import React, { useState, useEffect } from 'react';
import { FireIncidentScenario, AIVerificationResult } from '../types/fire';
import { AVAILABLE_MODELS, OpenRouterConfig, runWildfireAIVerification } from '../services/openRouterService';
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Radio,
  Copy,
  Check,
  Zap,
  Clock,
  Compass,
  FileCode,
  RadioTower,
  BellRing,
  Send,
  Building2,
  CheckCircle2
} from 'lucide-react';

interface AIVerificationPanelProps {
  incident: FireIncidentScenario;
  onAlertVerified?: (result: AIVerificationResult) => void;
}

export const AIVerificationPanel: React.FC<AIVerificationPanelProps> = ({
  incident,
  onAlertVerified
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);
  const [temperature, setTemperature] = useState<number>(0.1);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<AIVerificationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'tactical' | 'alerts' | 'raw_json'>('diagnosis');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [dispatchedToast, setDispatchedToast] = useState<string | null>(null);

  // Automatically load verification result for the active incident (Frontend Maquetado)
  useEffect(() => {
    let isMounted = true;
    const loadMockAnalysis = async () => {
      setIsLoading(true);
      try {
        const config: OpenRouterConfig = {
          model: selectedModel,
          temperature
        };
        const result = await runWildfireAIVerification(incident, config);
        if (isMounted) {
          setVerificationResult(result);
          onAlertVerified?.(result);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadMockAnalysis();

    return () => {
      isMounted = false;
    };
  }, [incident.id, selectedModel]);

  const handleRunVerification = async () => {
    setIsLoading(true);
    try {
      const config: OpenRouterConfig = {
        model: selectedModel,
        temperature
      };

      const result = await runWildfireAIVerification(incident, config);
      setVerificationResult(result);
      onAlertVerified?.(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const triggerDispatchAction = (actionTitle: string) => {
    setDispatchedToast(actionTitle);
    setTimeout(() => setDispatchedToast(null), 3500);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100 flex flex-col h-full relative">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider font-mono">
                Verificador Táctico IA
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                MAQUETADO VALLE DEL CAUCA
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Fusión Analítica Satélite FIRMS + IoT In-Situ + Protocolos Bomberos Cali
            </p>
          </div>
        </div>

        {/* Action Controls & Model Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs">
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">Modelo:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunVerification}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-semibold text-xs shadow-lg shadow-red-950/50 transition transform active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Calculando Fusión...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                <span>Regenerar Diagnóstico</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Dispatch Simulation Actions Bar */}
      <div className="mt-2.5 py-2 px-3 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
          <Send className="w-3 h-3 text-cyan-400" /> Despacho Inmediato (Maqueta):
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => triggerDispatchAction('Alerta despachada a Central de Bomberos Voluntarios de Cali (X-1)')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/50 hover:bg-red-900 text-red-300 border border-red-800/60 transition text-[11px]"
          >
            <RadioTower className="w-3 h-3" />
            <span>Despacho Bomberos Cali</span>
          </button>
          <button
            onClick={() => triggerDispatchAction('Boletín CAP enviado a Defensa Civil Valle y DAGRD Cali')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/50 hover:bg-amber-900 text-amber-300 border border-amber-800/60 transition text-[11px]"
          >
            <BellRing className="w-3 h-3" />
            <span>Alerta DAGRD / CAP</span>
          </button>
          <button
            onClick={() => triggerDispatchAction('Ficha técnica generada para Corporación Autónoma Regional CVC')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/50 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 transition text-[11px]"
          >
            <Building2 className="w-3 h-3" />
            <span>Ficha CVC Valle</span>
          </button>
        </div>
      </div>

      {/* Dispatched Notification Toast */}
      {dispatchedToast && (
        <div className="mt-2 p-2.5 bg-emerald-950/90 border border-emerald-700/80 rounded-lg text-emerald-200 text-xs flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{dispatchedToast}</span>
        </div>
      )}

      {/* Verification Output Body */}
      {verificationResult ? (
        <div className="mt-3 flex-1 flex flex-col min-h-0 space-y-3">
          {/* Top Status & Badge Banner */}
          <div
            className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
              verificationResult.classification === 'VERIFIED_WILDFIRE'
                ? 'bg-red-950/40 border-red-800/80 shadow-lg shadow-red-950/20'
                : verificationResult.classification === 'EARLY_WARNING_SMOLDER'
                ? 'bg-amber-950/40 border-amber-800/80'
                : verificationResult.classification === 'WATCH_ELEVATED_RISK'
                ? 'bg-orange-950/40 border-orange-800/80'
                : 'bg-emerald-950/40 border-emerald-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg border ${
                  verificationResult.classification === 'VERIFIED_WILDFIRE'
                    ? 'bg-red-600/20 border-red-500/40 text-red-400'
                    : verificationResult.classification === 'EARLY_WARNING_SMOLDER'
                    ? 'bg-amber-600/20 border-amber-500/40 text-amber-400'
                    : verificationResult.classification === 'WATCH_ELEVATED_RISK'
                    ? 'bg-orange-600/20 border-orange-500/40 text-orange-400'
                    : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                }`}
              >
                {verificationResult.classification === 'VERIFIED_WILDFIRE' && <Flame className="w-5 h-5 animate-bounce" />}
                {verificationResult.classification === 'EARLY_WARNING_SMOLDER' && <Radio className="w-5 h-5 animate-pulse" />}
                {verificationResult.classification === 'WATCH_ELEVATED_RISK' && <AlertTriangle className="w-5 h-5" />}
                {verificationResult.classification === 'FALSE_POSITIVE_LIKELY' && <ShieldCheck className="w-5 h-5" />}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-wide font-mono text-white">
                    {verificationResult.classification === 'VERIFIED_WILDFIRE' && 'INCENDIO DE COBERTURA VEGETAL VERIFICADO'}
                    {verificationResult.classification === 'EARLY_WARNING_SMOLDER' && 'ALERTA TEMPRANA BAJO DOSEL (RED IOT CALI)'}
                    {verificationResult.classification === 'WATCH_ELEVATED_RISK' && 'FOCO EN OBSERVACIÓN (SIN SENSOR CERCANO)'}
                    {verificationResult.classification === 'FALSE_POSITIVE_LIKELY' && 'FALSO POSITIVO IDENTIFICADO (QUEMA AGRÍCOLA)'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      verificationResult.riskLevel === 'CRITICAL'
                        ? 'bg-red-500 text-white animate-pulse'
                        : verificationResult.riskLevel === 'HIGH'
                        ? 'bg-amber-500 text-black'
                        : verificationResult.riskLevel === 'MODERATE'
                        ? 'bg-orange-500 text-black'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    Riesgo: {verificationResult.riskLevel}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  ID Operativo: <span className="font-mono text-slate-400">{verificationResult.alertId}</span> • Motor:{' '}
                  <span className="font-mono text-amber-300">{verificationResult.modelUsed}</span>
                </div>
              </div>
            </div>

            {/* Score Badges */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] uppercase font-mono text-slate-400">Nivel Confianza IA</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {verificationResult.confidenceScore}%
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800"></div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-mono text-slate-400">Prob. Falso Positivo</div>
                <div
                  className={`text-lg font-bold font-mono ${
                    verificationResult.falsePositiveProbability > 50 ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {verificationResult.falsePositiveProbability}%
                </div>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('diagnosis')}
              className={`pb-2 px-3 font-medium transition border-b-2 ${
                activeTab === 'diagnosis'
                  ? 'border-amber-500 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Diagnóstico Cali & Fusión
            </button>
            <button
              onClick={() => setActiveTab('tactical')}
              className={`pb-2 px-3 font-medium transition border-b-2 ${
                activeTab === 'tactical'
                  ? 'border-amber-500 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Plan Táctico & Despacho
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`pb-2 px-3 font-medium transition border-b-2 ${
                activeTab === 'alerts'
                  ? 'border-amber-500 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Alertas Protección Civil & Radio 119
            </button>
            <button
              onClick={() => setActiveTab('raw_json')}
              className={`pb-2 px-3 font-medium transition border-b-2 flex items-center gap-1 ${
                activeTab === 'raw_json'
                  ? 'border-amber-500 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>JSON Geoespacial</span>
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="flex-1 overflow-y-auto pr-1 text-xs">
            {activeTab === 'diagnosis' && (
              <div className="space-y-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] font-bold text-amber-400 uppercase font-mono mb-1">
                    Dictamen Analítico de la IA (Valle del Cauca):
                  </div>
                  <p className="text-slate-200 leading-relaxed text-xs">
                    {verificationResult.falsePositiveDiagnosis}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-300 uppercase font-mono flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Correlación Satélite ↔ Sensor Cali</span>
                    </div>
                    <div className="text-slate-400">
                      Distancia al sensor más próximo:{' '}
                      <span className="text-white font-mono font-semibold">
                        {verificationResult.correlation.spatialDistanceKm} km
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Alineación Vector Viento Pacífico:{' '}
                      <span
                        className={`font-semibold font-mono ${
                          verificationResult.correlation.windPlumeVectorMatch
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {verificationResult.correlation.windPlumeVectorMatch
                          ? 'POSITIVA (Viento empuja humo hacia casco urbano)'
                          : 'NEUTRA / DESALINEADA'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 italic">
                      "{verificationResult.correlation.summary}"
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-300 uppercase font-mono flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>Dinámica del Fuego en Ladera</span>
                    </div>
                    <div className="text-slate-400">
                      Tasa de Avance Estimada (ROS):{' '}
                      <span className="text-amber-300 font-mono font-bold">
                        {verificationResult.fireDynamics.estimatedRateOfSpreadKmH} km/h
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Dirección de Propagación:{' '}
                      <span className="text-white font-mono">
                        {verificationResult.fireDynamics.propagationDirection}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      Potencia Radiativa Acumulada:{' '}
                      <span className="text-red-400 font-mono font-bold">
                        {verificationResult.fireDynamics.fireRadiativePowerTotalMw} MW
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tactical' && (
              <div className="space-y-3">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] font-bold text-red-400 uppercase font-mono mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Infraestructura & Bienes en Amenaza en Cali:</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-200">
                    {verificationResult.threatenedAssets.map((asset, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-400 font-mono font-bold">•</span>
                        <span>{asset}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] font-bold text-amber-400 uppercase font-mono mb-2 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Recomendaciones Tácticas para Bomberos Cali & CVC:</span>
                  </div>
                  <ul className="space-y-2 text-slate-200">
                    {verificationResult.tacticalRecommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-amber-400 font-mono font-bold">{i + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="space-y-3">
                {/* SMS CAP Notice */}
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] font-bold text-cyan-400 uppercase font-mono flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Mensaje Celular de Emergencia / CAP (Alcaldía de Cali / DAGRD)</span>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(verificationResult.disasterAlerts.shortSmsCAP, 'sms')
                      }
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      {copiedKey === 'sms' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'sms' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-cyan-900/40 text-cyan-200 font-mono text-xs">
                    {verificationResult.disasterAlerts.shortSmsCAP}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Longitud: {verificationResult.disasterAlerts.shortSmsCAP.length} caracteres (Compatible con Cell Broadcast Colombia)
                  </div>
                </div>

                {/* Civil Protection Full Notice */}
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] font-bold text-amber-400 uppercase font-mono flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Boletín Oficial de Gestión del Riesgo (DAGRD Cali / CVC)</span>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(verificationResult.disasterAlerts.civilProtectionNotice, 'civil')
                      }
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      {copiedKey === 'civil' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'civil' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-slate-200 text-xs leading-relaxed">
                    {verificationResult.disasterAlerts.civilProtectionNotice}
                  </div>
                </div>

                {/* Firefighter Radio Dispatch Bulletin */}
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] font-bold text-emerald-400 uppercase font-mono flex items-center gap-1.5">
                      <RadioTower className="w-3.5 h-3.5" />
                      <span>Despacho Radial a Unidades Forestales Bomberos Cali (X-1)</span>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(verificationResult.disasterAlerts.firefighterRadioBulletin, 'radio')
                      }
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      {copiedKey === 'radio' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'radio' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded border border-emerald-900/40 text-emerald-200 font-mono text-xs">
                    {verificationResult.disasterAlerts.firefighterRadioBulletin}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'raw_json' && (
              <div className="relative">
                <button
                  onClick={() => copyToClipboard(verificationResult.rawJsonResponse, 'rawjson')}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-200 hover:text-white text-[11px] border border-slate-700 z-10"
                >
                  {copiedKey === 'rawjson' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'rawjson' ? 'Copiado' : 'Copiar JSON'}</span>
                </button>
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-200 overflow-x-auto leading-tight">
                  {verificationResult.rawJsonResponse}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-amber-400 mb-3 shadow">
            <Zap className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-sm text-slate-200">
            Fusión Analítica en Ejecución
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            Correlacionando focos térmicos FIRMS con la red de sensores IoT de Cali y Valle del Cauca...
          </p>
        </div>
      )}
    </div>
  );
};
