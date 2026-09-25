/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import {
  Flame,
  Radio,
  Satellite,
  Layers,
  Sparkles,
  MapPin,
  ChevronDown,
  Activity,
  Wind,
  Code2,
  Send,
  BellRing,
  ExternalLink,
  Zap,
  Camera,
  MessageSquare,
  TrendingUp,
  Cpu,
  CheckCircle2,
  FlaskConical,
  Gauge,
  Brain
} from 'lucide-react';

export default function App() {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(MOCK_INCIDENTS[0].id);

  // Top-Level Mode: Datos Reales (Producción) vs Datos Simulados (Sandbox)
  const [systemMode, setSystemMode] = useState<'real' | 'simulation'>('real');

  // Subtabs within Real Data Mode
  const [realDataTab, setRealDataTab] = useState<'map' | 'ai_decisions' | 'sensors' | 'cameras' | 'whatsapp' | 'api'>('map');

  const [selectedSensor, setSelectedSensor] = useState<IoTSensorNode | undefined>(undefined);
  const [lastVerificationResult, setLastVerificationResult] = useState<AIVerificationResult | null>(null);

  const currentIncident: FireIncidentScenario =
    MOCK_INCIDENTS.find((inc) => inc.id === selectedIncidentId) || MOCK_INCIDENTS[0];

  const totalFRP = currentIncident.hotspots.reduce((acc, h) => acc + h.frp, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-[2000]">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Region */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-red-500 opacity-60"></span>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-600 via-amber-600 to-orange-500 flex items-center justify-center shadow-lg border border-amber-400/40">
                <Flame className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold font-mono tracking-wider text-white">
                  PYROWATCH<span className="text-amber-400 font-extrabold">.VALLE</span>
                </h1>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  CALI EN VIVO
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hidden md:inline">
                  🛰️ GOES-16 ABI 15m
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Detección Satelital, Red de Sensores IoT, Cámaras Térmicas & Bot WhatsApp
              </p>
            </div>
          </div>

          {/* MAIN DUAL MODE TOGGLE: DATOS REALES VS DATOS SIMULADOS (SANDBOX) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setSystemMode('real')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition ${
                systemMode === 'real'
                  ? 'bg-emerald-600 text-white shadow-lg font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
              <span>🟢 Datos Reales (Producción)</span>
            </button>

            <button
              onClick={() => setSystemMode('simulation')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition ${
                systemMode === 'simulation'
                  ? 'bg-purple-600 text-white shadow-lg font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-300" />
              <span>🧪 Datos Simulados / Pruebas (Sandbox)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sub-Navigation Bar for Real Data Mode */}
      {systemMode === 'real' && (
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 font-mono">
            {/* Real Data View Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setRealDataTab('map')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  realDataTab === 'map'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Mapa Táctico (FIRMS + GOES-16)</span>
              </button>

              <button
                onClick={() => setRealDataTab('ai_decisions')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  realDataTab === 'ai_decisions'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Brain className="w-3 h-3 text-purple-400" />
                <span>Decisiones de IA & Filtros</span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
              </button>

              <button
                onClick={() => setRealDataTab('sensors')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  realDataTab === 'sensors'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Gauge className="w-3 h-3 text-cyan-400" />
                <span>Sensores & Métricas IoT</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              </button>

              <button
                onClick={() => setRealDataTab('cameras')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  realDataTab === 'cameras'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-3 h-3 text-orange-400" />
                <span>Cámaras Térmicas PTZ (IA)</span>
              </button>

              <button
                onClick={() => setRealDataTab('whatsapp')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  realDataTab === 'whatsapp'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                <span>Bot WhatsApp Bomberos Cali</span>
              </button>

              <button
                onClick={() => setRealDataTab('api')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  realDataTab === 'api'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3 h-3 text-cyan-300" />
                <span>Integrar API (/stream)</span>
              </button>
            </div>

            {/* Quick Sector Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-amber-400 font-semibold flex items-center gap-1 shrink-0 text-[11px]">
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
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
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
                  <div className="lg:col-span-8 flex flex-col h-[520px]">
                    <MapViewer
                      incident={currentIncident}
                      onSelectSensor={(sensor) => setSelectedSensor(sensor)}
                    />
                  </div>

                  <div className="lg:col-span-4 flex flex-col h-[520px]">
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
              <AIFilteredAlertsHub />
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

            {realDataTab === 'api' && (
              <ApiIntegrationHub />
            )}
          </div>
        )}

        {/* ========================================= */}
        {/* MODE 2: DATOS SIMULADOS / PRUEBAS        */}
        {/* ========================================= */}
        {systemMode === 'simulation' && (
          <SandboxTestingPanel />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-3 text-center text-xs text-slate-500 font-mono">
        PyroWatch Valle • Santiago de Cali & Valle del Cauca • Monitoreo Real vs Sandbox de Pruebas • Canal <code className="text-cyan-400 font-semibold">/stream</code>
      </footer>
    </div>
  );
}
