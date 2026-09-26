/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { MOCK_INCIDENTS } from './data/mockIncidents';
import { FireIncidentScenario, IoTSensorNode, AIVerificationResult } from './types/fire';
import { MapViewer } from './components/MapViewer';
import { IoTTelemetryPanel } from './components/IoTTelemetryPanel';
import { AIVerificationPanel } from './components/AIVerificationPanel';
import { ApiIntegrationHub } from './components/ApiIntegrationHub';
import { ThermalVisionCameras } from './components/ThermalVisionCameras';
import { WhatsAppBotDispatcher } from './components/WhatsAppBotDispatcher';
import { SensorsMetricsDashboard } from './components/SensorsMetricsDashboard';
import { SandboxTestingPanel } from './components/SandboxTestingPanel';
import { AIFilteredAlertsHub } from './components/AIFilteredAlertsHub';
import { StreamLiveChannel } from './components/StreamLiveChannel';
import { WebSocketStreamStudio } from './components/WebSocketStreamStudio';
import { PromptEngineeringStudio } from './components/PromptEngineeringStudio';
import { FireSpreadSimulator } from './components/FireSpreadSimulator';
import { StreamApiDocumentation } from './components/StreamApiDocumentation';
import { ArchitectureDocs } from './components/ArchitectureDocs';
import {
  Flame,
  Radio,
  Layers,
  MapPin,
  Code2,
  Camera,
  MessageSquare,
  FlaskConical,
  Gauge,
  Brain,
  Zap
} from 'lucide-react';

