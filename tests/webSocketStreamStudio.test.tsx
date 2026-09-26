import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketStreamStudio } from '../src/components/WebSocketStreamStudio';
import { wsClient } from '../src/services/websocketService';
import { MOCK_INCIDENTS } from '../src/data/mockIncidents';

const incident = MOCK_INCIDENTS[0];

type Handler = ((ev?: any) => void) | null | undefined;

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];
  static failConnect = false;

  url: string;
  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: Handler = null;
  onmessage: Handler = null;
  onclose: Handler = null;
  onerror: Handler = null;

  constructor(url: string) {
    if (FakeWebSocket.failConnect) {
      throw new Error('ECONNREFUSED gateway caído');
    }
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error('InvalidStateError');
    this.sent.push(data);
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({});
  }

  simulateOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({});
  }

  emit(obj: unknown) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }

  get frames(): any[] {
    return this.sent.map((s) => JSON.parse(s));
  }
}

const lastSocket = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

describe('WebSocketStreamStudio', () => {
  beforeEach(() => {
    wsClient.disconnect();
    FakeWebSocket.instances = [];
    FakeWebSocket.failConnect = false;
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    cleanup();
    wsClient.disconnect();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const renderStudio = () => render(<WebSocketStreamStudio currentIncident={incident} />);
  // Las trazas llegan por fuera de React: hay que envolverlas en act() para que
  // el estado se flushée antes de consultar el DOM.
  const openSocket = () => act(() => lastSocket().simulateOpen());
  const emitToSocket = (msg: unknown) => act(() => lastSocket().emit(msg));
  // getText() ignora nodos de texto repartidos entre elementos (p. ej. "Chunks: <strong>2</strong>")
  const bodyText = () => (document.body.textContent || '').replace(/\s+/g, ' ');

  it('conecta al montar y refleja el estado del gateway', () => {
    renderStudio();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(screen.getByText('RECONECTANDO')).toBeDefined();

    openSocket();
    expect(screen.getByText('EN LÍNEA (STREAM ACTIVO)')).toBeDefined();
    expect(lastSocket().frames.some((f) => f.type === 'subscribe')).toBe(true);
  });

  it('emite la petición de stream y sólo pinta chunks del streamId propio (regresión)', () => {
    renderStudio();
    openSocket();

    fireEvent.click(screen.getByText('Iniciar Stream de Tokens'));
    expect(lastSocket().frames.some((f) => f.type === 'request_ai_stream')).toBe(true);
    expect(screen.getByText('Transmitiendo Stream WebSocket...')).toBeDefined();

    emitToSocket({ channel: 'analysis', type: 'STREAM_START', streamId: 'stream-1', timestamp: 't1' });
    expect(screen.getByText('Flujo de Tokens Activo (OpenRouter SSE → WS)')).toBeDefined();

    emitToSocket({ channel: 'analysis', type: 'STREAM_CHUNK', streamId: 'stream-1', chunk: 'Frente ', timestamp: 't2' });
    emitToSocket({ channel: 'analysis', type: 'STREAM_CHUNK', streamId: 'stream-1', chunk: 'activo', timestamp: 't3' });
    expect(screen.getByText(/Frente\s+activo/)).toBeDefined();
    expect(bodyText()).toContain('Chunks recibidos: 2');

    // chunks de otro operador: no deben contaminar la ventana de salida
    // (el registro crudo de la terminal sí los lista: es un log operativo)
    emitToSocket({ channel: 'analysis', type: 'STREAM_CHUNK', streamId: 'stream-2', chunk: 'AJENO', timestamp: 't4' });
    const outputPanel = screen
      .getByRole('button', { name: 'Copiar' })
      .parentElement!.parentElement!.parentElement!;
    expect(outputPanel.textContent).toContain('Frente');
    expect(outputPanel.textContent).not.toContain('AJENO');
    expect(bodyText()).toContain('Chunks recibidos: 2');

    emitToSocket({ channel: 'analysis', type: 'STREAM_ERROR', streamId: 'stream-2', error: 'error ajeno', timestamp: 't5' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Transmitiendo Stream WebSocket...')).toBeDefined();
  });

  it('muestra el error cuando STREAM_ERROR es del stream propio', () => {
    renderStudio();
    openSocket();

    fireEvent.click(screen.getByText('Iniciar Stream de Tokens'));
    emitToSocket({ channel: 'analysis', type: 'STREAM_START', streamId: 'stream-1', timestamp: 't1' });
    emitToSocket({
      channel: 'analysis',
      type: 'STREAM_ERROR',
      streamId: 'stream-1',
      error: 'OpenRouter 401: User not found',
      timestamp: 't2'
    });

    expect(screen.getByRole('alert').textContent).toContain('OpenRouter 401: User not found');
    // el spinner se libera
    expect(screen.getByText('Iniciar Stream de Tokens')).toBeDefined();
  });

  it('STREAM_COMPLETE del stream propio finaliza el stream con el texto completo', () => {
    renderStudio();
    openSocket();

    fireEvent.click(screen.getByText('Iniciar Stream de Tokens'));
    emitToSocket({ channel: 'analysis', type: 'STREAM_START', streamId: 'stream-1', timestamp: 't1' });
    emitToSocket({ channel: 'analysis', type: 'STREAM_COMPLETE', streamId: 'stream-1', fullText: 'Boletín final', timestamp: 't2' });

    expect(screen.getByText('Boletín final')).toBeDefined();
    expect(screen.getByText('Iniciar Stream de Tokens')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('si el gateway no acepta el frame lo dice explícitamente (antes el click era mudo)', () => {
    FakeWebSocket.failConnect = true;
    renderStudio();
    expect(FakeWebSocket.instances).toHaveLength(0);

    fireEvent.click(screen.getByText('Iniciar Stream de Tokens'));

    expect(screen.getByRole('alert').textContent).toContain('No hay conexión con el gateway WebSocket');
    expect(screen.getByText('Iniciar Stream de Tokens')).toBeDefined();
  });

  it('al desmontar cierra el socket en lugar de dejarlo reconectando', () => {
    vi.useFakeTimers();
    const { unmount } = renderStudio();
    openSocket();

    unmount();

    expect(lastSocket().readyState).toBe(FakeWebSocket.CLOSED);
    vi.advanceTimersByTime(10000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('el prompt por defecto se basa en el incidente activo', () => {
    renderStudio();
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toContain(incident.title);
  });
});
