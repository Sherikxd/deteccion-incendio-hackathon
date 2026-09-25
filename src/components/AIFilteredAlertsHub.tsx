import React, { useState, useEffect } from 'react';
import { FireEmergencyAlert, AIDecisionMeta } from '../types/fire';
import {
  Brain,
  ShieldCheck,
  Flame,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  DollarSign,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Send,
  Code2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  Layers,
  ArrowRight
} from 'lucide-react';

export const AIFilteredAlertsHub: React.FC = () => {
  const [alerts, setAlerts] = useState<FireEmergencyAlert[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'confirmed' | 'discarded' | 'monitored'>('all');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [decisionSummary, setDecisionSummary] = useState<any>({
    totalAnalyzed: 0,
    confirmedDispatches: 0,
    discardedFalsePositives: 0,
    monitoredSmoldering: 0,
    totalResourcesSavedCop: 0
  });

  // Custom AI Evaluator form state
  const [evalSector, setEvalSector] = useState<string>('Cerro de las Tres Cruces');
  const [evalFrp, setEvalFrp] = useState<number>(85.0);
  const [evalSlope, setEvalSlope] = useState<number>(30);
  const [evalWindSpeed, setEvalWindSpeed] = useState<number>(32);
  const [evalWindDir, setEvalWindDir] = useState<string>('WNW');
  const [evalIsAgri, setEvalIsAgri] = useState<boolean>(false);
  const [evalIsIndustrial, setEvalIsIndustrial] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchAlerts = async (filter: string = activeFilter) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/alerts?decision=${filter}`);
      const data = await res.json();
      if (data.alerts) {
        setAlerts(data.alerts);
        if (data.decisionSummary) {
          setDecisionSummary(data.decisionSummary);
        }
      }
    } catch (e) {
      console.error('Error fetching filtered alerts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts(activeFilter);
  }, [activeFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunAiEvaluation = async () => {
    setIsEvaluating(true);
    setEvalResult(null);

    try {
      const res = await fetch('/api/alerts/evaluate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector: evalSector,
          frp: evalFrp,
          slopeDeg: evalSlope,
          windSpeed: evalWindSpeed,
          windDirection: evalWindDir,
          isAgriculturalZone: evalIsAgri,
          isIndustrialPark: evalIsIndustrial
        })
      });

      const data = await res.json();
      setEvalResult(data);
      // Refresh list to show potential updates
      fetchAlerts(activeFilter);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-white">
                  MOTOR DE DECISIÓN & ALERTAS FILTRADAS POR IA
                </h2>
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-300" />
                  <span>Razonamiento Táctico Regional</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                La IA analiza cada anomalía térmica cruzando pendiente, viento del Pacífico, zonificación catastral y sensores in-situ para autorizar o descartar despachos de Bomberos Cali.
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchAlerts(activeFilter)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refrescar Análisis</span>
          </button>
        </div>

        {/* Decision Summary Stat Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-red-900/50 flex flex-col justify-between">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-red-400" /> Despachos Confirmados
            </span>
            <div className="text-2xl font-bold text-red-400 mt-1">
              {decisionSummary.confirmedDispatches} <span className="text-xs font-normal text-slate-400">focos</span>
            </div>
            <span className="text-[10px] text-slate-500">Máquinas de bomberos asignadas</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/50 flex flex-col justify-between">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Falsos Positivos Filtrados
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {decisionSummary.discardedFalsePositives} <span className="text-xs font-normal text-slate-400">descartes</span>
            </div>
            <span className="text-[10px] text-slate-500">Quemas de caña e industria</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-amber-900/50 flex flex-col justify-between">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-amber-400" /> Focos en Monitoreo
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {decisionSummary.monitoredSmoldering} <span className="text-xs font-normal text-slate-400">alertas</span>
            </div>
            <span className="text-[10px] text-slate-500">Bajo dosel arbóreo (Farallones)</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-cyan-900/50 flex flex-col justify-between">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" /> Recursos Ahorrados
            </span>
            <div className="text-xl font-bold text-cyan-300 mt-1 truncate">
              ${(decisionSummary.totalResourcesSavedCop || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">COP</span>
            </div>
            <span className="text-[10px] text-slate-500">Combustible y horas operativas</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 text-[11px] flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" /> Filtrar Decisiones:
          </span>

          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg border transition ${
              activeFilter === 'all'
                ? 'bg-purple-600 text-white border-purple-500 font-bold shadow'
                : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            Todos ({alerts.length})
          </button>

          <button
            onClick={() => setActiveFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
              activeFilter === 'confirmed'
                ? 'bg-red-600 text-white border-red-500 font-bold shadow'
                : 'bg-slate-950 text-red-300 hover:text-white border-slate-800'
            }`}
          >
            <Flame className="w-3 h-3 text-red-400" />
            <span>Confirmados (Despacho)</span>
          </button>

          <button
            onClick={() => setActiveFilter('discarded')}
            className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
              activeFilter === 'discarded'
                ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow'
                : 'bg-slate-950 text-emerald-300 hover:text-white border-slate-800'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Descartados por IA (Falsos Positivos)</span>
          </button>

          <button
            onClick={() => setActiveFilter('monitored')}
            className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
              activeFilter === 'monitored'
                ? 'bg-amber-600 text-white border-amber-500 font-bold shadow'
                : 'bg-slate-950 text-amber-300 hover:text-white border-slate-800'
            }`}
          >
            <Eye className="w-3 h-3 text-amber-400" />
            <span>Monitoreo Preventivo</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Alert List (7 cols) + Live AI Decision Evaluator (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Filtered Alerts List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>Alertas Analizadas por el Modelo de Razonamiento ({alerts.length})</span>
            <span className="text-[11px] text-cyan-400">Endpoint: GET /api/alerts?decision={activeFilter}</span>
          </div>

          {isLoading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
              <span>Cargando decisiones de IA...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs font-mono">
              No hay alertas que coincidan con el filtro seleccionado.
            </div>
          ) : (
            alerts.map((alert) => {
              const isConfirmed = alert.aiDecision?.decision === 'DISPATCH_CONFIRMED';
              const isDiscarded = alert.aiDecision?.decision === 'DISCARDED_FALSE_POSITIVE';
              const isMonitored = alert.aiDecision?.decision === 'EARLY_WARNING_MONITOR';
              const isExpanded = expandedAlertId === alert.alertId;

              return (
                <div
                  key={alert.alertId}
                  className={`bg-slate-900/90 rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
                    isConfirmed
                      ? 'border-red-900/70 hover:border-red-600'
                      : isDiscarded
                      ? 'border-emerald-900/70 hover:border-emerald-600'
                      : 'border-amber-900/70 hover:border-amber-600'
                  }`}
                >
                  {/* Alert Header Banner */}
                  <div className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isConfirmed && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 text-white flex items-center gap-1 shadow">
                            <Flame className="w-3 h-3" /> DESPACHO CONFIRMADO POR IA ({alert.aiDecision?.confidence}%)
                          </span>
                        )}
                        {isDiscarded && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white flex items-center gap-1 shadow">
                            <ShieldCheck className="w-3 h-3" /> FALSO POSITIVO DESCARTADO ({alert.aiDecision?.confidence}%)
                          </span>
                        )}
                        {isMonitored && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-600 text-white flex items-center gap-1 shadow">
                            <Eye className="w-3 h-3" /> MONITOREO PREVENTIVO ({alert.aiDecision?.confidence}%)
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {alert.category}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500">{alert.alertId}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-white font-mono">{alert.sector}</h4>
                      <p className="text-xs text-slate-300 mt-0.5 font-sans leading-relaxed">
                        {alert.headline}
                      </p>
                    </div>

                    {/* Quick Metrics Strip */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
                      <span>FRP: <strong className="text-amber-400">{alert.frpMw} MW</strong></span>
                      <span>PM2.5: <strong className="text-cyan-300">{alert.pm25UgM3} µg/m³</strong></span>
                      <span>Viento: <strong className="text-blue-300">{alert.windSpeedKmh} km/h ({alert.windDirection})</strong></span>

                      {alert.aiDecision?.resourcesSavedEstimateCop && (
                        <span className="text-emerald-400 font-bold ml-auto flex items-center gap-1">
                          <span>Ahorro:</span>
                          <span>+${alert.aiDecision.resourcesSavedEstimateCop.toLocaleString()} COP</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand/Collapse AI Reasoning Toggle */}
                  <div className="bg-slate-950/80 px-4 py-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={() => setExpandedAlertId(isExpanded ? null : alert.alertId)}
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold transition"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Ocultar Justificación y Reglas IA' : 'Ver Desglose de Decisión de IA'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <span className="text-[10px] text-slate-500">
                      Modelo: {alert.aiDecision?.model || 'claude-3.5-sonnet'}
                    </span>
                  </div>

                  {/* Expanded AI Reasoning Breakdown */}
                  {isExpanded && alert.aiDecision && (
                    <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 text-xs font-mono">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Dictamen del Motor de IA:
                        </span>
                        <p className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-sans text-xs leading-relaxed">
                          {alert.aiDecision.reasoning}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Reglas Evaluadas:
                        </span>
                        <div className="space-y-1">
                          {alert.aiDecision.rulesEvaluated.map((rule, rIdx) => (
                            <div
                              key={rIdx}
                              className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800 text-[11px]"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span className="text-slate-300">{rule}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Acción Táctica Ordenada:</span>
                        <strong className="text-amber-300">{alert.tacticalAction}</strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Live AI Decision Evaluator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
              <Cpu className="w-4 h-4 text-purple-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-100 font-mono">
                  Evaluador de Focos en Tiempo Real
                </h3>
                <p className="text-[11px] text-slate-400">
                  Prueba cómo el motor clasifica cualquier anomalía térmica externa antes de despachar.
                </p>
              </div>
            </div>

            {/* Input Form */}
            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Sector o Paraje:</label>
                <input
                  type="text"
                  value={evalSector}
                  onChange={(e) => setEvalSector(e.target.value)}
                  className="w-full bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">
                    Potencia FRP (MW):
                  </label>
                  <input
                    type="number"
                    value={evalFrp}
                    onChange={(e) => setEvalFrp(Number(e.target.value))}
                    className="w-full bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs text-amber-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">
                    Pendiente (°):
                  </label>
                  <input
                    type="number"
                    value={evalSlope}
                    onChange={(e) => setEvalSlope(Number(e.target.value))}
                    className="w-full bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs text-emerald-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">
                    Viento (km/h):
                  </label>
                  <input
                    type="number"
                    value={evalWindSpeed}
                    onChange={(e) => setEvalWindSpeed(Number(e.target.value))}
                    className="w-full bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs text-blue-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">
                    Dirección:
                  </label>
                  <select
                    value={evalWindDir}
                    onChange={(e) => setEvalWindDir(e.target.value)}
                    className="w-full bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs text-white"
                  >
                    <option value="WNW">WNW (Del Pacífico a Cali)</option>
                    <option value="W">W (Oeste ladera)</option>
                    <option value="NE">NE (Hacia el Valle llano)</option>
                    <option value="ESE">ESE (Hacia cordillera)</option>
                  </select>
                </div>
              </div>

              {/* Toggles for False Positive Context */}
              <div className="space-y-2 pt-1 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={evalIsAgri}
                    onChange={(e) => setEvalIsAgri(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>¿Es zona plana de cultivo de caña? (Rozo / Palmira)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={evalIsIndustrial}
                    onChange={(e) => setEvalIsIndustrial(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>¿Es polígono catastral industrial? (Acopi / Yumbo)</span>
                </label>
              </div>

              <button
                onClick={handleRunAiEvaluation}
                disabled={isEvaluating}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>{isEvaluating ? 'Evaluando Reglas...' : 'Ejecutar Dictamen de IA'}</span>
              </button>
            </div>

            {/* Evaluation Result Display */}
            {evalResult && (
              <div
                className={`p-3.5 rounded-xl border space-y-2 text-xs font-mono animate-fade-in ${
                  evalResult.decision === 'DISPATCH_CONFIRMED'
                    ? 'bg-red-950/50 border-red-800 text-red-200'
                    : evalResult.decision === 'DISCARDED_FALSE_POSITIVE'
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                    : 'bg-amber-950/50 border-amber-800 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>DICTAMEN: {evalResult.decision}</span>
                  <span>{evalResult.confidence}% Confianza</span>
                </div>
                <p className="text-[11px] text-slate-200 font-sans leading-relaxed">
                  {evalResult.reasoning}
                </p>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-700">
                  Acción: {evalResult.tacticalAction}
                </div>
                {evalResult.resourcesSavedEstimateCop && (
                  <div className="text-[10px] font-bold text-emerald-300">
                    Ahorro estimado: +${evalResult.resourcesSavedEstimateCop.toLocaleString()} COP
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Integration Snippet */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>Consumir Solo Alertas Filtradas</span>
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    `curl -s "https://<tu-app-url>/api/alerts?decision=confirmed"`,
                    'api_filtered_curl'
                  )
                }
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedKey === 'api_filtered_curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>
            <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-cyan-200 overflow-x-auto leading-relaxed">
{`# 1. Obtener solo alertas confirmadas para despacho de bomberos:
curl -s "https://<tu-app-url>/api/alerts?decision=confirmed"

# 2. Consultar falsos positivos descartados (quemas agrícolas):
curl -s "https://<tu-app-url>/api/alerts?decision=discarded"

# 3. Evaluar un foco externo con la IA antes de alertar:
curl -X POST "https://<tu-app-url>/api/alerts/evaluate-ai" \\
  -H "Content-Type: application/json" \\
  -d '{"sector":"Cerro Tres Cruces","frp":95.0,"slopeDeg":30}'`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
