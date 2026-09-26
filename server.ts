import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sseEventName } from './src/server/sseEvents.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY;

const ALLOWED_AI_MODELS = new Set([
  'anthropic/claude-3.5-sonnet',
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o',
  'meta-llama/llama-3.3-70b-instruct'
]);

const DEFAULT_AI_MODEL = 'anthropic/claude-3.5-sonnet';

function safeAiModel(value: unknown): string {
  return typeof value === 'string' && ALLOWED_AI_MODELS.has(value) ? value : DEFAULT_AI_MODEL;
}

const app = express();
app.use(express.json({ limit: '256kb' }));

// Keep the public demo usable without allowing unbounded POST traffic to
// consume the in-memory alert/sensor gateway.
const mutationRateBuckets = new Map<string, { windowStartedAt: number; count: number }>();
const MUTATION_WINDOW_MS = 60_000;
const MUTATION_LIMIT_PER_IP = 60;

app.use((req, res, next) => {
  if (req.method !== 'POST') return next();

  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const current = mutationRateBuckets.get(key);
  const bucket = !current || now - current.windowStartedAt >= MUTATION_WINDOW_MS
    ? { windowStartedAt: now, count: 0 }
    : current;

  bucket.count += 1;
  mutationRateBuckets.set(key, bucket);

  if (bucket.count > MUTATION_LIMIT_PER_IP) {
    return res.status(429).json({
      success: false,
      error: 'Límite temporal de solicitudes POST alcanzado',
      retryAfterSeconds: Math.ceil((bucket.windowStartedAt + MUTATION_WINDOW_MS - now) / 1000)
    });
  }

  return next();
});

// Enable CORS for SSE and REST calls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const server = http.createServer(app);

// WebSocket Server attached with noServer mode so it supports both /ws and /stream paths
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  try {
    const pathname = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).pathname;
    if (pathname === '/ws' || pathname === '/stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  } catch (err) {
    socket.destroy();
  }
});

interface ClientMetadata {
  id: string;
  ws: WebSocket;
  ip: string;
  connectedAt: Date;
  subscribedChannels: Set<string>;
}

const wsClients = new Map<WebSocket, ClientMetadata>();

// SSE Clients Registry for GET /stream
interface SseClient {
  id: string;
  res: Response;
  req: Request;
  channel: string;
  connectedAt: Date;
  ip: string;
}

const sseClients = new Map<string, SseClient>();

export interface AIDecisionMeta {
  decision: 'DISPATCH_CONFIRMED' | 'DISCARDED_FALSE_POSITIVE' | 'EARLY_WARNING_MONITOR';
  confidence: number;
  model: string;
  reasoning: string;
  rulesEvaluated: string[];
  resourcesSavedEstimateCop?: number;
}

export interface FireEmergencyAlert {
  alertId: string;
  timestamp: string;
  sector: string;
  region: string;
  country: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  category: 'WILDFIRE' | 'SMOLDERING' | 'AGRICULTURAL_BURN' | 'WEATHER_WARNING' | 'INDUSTRIAL';
  headline: string;
  description: string;
  windSpeedKmh: number;
  windDirection: string;
  pm25UgM3: number;
  frpMw: number;
  threatenedAssets: string[];
  tacticalAction: string;
  capNotice: string;
  radioDispatch: string;
  aiDecision?: AIDecisionMeta;
}

const ALERT_RISK_LEVELS = new Set<FireEmergencyAlert['riskLevel']>([
  'CRITICAL',
  'HIGH',
  'MODERATE',
  'LOW'
]);

const ALERT_CATEGORIES = new Set<FireEmergencyAlert['category']>([
  'WILDFIRE',
  'SMOLDERING',
  'AGRICULTURAL_BURN',
  'WEATHER_WARNING',
  'INDUSTRIAL'
]);

const ALERT_NUMBER_LIMITS: Record<string, [number, number]> = {
  windSpeedKmh: [0, 250],
  pm25UgM3: [0, 10_000],
  frpMw: [0, 100_000]
};

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function validateAlertPayload(body: unknown): string[] {
  if (!isRecord(body)) return ['El cuerpo debe ser un objeto JSON'];

  const errors: string[] = [];
  if (body.riskLevel !== undefined && !ALERT_RISK_LEVELS.has(body.riskLevel)) {
    errors.push(`riskLevel debe ser uno de: ${Array.from(ALERT_RISK_LEVELS).join(', ')}`);
  }
  if (body.category !== undefined && !ALERT_CATEGORIES.has(body.category)) {
    errors.push(`category debe ser uno de: ${Array.from(ALERT_CATEGORIES).join(', ')}`);
  }

  Object.entries(ALERT_NUMBER_LIMITS).forEach(([field, [min, max]]) => {
    if (body[field] === undefined || body[field] === null || body[field] === '') return;
    const parsed = Number(body[field]);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      errors.push(`${field} debe ser un número entre ${min} y ${max}`);
    }
  });

  if (body.threatenedAssets !== undefined && !Array.isArray(body.threatenedAssets)) {
    errors.push('threatenedAssets debe ser un arreglo de textos');
  }

  return errors;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').slice(0, 20)
    : fallback;
}

// In-memory buffer of recent alerts for Cali & Valle del Cauca
// ESTADO REAL EN TIEMPO REAL: Vacío en condiciones normales de vigilancia.
// Sin incendios activos en las laderas de Cali. Los simulacros se inyectan en el Sandbox.
const recentAlerts: FireEmergencyAlert[] = [];

// Canonical SSE event name per channel (contract documented in docs/04-API-REFERENCE.md).
// Source of truth lives in src/server/sseEvents.ts so it is unit-testable without
// booting the server; payload `type` still travels inside `data` for discrimination.

// Unified broadcast function: broadcasts to both WebSocket clients and SSE (/stream) clients
export function broadcastToChannel(channel: string, payload: any, senderWs?: WebSocket) {
  const timestamp = new Date().toISOString();
  const eventMessage = {
    channel,
    timestamp,
    data: payload
  };
  const jsonString = JSON.stringify(eventMessage);

  // 1. Broadcast to WebSockets
  wsClients.forEach((client, ws) => {
    if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
      if (client.subscribedChannels.has('all') || client.subscribedChannels.has(channel)) {
        ws.send(jsonString);
      }
    }
  });

  // 2. Broadcast to SSE clients connected to /stream
  const sseChunk = `event: ${sseEventName(channel)}\ndata: ${jsonString}\n\n`;

  sseClients.forEach((sseClient, clientId) => {
    if (sseClient.channel === 'all' || sseClient.channel === channel) {
      try {
        sseClient.res.write(sseChunk);
      } catch (err) {
        sseClients.delete(clientId);
      }
    }
  });
}

