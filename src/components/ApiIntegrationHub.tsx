import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Terminal,
  Play,
  Server,
  Zap,
  CheckCircle2,
  ExternalLink,
  Flame,
  Activity,
  Layers,
  Sparkles,
  FileCode2,
  BookOpen,
  FileText
} from 'lucide-react';

export const ApiIntegrationHub: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<'python' | 'javascript' | 'curl'>('python');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Interactive Live Tester state
  const [testEndpoint, setTestEndpoint] = useState<'alerts' | 'sensors' | 'verify' | 'stream_sample'>('alerts');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const proto = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const baseUrl = `${proto}//${host}`;

  const runApiTest = async (endpoint: 'alerts' | 'sensors' | 'verify' | 'stream_sample') => {
    setIsTesting(true);
    setTestResult(null);
    const start = Date.now();

    try {
      if (endpoint === 'alerts') {
        const res = await fetch('/api/alerts');
        const data = await res.json();
        setTestResult(data);
      } else if (endpoint === 'sensors') {
        const res = await fetch('/api/sensors');
        const data = await res.json();
        setTestResult(data);
      } else if (endpoint === 'verify') {
        const res = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sector: 'Cerro de las Tres Cruces',
            frp: 84.5,
            pm25: 284,
            windSpeed: 32,
            windDirection: 'WNW'
          })
        });
        const data = await res.json();
        setTestResult(data);
      } else if (endpoint === 'stream_sample') {
        const res = await fetch('/stream/alerts');
        const data = await res.json();
        setTestResult(data);
      }
      setTestLatency(Date.now() - start);
    } catch (e: any) {
      setTestResult({ error: e.message || 'Error al conectar con la API' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Hero Developer Integration Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold font-mono tracking-wide text-white">
                  INTEGRACIÓN DE LA API EN OTROS PROYECTOS
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conecta cualquier aplicación móvil, web, bot o script de Python en menos de 2 minutos.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>CORS Habilitado (Sin Bloqueos)</span>
            </span>
          </div>
        </div>

        {/* 3 Steps Integration Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <div className="font-mono text-cyan-400 font-bold text-[11px] flex items-center gap-1 mb-1">
              <span>1. TIEMPO REAL (SSE / WS)</span>
            </div>
            <code className="text-white text-xs block font-mono bg-slate-900 p-1.5 rounded border border-slate-800 mb-1.5">
              GET {baseUrl}/stream
            </code>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Recibe cada alerta de incendio y cambio en sensores de Cali automáticamente sin hacer polling.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <div className="font-mono text-amber-400 font-bold text-[11px] flex items-center gap-1 mb-1">
              <span>2. CONSULTA REST PUNTUAL</span>
            </div>
            <code className="text-white text-xs block font-mono bg-slate-900 p-1.5 rounded border border-slate-800 mb-1.5">
              GET {baseUrl}/api/alerts
            </code>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Retorna el listado estructurado de alertas activas en formato JSON listo para renderizar.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <div className="font-mono text-emerald-400 font-bold text-[11px] flex items-center gap-1 mb-1">
              <span>3. ENVIAR O VERIFICAR</span>
            </div>
            <code className="text-white text-xs block font-mono bg-slate-900 p-1.5 rounded border border-slate-800 mb-1.5">
              POST {baseUrl}/api/alerts
            </code>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Emite alertas desde drones, estaciones propias o solicita diagnóstico táctico instantáneo.
            </p>
          </div>
        </div>
      </div>

      {/* Code Snippets Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100 font-mono">
              Código Listo para Copiar y Pegar en tu Proyecto
            </h3>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setSelectedLang('python')}
              className={`px-3 py-1 rounded transition ${
                selectedLang === 'python' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setSelectedLang('javascript')}
              className={`px-3 py-1 rounded transition ${
                selectedLang === 'javascript' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              JavaScript / React / Node
            </button>
            <button
              onClick={() => setSelectedLang('curl')}
              className={`px-3 py-1 rounded transition ${
                selectedLang === 'curl' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              cURL (Terminal)
            </button>
          </div>
        </div>

        <div className="mt-3 relative">
          <button
            onClick={() => {
              const code = getSnippet(selectedLang, baseUrl);
              copyToClipboard(code, `code_${selectedLang}`);
            }}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 z-10 transition"
          >
            {copiedKey === `code_${selectedLang}` ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedKey === `code_${selectedLang}` ? 'Copiado' : 'Copiar Código'}</span>
          </button>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-cyan-200/90 overflow-x-auto leading-relaxed">
            {getSnippet(selectedLang, baseUrl)}
          </pre>
        </div>
      </div>

      {/* Interactive API Tester Console */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-100 font-mono">
                Consola Interactiva: Probar la API en Vivo
              </h3>
              <p className="text-[11px] text-slate-400">
                Haz clic en cualquier endpoint para probar la respuesta real del servidor al instante.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setTestEndpoint('alerts');
                runApiTest('alerts');
              }}
              disabled={isTesting}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                testEndpoint === 'alerts'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              GET /api/alerts
            </button>
            <button
              onClick={() => {
                setTestEndpoint('sensors');
                runApiTest('sensors');
              }}
              disabled={isTesting}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                testEndpoint === 'sensors'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              GET /api/sensors
            </button>
            <button
              onClick={() => {
                setTestEndpoint('verify');
                runApiTest('verify');
              }}
              disabled={isTesting}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                testEndpoint === 'verify'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              POST /api/verify
            </button>
          </div>
        </div>

        {/* Live response window */}
        <div className="mt-3 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">200 OK</span>
              {testLatency !== null && (
                <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  {testLatency} ms
                </span>
              )}
            </div>

            {testResult && (
              <button
                onClick={() => copyToClipboard(JSON.stringify(testResult, null, 2), 'testres')}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedKey === 'testres' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar Respuesta</span>
              </button>
            )}
          </div>

          {isTesting ? (
            <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
              <span>Consultando endpoint en vivo...</span>
            </div>
          ) : testResult ? (
            <pre className="max-h-60 overflow-y-auto text-amber-200/90 text-[11px] leading-snug">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          ) : (
            <div className="py-8 text-center text-slate-500">
              Haz clic en cualquiera de los botones superiores para ejecutar una petición de prueba.
            </div>
          )}
        </div>
      </div>

      {/* Markdown Documentation Folder (/docs) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-100 font-mono">
                Documentación Completa en Markdown (Carpeta /docs)
              </h3>
              <p className="text-[11px] text-slate-400">
                Archivos estructurados listos para consultar en GitHub, VSCode o wikis de ingeniería.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-slate-950 px-2 py-1 rounded text-slate-400 border border-slate-800">
            /docs/*.md
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>docs/01-COMO-FUNCIONA.md</span>
              </span>
              <span className="text-[10px] text-slate-500">Fundamentos</span>
            </div>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              Explicación del flujo en 4 etapas: satélites NASA FIRMS, red de sensores terrestres en Cali, correlación táctica con IA y despacho a Bomberos Cali (X-1).
            </p>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-purple-400 font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>docs/02-ARQUITECTURA.md</span>
              </span>
              <span className="text-[10px] text-slate-500">Arquitectura</span>
            </div>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              Diagrama de bloques, capas del backend (Express + SSE + WebSockets), pipelines espectrales de Copernicus Sentinel-2 y gestión de secretos en backend.
            </p>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>docs/03-INTEGRACION-WEB.md</span>
              </span>
              <span className="text-[10px] text-slate-500">Guía Web</span>
            </div>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              Guías con código completo para React, Next.js, Vue, Angular, Vanilla JS, Node.js, Python (FastAPI/Flask) y aplicaciones móviles (React Native/Flutter).
            </p>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>docs/04-API-REFERENCE.md</span>
              </span>
              <span className="text-[10px] text-slate-500">Endpoints</span>
            </div>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              Catálogo completo de endpoints REST (`/api/alerts`, `/api/sensors`, `/api/verify`), canal Server-Sent Events (`/stream`), WebSocket (`/ws`) y esquemas JSON.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function getSnippet(lang: 'python' | 'javascript' | 'curl', baseUrl: string) {
  if (lang === 'python') {
    return `# 1. Instalar librería estándar: pip install requests
import requests
import json

BASE_URL = "${baseUrl}"

# A) Consultar alertas activas en formato JSON
def obtener_alertas():
    res = requests.get(f"{BASE_URL}/api/alerts")
    alertas = res.json().get("alerts", [])
    for a in alertas:
        print(f"[{a['riskLevel']}] {a['sector']}: {a['headline']}")

# B) Escuchar alertas en tiempo real continuo (SSE /stream)
def escuchar_stream():
    print(f"Conectando a {BASE_URL}/stream...")
    res = requests.get(f"{BASE_URL}/stream?channel=alerts", stream=True)
    for line in res.iter_lines():
        if line and line.startswith(b"data: "):
            evento = json.loads(line[6:].decode("utf-8"))
            print("Nueva alerta en vivo:", evento)

if __name__ == "__main__":
    obtener_alertas()
`;
  }

  if (lang === 'javascript') {
    return `// JavaScript / TypeScript (Funciona en React, Vue, Node.js y navegadores)
const BASE_URL = "${baseUrl}";

// A) En el navegador: escuchar alertas en vivo (3 líneas de código nativo)
const stream = new EventSource(\`\${BASE_URL}/stream?channel=alerts\`);

stream.addEventListener('alert', (event) => {
  const payload = JSON.parse(event.data);
  const alerta = payload.data.alert;
  console.warn(\`🚨 Incendio en \${alerta.sector} (\${alerta.riskLevel})\`);
  console.log(alerta.headline);
});

// B) Consulta puntual con fetch()
async function cargarAlertas() {
  const res = await fetch(\`\${BASE_URL}/api/alerts\`);
  const data = await res.json();
  console.log('Alertas activas:', data.alerts);
}
`;
  }

  return `# 1. Escuchar alertas en tiempo real continuo en terminal:
curl -N -H "Accept: text/event-stream" "${baseUrl}/stream?channel=alerts"

# 2. Consultar alertas en JSON plano:
curl -s "${baseUrl}/api/alerts"

# 3. Consultar sensores IoT de Cali:
curl -s "${baseUrl}/api/sensors"

# 4. Enviar una alerta desde tu aplicación:
curl -X POST "${baseUrl}/api/alerts" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sector": "Cerro de las Tres Cruces",
    "riskLevel": "CRITICAL",
    "headline": "Foco activo reportado con avance a Bataclán"
  }'
`;
}
