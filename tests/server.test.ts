// @vitest-environment node
/**
 * Tests de integración: arranca el servidor real (`tsx server.ts`) como proceso
 * hijo y comprueba el contrato SSE, la validación de payloads y el modelo de
 * propagación contra los endpoints HTTP de verdad.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.TEST_PORT || String(4300 + (process.pid % 500));
const BASE = `http://127.0.0.1:${PORT}`;

let child: ChildProcess;
let output = '';

const post = (urlPath: string, body: unknown) =>
  fetch(`${BASE}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

const validAlert = {
  sector: 'Cerro de las Tres Cruces',
  riskLevel: 'CRITICAL',
  headline: 'Frente activo hacia Bataclán',
  frpMw: 145,
  windSpeedKmh: 32,
  windDirection: 'WNW',
  threatenedAssets: ['Barrio Juanambú'],
  tacticalAction: '2 cisternas en cota 1100'
};

/** Suscribe /stream, dispara `fire` y devuelve los nombres de evento vistos. */
async function captureSseEvents(channel: string, fire: () => Promise<unknown>): Promise<Set<string>> {
  const res = await fetch(`${BASE}/stream?channel=${channel}`);
  expect(res.status).toBe(200);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const found = new Set<string>();

  const pump = (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        for (const m of buffer.matchAll(/^event: (\S+)$/gm)) {
          found.add(m[1]);
        }
      }
    } catch {
      /* cancelado */
    }
  })();

  await new Promise((r) => setTimeout(r, 350));
  await fire();
  await new Promise((r) => setTimeout(r, 350));
  await reader.cancel().catch(() => {});
  await pump;
  return found;
}

beforeAll(async () => {
  child = spawn('node', [path.join(ROOT, 'node_modules/tsx/dist/cli.mjs'), 'server.ts'], {
    cwd: ROOT,
    env: { ...process.env, PORT, DISABLE_HMR: 'true' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout?.on('data', (d) => (output += d.toString()));
  child.stderr?.on('data', (d) => (output += d.toString()));

  const deadline = Date.now() + 60000;
  for (;;) {
    if (child.exitCode !== null) {
      throw new Error(`El servidor terminó con código ${child.exitCode}:\n${output.slice(-3000)}`);
    }
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) break;
    } catch {
      /* aún no escucha */
    }
    if (Date.now() > deadline) {
      throw new Error(`El servidor no respondió en 60s:\n${output.slice(-3000)}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}, 90000);

afterAll(async () => {
  if (!child) return;
  child.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 1500));
  if (child.exitCode === null) child.kill('SIGKILL');
});

describe('contrato SSE en vivo (GET /stream)', () => {
  const cases: Array<{ channel: string; payload: unknown; expected: string; forbidden: string[] }> = [
    {
      channel: 'alerts',
      payload: { type: 'EMERGENCY_ALERT', alert: { sector: 'x' } },
      expected: 'alert',
      forbidden: ['emergency_alert']
    },
    {
      channel: 'telemetry',
      payload: { type: 'SENSOR_UPDATE', sensor: { name: 's' } },
      expected: 'sensor_update',
      forbidden: ['telemetry']
    },
    {
      channel: 'analysis',
      payload: { type: 'STREAM_CHUNK', streamId: 's1', chunk: 'x' },
      expected: 'analysis',
      forbidden: ['chunk']
    },
    {
      channel: 'incidents',
      payload: { type: 'INCIDENT_STATUS_UPDATE' },
      expected: 'incident_update',
      forbidden: ['incident']
    },
    {
      channel: 'canal_exotico',
      payload: { type: 'X' },
      expected: 'canal_exotico',
      forbidden: []
    }
  ];

  for (const c of cases) {
    it(`canal ${c.channel} emite "event: ${c.expected}"`, async () => {
      const events = await captureSseEvents(c.channel, () =>
        post('/api/stream/broadcast', { channel: c.channel, data: c.payload })
      );
      expect(events.has(c.expected)).toBe(true);
      // El saludo del servidor también usa nombres fijos
      expect(events.has('connected')).toBe(true);
      for (const bad of c.forbidden) {
        expect(events.has(bad)).toBe(false);
      }
    });
  }

  it('POST /api/alerts retransmite como "event: alert"', async () => {
    const events = await captureSseEvents('alerts', () => post('/api/alerts', validAlert));
    expect(events.has('alert')).toBe(true);
    expect(events.has('emergency_alert')).toBe(false);
  });
});

describe('POST /api/simulate/spread', () => {
  it('devuelve resultados coherentes y ecoa el vector de viento', async () => {
    const res = await post('/api/simulate/spread', {
      windSpeed: 45,
      slopeDeg: 35,
      fuelMoisture: 'EXTREME',
      windDirection: 'ESE'
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.inputs.windDirection).toBe('ESE');
    expect(body.results.rateOfSpreadMetersPerMinute).toBeGreaterThan(0);
    expect(body.results.flameLengthMeters).toBeGreaterThan(0);
    expect(body.results.isochronesEstimated.min60Meters).toBeGreaterThan(
      body.results.isochronesEstimated.min15Meters
    );
  });

  it('orden de combustible: EXTREME > HIGH > MODERATE con el resto constante', async () => {
    const rosFor = async (fuelMoisture: string) => {
      const res = await post('/api/simulate/spread', { windSpeed: 30, slopeDeg: 30, fuelMoisture });
      const body = await res.json();
      return body.results.rateOfSpreadMetersPerMinute;
    };

    const [extreme, high, moderate] = await Promise.all([
      rosFor('EXTREME'),
      rosFor('HIGH'),
      rosFor('MODERATE')
    ]);
    expect(extreme).toBeGreaterThan(high);
    expect(high).toBeGreaterThan(moderate);
  });

  it('el suelo de 2 m/min evita ROS nulos con viento en calma', async () => {
    const res = await post('/api/simulate/spread', { windSpeed: 0, slopeDeg: 5, fuelMoisture: 'MODERATE' });
    const body = await res.json();
    expect(body.results.rateOfSpreadMetersPerMinute).toBeGreaterThanOrEqual(2);
    expect(body.results.timeToUrbanPerimeterMinutes).toBeGreaterThan(0);
  });

  it('rechaza fuelMoisture desconocido con 422', async () => {
    const res = await post('/api/simulate/spread', { windSpeed: 30, slopeDeg: 30, fuelMoisture: 'HUMO' });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.fields).toContain('fuelMoisture');
  });
});

describe('POST /api/alerts', () => {
  it('valida el payload con 422', async () => {
    const res = await post('/api/alerts', { riskLevel: 'NO_EXISTE', frpMw: 'abc' });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(Array.isArray(body.fields)).toBe(true);
  });

  it('acepta un payload válido con 201', async () => {
    const res = await post('/api/alerts', validAlert);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.alert.alertId).toMatch(/^ALR-EXT-/);
  });
});

describe('otras superficies', () => {
  it('GET /stream/alerts devuelve el snapshot en JSON', async () => {
    const res = await fetch(`${BASE}/stream/alerts`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.alerts)).toBe(true);
    expect(body.alerts.length).toBeGreaterThan(0);
  });

  it('GET /api/health responde', async () => {
    const res = await fetch(`${BASE}/api/health`);
    expect(res.status).toBe(200);
  });

  it('server.ts usa la fuente de verdad del contrato (guardia de regresión)', () => {
    const src = readFileSync(path.join(ROOT, 'server.ts'), 'utf8');
    expect(src).toContain('event: ${sseEventName(channel)}');
    expect(src).not.toContain('SSE_EVENT_NAME_BY_CHANNEL');
  });
});
