import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamLiveChannel } from '../src/components/StreamLiveChannel';

/** EventSource simulado: registra listeners y permite emitir eventos con nombre. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  onopen: any = null;
  onerror: any = null;
  closed = false;
  private listeners = new Map<string, Set<(e: any) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (e: any) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  }

  removeEventListener(type: string, cb: (e: any) => void) {
    this.listeners.get(type)?.delete(cb);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, payload: unknown) {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.listeners.get(type)?.forEach((cb) => cb({ type, data }));
  }

  get registeredEvents(): string[] {
    return [...this.listeners.keys()].sort();
  }
}

const jsonRes = (body: unknown, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => body
});

describe('StreamLiveChannel', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    FakeEventSource.instances = [];
    fetchMock.mockReset();
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const lastES = () => FakeEventSource.instances[FakeEventSource.instances.length - 1];
  // El EventSource dispara callbacks fuera del ciclo de React: act() fuerza el flush.
  const emitFromServer = (type: string, payload: unknown) => act(() => lastES().emit(type, payload));

  it('se suscribe a los eventos canónicos del contrato SSE (regresión P1)', async () => {
    render(<StreamLiveChannel currentIncidentTitle="Incendio" />);

    const es = lastES();
    expect(es.url).toBe('/stream?channel=all');
    expect(es.registeredEvents).toEqual([
      'alert',
      'analysis',
      'connected',
      'initial_alerts',
      'sensor_update'
    ]);
    // Los nombres viejos que el servidor ya no emite no deben registrarse
    expect(es.registeredEvents).not.toContain('emergency_alert');
    expect(es.registeredEvents).not.toContain('telemetry');
  });

  it('pinta una alerta recibida en el canal `alert`', async () => {
    render(<StreamLiveChannel currentIncidentTitle="Incendio" />);

    emitFromServer('alert', {
      channel: 'alerts',
      timestamp: new Date().toISOString(),
      data: {
        type: 'EMERGENCY_ALERT',
        alert: {
          sector: 'Cerro de las Tres Cruces',
          alertId: 'ALT-77',
          riskLevel: 'CRITICAL',
          headline: 'Frente activo hacia Bataclán',
          frpMw: 180,
          windSpeedKmh: 34,
          windDirection: 'WNW',
          pm25UgM3: 240,
          tacticalAction: '2 cisternas'
        }
      }
    });

    await waitFor(() => expect(screen.getByText('Cerro de las Tres Cruces')).toBeDefined());
    expect(screen.getByText('Frente activo hacia Bataclán')).toBeDefined();
    expect(screen.getByText('Riesgo: CRITICAL')).toBeDefined();
    expect(screen.getByText(/ALT-77/)).toBeDefined();
    expect((document.body.textContent || '').replace(/\s+/g, ' ')).toContain(
      'Flujo de Eventos en Vivo (1 recibidos)'
    );
  });

  it('pinta telemetría del canal `sensor_update`', async () => {
    render(<StreamLiveChannel currentIncidentTitle="Incendio" />);

    emitFromServer('sensor_update', {
      channel: 'telemetry',
      timestamp: new Date().toISOString(),
      data: {
        type: 'SENSOR_UPDATE',
        sensor: { name: 'Estación Tres Cruces', pm25: 88, windSpeed: 31, windDir: 'W', temp: 29 }
      }
    });

    await waitFor(() => expect(screen.getByText('Estación Tres Cruces')).toBeDefined());
    expect(screen.getByText('PM2.5: 88')).toBeDefined();
  });

  it('un evento `connected` actualiza el contador de listeners', async () => {
    render(<StreamLiveChannel currentIncidentTitle="Incendio" />);

    emitFromServer('connected', { totalActiveListeners: 42 });

    await waitFor(() => expect(screen.getByText('42 Clientes Conectados')).toBeDefined());
  });

  it('transmite la alerta de prueba por POST /stream y confirma', async () => {
    fetchMock.mockResolvedValue(jsonRes({ success: true }));
    render(<StreamLiveChannel currentIncidentTitle="Incendio" />);

    fireEvent.click(screen.getByText('Disparar Alerta en Vivo a /stream'));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('¡Alerta transmitida en tiempo real')
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/stream');
    expect(JSON.parse(init.body)).toMatchObject({
      riskLevel: 'CRITICAL',
      windDirection: 'WNW',
      frpMw: 145
    });
  });

  it('ante un 429 del rate limit muestra el detalle del error, no éxito', async () => {
    fetchMock.mockResolvedValue(jsonRes({ error: 'Rate limit excedido' }, { ok: false, status: 429 }));
    render(<StreamLiveChannel currentIncidentTitle="Incendio" />);

    fireEvent.click(screen.getByText('Disparar Alerta en Vivo a /stream'));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('No se pudo transmitir la alerta: Rate limit excedido')
    );
  });

  it('si la red falla lo comunica explícitamente', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    render(<StreamLiveChannel currentIncidentTitle="Incendio" />);

    fireEvent.click(screen.getByText('Disparar Alerta en Vivo a /stream'));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Error de red al transmitir la alerta')
    );
  });

  it('cambia de canal reabriendo el EventSource y ciérralo al desmontar', async () => {
    const { unmount } = render(<StreamLiveChannel currentIncidentTitle="Incendio" />);
    expect(FakeEventSource.instances).toHaveLength(1);

    fireEvent.click(screen.getByText('#alerts'));
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(lastES().url).toBe('/stream?channel=alerts');
    expect(FakeEventSource.instances[0].closed).toBe(true);

    const open = lastES();
    unmount();
    expect(open.closed).toBe(true);
  });
});
