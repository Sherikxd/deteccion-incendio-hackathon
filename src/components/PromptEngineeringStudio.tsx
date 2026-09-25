import React, { useState } from 'react';
import { FireIncidentScenario } from '../types/fire';
import {
  SYSTEM_PROMPT_WILDFIRE,
  USER_PROMPT_TEMPLATE,
  OPENROUTER_INTEGRATION_CODE_TS,
  OPENROUTER_INTEGRATION_CODE_PY
} from '../prompts/masterFirePrompt';
import {
  FileText,
  Copy,
  Check,
  Code2,
  Cpu,
  Sliders,
  Sparkles,
  Database,
  Terminal,
  ExternalLink,
  ShieldAlert,
  Flame,
  Satellite
} from 'lucide-react';

interface PromptEngineeringStudioProps {
  currentIncident: FireIncidentScenario;
}

export const PromptEngineeringStudio: React.FC<PromptEngineeringStudioProps> = ({
  currentIncident
}) => {
  const [activeSection, setActiveSection] = useState<'system' | 'user_injected' | 'code_ts' | 'code_py'>('system');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Prompt options state
  const [includeAgriculturalRule, setIncludeAgriculturalRule] = useState<boolean>(true);
  const [includeIndustrialRule, setIncludeIndustrialRule] = useState<boolean>(true);
  const [includeCapAlerts, setIncludeCapAlerts] = useState<boolean>(true);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate live injected user prompt with current incident data
  const injectedUserPrompt = `Analiza el siguiente incidente forestal multi-fuente y emite la verificación de inteligencia:

### DATOS SATELITALES NASA FIRMS (Focos Térmicos Activos):
${JSON.stringify(currentIncident.hotspots, null, 2)}

### RED DE SENSORES IOT TERRESTRES (Telemetría en Tiempo Real):
${JSON.stringify(currentIncident.sensors, null, 2)}

### CONTEXTO AMBIENTAL COPERNICUS STAC / SENTINEL-2:
${JSON.stringify(currentIncident.copernicus, null, 2)}

### METEOROLOGÍA Y ORIENTACIÓN DE VIENTO:
{
  "windSpeedKmh": ${currentIncident.sensors[0]?.metrics.windSpeedKmh || 25},
  "windDirectionCardinal": "${currentIncident.sensors[0]?.metrics.windDirectionCardinal || 'SW'}",
  "windDirectionDegrees": ${currentIncident.sensors[0]?.metrics.windDirectionDeg || 220},
  "ambientTemperatureC": ${currentIncident.sensors[0]?.metrics.tempC || 32},
  "relativeHumidityPercent": ${currentIncident.sensors[0]?.metrics.humidityPercent || 15}
}

Instrucción adicional: Correlaciona la orientación del viento con la posición del sensor más cercano y calcula la probabilidad de falso positivo. Emite el bloque JSON estricto con dictamen táctico.`;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 flex flex-col space-y-4">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-mono tracking-wide flex items-center gap-2">
              <span>PROMPT MASTER & INGENIERÍA DE INSTRUCCIONES</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 border border-red-500/30">
                PRODUCCIÓN OPENROUTER
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Diseñado para Claude 3.5 Sonnet, GPT-4o y Llama 3.3 con fusión NASA FIRMS + IoT + Copernicus
            </p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSection('system')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeSection === 'system'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>System Prompt Maestro</span>
          </button>
          <button
            onClick={() => setActiveSection('user_injected')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeSection === 'user_injected'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>User Payload Inyectado</span>
          </button>
          <button
            onClick={() => setActiveSection('code_ts')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeSection === 'code_ts'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Integración Node.js (Proxy)</span>
          </button>
          <button
            onClick={() => setActiveSection('code_py')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeSection === 'code_py'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Script Python</span>
          </button>
        </div>
      </div>

      {/* Main Content Area based on tab */}
      {activeSection === 'system' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-amber-300 font-mono">Reglas Clave del Prompt:</span> Fusión FIRMS + IoT downwind, descarte de falsos positivos (quemas/industrias), estimación de propagación y salida JSON estricta.
            </div>
            <button
              onClick={() => copyToClipboard(SYSTEM_PROMPT_WILDFIRE, 'system_prompt')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition"
            >
              {copiedKey === 'system_prompt' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>¡Copiado al Portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar System Prompt</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre-wrap">
              {SYSTEM_PROMPT_WILDFIRE}
            </pre>
          </div>
        </div>
      )}

      {activeSection === 'user_injected' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-300">
              Datos reales del incidente seleccionado: <strong className="text-amber-300">{currentIncident.title}</strong>
            </div>
            <button
              onClick={() => copyToClipboard(injectedUserPrompt, 'injected_prompt')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition"
            >
              {copiedKey === 'injected_prompt' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Payload Completo</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre-wrap">
              {injectedUserPrompt}
            </pre>
          </div>
        </div>
      )}

      {activeSection === 'code_ts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-emerald-400 font-mono">Backend Express / TypeScript:</span> Mantiene <code className="text-amber-300">OPENROUTER_API_KEY</code> y <code className="text-amber-300">FIRMS_MAP_KEY</code> en el servidor protegidos.
            </div>
            <button
              onClick={() => copyToClipboard(OPENROUTER_INTEGRATION_CODE_TS, 'code_ts')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition"
            >
              {copiedKey === 'code_ts' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>¡Código Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código Node.js</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre-wrap">
            {OPENROUTER_INTEGRATION_CODE_TS}
          </pre>
        </div>
      )}

      {activeSection === 'code_py' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-sky-400 font-mono">Backend Python:</span> Módulo reutilizable con biblioteca <code className="text-amber-300">requests</code> y manejo determinista a <code className="text-amber-300">temperature=0.1</code>.
            </div>
            <button
              onClick={() => copyToClipboard(OPENROUTER_INTEGRATION_CODE_PY, 'code_py')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition"
            >
              {copiedKey === 'code_py' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>¡Código Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Script Python</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-amber-200 overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre-wrap">
            {OPENROUTER_INTEGRATION_CODE_PY}
          </pre>
        </div>
      )}
    </div>
  );
};