// Function to emit a new emergency alert to the stream
export function emitEmergencyAlert(alert: FireEmergencyAlert) {
  recentAlerts.unshift(alert);
  if (recentAlerts.length > 20) {
    recentAlerts.pop();
  }

  broadcastToChannel('alerts', {
    type: 'EMERGENCY_ALERT',
    alert
  });
}

// Cali & Valle del Cauca live sensor network: Lecturas basales reales dentro de norma
const CALI_SENSORS_STATE = [
  {
    id: 'iot-cali-tres-cruces-01',
    name: 'Estación CVC-01 Mirador Tres Cruces',
    location: 'Cali Ladera Noroccidental (1465 msnm)',
    pm25: 16,
    co: 1.4,
    temp: 28.4,
    humidity: 54,
    windSpeed: 14,
    windDir: 'WNW',
    flame: false,
    status: 'normal'
  },
  {
    id: 'iot-farallones-penas-blancas',
    name: 'Estación Guardaparque PNN — Peñas Blancas',
    location: 'PNN Farallones de Cali (1980 msnm)',
    pm25: 11,
    co: 0.9,
    temp: 21.2,
    humidity: 68,
    windSpeed: 8,
    windDir: 'WSW',
    flame: false,
    status: 'normal'
  },
  {
    id: 'iot-cristo-rey-mirador',
    name: 'Torre Mirador Cristo Rey — Nodo Sentry-03',
    location: 'Monumento Cristo Rey (1435 msnm)',
    pm25: 14,
    co: 1.2,
    temp: 27.8,
    humidity: 58,
    windSpeed: 12,
    windDir: 'W',
    flame: false,
    status: 'normal'
  },
  {
    id: 'iot-dapa-medio',
    name: 'Nodo Ambiental Medio Dapa (IoT-14)',
    location: 'Piedemonte Cali - Yumbo (1420 msnm)',
    pm25: 15,
    co: 1.1,
    temp: 26.5,
    humidity: 60,
    windSpeed: 15,
    windDir: 'NW',
    flame: false,
    status: 'normal'
  }
];

// Broadcast periodic telemetry ticker over both WebSocket and /stream SSE
setInterval(() => {
  if (wsClients.size === 0 && sseClients.size === 0) return;

  const sensorIndex = Math.floor(Math.random() * CALI_SENSORS_STATE.length);
  const sensor = CALI_SENSORS_STATE[sensorIndex];

  const jitterPm = (Math.random() * 6 - 3).toFixed(1);
  const jitterWind = (Math.random() * 4 - 2).toFixed(1);
  const jitterTemp = (Math.random() * 0.6 - 0.3).toFixed(1);

  const updatedReading = {
    ...sensor,
    pm25: Math.max(10, parseFloat((sensor.pm25 + parseFloat(jitterPm)).toFixed(1))),
    temp: parseFloat((sensor.temp + parseFloat(jitterTemp)).toFixed(1)),
    windSpeed: Math.max(5, parseFloat((sensor.windSpeed + parseFloat(jitterWind)).toFixed(1))),
    readingTime: new Date().toISOString()
  };

  broadcastToChannel('telemetry', {
    type: 'SENSOR_UPDATE',
    sensor: updatedReading
  });
}, 3500);

// Keep-alive heartbeat for SSE /stream connections (every 15s to keep connections alive through proxies)
setInterval(() => {
  if (sseClients.size === 0) return;
  const heartbeatMsg = `: keepalive ${Date.now()}\n\n`;
  sseClients.forEach((client, id) => {
    try {
      client.res.write(heartbeatMsg);
    } catch (e) {
      sseClients.delete(id);
    }
  });
}, 15000);

// ==========================================
// CORE /stream ENDPOINT (Server-Sent Events)
// ==========================================
/**
 * GET /stream
 * Allows any client (curl, browser EventSource, Python, mobile app) to connect
 * and receive live fire alerts and telemetry in real time.
 * Supports query parameter: ?channel=alerts | telemetry | analysis | incidents | all
 */
app.get('/stream', (req: Request, res: Response) => {
  if (sseClients.size >= 250) {
    return res.status(503).json({ success: false, error: 'Límite de conexiones SSE alcanzado' });
  }

  const channel = (req.query.channel as string) || 'all';
  const clientId = `sse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clientIp = req.socket.remoteAddress || 'unknown';

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });

  res.flushHeaders();

  // Register client
  sseClients.set(clientId, {
    id: clientId,
    res,
    req,
    channel,
    connectedAt: new Date(),
    ip: clientIp
  });

  // 1. Send immediate welcome and connection status event
  const welcomePayload = {
    status: 'connected',
    stream: '/stream',
    clientId,
    channel,
    region: 'Santiago de Cali & Valle del Cauca (Colombia)',
    timestamp: new Date().toISOString(),
    totalActiveListeners: sseClients.size,
    availableChannels: ['alerts', 'telemetry', 'incidents', 'analysis', 'all'],
    info: 'Conexión activa al canal /stream de NatureIntelligence. Escuchando alertas tempranas de incendios forestales y telemetría de Cali.'
  };

  res.write(`event: connected\ndata: ${JSON.stringify(welcomePayload)}\n\n`);

  // 2. Immediately send the current active emergency alerts so client has instant situational awareness
  const initialAlertsPayload = {
    channel: 'alerts',
    type: 'INITIAL_ACTIVE_ALERTS',
    timestamp: new Date().toISOString(),
    count: recentAlerts.length,
    alerts: recentAlerts
  };

  res.write(`event: initial_alerts\ndata: ${JSON.stringify(initialAlertsPayload)}\n\n`);

  // Clean up when client disconnects
  req.on('close', () => {
    sseClients.delete(clientId);
  });
});

// POST /stream or POST /stream/alert: Endpoint to emit an alert into the live stream from external applications
app.post(['/stream', '/stream/alert', '/api/stream/alert'], (req: Request, res: Response) => {
  const body = req.body || {};
  const validationErrors = validateAlertPayload(body);
  if (validationErrors.length > 0) {
    return res.status(422).json({ success: false, error: 'Payload de alerta inválido', fields: validationErrors });
  }

  const alert: FireEmergencyAlert = {
    alertId: body.alertId || `ALR-EXT-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    sector: body.sector || 'Valle del Cauca (Sector No Especificado)',
    region: body.region || 'Área Metropolitana de Santiago de Cali',
    country: 'Colombia (Valle del Cauca)',
    riskLevel: body.riskLevel ?? 'HIGH',
    category: body.category ?? 'WILDFIRE',
    headline: body.headline || 'Alerta de Detección Térmica Reportada por Aplicación Externa',
    description: body.description || 'Notificación emitida desde sistema de monitoreo externo hacia el canal /stream de NatureIntelligence.',
    windSpeedKmh: finiteNumber(body.windSpeedKmh, 25, 0, 250),
    windDirection: body.windDirection || 'WNW',
    pm25UgM3: finiteNumber(body.pm25UgM3, 120, 0, 10_000),
    frpMw: finiteNumber(body.frpMw, 45.0, 0, 100_000),
    threatenedAssets: stringArray(body.threatenedAssets, ['Zona de ladera y vegetación en observación']),
    tacticalAction: body.tacticalAction || 'Verificación en terreno por brigada forestal de Bomberos Cali.',
    capNotice: body.capNotice || 'ALERTA PREVENTIVA: Se reporta condición de riesgo de incendio en ladera de Cali.',
    radioDispatch: body.radioDispatch || 'Central Bomberos Cali a Móviles: Unidad de verificación en desplazamiento.'
  };

  emitEmergencyAlert(alert);

  return res.json({
    success: true,
    message: 'Alerta transmitida exitosamente a todos los clientes del canal /stream y WebSocket.',
    alertId: alert.alertId,
    timestamp: alert.timestamp,
    activeSseListeners: sseClients.size,
    activeWsListeners: wsClients.size
  });
});

