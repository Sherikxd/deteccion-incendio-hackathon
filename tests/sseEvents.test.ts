import { describe, expect, it } from 'vitest';
import { SSE_EVENT_NAME_BY_CHANNEL, sseEventName } from '../src/server/sseEvents';

/**
 * Contrato SSE (documentado en docs/04-API-REFERENCE.md).
 * Regresión del bug P1: cada canal emite SIEMPRE un nombre de evento estable,
 * mientras que el tipo concreto viaja dentro de `data.type`.
 */
describe('contrato de nombres de evento SSE', () => {
  it('mapea los cuatro canales registrados', () => {
    expect(sseEventName('alerts')).toBe('alert');
    expect(sseEventName('telemetry')).toBe('sensor_update');
    expect(sseEventName('analysis')).toBe('analysis');
    expect(sseEventName('incidents')).toBe('incident_update');
  });

  it('usa el propio nombre del canal si no está registrado', () => {
    expect(sseEventName('weather')).toBe('weather');
    expect(sseEventName('')).toBe('');
  });

  it('el mapa exportado y la función nunca divergen', () => {
    for (const [channel, event] of Object.entries(SSE_EVENT_NAME_BY_CHANNEL)) {
      expect(sseEventName(channel)).toBe(event);
    }
  });

  it('ningún nombre de evento contiene espacios (rompería el framing SSE)', () => {
    for (const event of Object.values(SSE_EVENT_NAME_BY_CHANNEL)) {
      expect(event).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });
});
