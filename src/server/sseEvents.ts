/**
 * Contrato de nombres de evento SSE del canal /stream.
 *
 * Es la fuente de verdad compartida entre el servidor (que serializa cada trama
 * como `event: <nombre>`) y los consumidores (EventSource.addEventListener).
 * El tipo concreto del mensaje (EMERGENCY_ALERT, SENSOR_UPDATE, STREAM_CHUNK...)
 * viaja dentro de `data.type`, nunca en el nombre del evento.
 */

export const SSE_EVENT_NAME_BY_CHANNEL: Record<string, string> = {
  alerts: 'alert',
  telemetry: 'sensor_update',
  analysis: 'analysis',
  incidents: 'incident_update'
};

/** Nombre de evento SSE estable para un canal. Canales no registrados usan su propio nombre. */
export function sseEventName(channel: string): string {
  return SSE_EVENT_NAME_BY_CHANNEL[channel] || channel;
}