// GET /stream/alerts: Fetch latest alerts as JSON
app.get('/stream/alerts', (_req: Request, res: Response) => {
  res.json({
    region: 'Valle del Cauca / Cali (Colombia)',
    timestamp: new Date().toISOString(),
    activeSseListeners: sseClients.size,
    totalAlerts: recentAlerts.length,
    alerts: recentAlerts
  });
});

// GET /stream/info: Complete metadata & documentation about the stream
app.get(['/stream/info', '/api/stream/info'], (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const proto = req.protocol === 'https' ? 'https' : 'http';
  const wsProto = req.protocol === 'https' ? 'wss' : 'ws';

  res.json({
    service: 'NatureIntelligence — Real-Time Alert & Telemetry Stream',
    region: 'Santiago de Cali & Valle del Cauca, Colombia',
    streamEndpoint: `${proto}://${host}/stream`,
    wsEndpoint: `${wsProto}://${host}/stream`,
    alternateWsEndpoint: `${wsProto}://${host}/ws`,
    stats: {
      activeSseListeners: sseClients.size,
      activeWsListeners: wsClients.size,
      uptimeSeconds: Math.floor(process.uptime()),
      cachedAlertsCount: recentAlerts.length
    },
    channels: {
      alerts: 'Alertas de emergencias, boletines CAP y despachos de Bomberos Cali (X-1)',
      telemetry: 'Lecturas en tiempo real de estaciones IoT CVC y DAGRD (PM2.5, CO, Temperatura, Viento Pacífico)',
      incidents: 'Detección satelital FIRMS/VIIRS y actualización de focos activos',
      analysis: 'Stream de inferencia diagnóstica con OpenRouter AI (token por token)',
      all: 'Canal unificado con todas las tramas y alertas'
    },
    curlExample: `curl -N -H "Accept: text/event-stream" "${proto}://${host}/stream"`,
    javascriptExample: `const es = new EventSource("${proto}://${host}/stream?channel=alerts"); es.onmessage = (e) => console.log(JSON.parse(e.data));`,
    pythonExample: `import requests; r = requests.get("${proto}://${host}/stream", stream=True); [print(line) for line in r.iter_lines() if line]`
  });
});

// WebSocket connection lifecycle
wss.on('connection', (ws: WebSocket, req) => {
  const clientId = `ws_${Math.random().toString(36).substring(2, 9)}`;
  const clientIp = req.socket.remoteAddress || 'unknown';

  const metadata: ClientMetadata = {
    id: clientId,
    ws,
    ip: clientIp,
    connectedAt: new Date(),
    subscribedChannels: new Set(['all'])
  };

  wsClients.set(ws, metadata);

  // Send initial welcome message
  ws.send(
    JSON.stringify({
      channel: 'system',
      type: 'CONNECTION_ESTABLISHED',
      clientId,
      timestamp: new Date().toISOString(),
      channels: ['alerts', 'telemetry', 'incidents', 'analysis', 'all'],
      openRouterConfigured: Boolean(OPENROUTER_API_KEY),
      activeSensors: CALI_SENSORS_STATE.map((s) => s.id),
      recentAlertsCount: recentAlerts.length,
      message: 'NatureIntelligence Real-Time Stream Gateway conectado exitosamente.'
    })
  );

  // Send latest alert immediately to WS client
  if (recentAlerts.length > 0) {
    ws.send(
      JSON.stringify({
        channel: 'alerts',
        type: 'INITIAL_ACTIVE_ALERTS',
        timestamp: new Date().toISOString(),
        alerts: recentAlerts.slice(0, 3)
      })
    );
  }

  // Handle incoming messages
  ws.on('message', async (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage.toString());

      switch (msg.type) {
        case 'ping':
          ws.send(
            JSON.stringify({
              type: 'pong',
              channel: 'system',
              timestamp: new Date().toISOString()
            })
          );
          break;

        case 'subscribe':
          if (Array.isArray(msg.channels)) {
            metadata.subscribedChannels.clear();
            msg.channels.forEach((ch: string) => metadata.subscribedChannels.add(ch));
          } else if (typeof msg.channel === 'string') {
            metadata.subscribedChannels.add(msg.channel);
          }
          ws.send(
            JSON.stringify({
              channel: 'system',
              type: 'SUBSCRIPTION_UPDATED',
              subscribedChannels: Array.from(metadata.subscribedChannels)
            })
          );
          break;

        case 'publish_alert':
          if (msg.alert) {
            emitEmergencyAlert(msg.alert);
            ws.send(
              JSON.stringify({
                channel: 'system',
                type: 'ALERT_PUBLISHED_ACK',
                alertId: msg.alert.alertId
              })
            );
          }
          break;

        case 'publish_telemetry':
          if (msg.sensor) {
            broadcastToChannel(
              'telemetry',
              {
                type: 'EXTERNAL_SENSOR_INGESTED',
                source: metadata.id,
                sensor: msg.sensor
              },
              ws
            );
            ws.send(
              JSON.stringify({
                channel: 'system',
                type: 'INGEST_ACK',
                sensorId: msg.sensor.id || 'custom',
                status: 'broadcasted'
              })
            );
          }
          break;

        case 'request_ai_stream':
          await handleOpenRouterAiStream(ws, msg);
          break;

        default:
          ws.send(
            JSON.stringify({
              channel: 'system',
              type: 'INFO',
              echo: msg
            })
          );
      }
    } catch (err: any) {
      ws.send(
        JSON.stringify({
          channel: 'system',
          type: 'ERROR',
          error: 'Formato de mensaje JSON inválido',
          details: err.message
        })
      );
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
    wsClients.delete(ws);
  });
});

