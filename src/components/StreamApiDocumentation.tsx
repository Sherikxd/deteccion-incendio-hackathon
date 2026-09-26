import React, { useState } from 'react';
import {
  BookOpen,
  Terminal,
  Code2,
  Copy,
  Check,
  Server,
  Flame,
  Activity,
  Wifi
} from 'lucide-react';
import { copyTextToClipboard } from '../utils/copyToClipboard';

export const StreamApiDocumentation: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'javascript' | 'python' | 'nodejs' | 'golang'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    copyTextToClipboard(text).then((copied) => {
      if (!copied) return;
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const currentHost = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const currentProto = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const streamUrl = `${currentProto}//${currentHost}/stream`;
  const wsUrl = `${currentProto === 'https:' ? 'wss:' : 'ws:'}//${currentHost}/stream`;

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold font-mono tracking-wide text-white">
                  DOCUMENTACIÓN DE INTEGRACIÓN: CANAL /stream
                </h2>
                <p className="text-xs text-slate-400">
                  Especificación de conexión en tiempo real vía Server-Sent Events (SSE) y WebSocket para Cali & Valle del Cauca
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
              HTTP/1.1 & HTTP/2 SSE + WebSockets
            </span>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" />
              <span>1. Endpoint Principal /stream</span>
            </div>
            <div className="font-mono text-white text-xs select-all">
              GET {streamUrl}
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Conexión continua HTTP Server-Sent Events. Compatible de forma nativa con navegadores (EventSource), curl y cualquier lenguaje sin dependencias pesadas.
            </p>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[10px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              <span>2. Emisión de Alertas Externas</span>
            </div>
            <div className="font-mono text-white text-xs select-all">
              POST {streamUrl}
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Permite a drones térmicos, puestos de comando móvil o sensores periféricos inyectar una alerta que se propaga instantáneamente a todos los clientes.
            </p>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[10px] font-mono uppercase text-purple-400 font-bold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              <span>3. Socket Bidireccional</span>
            </div>
            <div className="font-mono text-white text-xs select-all">
              WS {wsUrl}
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Para aplicaciones que requieren bidireccionalidad interactiva: suscripción a subcanales, streaming de IA con OpenRouter y ping/pong.
            </p>
          </div>
        </div>
      </div>

      {/* Code Examples Playground */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100 font-mono">
              Cómo Conectarse al /stream desde Cualquier Aplicación
            </h3>
          </div>

          {/* Language Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {(['curl', 'javascript', 'python', 'nodejs', 'golang'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-1 rounded transition capitalize ${
                  selectedLanguage === lang
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="mt-3 relative">
          <button
            onClick={() => {
              const code = getCodeSnippet(selectedLanguage, streamUrl, wsUrl);
              copyToClipboard(code, `code_${selectedLanguage}`);
            }}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 z-10 transition"
          >
            {copiedKey === `code_${selectedLanguage}` ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedKey === `code_${selectedLanguage}` ? 'Copiado' : 'Copiar Código'}</span>
          </button>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-cyan-200/90 overflow-x-auto leading-relaxed">
            {getCodeSnippet(selectedLanguage, streamUrl, wsUrl)}
          </pre>
        </div>
      </div>

      {/* API Endpoints Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
        <h3 className="font-bold text-sm text-amber-400 font-mono uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span>Matriz de Endpoints y Parámetros del /stream</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="py-2.5 px-3">Método</th>
                <th className="py-2.5 px-3">Ruta</th>
                <th className="py-2.5 px-3">Parámetros / Query</th>
                <th className="py-2.5 px-3">Protocolo</th>
                <th className="py-2.5 px-3">Descripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 text-emerald-400 font-bold">GET</td>
                <td className="py-2.5 px-3 text-white font-bold">/stream</td>
                <td className="py-2.5 px-3 text-amber-300">?channel=alerts|telemetry|incidents|analysis|all</td>
                <td className="py-2.5 px-3 text-cyan-300">HTTP SSE</td>
                <td className="py-2.5 px-3 font-sans">
                  Abre un canal de eventos unidireccional permanente. Emite{' '}
                  <code className="text-amber-300">event: alert</code>,{' '}
                  <code className="text-amber-300">event: sensor_update</code> y{' '}
                  <code className="text-amber-300">event: analysis</code> (más <code>connected</code> e{' '}
                  <code>initial_alerts</code> al conectar).
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 text-amber-400 font-bold">POST</td>
                <td className="py-2.5 px-3 text-white font-bold">/stream</td>
                <td className="py-2.5 px-3 text-slate-400">JSON Body (AlertPayload)</td>
                <td className="py-2.5 px-3 text-cyan-300">HTTP REST</td>
                <td className="py-2.5 px-3 font-sans">
                  Inyecta una alerta de emergencia desde un sistema externo, difundiéndola a todos los clientes conectados al /stream.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 text-emerald-400 font-bold">GET</td>
                <td className="py-2.5 px-3 text-white font-bold">/stream/alerts</td>
                <td className="py-2.5 px-3 text-slate-400">Ninguno</td>
                <td className="py-2.5 px-3 text-cyan-300">JSON Snapshot</td>
                <td className="py-2.5 px-3 font-sans">
                  Retorna el historial reciente de las alertas activas en Cali y Valle del Cauca en formato JSON plano.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 text-emerald-400 font-bold">GET</td>
                <td className="py-2.5 px-3 text-white font-bold">/stream/info</td>
                <td className="py-2.5 px-3 text-slate-400">Ninguno</td>
                <td className="py-2.5 px-3 text-cyan-300">JSON Metadata</td>
                <td className="py-2.5 px-3 font-sans">
                  Estadísticas en vivo, número de escuchas activos, tiempo de actividad y canales soportados.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 text-purple-400 font-bold">WS</td>
                <td className="py-2.5 px-3 text-white font-bold">/stream (o /ws)</td>
                <td className="py-2.5 px-3 text-slate-400">Subprotocolos estándar</td>
                <td className="py-2.5 px-3 text-purple-300">WebSocket</td>
                <td className="py-2.5 px-3 font-sans">
                  Canal dúplex completo para suscripción dinámica, inferencia token a token con OpenRouter y telemetría.
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 text-emerald-400 font-bold">GET</td>
                <td className="py-2.5 px-3 text-white font-bold">/api/health</td>
                <td className="py-2.5 px-3 text-slate-400">Ninguno</td>
                <td className="py-2.5 px-3 text-cyan-300">JSON Health</td>
                <td className="py-2.5 px-3 font-sans">
                  Verificación de disponibilidad de infraestructura (liveness probe).
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-[11px] text-amber-200 font-sans leading-relaxed">
          <strong className="font-mono text-amber-300">Límites operativos:</strong> las solicitudes <code>POST</code>{' '}
          comparten un límite de <strong>60 por minuto e IP</strong> (respuesta <code className="font-mono">429</code>) y
          el canal SSE admite hasta <strong>250 escuchas simultáneas</strong> (respuesta{' '}
          <code className="font-mono">503</code>). Los cuerpos JSON se limitan a 256 kB.
        </div>
      </div>

      {/* Data Model / JSON Payload Specification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Alert JSON Schema */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Flame className="w-4 h-4 text-red-400" />
            <h4 className="font-bold text-sm text-slate-100 font-mono">
              Esquema de Alerta de Incendio (Canal #alerts)
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Estructura JSON emitida cada vez que se detecta o verifica un incendio forestal en Cali o sus alrededores:
          </p>
          <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-200 overflow-x-auto">
{`{
  "channel": "alerts",
  "timestamp": "2026-09-25T15:30:00.000Z",
  "data": {
    "type": "EMERGENCY_ALERT",
    "alert": {
      "alertId": "ALR-CALI-2026-8901",
      "sector": "Cerro de las Tres Cruces & Bataclán",
      "region": "Santiago de Cali / Ladera Noroccidental",
      "riskLevel": "CRITICAL",
      "category": "WILDFIRE",
      "headline": "Incendio con avance rápido a Bataclán",
      "windSpeedKmh": 32,
      "windDirection": "WNW",
      "pm25UgM3": 284,
      "frpMw": 175.2,
      "threatenedAssets": [
        "Ecoparque Bataclán",
        "Sector Juanambú y Granada"
      ],
      "tacticalAction": "Despacho Máquinas 4, 7 y Forestal 1",
      "capNotice": "ALERTA ROJA BOMBEROS CALI: EVITAR ACCESOS...",
      "radioDispatch": "Central Bomberos Cali X-1 a Móviles..."
    }
  }
}`}
          </pre>
          <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
            <code className="text-amber-300 font-mono">riskLevel</code>:{' '}
            <span className="font-mono">CRITICAL | HIGH | MODERATE | LOW</span> ·{' '}
            <code className="text-amber-300 font-mono">category</code>:{' '}
            <span className="font-mono">WILDFIRE | SMOLDERING | AGRICULTURAL_BURN | WEATHER_WARNING | INDUSTRIAL</span>
            {'. El evento SSE se emite como '}
            <code className="text-cyan-300 font-mono">event: alert</code>.
          </p>
        </div>

        {/* Telemetry JSON Schema */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-sm text-slate-100 font-mono">
              Esquema de Telemetría IoT (Canal #telemetry)
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Paquetes periódicos (cada 3.5 segundos) con lecturas físicas de las estaciones de ladera en Cali:
          </p>
          <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-200 overflow-x-auto">
{`{
  "channel": "telemetry",
  "timestamp": "2026-09-25T15:30:04.500Z",
  "data": {
    "type": "SENSOR_UPDATE",
    "sensor": {
      "id": "iot-cali-tres-cruces-01",
      "name": "Estación CVC-01 Mirador Tres Cruces",
      "location": "Cali Ladera Noroccidental (1465 msnm)",
      "pm25": 284.5,
      "co": 22.8,
      "temp": 34.2,
      "humidity": 18,
      "windSpeed": 32.4,
      "windDir": "WNW",
      "flame": true,
      "status": "critical"
    }
  }
}`}
          </pre>
          <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
            Unidades: <span className="font-mono">pm25</span> µg/m³ · <span className="font-mono">co</span> ppm ·{' '}
            <span className="font-mono">temp</span> °C · <span className="font-mono">humidity</span> % ·{' '}
            <span className="font-mono">windSpeed</span> km/h.{' '}
            <span className="font-mono">status</span>: critical | elevated | normal. El evento SSE se emite como{' '}
            <code className="text-cyan-300 font-mono">event: sensor_update</code>.
          </p>
        </div>
      </div>
    </div>
  );
};

export function getCodeSnippet(lang: string, streamUrl: string, wsUrl: string) {
  if (lang === 'curl') {
    return `# 1. Conectarse y escuchar el flujo en vivo de ALERTAS con cURL:
curl -N -H "Accept: text/event-stream" "${streamUrl}?channel=alerts"

# 2. Escuchar TODO el flujo continuo (Alertas + Sensores IoT):
curl -N -H "Accept: text/event-stream" "${streamUrl}?channel=all"

# 3. Emitir una nueva alerta a todos los clientes suscritos:
curl -X POST "${streamUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sector": "Cerro Cristo Rey",
    "riskLevel": "CRITICAL",
    "headline": "Foco activo en ladera de Cristo Rey avanzando a Bellavista",
    "windSpeedKmh": 28,
    "frpMw": 110.5,
    "tacticalAction": "Despacho inmediato de Bomberos Cali Subestación Los Andes"
  }'

# 4. Consultar snapshot de alertas en JSON plano:
curl -s "${streamUrl}/alerts"
`;
  }

  if (lang === 'javascript') {
    return `// Conexión nativa en navegador (Frontend / React / Vue / Angular / Vanilla)
const streamUrl = '${streamUrl}?channel=alerts';

// EventSource mantiene la conexión HTTP abierta automáticamente
const eventSource = new EventSource(streamUrl);

// 1. Confirmación de conexión inicial
eventSource.addEventListener('connected', (event) => {
  const status = JSON.parse(event.data);
  console.log('[*] Conectado a NatureIntelligence /stream:', status);
});

// 2. Escuchar alertas de incendios forestales
// (en este canal también llegan eventos de tipo AI_FILTERING_DECISION o
//  WHATSAPP_DISPATCH_TRIGGERED, que no traen un bloque "alert")
eventSource.addEventListener('alert', (event) => {
  const packet = JSON.parse(event.data);
  const alert = packet.data && packet.data.alert;
  if (!alert) {
    console.log('[EVENTO /stream]', packet.data && packet.data.type, packet.data);
    return;
  }
  
  console.warn(\`🚨 ALERTA [\${alert.riskLevel}]: \${alert.sector}\`);
  console.log('Titular:', alert.headline);
  console.log('Viento:', alert.windSpeedKmh, 'km/h hacia', alert.windDirection);
  console.log('Despacho:', alert.tacticalAction);

  // Mostrar notificación al operador o brigadista
  if (Notification.permission === 'granted') {
    new Notification(\`Incendio en \${alert.sector}\`, { body: alert.headline });
  }
});

// 3. Manejo de reconexión automática en caso de corte de red
eventSource.onerror = (err) => {
  console.error('Error o reconexión en /stream', err);
};
`;
  }

  if (lang === 'python') {
    return `# Instalar si no lo tienes: pip install requests
import requests
import json

STREAM_URL = "${streamUrl}?channel=alerts"

def listen_to_fire_alerts():
    print(f"[*] Conectando a {STREAM_URL}...")
    
    # stream=True mantiene la conexión HTTP abierta indefinidamente
    response = requests.get(STREAM_URL, stream=True, headers={"Accept": "text/event-stream"})
    if not response.ok:
        # 429 = límite de solicitudes, 503 = cupo SSE agotado
        raise SystemExit(f"[!] Error al abrir el stream: HTTP {response.status_code}")
    
    for raw_line in response.iter_lines():
        if not raw_line:
            continue
        line = raw_line.decode('utf-8')
        
        # Procesar líneas de datos SSE ("data: {...}")
        if line.startswith("data: "):
            json_payload = line[6:]
            try:
                packet = json.loads(json_payload)
                
                # Alerta de emergencia recibida
                if packet.get("channel") == "alerts":
                    alert = packet.get("data", {}).get("alert") or {}
                    if not alert:
                        # Otros eventos del canal (AI_FILTERING_DECISION, etc.)
                        continue
                    print(f"\\n🔥 [ALERTA {alert.get('riskLevel')}] {alert.get('sector')}")
                    print(f"   Titular:  {alert.get('headline')}")
                    print(f"   Potencia: {alert.get('frpMw')} MW | Viento: {alert.get('windSpeedKmh')} km/h")
                    print(f"   Despacho: {alert.get('tacticalAction')}")
            except json.JSONDecodeError:
                pass

if __name__ == "__main__":
    listen_to_fire_alerts()
`;
  }

  if (lang === 'nodejs') {
    return `// Node.js (v18+ con fetch nativo)
const streamUrl = '${streamUrl}';

async function monitorCaliFireStream() {
  console.log('[*] Iniciando cliente Node.js para NatureIntelligence /stream...');
  
  const response = await fetch(streamUrl, {
    headers: { 'Accept': 'text/event-stream' }
  });

  // El gateway devuelve 429 si se supera el límite de solicitudes o 503 si no hay cupo SSE
  if (!response.ok) {
    throw new Error(\`No se pudo abrir el stream: HTTP \${response.status}\`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      // Ignora líneas de comentario SSE (p. ej. ": keepalive 1712345") y "event: ..."
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.channel === 'alerts' && data.data?.alert) {
          console.log('[ALERTA CALI]', data.data.alert.sector, '-', data.data.alert.headline);
        }
      } catch (err) {
        // Trama parcial o no JSON: no romper el bucle de lectura
      }
    }
  }
}

monitorCaliFireStream().catch(console.error);
`;
  }

  return `package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

func main() {
	streamURL := "${streamUrl}?channel=alerts"
	fmt.Printf("[*] Conectando cliente Golang al /stream de Cali: %s\\n", streamURL)

	req, _ := http.NewRequest("GET", streamURL, nil)
	req.Header.Set("Accept", "text/event-stream")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadString('\\n')
		if err != nil {
			break
		}

		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "data: ") {
			jsonData := strings.TrimPrefix(line, "data: ")
			var packet map[string]interface{}
			if err := json.Unmarshal([]byte(jsonData), &packet); err == nil {
				fmt.Printf("[EVENTO SSE] %v\\n", packet)
			}
		}
	}
}
`;
}