export default function App() {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(MOCK_INCIDENTS[0].id);

  // Top-Level Mode: Datos Reales (Producción) vs Datos Simulados (Sandbox)
  const [systemMode, setSystemMode] = useState<'real' | 'simulation'>('real');

  // Subtabs within Real Data Mode
  const [realDataTab, setRealDataTab] = useState<
    'map' | 'ai_decisions' | 'sensors' | 'cameras' | 'whatsapp' | 'stream' | 'ws' | 'api'
  >('map');

  const [selectedSensor, setSelectedSensor] = useState<IoTSensorNode | undefined>(undefined);
  const [lastVerificationResult, setLastVerificationResult] = useState<AIVerificationResult | null>(null);

  const currentIncident: FireIncidentScenario =
    MOCK_INCIDENTS.find((inc) => inc.id === selectedIncidentId) || MOCK_INCIDENTS[0];

  const totalFRP = currentIncident.hotspots.reduce((acc, h) => acc + h.frp, 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-neutral-800 bg-neutral-900 sticky top-0 z-[2000]">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Region */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-semibold tracking-tight text-white">
                  Nature<span className="text-amber-500">Intelligence</span>
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-600/40 text-emerald-500 hidden sm:inline">
                  CALI EN VIVO
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-400 border border-neutral-600/40 hidden md:inline">
                  GOES-16 ABI 15m
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Detección Satelital, Red de Sensores IoT, Cámaras Térmicas & Bot WhatsApp
              </p>
            </div>
          </div>

          {/* MAIN DUAL MODE TOGGLE: DATOS REALES VS DATOS SIMULADOS (SANDBOX) */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-md border border-neutral-800 text-xs font-mono shrink-0">
            <button
              onClick={() => setSystemMode('real')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 rounded-lg font-medium transition ${
                systemMode === 'real'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="hidden sm:inline">Datos Reales (Producción)</span>
              <span className="sm:hidden">Reales</span>
            </button>

            <button
              onClick={() => setSystemMode('simulation')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 rounded-lg font-medium transition ${
                systemMode === 'simulation'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Datos Simulados / Pruebas (Sandbox)</span>
              <span className="sm:hidden">Sandbox</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sub-Navigation Bar for Real Data Mode */}
      {systemMode === 'real' && (
        <div className="bg-neutral-900/60 border-b border-neutral-800/80 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 font-mono">
            {/* Real Data View Selector — scroll horizontal en móvil, wrap en escritorio */}
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 flex-nowrap overflow-x-auto no-scrollbar lg:flex-wrap lg:overflow-visible">
              <button
                onClick={() => setRealDataTab('map')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-xs font-semibold transition shrink-0 whitespace-nowrap ${
                  realDataTab === 'map'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="hidden sm:inline">Mapa Táctico (FIRMS + GOES-16)</span>
                <span className="sm:hidden">Mapa</span>
              </button>

              <button
                onClick={() => setRealDataTab('ai_decisions')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-xs font-semibold transition shrink-0 whitespace-nowrap ${
                  realDataTab === 'ai_decisions'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Brain className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="hidden sm:inline">Decisiones de IA & Filtros</span>
                <span className="sm:hidden">IA</span>
              </button>

              <button
                onClick={() => setRealDataTab('sensors')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-xs font-semibold transition shrink-0 whitespace-nowrap ${
                  realDataTab === 'sensors'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Gauge className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="hidden sm:inline">Sensores & Métricas IoT</span>
                <span className="sm:hidden">Sensores</span>
              </button>

              <button
                onClick={() => setRealDataTab('cameras')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-xs font-semibold transition shrink-0 whitespace-nowrap ${
                  realDataTab === 'cameras'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Camera className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="hidden sm:inline">Cámaras Térmicas PTZ (IA)</span>
                <span className="sm:hidden">Cámaras</span>
              </button>

              <button
                onClick={() => setRealDataTab('whatsapp')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-xs font-semibold transition shrink-0 whitespace-nowrap ${
                  realDataTab === 'whatsapp'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="hidden sm:inline">Bot WhatsApp Bomberos Cali</span>
                <span className="sm:hidden">WhatsApp</span>
              </button>

              <button
                onClick={() => setRealDataTab('stream')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-xs font-semibold transition shrink-0 whitespace-nowrap ${
                  realDataTab === 'stream'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Radio className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="hidden sm:inline">Canal en Vivo (/stream SSE)</span>
                <span className="sm:hidden">En vivo</span>
              </button>

              <button
                onClick={() => setRealDataTab('ws')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-xs font-semibold transition shrink-0 whitespace-nowrap ${
                  realDataTab === 'ws'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="hidden sm:inline">Estudio WebSocket IA</span>
                <span className="sm:hidden">WebSocket</span>
              </button>

              <button
                onClick={() => setRealDataTab('api')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-xs font-semibold transition shrink-0 whitespace-nowrap ${
                  realDataTab === 'api'
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="hidden sm:inline">Integrar API (/stream)</span>
                <span className="sm:hidden">API</span>
              </button>
            </div>

            {/* Quick Sector Selector Pills — scroll horizontal en móvil */}
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar">
              <span className="text-neutral-400 font-medium flex items-center gap-1 shrink-0 text-[11px]">
                <MapPin className="w-3 h-3" /> Sector:
              </span>
              {MOCK_INCIDENTS.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => {
                    setSelectedIncidentId(inc.id);
                    setSelectedSensor(undefined);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition shrink-0 ${
                    selectedIncidentId === inc.id
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                      : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50'
                  }`}
                >
                  {inc.region.split('/')[0].trim()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <main className="max-w-7xl mx-auto px-4 py-4 flex-1 w-full">
        {/* ========================================= */}
        {/* MODE 1: DATOS REALES (En Producción)     */}
        {/* ========================================= */}
        {systemMode === 'real' && (
          <div className="space-y-4">
            {realDataTab === 'map' && (
              <div className="space-y-4">
                {/* Top row: Map and Telemetry */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-8 flex flex-col h-[460px] sm:h-[520px]">
                    <MapViewer
                      incident={currentIncident}
                      onSelectSensor={(sensor) => setSelectedSensor(sensor)}
                    />
                  </div>

                  <div className="lg:col-span-4 flex flex-col lg:h-[520px]">
                    <IoTTelemetryPanel
                      sensors={currentIncident.sensors}
                      selectedSensorId={selectedSensor?.id}
                      onSelectSensor={(sensor) => setSelectedSensor(sensor)}
                    />
                  </div>
                </div>

                {/* Bottom row: Clear AI Verification & Dispatch */}
                <div className="w-full">
                  <AIVerificationPanel
                    incident={currentIncident}
                    onAlertVerified={(result) => setLastVerificationResult(result)}
                  />
                </div>
              </div>
            )}

            {realDataTab === 'ai_decisions' && (
              <div className="space-y-4">
                <AIFilteredAlertsHub />
                <PromptEngineeringStudio currentIncident={currentIncident} />
              </div>
            )}

            {realDataTab === 'sensors' && (
              <SensorsMetricsDashboard />
            )}

            {realDataTab === 'cameras' && (
              <ThermalVisionCameras />
            )}

            {realDataTab === 'whatsapp' && (
              <WhatsAppBotDispatcher />
            )}

            {realDataTab === 'stream' && (
              <StreamLiveChannel currentIncidentTitle={currentIncident.title} />
            )}

            {realDataTab === 'ws' && (
              <WebSocketStreamStudio currentIncident={currentIncident} />
            )}

            {realDataTab === 'api' && (
              <div className="space-y-4">
                <ApiIntegrationHub />
                <StreamApiDocumentation />
                <ArchitectureDocs />
              </div>
            )}
          </div>
        )}

        {/* ========================================= */}
        {/* MODE 2: DATOS SIMULADOS / PRUEBAS        */}
        {/* ========================================= */}
        {systemMode === 'simulation' && (
          <div className="space-y-4">
            <SandboxTestingPanel />
            <FireSpreadSimulator />
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] px-4 text-center text-xs text-neutral-400 font-mono">
        NatureIntelligence • Santiago de Cali & Valle del Cauca • Monitoreo Real vs Sandbox de Pruebas • Canal <code className="text-neutral-400 font-semibold">/stream</code>
      </footer>
    </div>
  );
}