/**
 * Executes a streaming call to OpenRouter and streams chunks via WebSocket in real-time
 */
async function handleOpenRouterAiStream(ws: WebSocket, requestPayload: any) {
  const streamId = `stream_${Date.now()}`;
  const model = safeAiModel(requestPayload.model);
  const prompt = String(
    requestPayload.prompt ||
      'Realiza un diagnóstico táctico inmediato del incendio forestal en el Cerro de las Tres Cruces de Cali con vector de viento WNW hacia Bataclán.'
  ).slice(0, 4_000);

  ws.send(
    JSON.stringify({
      channel: 'analysis',
      type: 'STREAM_START',
      streamId,
      model,
      timestamp: new Date().toISOString()
    })
  );

  if (!OPENROUTER_API_KEY) {
    ws.send(
      JSON.stringify({
        channel: 'analysis',
        type: 'STREAM_ERROR',
        streamId,
        error: 'OPENROUTER_API_KEY no está configurada; la inferencia externa está deshabilitada.'
      })
    );
    return;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://natureintelligence.ai',
        'X-Title': 'NatureIntelligence - Cali Forest Fire Detection',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `Eres el Oficial Técnico de Inteligencia Geoespacial y Despacho Forestal de Bomberos Santiago de Cali y CVC Valle del Cauca.
Analizas telemetría satelital (NASA FIRMS, VIIRS, MODIS) y estaciones IoT terrestres en tiempo real.
Emite un reporte táctico estructurado en:
1. DIAGNÓSTICO TÁCTICO IN-SITU (Cerro / Sector de Cali).
2. DINÁMICA DE FUEGO Y VIENTO (Viento del Pacífico, velocidad y dirección).
3. AMENAZAS A INFRAESTRUCTURA URBANA Y BIODIVERSIDAD.
4. RECOMENDACIONES DE DESPACHO (Bomberos Cali X-1, FAC Bambi Bucket, DAGRD).
5. ALERTA CAP PARA RADIODIFUSIÓN Y CELULARES.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: true,
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      ws.send(
        JSON.stringify({
          channel: 'analysis',
          type: 'STREAM_ERROR',
          streamId,
          status: response.status,
          error: `OpenRouter API error: ${errorText}`
        })
      );
      return;
    }

    if (!response.body) {
      ws.send(
        JSON.stringify({
          channel: 'analysis',
          type: 'STREAM_ERROR',
          streamId,
          error: 'No readable stream available in OpenRouter response'
        })
      );
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed === 'data: [DONE]') {
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          try {
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;

            if (deltaContent) {
              accumulatedText += deltaContent;
              const chunkMessage = {
                channel: 'analysis',
                type: 'STREAM_CHUNK',
                streamId,
                chunk: deltaContent,
                accumulatedLength: accumulatedText.length,
                timestamp: new Date().toISOString()
              };

              ws.send(JSON.stringify(chunkMessage));
              broadcastToChannel('analysis', chunkMessage, ws);
            }
          } catch (e) {
            // ignore partial json
          }
        }
      }
    }

    const completeMessage = {
      channel: 'analysis',
      type: 'STREAM_COMPLETE',
      streamId,
      model,
      totalLength: accumulatedText.length,
      fullText: accumulatedText,
      timestamp: new Date().toISOString()
    };

    ws.send(JSON.stringify(completeMessage));
    broadcastToChannel('analysis', completeMessage, ws);
  } catch (error: any) {
    ws.send(
      JSON.stringify({
        channel: 'analysis',
        type: 'STREAM_ERROR',
        streamId,
        error: error.message || 'Error processing AI stream'
      })
    );
  }
}

// REST API Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'NatureIntelligence Real-Time Stream Gateway',
    region: 'Valle del Cauca / Cali (Colombia)',
    uptimeSeconds: Math.floor(process.uptime()),
    connectedWsClients: wsClients.size,
    connectedSseClients: sseClients.size,
    openRouterConfigured: Boolean(OPENROUTER_API_KEY),
    availableChannels: ['alerts', 'telemetry', 'incidents', 'analysis', 'all'],
    endpoints: {
      sseStream: '/stream',
      websocket: '/ws',
      alerts: '/api/alerts',
      sensors: '/api/sensors',
      verify: '/api/verify',
      docs: '/api/docs'
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/alerts: Clean REST endpoint for other projects to fetch current alerts with AI decision filtering
app.get('/api/alerts', (req: Request, res: Response) => {
  const decisionFilter = (req.query.decision || req.query.filter || 'all') as string;
  const minConfidence = req.query.min_confidence ? Number(req.query.min_confidence) : 0;

  let filtered = [...recentAlerts];

  if (decisionFilter === 'confirmed') {
    filtered = filtered.filter((a) => a.aiDecision?.decision === 'DISPATCH_CONFIRMED');
  } else if (decisionFilter === 'discarded') {
    filtered = filtered.filter((a) => a.aiDecision?.decision === 'DISCARDED_FALSE_POSITIVE');
  } else if (decisionFilter === 'monitored') {
    filtered = filtered.filter((a) => a.aiDecision?.decision === 'EARLY_WARNING_MONITOR');
  }

  if (minConfidence > 0) {
    filtered = filtered.filter((a) => (a.aiDecision?.confidence || 0) >= minConfidence);
  }

  const confirmedCount = recentAlerts.filter((a) => a.aiDecision?.decision === 'DISPATCH_CONFIRMED').length;
  const discardedCount = recentAlerts.filter((a) => a.aiDecision?.decision === 'DISCARDED_FALSE_POSITIVE').length;
  const monitoredCount = recentAlerts.filter((a) => a.aiDecision?.decision === 'EARLY_WARNING_MONITOR').length;
  const totalSavedCop = recentAlerts.reduce((acc, a) => acc + (a.aiDecision?.resourcesSavedEstimateCop || 0), 0);

  res.json({
    success: true,
    region: 'Santiago de Cali & Valle del Cauca',
    filterApplied: decisionFilter,
    decisionSummary: {
      totalAnalyzed: recentAlerts.length,
      confirmedDispatches: confirmedCount,
      discardedFalsePositives: discardedCount,
      monitoredSmoldering: monitoredCount,
      totalResourcesSavedCop: totalSavedCop
    },
    total: filtered.length,
    alerts: filtered,
    streamUrl: '/stream?channel=alerts',
    timestamp: new Date().toISOString()
  });
});

// POST /api/alerts/evaluate-ai: AI Decision Engine endpoint for external clients (Drones, Citizen reports, Satellites)
app.post('/api/alerts/evaluate-ai', (req: Request, res: Response) => {
  const {
    sector = 'Ladera de Cali',
    frp = 35.0,
    pm25 = 95.0,
    co = 5.0,
    windSpeed = 22.0,
    windDirection = 'WNW',
    slopeDeg = 20,
    isAgriculturalZone = false,
    isIndustrialPark = false
  } = req.body || {};

  const evaluatedRules: string[] = [];
  let decision: 'DISPATCH_CONFIRMED' | 'DISCARDED_FALSE_POSITIVE' | 'EARLY_WARNING_MONITOR';
  let confidence: number;
  let reasoning: string;
  let tacticalAction: string;
  let resourcesSavedEstimateCop = 0;

  // RULE 1: Agricultural sugarcane burn on flat land
  if (isAgriculturalZone || (slopeDeg <= 5 && frp < 30 && ['NE', 'E', 'ESE'].includes(windDirection))) {
    decision = 'DISCARDED_FALSE_POSITIVE';
    confidence = 96.5;
    reasoning = `Foco en zona agrícola plana (pendiente ${slopeDeg}°): FRP moderado (${frp} MW) y viento en dirección al valle. Se descarta riesgo para infraestructura urbana de Cali.`;
    tacticalAction = 'NINGUNA. Quema agrícola autorizada de caña de azúcar descartada por la IA.';
    evaluatedRules.push('ZONIFICACION_AGRICOLA_CANA', 'PENDIENTE_PLANA_0_5_DEG', 'FRP_BAJO_RESIDUAL');
    resourcesSavedEstimateCop = 1850000;
  }
  // RULE 2: Industrial flare
  else if (isIndustrialPark) {
    decision = 'DISCARDED_FALSE_POSITIVE';
    confidence = 98.9;
    reasoning = `Emisión térmica recurrente en polígono industrial registrado. Sin dispersión de humo de biomasa forestal.`;
    tacticalAction = 'NINGUNA. Punto caliente industrial filtrado automáticamente.';
    evaluatedRules.push('POLIGONO_CATASTRAL_INDUSTRIAL', 'EMISION_TERMICA_CONOCIDA');
    resourcesSavedEstimateCop = 1850000;
  }
  // RULE 3: Smoldering fire under canopy
  else if (frp < 10 && co > 18.0) {
    decision = 'EARLY_WARNING_MONITOR';
    confidence = 88.4;
    reasoning = `Concentración de CO elevada (${co} ppm) con FRP satelital bajo o nulo. Indica fuego latente bajo dosel arbóreo en bosque de ladera o niebla.`;
    tacticalAction = 'Despliegue de cuadrilla de guardaparques con bombas de espalda para verificación terrestre.';
    evaluatedRules.push('CO_ELEVADO_COMBUSTION_INCOMPLETA', 'FRP_ATENUADO_POR_FOLLAJE');
  }
  // RULE 4: Confirmed wildfire with urban threat
  else {
    decision = 'DISPATCH_CONFIRMED';
    confidence = Math.min(99.2, 85 + (frp / 10) + (windSpeed / 5));
    reasoning = `Frente térmico activo con FRP de ${frp} MW en pendiente de ${slopeDeg}° con vientos de ${windSpeed} km/h (${windDirection}) empujando hacia ladera urbana. Despacho urgente de bomberos requerido.`;
    tacticalAction = 'Despacho prioritario de Máquinas extintoras de Bomberos Cali y cortafuegos en cota crítica.';
    evaluatedRules.push('PENDIENTE_ACELERA_PROPAGACION', 'VIENTO_HACIA_ZONA_RESIDENCIAL', 'PICO_PARTICULAS_PM25');
  }

  const result = {
    success: true,
    evaluationId: `AI-DEC-${Date.now().toString(36).toUpperCase()}`,
    sector,
    decision,
    confidence,
    reasoning,
    evaluatedRules,
    tacticalAction,
    resourcesSavedEstimateCop: resourcesSavedEstimateCop > 0 ? resourcesSavedEstimateCop : undefined,
    timestamp: new Date().toISOString()
  };

  // Broadcast to ai_decisions SSE channel
  broadcastToChannel('alerts', {
    type: 'AI_FILTERING_DECISION',
    result
  });

  return res.json(result);
});

// POST /api/alerts: Clean REST endpoint for other projects to create / publish an alert
app.post('/api/alerts', (req: Request, res: Response) => {
  const body = req.body || {};
  const validationErrors = validateAlertPayload(body);
  if (validationErrors.length > 0) {
    return res.status(422).json({ success: false, error: 'Payload de alerta inválido', fields: validationErrors });
  }

  const alert: FireEmergencyAlert = {
    alertId: body.alertId || `ALR-EXT-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    sector: body.sector || 'Cali / Valle del Cauca',
    region: body.region || 'Santiago de Cali',
    country: 'Colombia (Valle del Cauca)',
    riskLevel: body.riskLevel ?? 'HIGH',
    category: body.category ?? 'WILDFIRE',
    headline: body.headline || 'Alerta de incendio reportada por aplicación externa',
    description: body.description || 'Reporte recibido vía REST API /api/alerts.',
    windSpeedKmh: finiteNumber(body.windSpeedKmh, 25, 0, 250),
    windDirection: body.windDirection || 'WNW',
    pm25UgM3: finiteNumber(body.pm25UgM3, 120, 0, 10_000),
    frpMw: finiteNumber(body.frpMw, 45.0, 0, 100_000),
    threatenedAssets: stringArray(body.threatenedAssets, ['Zona de ladera y vegetación en observación']),
    tacticalAction: body.tacticalAction || 'Verificación en terreno por brigada forestal de Bomberos Cali.',
    capNotice: body.capNotice || 'ALERTA PREVENTIVA: Se reporta condición de riesgo de incendio en Cali.',
    radioDispatch: body.radioDispatch || 'Central Bomberos Cali a Móviles: Unidad de verificación en desplazamiento.'
  };

  emitEmergencyAlert(alert);

  return res.status(201).json({
    success: true,
    message: 'Alerta creada y transmitida a /stream',
    alert
  });
});

