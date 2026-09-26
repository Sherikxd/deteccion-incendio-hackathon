import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wsClient } from '../src/services/websocketService';

type Handler = ((ev?: any) => void) | null | undefined;

/** WebSocket simulado: registra frames enviados y permite disparar onopen/onmessage/onclose. */
class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  url: string;
  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: Handler = null;
  onmessage: Handler = null;
  onclose: Handler = null;
  onerror: Handler = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    if (this.readyState !== FakeWebSocket.OPEN) {
      throw new Error('InvalidStateError: socket no abierto');
    }
    this.sent.push(data);
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({});
  }

  /** Helpers de test */
  simulateOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({});
  }

  simulateMessage(obj: unknown) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }

  simulateClose() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({});
  }

  get frames(): any[] {
    return this.sent.map((s) => JSON.parse(s));
  }
}

const lastSocket = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

describe('websocketService (cola de salida y ciclo de vida)', () => {
  beforeEach(() => {
    wsClient.disconnect(); // resetea el singleton entre tests
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    wsClient.disconnect();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('encola los frames enviados durante el handshake y los vacía al abrir', () => {
    wsClient.connect();
    const ws = lastSocket();
    expect(ws).toBeDefined();
    expect(ws.readyState).toBe(FakeWebSocket.CONNECTING);
    expect(wsClient.isConnectedNow()).toBe(false);

    // send() durante CONNECTING debe aceptar el frame encolado, no perderlo
    expect(wsClient.requestAiStream('prompt de prueba', 'test/model')).toBe(true);
    expect(ws.sent.length).toBe(0);

    ws.simulateOpen();

    expect(wsClient.isConnectedNow()).toBe(true);
    const types = ws.frames.map((f) => f.type);
    expect(types).toContain('subscribe');
    expect(types).toContain('request_ai_stream');
    const streamReq = ws.frames.find((f) => f.type === 'request_ai_stream');
    expect(streamReq.prompt).toBe('prompt de prueba');
    expect(streamReq.model).toBe('test/model');
    // la cola no debe re-enviar nada dos veces
    expect(ws.frames.filter((f) => f.type === 'request_ai_stream')).toHaveLength(1);
  });

  it('send() devuelve false si no hay socket (antes era void y se perdía el error)', () => {
    expect(wsClient.send({ type: 'ping' })).toBe(false);
    expect(wsClient.isConnectedNow()).toBe(false);
  });

  it('send() devuelve true y transmite en cuanto el socket está OPEN', () => {
    wsClient.connect();
    const ws = lastSocket();
    ws.simulateOpen();
    expect(wsClient.send({ type: 'ping' })).toBe(true);
    expect(ws.frames.filter((f) => f.type === 'ping')).toHaveLength(1);
  });

  it('una caída abrupta no reprograma reconexión tras disconnect() manual', () => {
    vi.useFakeTimers();
    wsClient.connect();
    expect(FakeWebSocket.instances).toHaveLength(1);

    wsClient.disconnect();
    // close() dispara onclose: sin la flag manuallyClosed reprogramaría reconexión
    expect(FakeWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(10000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(wsClient.isConnectedNow()).toBe(false);
  });

  it('sin disconnect() manual, onclose sí programa reconexión a los 3s', () => {
    vi.useFakeTimers();
    wsClient.connect();
    expect(FakeWebSocket.instances).toHaveLength(1);

    lastSocket().simulateClose();

    vi.advanceTimersByTime(2999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('onclose descarta lo que quedara encolado (handshake fallido)', () => {
    wsClient.connect();
    const ws = lastSocket();
    expect(wsClient.send({ type: 'stale_frame' })).toBe(true); // encolado

    ws.simulateClose();

    // un siguiente socket nuevo no debe recibir el frame viejo
    wsClient.connect();
    const ws2 = lastSocket();
    ws2.simulateOpen();
    expect(ws2.frames.some((f) => f.type === 'stale_frame')).toBe(false);
  });

  it('isConnectedNow() es false con el socket en CLOSING/CLOSED', () => {
    wsClient.connect();
    const ws = lastSocket();
    ws.simulateOpen();
    expect(wsClient.isConnectedNow()).toBe(true);

    ws.readyState = FakeWebSocket.CLOSED;
    expect(wsClient.isConnectedNow()).toBe(false);
  });

  it('notifica los cambios de estado a los suscriptores y permite darse de baja', () => {
    const seen: boolean[] = [];
    const unsub = wsClient.addStatusListener((connected) => seen.push(connected));
    wsClient.connect();
    lastSocket().simulateOpen();
    expect(seen).toContain(true);
    expect(seen).toContain(false); // estado inicial al suscribirse

    unsub();
    const count = seen.length;
    lastSocket().simulateClose();
    expect(seen).toHaveLength(count);
  });

  it('propaga los mensajes entrantes a los listeners', () => {
    wsClient.connect();
    const ws = lastSocket();
    ws.simulateOpen();

    const received: any[] = [];
    const unsub = wsClient.addMessageListener((msg) => received.push(msg));
    ws.simulateMessage({ channel: 'analysis', type: 'STREAM_START', timestamp: 'now', streamId: 'abc' });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('STREAM_START');
    expect(received[0].streamId).toBe('abc');
    unsub();
  });
});
