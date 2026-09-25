import React, { useState } from 'react';
import { IoTSensorNode } from '../types/fire';
import { Activity, Wind, Thermometer, Droplets, Gauge, AlertTriangle, ShieldCheck, Battery, RefreshCw, Zap } from 'lucide-react';

interface IoTTelemetryPanelProps {
  sensors: IoTSensorNode[];
  selectedSensorId?: string;
  onSelectSensor?: (sensor: IoTSensorNode) => void;
}

export const IoTTelemetryPanel: React.FC<IoTTelemetryPanelProps> = ({
  sensors,
  selectedSensorId,
  onSelectSensor
}) => {
  // Local state to allow simulating live fluctuation in the maquetado
  const [simulatedOffset, setSimulatedOffset] = useState<number>(0);
  const [isSimulatingBurst, setIsSimulatingBurst] = useState<boolean>(false);

  const handleSimulateBurst = () => {
    setIsSimulatingBurst(true);
    setSimulatedOffset((prev) => (prev > 0 ? 0 : 25));
    setTimeout(() => {
      setIsSimulatingBurst(false);
    }, 1200);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider font-mono">
              Red IoT Cali & Valle
            </h3>
            <p className="text-xs text-slate-400">
              Estaciones CVC, DAGRD y Bomberos en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateBurst}
            disabled={isSimulatingBurst}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded font-mono border transition ${
              simulatedOffset > 0
                ? 'bg-amber-950 text-amber-300 border-amber-700'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Simular ráfaga de viento y aumento de humo en la maqueta"
          >
            <Zap className={`w-3 h-3 ${isSimulatingBurst ? 'animate-bounce text-amber-400' : 'text-slate-400'}`} />
            <span>{simulatedOffset > 0 ? 'Ráfaga Activa' : 'Simular Ráfaga'}</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{sensors.length} Nodos</span>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-3 overflow-y-auto max-h-[380px] pr-1">
        {sensors.map((sensor) => {
          const isCritical = sensor.status === 'critical';
          const isElevated = sensor.status === 'elevated';
          const isSelected = selectedSensorId === sensor.id;

          // Apply simulated fluctuations if active
          const livePm25 = sensor.metrics.pm25 + (isCritical || isElevated ? simulatedOffset : Math.floor(simulatedOffset / 4));
          const liveWindSpeed = sensor.metrics.windSpeedKmh + (simulatedOffset > 0 ? 8 : 0);

          return (
            <div
              key={sensor.id}
              onClick={() => onSelectSensor?.(sensor)}
              className={`p-3.5 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? 'border-amber-500/80 bg-slate-800/90 shadow-lg ring-1 ring-amber-500/50'
                  : isCritical
                  ? 'border-red-900/80 bg-red-950/20 hover:border-red-600/70'
                  : 'border-slate-800 bg-slate-850/60 hover:border-slate-700'
              }`}
            >
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white font-mono">{sensor.name}</span>
                    {isCritical ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                        <AlertTriangle className="w-2.5 h-2.5" /> CRÍTICO
                      </span>
                    ) : isElevated ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        PREALERTA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <ShieldCheck className="w-2.5 h-2.5" /> NORMAL
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {sensor.locationName} • Alt: {sensor.elevationM} msnm
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{sensor.metrics.batteryPercent}%</span>
                </div>
              </div>

              {/* Sensor Indicators Grid */}
              <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                {/* PM2.5 Smoke */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] uppercase font-mono text-slate-400">PM2.5 Humo</div>
                  <div className={`text-base font-bold font-mono ${livePm25 > 50 ? 'text-red-400' : 'text-slate-100'}`}>
                    {livePm25}
                  </div>
                  <div className="text-[9px] text-slate-400">µg/m³</div>
                </div>

                {/* CO ppm */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Monóxido CO</div>
                  <div className={`text-base font-bold font-mono ${sensor.metrics.coPpm > 10 ? 'text-red-400' : 'text-slate-100'}`}>
                    {sensor.metrics.coPpm}
                  </div>
                  <div className="text-[9px] text-slate-400">ppm</div>
                </div>

                {/* Temp / Hum */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Temp / Hum</div>
                  <div className="text-xs font-bold text-amber-300 font-mono mt-0.5">
                    {sensor.metrics.tempC}°C
                  </div>
                  <div className="text-[10px] text-cyan-300 font-mono">
                    {sensor.metrics.humidityPercent}% RH
                  </div>
                </div>

                {/* Wind */}
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] uppercase font-mono text-slate-400">Viento Pacífico</div>
                  <div className="text-xs font-bold text-sky-300 font-mono mt-0.5">
                    {liveWindSpeed} km/h
                  </div>
                  <div className="text-[10px] text-amber-400 font-mono flex items-center justify-center gap-0.5">
                    <Wind className="w-2.5 h-2.5" />
                    <span>{sensor.metrics.windDirectionCardinal}</span>
                  </div>
                </div>
              </div>

              {/* Flame Detector status */}
              {sensor.metrics.flameDetected && (
                <div className="mt-2.5 px-2.5 py-1 bg-red-900/40 border border-red-700/60 rounded text-[11px] text-red-200 flex items-center gap-1.5 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>¡SENSOR INFRARROJO / LLAMA DIRECTA DETECTADA EN LADERA!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