// GET /api/sensors: Clean REST endpoint for other projects to fetch live IoT stations
app.get('/api/sensors', (_req: Request, res: Response) => {
  res.json({
    success: true,
    region: 'Santiago de Cali & Valle del Cauca',
    total: CALI_SENSORS_STATE.length,
    sensors: CALI_SENSORS_STATE,
    timestamp: new Date().toISOString()
  });
});

// POST /api/sensors/ingest: Ingest telemetry from physical IoT hardware (ESP32, Arduino, LoRaWAN, etc.)
app.post('/api/sensors/ingest', (req: Request, res: Response) => {
  const body = req.body || {};
  if (!isRecord(body) || typeof body.id !== 'string' || body.id.trim().length === 0 || body.id.length > 128) {
    return res.status(422).json({ error: 'id es obligatorio y debe ser un texto de máximo 128 caracteres' });
  }

  const numericFields: Record<string, [number, number]> = {
    pm25: [0, 10_000],
    co: [0, 1_000],
    temp: [-80, 100],
    humidity: [0, 100],
    windSpeed: [0, 250]
  };
  const sensorErrors: string[] = [];
  Object.entries(numericFields).forEach(([field, [min, max]]) => {
    if (body[field] === undefined || body[field] === null || body[field] === '') return;
    const parsed = Number(body[field]);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      sensorErrors.push(`${field} debe ser un número entre ${min} y ${max}`);
    }
  });
  if (sensorErrors.length > 0) {
    return res.status(422).json({ error: 'Telemetría inválida', fields: sensorErrors });
  }

  const id = body.id.trim();
  const name = typeof body.name === 'string' ? body.name.slice(0, 160) : undefined;
  const location = typeof body.location === 'string' ? body.location.slice(0, 240) : undefined;
  const pm25 = finiteNumber(body.pm25, 15, 0, 10_000);
  const co = finiteNumber(body.co, 2.0, 0, 1_000);
  const temp = finiteNumber(body.temp, 28, -80, 100);
  const humidity = finiteNumber(body.humidity, 45, 0, 100);
  const windSpeed = finiteNumber(body.windSpeed, 12, 0, 250);
  const windDir = typeof body.windDir === 'string' ? body.windDir.slice(0, 16) : 'WNW';
  const flame = body.flame === true || body.flame === 'true';

  const isCritical = pm25 > 180 || co > 15 || flame;
  const isElevated = pm25 > 60 || co > 8;
  const status = isCritical ? 'critical' : isElevated ? 'elevated' : 'normal';

  const existingIndex = CALI_SENSORS_STATE.findIndex((s) => s.id === id);
  const updatedSensor = {
    id,
    name: name || `Estación ${id}`,
    location: location || 'Santiago de Cali (Ladera)',
    pm25: Number(pm25),
    co: Number(co),
    temp: Number(temp),
    humidity: Number(humidity),
    windSpeed: Number(windSpeed),
    windDir: String(windDir),
    flame: Boolean(flame),
    status
  };

  if (existingIndex >= 0) {
    CALI_SENSORS_STATE[existingIndex] = updatedSensor;
  } else {
    CALI_SENSORS_STATE.push(updatedSensor);
  }

  // Broadcast to telemetry channel on SSE and WebSocket
  broadcastToChannel('telemetry', {
    type: 'SENSOR_UPDATE',
    sensor: updatedSensor,
    timestamp: new Date().toISOString()
  });

  return res.status(200).json({
    success: true,
    message: 'Telemetría de sensor IoT ingerida y transmitida a /stream',
    sensor: updatedSensor
  });
});

