import React, { useState } from 'react';
import { ThermalCameraFeed } from '../types/fire';
import { THERMAL_CAMERAS } from '../data/advancedSensors';
import {
  Camera,
  Eye,
  Flame,
  Activity,
  Layers,
  Sparkles,
  Wifi,
  Cpu,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Send,
  Compass,
  Zap,
  Radio
} from 'lucide-react';

interface ThermalVisionCamerasProps {
  onTriggerAlert?: (alertData: any) => void;
}

export const ThermalVisionCameras: React.FC<ThermalVisionCamerasProps> = ({ onTriggerAlert }) => {
  const [cameras, setCameras] = useState<ThermalCameraFeed[]>(THERMAL_CAMERAS);
  const [selectedCameraId, setSelectedCameraId] = useState<string>(THERMAL_CAMERAS[0].id);
  const [isInjectingDetection, setIsInjectingDetection] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeCamera = cameras.find((c) => c.id === selectedCameraId) || cameras[0];

  const toggleMode = (cameraId: string) => {
    setCameras((prev) =>
      prev.map((cam) =>
        cam.id === cameraId
          ? { ...cam, currentMode: cam.currentMode === 'THERMAL' ? 'OPTICAL' : 'THERMAL' }
          : cam
      )
    );
  };

  const handleTestVisionDetection = async () => {
    setIsInjectingDetection(true);

    const alertPayload = {
      sector: activeCamera.location,
      riskLevel: 'CRITICAL',
      headline: `Detección con Visión Artificial en ${activeCamera.name}: ${activeCamera.detections[0]?.label || 'Frente Térmico Crítico'}`,
      frpMw: 115.0,
      pm25UgM3: 240,
      windSpeedKmh: 32,
      windDirection: 'WNW',
      threatenedAssets: [
        'Cobertura vegetal en ladera',
        'Vía de evacuación y antenas de comunicaciones'
      ],
      tacticalAction: `Despacho inmediato ordenado por detección óptica/térmica de ${activeCamera.name}.`,
      capNotice: `ALERTA ROJA: Foco detectado por cámara ${activeCamera.name}. Despacho Bomberos Cali activado.`
    };

    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload)
      });

      if (onTriggerAlert) {
        onTriggerAlert(alertPayload);
      }

      setToastMessage(`¡Detección de ${activeCamera.name} transmitida a /stream y WhatsApp Bot!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsInjectingDetection(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base font-mono text-white">
                  Red de Cámaras Térmicas PTZ & Visión Artificial (IA Edge)
                </h3>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>4 Nodos In-Situ</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monitoreo continuo 360° en cerros tutelares de Cali con inferencia en tiempo real (YOLOv8 Edge: Detección de Humo y Fuego en &lt; 30 ms).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestVisionDetection}
              disabled={isInjectingDetection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xs font-semibold shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Simular Detección IA en Cámara</span>
            </button>
          </div>
        </div>

        {/* Camera Selector Pills */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
          {cameras.map((cam) => (
            <button
              key={cam.id}
              onClick={() => setSelectedCameraId(cam.id)}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-2 border ${
                selectedCameraId === cam.id
                  ? 'bg-amber-600 text-white border-amber-500 font-bold shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  cam.status === 'ALARM' ? 'bg-red-400 animate-ping' : 'bg-emerald-400'
                }`}
              ></span>
              <span>{cam.name.split('—')[1]?.trim() || cam.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-700 rounded-xl text-emerald-200 text-xs flex items-center gap-2 shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Active Camera Live Feed Window */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Video Simulation Canvas (8 cols) */}
        <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
          {/* Top Video Header */}
          <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                <span>REC LIVE</span>
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-white font-semibold">{activeCamera.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMode(activeCamera.id)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition"
              >
                Modo: <strong className="text-amber-400">{activeCamera.currentMode}</strong>
              </button>
              <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                {activeCamera.fps} FPS • {activeCamera.latencyMs} ms
              </span>
            </div>
          </div>

          {/* Visual Simulation Canvas */}
          <div className="relative w-full h-[360px] bg-slate-900 flex items-center justify-center overflow-hidden select-none">
            {/* Background Simulated Landscape */}
            <div
              className={`absolute inset-0 transition duration-700 ${
                activeCamera.currentMode === 'THERMAL'
                  ? 'bg-gradient-to-tr from-slate-950 via-purple-950 to-amber-900 opacity-95'
                  : 'bg-gradient-to-b from-sky-900 via-slate-800 to-emerald-950'
              }`}
            >
              {/* Mountain silhouettes */}
              <svg className="w-full h-full opacity-60" viewBox="0 0 800 400" preserveAspectRatio="none">
                <path d="M0,280 Q200,160 400,240 T800,200 L800,400 L0,400 Z" fill="#0f172a" />
                <path d="M150,300 Q350,200 550,270 T800,260 L800,400 L150,400 Z" fill="#020617" />
              </svg>

              {/* Thermal color heat glow when in THERMAL mode */}
              {activeCamera.currentMode === 'THERMAL' && (
                <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-gradient-radial from-amber-400 via-red-600 to-transparent opacity-80 blur-xl animate-pulse"></div>
              )}
            </div>

            {/* AI Bounding Boxes Overlaid by Vision AI */}
            {activeCamera.detections.map((det) => (
              <div
                key={det.id}
                className="absolute border-2 border-red-500 bg-red-500/15 rounded transition-all duration-300 pointer-events-none"
                style={{
                  left: `${det.bbox.x}%`,
                  top: `${det.bbox.y}%`,
                  width: `${det.bbox.w}%`,
                  height: `${det.bbox.h}%`
                }}
              >
                {/* AI Label Tag */}
                <div className="absolute -top-6 left-0 bg-red-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1.5 whitespace-nowrap">
                  <Flame className="w-3 h-3 text-amber-300" />
                  <span>{det.label}</span>
                  <span className="text-amber-200">({det.confidence}%)</span>
                  {det.tempC && <span className="text-yellow-300">[{det.tempC}°C]</span>}
                </div>
              </div>
            ))}

            {/* Thermal Palette Scale on Right */}
            {activeCamera.currentMode === 'THERMAL' && (
              <div className="absolute right-3 top-4 bottom-4 w-5 bg-gradient-to-t from-purple-900 via-red-600 via-amber-400 to-white rounded-md border border-slate-700/80 flex flex-col justify-between py-1 text-[8px] font-mono text-white text-center font-bold shadow-lg">
                <span>{activeCamera.maxTempC}°C</span>
                <span>250°C</span>
                <span>120°C</span>
                <span>{activeCamera.ambientTempC}°C</span>
              </div>
            )}

            {/* Target Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-16 h-16 border border-dashed border-cyan-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              </div>
            </div>

            {/* On-Screen Telemetry HUD */}
            <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur p-2 rounded-lg border border-slate-800 text-[11px] font-mono space-y-0.5">
              <div className="text-cyan-300 font-bold">
                CAM: {activeCamera.name.split('—')[0]} • ELEV: {activeCamera.elevationM}m
              </div>
              <div className="text-slate-400">
                LAT/LNG: {activeCamera.lat.toFixed(4)}, {activeCamera.lng.toFixed(4)}
              </div>
              <div className="text-amber-400 font-semibold">
                TEMP MÁX: {activeCamera.maxTempC}°C | AMBIENTE: {activeCamera.ambientTempC}°C
              </div>
            </div>
          </div>
        </div>

        {/* Camera Details & AI Stats Panel (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-sm text-slate-100 font-mono">
                Diagnóstico de Visión Artificial
              </h4>
            </div>

            <div className="mt-3 space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Modelo Inferencia:</span>
                <span className="text-cyan-300 font-bold">YOLOv8-Wildfire Edge</span>
              </div>

              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Latencia Inferencia:</span>
                <span className="text-emerald-400 font-bold">{activeCamera.latencyMs} ms</span>
              </div>

              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Tasa de Cuadros:</span>
                <span className="text-white font-bold">{activeCamera.fps} FPS</span>
              </div>

              <div className="flex justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Detecciones Activas:</span>
                <span className="text-red-400 font-bold">{activeCamera.detections.length} Focos</span>
              </div>
            </div>

            {/* Detection List */}
            <div className="mt-3 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                Foco Detectado en Cuadro:
              </div>
              {activeCamera.detections.map((det) => (
                <div
                  key={det.id}
                  className="p-2 rounded-lg bg-red-950/40 border border-red-800/60 text-xs font-mono flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-slate-200">{det.label}</span>
                  </div>
                  <span className="text-amber-300 font-bold">{det.confidence}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick trigger action */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={handleTestVisionDetection}
              disabled={isInjectingDetection}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Escalar Detección a Bomberos Cali (WhatsApp)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
