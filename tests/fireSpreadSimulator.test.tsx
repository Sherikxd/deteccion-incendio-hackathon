import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FireSpreadSimulator } from '../src/components/FireSpreadSimulator';

const jsonRes = (body: unknown, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => body
});

const serverResult = {
  rateOfSpreadMetersPerMinute: 12.4,
  rateOfSpreadKmPerHour: 0.74,
  flameLengthMeters: 1.9,
  timeToUrbanPerimeterMinutes: 113,
  isochronesEstimated: {}
};

describe('FireSpreadSimulator', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renderiza el escenario por defecto con amenaza urbana (viento WNW)', () => {
    render(<FireSpreadSimulator />);
    expect(screen.getByText(/minutos hasta cota residencial/)).toBeDefined();
    expect(screen.queryByText(/Sin amenaza directa a la cota urbana/)).toBeNull();
  });

  it('con viento ESE descarta la amenaza urbana y cambia el cronograma', () => {
    render(<FireSpreadSimulator />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'ESE' } });

    expect(screen.getByText(/Sin amenaza directa a la cota urbana/)).toBeDefined();
    expect(screen.queryByText(/minutos hasta cota residencial/)).toBeNull();
    expect(screen.getByText(/Avance estimado del frente/)).toBeDefined();
    expect(screen.queryByText(/Cronograma estimado de amenazas/)).toBeNull();
  });

  it('ejecuta el modelo real en el servidor y pinta su resultado', async () => {
    fetchMock.mockResolvedValue(
      jsonRes({ success: true, results: serverResult, input: { windDirection: 'WNW' } })
    );
    render(<FireSpreadSimulator />);

    fireEvent.click(screen.getByText('Ejecutar Modelo de Propagación'));

    await waitFor(() =>
      expect(screen.getByText(/Resultado del servidor \(POST \/api\/simulate\/spread\)/)).toBeDefined()
    );
    // aparece en el panel de resultado y en el toast del servidor
    expect(screen.getAllByText(/ROS 12\.4 m\/min/).length).toBeGreaterThanOrEqual(1);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/simulate/spread');
    expect(JSON.parse(init.body)).toMatchObject({ windSpeed: 32, slopeDeg: 30, fuelMoisture: 'EXTREME' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('muestra el error del servidor (422) en caja y toast', async () => {
    fetchMock.mockResolvedValue(jsonRes({ success: false, error: 'fuelMoisture inválido' }, { ok: false, status: 422 }));
    render(<FireSpreadSimulator />);

    fireEvent.click(screen.getByText('Ejecutar Modelo de Propagación'));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('fuelMoisture inválido')
    );
    const toast = screen.getByRole('status');
    expect(toast.textContent).toContain('No se pudo ejecutar el modelo de propagación');
    expect(screen.queryByText(/Resultado del servidor/)).toBeNull();
  });

  it('transmite el escenario a /api/alerts y dispara el despacho de WhatsApp', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonRes({ success: true, id: 'alt-1' }))
      .mockResolvedValueOnce(jsonRes({ success: true, dispatched: true }));
    render(<FireSpreadSimulator />);

    fireEvent.click(screen.getByText('Enviar a WhatsApp Bot'));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('despacho WhatsApp (simulado) emitido')
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/alerts');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/whatsapp/dispatch');
    const alertBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(alertBody.headline).toContain('cota urbana');
    expect(alertBody.windDirection).toBe('WNW');
  });

  it('si el despacho de WhatsApp falla no anuncia éxito', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonRes({ success: true }))
      .mockResolvedValueOnce(jsonRes({ error: 'sin destino' }, { ok: false, status: 500 }));
    render(<FireSpreadSimulator />);

    fireEvent.click(screen.getByText('Enviar a WhatsApp Bot'));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('No se pudo transmitir el escenario')
    );
    expect(screen.queryByText(/despacho WhatsApp \(simulado\) emitido/)).toBeNull();
  });

  it('si /api/alerts rechaza (rate limit 429) muestra el error en vez de éxito', async () => {
    fetchMock.mockResolvedValue(jsonRes({ error: 'Rate limit excedido' }, { ok: false, status: 429 }));
    render(<FireSpreadSimulator />);

    fireEvent.click(screen.getByText('Enviar a WhatsApp Bot'));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Rate limit excedido')
    );
    // no debe llegar a intentar el despacho de WhatsApp
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