// POST /api/simulate/event: Sandbox testing endpoint to inject simulated fire/sensor scenarios
app.post('/api/simulate/event', (req: Request, res: Response) => {
  const { scenario = 'CRITICAL_FIRE_TRES_CRUCES' } = req.body || {};
  const allowedScenarios = new Set([
    'CRITICAL_FIRE_TRES_CRUCES',
    'SMOLDER_FARALLONES',
    'SUGARCANE_BURN_PALMIRA_FALSE_POSITIVE',
    'RESET_NORMAL'
  ]);
  if (!allowedScenarios.has(scenario)) {
    return res.status(422).json({ success: false, error: 'Escenario de simulación no reconocido' });
  }

  let generatedAlert: FireEmergencyAlert | null = null;
  let affectedSensorId = '';

  if (scenario === 'CRITICAL_FIRE_TRES_CRUCES') {
    affectedSensorId = 'iot-cali-tres-cruces-01';
    const s = CALI_SENSORS_STATE.find((x) => x.id === affectedSensorId);
    if (s) {
      s.pm25 = 320;
      s.co = 28.5;
      s.temp = 36.4;
      s.humidity = 14;
      s.windSpeed = 38;
      s.flame = true;
      s.status = 'critical';
    }

    generatedAlert = {
      alertId: `SIM-TC-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      sector: 'Cerro de las Tres Cruces & Bataclán (SIMULACIÓN)',
      region: 'Santiago de Cali / Ladera Noroccidental',
      country: 'Colombia (Valle del Cauca)',
      riskLevel: 'CRITICAL',
      category: 'WILDFIRE',
      headline: 'SIMULACRO TÁCTICO: Ráfagas del Pacífico propagan foco hacia Ecoparque Bataclán',
      description: 'Datos simulados de prueba: Pico de PM2.5 a 320 µg/m³ y CO a 28.5 ppm.',
      windSpeedKmh: 38,
      windDirection: 'WNW',
      pm25UgM3: 320,
      frpMw: 185.0,
      threatenedAssets: ['Ecoparque Bataclán', 'Barrio Juanambú (Comuna 2)'],
      tacticalAction: 'Despacho de simulación para máquinas forestales de Bomberos Cali.',
      capNotice: 'SIMULACRO OPERATIVO: Pruebas de integración de la API NatureIntelligence.',
      radioDispatch: 'Central X-1: Atención unidades, ejercicio de simulación de incendio forestal.'
    };
  } else if (scenario === 'SMOLDER_FARALLONES') {
    affectedSensorId = 'iot-farallones-penas-blancas';
    const s = CALI_SENSORS_STATE.find((x) => x.id === affectedSensorId);
    if (s) {
      s.pm25 = 240;
      s.co = 29.1;
      s.humidity = 28;
      s.flame = false;
      s.status = 'critical';
    }

    generatedAlert = {
      alertId: `SIM-FAR-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      sector: 'PNN Farallones de Cali — Peñas Blancas (SIMULACIÓN)',
      region: 'PNN Farallones / Cuenca Río Cali',
      country: 'Colombia (Valle del Cauca)',
      riskLevel: 'HIGH',
      category: 'SMOLDERING',
      headline: 'SIMULACRO: Foco bajo dosel arbóreo en Farallones detectado por CO elevado',
      description: 'Ejercicio de simulación: Guardaparques activan patrullaje con bombas de espalda.',
      windSpeedKmh: 20,
      windDirection: 'WSW',
      pm25UgM3: 240,
      frpMw: 0,
      threatenedAssets: ['Cuenca alta del Río Cali', 'Bosque de Niebla'],
      tacticalAction: 'Verificación de cuadrilla de guardaparques y brigada forestal.',
      capNotice: 'SIMULACRO: Ejercicio preventivo en Farallones de Cali.',
      radioDispatch: 'Guardaparques Farallones: Desplazamiento a sector Peñas Blancas para verificación.'
    };
  } else if (scenario === 'SUGARCANE_BURN_PALMIRA_FALSE_POSITIVE') {
    generatedAlert = {
      alertId: `SIM-SUG-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      sector: 'Valle Geográfico del Río Cauca (Palmira / Rozo) (SIMULACIÓN)',
      region: 'Valle del Cauca (Zona Plana)',
      country: 'Colombia',
      riskLevel: 'LOW',
      category: 'AGRICULTURAL_BURN',
      headline: 'DESCARTE DE FALSO POSITIVO: Quema Agrícola Controlada de Caña de Azúcar',
      description: 'La IA analiza pendiente 0°, FRP bajo (12 MW) y viento lejos de Cali: NO se despachan bomberos.',
      windSpeedKmh: 14,
      windDirection: 'NE',
      pm25UgM3: 45,
      frpMw: 12.0,
      threatenedAssets: ['Lotes agrícolas de caña en planicie'],
      tacticalAction: 'Sin despacho. Clasificado automáticamente como Quema Agrícola Programada.',
      capNotice: 'INFORMATIVO: Actividad agrícola de quema autorizada.',
      radioDispatch: 'Central Bomberos: Novedad descartada por sistema de IA.'
    };
  } else if (scenario === 'RESET_NORMAL') {
    // Reset all sensors to normal levels
    CALI_SENSORS_STATE.forEach((s) => {
      s.pm25 = Math.floor(Math.random() * 20 + 15);
      s.co = parseFloat((Math.random() * 2 + 1.2).toFixed(1));
      s.temp = 28.5;
      s.humidity = 55;
      s.windSpeed = 16;
      s.flame = false;
      s.status = 'normal';
    });
  }

  if (generatedAlert) {
    emitEmergencyAlert(generatedAlert);
  }

  // Broadcast sensor update
  broadcastToChannel('telemetry', {
    type: 'SENSORS_BATCH_REFRESH',
    sensors: CALI_SENSORS_STATE,
    timestamp: new Date().toISOString()
  });

  return res.json({
    success: true,
    scenario,
    message: scenario === 'RESET_NORMAL' ? 'Todos los sensores restablecidos a valores normales' : 'Escenario de prueba inyectado exitosamente a /stream',
    alert: generatedAlert,
    currentSensors: CALI_SENSORS_STATE,
    timestamp: new Date().toISOString()
  });
});

// POST /api/verify: AI Verification as a Service for third-party apps
app.post('/api/verify', async (req: Request, res: Response) => {
  const { sector = 'Ladera de Cali', frp = 50, pm25 = 150, windSpeed = 25, windDirection = 'WNW' } = req.body || {};

  const isCritical = frp > 50 || pm25 > 200;
  const riskLevel = isCritical ? 'CRITICAL' : frp > 20 || pm25 > 80 ? 'HIGH' : 'MODERATE';

  res.json({
    success: true,
    sector,
    riskLevel,
    verified: isCritical || riskLevel === 'HIGH',
    diagnosis: `Evaluación de riesgo en ${sector}: FRP de ${frp} MW y PM2.5 de ${pm25} µg/m³ con viento del ${windDirection} a ${windSpeed} km/h indican ${
      isCritical ? 'incendio activo de cobertura vegetal con alta probabilidad de propagación.' : 'foco en evolución o condición de sequedad elevada.'
    }`,
    tacticalAction: isCritical
      ? 'Despacho urgente de unidades de extinción y evaluación de apoyo aéreo.'
      : 'Monitoreo continuo de cámaras térmicas y patrullaje preventivo.',
    timestamp: new Date().toISOString()
  });
});

// POST /api/whatsapp/dispatch: Automated WhatsApp Bot webhook dispatcher
app.post('/api/whatsapp/dispatch', (req: Request, res: Response) => {
  const body = req.body || {};
  const dispatchId = `WA-DISPATCH-${Date.now().toString(36).toUpperCase()}`;

  // Broadcast to stream so connected web viewers see the automated dispatch
  broadcastToChannel('alerts', {
    type: 'WHATSAPP_DISPATCH_TRIGGERED',
    dispatchId,
    recipient: body.recipientGroup || 'Central X-1 Bomberos Cali',
    sector: body.sector || 'Cerro de las Tres Cruces',
    riskLevel: body.riskLevel || 'CRITICAL',
    headline: body.headline || 'Despacho forestal prioritario',
    timestamp: new Date().toISOString()
  });

  res.status(200).json({
    success: true,
    status: 'SIMULATED',
    dispatchId,
    recipient: body.recipientGroup,
    message: 'Despacho simulado localmente. No se envió ningún mensaje a WhatsApp.',
    timestamp: new Date().toISOString()
  });
});

// GET /api/goes16: NOAA GOES-16 Geostationary Detections
app.get('/api/goes16', (_req: Request, res: Response) => {
  res.json({
    success: true,
    satellite: 'NOAA GOES-16 (GOES-East)',
    sensor: 'Advanced Baseline Imager (ABI)',
    cadence: 'Cada 10 a 15 minutos (Mesoscala / Full Disk)',
    primaryBand: 'Banda 7 (Infrarrojo de Onda Corta 3.9 µm)',
    totalDetections: 3,
    timestamp: new Date().toISOString(),
    detections: [
      {
        id: 'goes16-cali-abi-701',
        latitude: 3.4712,
        longitude: -76.5428,
        scanTime: 'Hace 4 minutos (14:30 UTC)',
        firePowerMW: 92.4,
        fireTemperatureK: 378.2,
        confidence: 'HIGH'
      },
      {
        id: 'goes16-cali-abi-702',
        latitude: 3.4320,
        longitude: -76.5655,
        scanTime: 'Hace 4 minutos (14:30 UTC)',
        firePowerMW: 68.1,
        fireTemperatureK: 362.5,
        confidence: 'HIGH'
      }
    ]
  });
});

// GET /api/cameras: PTZ Thermal Cameras in Cali
app.get('/api/cameras', (_req: Request, res: Response) => {
  res.json({
    success: true,
    total: 4,
    model: 'YOLOv8-Wildfire Edge',
    timestamp: new Date().toISOString(),
    cameras: [
      {
        id: 'cam-ptz-tres-cruces-01',
        name: 'Cámara PTZ Térmica 360° — Cima Tres Cruces',
        location: 'Cali Ladera Norte',
        elevationM: 1465,
        status: 'ALARM',
        maxTempC: 485,
        ambientTempC: 34,
        fps: 30,
        detections: ['Columna de Humo en Cresta (98.4%)', 'Frente Térmico Infrarrojo (96.1%)']
      },
      {
        id: 'cam-ptz-cristo-rey-02',
        name: 'Cámara FLIR — Torre Mirador Cristo Rey',
        location: 'Los Cristales / Bellavista',
        elevationM: 1435,
        status: 'ALARM',
        maxTempC: 395,
        ambientTempC: 32,
        fps: 30,
        detections: ['Llama Activa Ladera Occidental (94.7%)']
      }
    ]
  });
});

// POST /api/simulate/spread: Rothermel Wildfire Propagation Simulation
const SPREAD_FUEL_FACTORS: Record<string, number> = {
  EXTREME: 1.8,
  HIGH: 1.3,
  MODERATE: 0.8
};

app.post('/api/simulate/spread', (req: Request, res: Response) => {
  const body = req.body || {};
  const windSpeed = finiteNumber(body.windSpeed, 30, 0, 250);
  const slopeDeg = finiteNumber(body.slopeDeg, 30, 0, 60);
  const fuelMoisture = typeof body.fuelMoisture === 'string' && body.fuelMoisture in SPREAD_FUEL_FACTORS
    ? body.fuelMoisture
    : undefined;

  if (!fuelMoisture) {
    return res.status(422).json({
      success: false,
      error: 'fuelMoisture debe ser uno de: EXTREME, HIGH, MODERATE',
      fields: ['fuelMoisture']
    });
  }

  const windDirection = typeof body.windDirection === 'string' ? body.windDirection.slice(0, 8) : undefined;
  const windFactor = Math.pow(windSpeed / 10, 1.4);
  const slopeFactor = 1 + 5.275 * Math.pow(Math.tan((slopeDeg * Math.PI) / 180), 2);
  const fuelFactor = SPREAD_FUEL_FACTORS[fuelMoisture];

  // Same floor as the browser-side simulator, so both models agree at calm wind
  const rateOfSpreadMpm = Math.max(2, parseFloat((4.5 * windFactor * slopeFactor * fuelFactor).toFixed(1)));
  const rateOfSpreadKmh = (rateOfSpreadMpm * 60) / 1000;
  const timeToUrbanMin = rateOfSpreadMpm > 0 ? Math.round(1400 / rateOfSpreadMpm) : null;

  res.json({
    success: true,
    model: 'Rothermel Wildfire Spread (Surface Model)',
    inputs: { windSpeed, slopeDeg, fuelMoisture, ...(windDirection ? { windDirection } : {}) },
    results: {
      rateOfSpreadMetersPerMinute: rateOfSpreadMpm,
      rateOfSpreadKmPerHour: parseFloat(rateOfSpreadKmh.toFixed(2)),
      flameLengthMeters: parseFloat((0.0775 * Math.pow(rateOfSpreadMpm * 18, 0.46)).toFixed(1)),
      timeToUrbanPerimeterMinutes: timeToUrbanMin,
      isochronesEstimated: {
        min15Meters: Math.round(rateOfSpreadMpm * 15),
        min30Meters: Math.round(rateOfSpreadMpm * 30),
        min45Meters: Math.round(rateOfSpreadMpm * 45),
        min60Meters: Math.round(rateOfSpreadMpm * 60)
      }
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/docs: Clean OpenAPI / developer documentation in JSON
app.get(['/api', '/api/docs'], (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const proto = req.protocol === 'https' ? 'https' : 'http';

  res.json({
    name: 'NatureIntelligence API',
    description: 'API en tiempo real para detección, verificación y despacho de incendios forestales en Cali & Valle del Cauca.',
    baseUrl: `${proto}://${host}`,
    endpoints: [
      {
        path: '/stream',
        method: 'GET',
        type: 'Server-Sent Events (SSE)',
        description: 'Transmisión continua de eventos y alertas en tiempo real.',
        queryParameters: { channel: 'alerts | telemetry | all' },
        example: `curl -N -H "Accept: text/event-stream" "${proto}://${host}/stream?channel=alerts"`
      },
      {
        path: '/api/alerts',
        method: 'GET',
        type: 'REST JSON',
        description: 'Obtiene el listado de alertas de emergencias activas.',
        example: `curl -s "${proto}://${host}/api/alerts"`
      },
      {
        path: '/api/alerts',
        method: 'POST',
        type: 'REST JSON',
        description: 'Publica una nueva alerta desde tu sistema externo.',
        example: `curl -X POST "${proto}://${host}/api/alerts" -H "Content-Type: application/json" -d '{"sector":"Cristo Rey","riskLevel":"CRITICAL","headline":"Fuego activo"}'`
      },
      {
        path: '/api/sensors',
        method: 'GET',
        type: 'REST JSON',
        description: 'Obtiene las lecturas en tiempo real de las estaciones IoT de Cali.',
        example: `curl -s "${proto}://${host}/api/sensors"`
      },
      {
        path: '/api/verify',
        method: 'POST',
        type: 'REST JSON',
        description: 'Verificación analítica inmediata de parámetros de incendio.',
        example: `curl -X POST "${proto}://${host}/api/verify" -H "Content-Type: application/json" -d '{"sector":"Tres Cruces","frp":85,"pm25":280}'`
      },
      {
        path: '/ws',
        method: 'WS',
        type: 'WebSocket',
        description: 'Conexión WebSocket bidireccional para apps interactivas.',
        example: `wscat -c "ws://${host}/ws"`
      }
    ]
  });
});

// REST endpoint to broadcast custom alerts or telemetry from external systems
app.post('/api/stream/broadcast', (req: Request, res: Response) => {
  const { channel = 'alerts', data } = req.body;
  if (!data) {
    return res.status(400).json({ error: 'Falta el campo data' });
  }

  broadcastToChannel(channel, data);
  return res.json({
    success: true,
    broadcastedToWsClients: wsClients.size,
    broadcastedToSseClients: sseClients.size,
    channel,
    timestamp: new Date().toISOString()
  });
});

// Server-Sent Events (SSE) alternative for HTTP-only AI analysis
app.get('/api/analyze/sse', async (req: Request, res: Response) => {
  if (!OPENROUTER_API_KEY) {
    return res.status(503).json({
      success: false,
      error: 'OPENROUTER_API_KEY no está configurada; la inferencia externa está deshabilitada.'
    });
  }

  const prompt = String(req.query.prompt || 'Diagnóstico rápido de incendio en Cali').slice(0, 4_000);
  const model = safeAiModel(req.query.model);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://natureintelligence.ai',
        'X-Title': 'NatureIntelligence',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      })
    });

    if (!response.body) {
      res.write(`data: ${JSON.stringify({ error: 'No stream body' })}\n\n`);
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      res.write(text);
    }
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// Serve frontend with Vite middleware in development or static in production
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`> NatureIntelligence Server & Stream Gateway running on port ${PORT}`);
    console.log(`> HTTP SSE Stream available at: http://localhost:${PORT}/stream`);
    console.log(`> WebSocket Stream available at: ws://localhost:${PORT}/ws and /stream`);
  });
}

startServer();
