import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Wind,
  Compass,
  Layers,
  Play,
  CheckCircle2,
  AlertTriangle,
  Send,
  TrendingUp,
  Activity
} from 'lucide-react';

interface SpreadServerResult {
  rateOfSpreadMetersPerMinute: number;
  rateOfSpreadKmPerHour: number;
  flameLengthMeters: number;
  timeToUrbanPerimeterMinutes: number;
  isochronesEstimated: Record<string, number>;
}

export const FireSpreadSimulator: React.FC = () => {
  // Simulator Parameters
  const [windSpeed, setWindSpeed] = useState<number>(32); // km/h
  const [windDirection, setWindDirection] = useState<'WNW' | 'W' | 'NW' | 'ESE'>('WNW');
  const [slopeDeg, setSlopeDeg] = useState<number>(30); // Degrees
  const [fuelMoisture, setFuelMoisture] = useState<'EXTREME' | 'HIGH' | 'MODERATE'>('EXTREME'); // Dryness
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  // Authoritative result returned by POST /api/simulate/spread (server-side Rothermel)
  const [serverResult, setServerResult] = useState<SpreadServerResult | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (!isMountedRef.current) return;
    setToastMessage(message);
    setToastType(type);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 4000);
  };

  // Rothermel-based tactical calculations
  // Rate of spread factor based on wind and slope
  const windFactor = Math.pow(windSpeed / 10, 1.4);
  const slopeFactor = 1 + 5.275 * Math.pow(Math.tan((slopeDeg * Math.PI) / 180), 2);
  const fuelFactor = fuelMoisture === 'EXTREME' ? 1.8 : fuelMoisture === 'HIGH' ? 1.3 : 0.8;

  // Rate of Spread in meters per minute (ROS)
  const rateOfSpreadMpm = Math.max(2, parseFloat((4.5 * windFactor * slopeFactor * fuelFactor).toFixed(1)));
  const rateOfSpreadKmh = (rateOfSpreadMpm * 60) / 1000;

  // Flame length in meters (Byram's fireline intensity formula approximation)
  const flameLengthM = parseFloat((0.0775 * Math.pow(rateOfSpreadMpm * 18, 0.46)).toFixed(1));

  // Time to reach closest urban perimeter (e.g. Juanambú / Bataclán at ~1400m distance)
  const distanceToHomesM = 1400;
  const timeToUrbanMin = Math.round(distanceToHomesM / rateOfSpreadMpm);

  // ESE blows from the valley towards the cordillera: the front is pushed AWAY from the
  // urban perimeter, so the ETA to the city does not apply for that vector.
  const threatensUrbanPerimeter = windDirection !== 'ESE';

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setModelError(null);
    try {
      const res = await fetch('/api/simulate/spread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windSpeed, slopeDeg, fuelMoisture, windDirection })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setServerResult(data.results as SpreadServerResult);
      showToast(
        `Modelo del servidor: ROS ${data.results.rateOfSpreadMetersPerMinute} m/min · ${
          data.results.timeToUrbanPerimeterMinutes ?? 'n/a'
        } min hasta cota urbana`
      );
    } catch (e: any) {
      setServerResult(null);
      setModelError(e?.message || 'No se pudo ejecutar el modelo de propagación en el servidor');
      showToast('No se pudo ejecutar el modelo de propagación', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApplyPreset = (preset: 'extreme' | 'moderate' | 'calm') => {
    if (preset === 'extreme') {
      setWindSpeed(45);
      setWindDirection('WNW');
      setSlopeDeg(35);
      setFuelMoisture('EXTREME');
    } else if (preset === 'moderate') {
      setWindSpeed(24);
      setWindDirection('W');
      setSlopeDeg(25);
      setFuelMoisture('HIGH');
    } else {
      setWindSpeed(8);
      setWindDirection('ESE');
      setSlopeDeg(15);
      setFuelMoisture('MODERATE');
    }
  };

  const handleBroadcastSimulation = async () => {
    if (isBroadcasting) return;
    setIsBroadcasting(true);
    try {
      const alertPayload = {
        sector: 'Cerro de las Tres Cruces (Escenario Simulado)',
        riskLevel: rateOfSpreadKmh > 1.5 ? 'CRITICAL' : 'HIGH',
        headline: threatensUrbanPerimeter
          ? `SIMULACIÓN TÁCTICA: Avance a ${rateOfSpreadKmh.toFixed(2)} km/h con alcance a cota urbana en ${timeToUrbanMin} min.`
          : `SIMULACIÓN TÁCTICA: Avance a ${rateOfSpreadKmh.toFixed(2)} km/h con viento ${windDirection} hacia la cordillera (sin avance hacia la cota urbana).`,
        frpMw: 165.0,
        windSpeedKmh: windSpeed,
        windDirection,
        threatenedAssets: threatensUrbanPerimeter
          ? ['Ecoparque Bataclán (15 min)', 'Barrio Juanambú (cota urbana)', 'Antenas de telecomunicaciones cima']
          : ['Cordillera Occidental / masas forestales', 'Antenas de telecomunicaciones cima'],
        tacticalAction: `Despliegue simulado de 3 máquinas de bomberos y cortafuegos en cota 1100m.`
      };

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload)
      });
      const alertData = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(alertData?.error || `HTTP ${res.status}`);
      }

      // Emit the dispatch event too: the toast below claims a WhatsApp dispatch, so
      // actually trigger it (the endpoint is a local simulation by design).
      const waRes = await fetch('/api/whatsapp/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientGroup: 'Central X-1 Bomberos Cali',
          sector: alertPayload.sector,
          riskLevel: alertPayload.riskLevel,
          headline: alertPayload.headline
        })
      });
      if (!waRes.ok) {
        throw new Error(`Despacho WhatsApp: HTTP ${waRes.status}`);
      }

      showToast('Escenario transmitido al canal /stream y despacho WhatsApp (simulado) emitido');
    } catch (e: any) {
      showToast(`No se pudo transmitir el escenario: ${e?.message || 'error de red'}`, 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base font-mono text-white">
                  Laboratorio de Simulación Táctica de Propagación (Modelo Rothermel)
                </h3>
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-semibold">
                  Modo Predictivo What-If
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Calcula el comportamiento físico del fuego en laderas de Cali variando viento del Pacífico, pendiente y sequedad del combustible.
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 text-[11px] hidden sm:inline">Escenarios Típicos:</span>
            <button
              onClick={() => handleApplyPreset('extreme')}
              className="px-2.5 py-1 rounded-lg bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-800/80 transition"
            >
              🔥 Vendaval Extremo (45 km/h)
            </button>
            <button
              onClick={() => handleApplyPreset('moderate')}
              className="px-2.5 py-1 rounded-lg bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 transition"
            >
              ⚠️ Típico Tarde (24 km/h)
            </button>
            <button
              onClick={() => handleApplyPreset('calm')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              🟢 Viento en Calma
            </button>
          </div>
        </div>

        {/* Interactive Sliders */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          {/* Wind Speed */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-cyan-400" /> Viento del Pacífico:
              </span>
              <strong className="text-cyan-300 font-bold">{windSpeed} km/h</strong>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={windSpeed}
              onChange={(e) => setWindSpeed(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Normal en Tres Cruces: 25 - 35 km/h</div>
          </div>

          {/* Wind Direction */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-400" /> Vector Dirección:
              </span>
              <strong className="text-amber-300 font-bold">{windDirection}</strong>
            </div>
            <select
              value={windDirection}
              onChange={(e: any) => setWindDirection(e.target.value)}
              className="w-full bg-slate-900 p-1.5 rounded border border-slate-800 text-xs text-white"
            >
              <option value="WNW">WNW (Pacífico hacia Juanambú / Ciudad)</option>
              <option value="W">W (Oeste hacia ladera urbana)</option>
              <option value="NW">NW (Noroeste hacia Bataclán)</option>
              <option value="ESE">ESE (Viento del Valle hacia cordillera)</option>
            </select>
            <div className="text-[10px] text-slate-500">WNW empuja humo directo a Comuna 2</div>
          </div>

          {/* Slope Inclination */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Pendiente Topográfica:</span>
              <strong className="text-emerald-400 font-bold">{slopeDeg}°</strong>
            </div>
            <input
              type="range"
              min="5"
              max="45"
              value={slopeDeg}
              onChange={(e) => setSlopeDeg(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Cresta de Tres Cruces: ~30° a 35°</div>
          </div>

          {/* Fuel Dryness */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Estrés Hídrico (NDVI):</span>
              <strong className="text-red-400 font-bold">{fuelMoisture}</strong>
            </div>
            <select
              value={fuelMoisture}
              onChange={(e: any) => setFuelMoisture(e.target.value)}
              className="w-full bg-slate-900 p-1.5 rounded border border-slate-800 text-xs text-red-300"
            >
              <option value="EXTREME">EXTREME (NDVI &lt; 0.20 - Pasto Seco)</option>
              <option value="HIGH">HIGH (NDVI 0.25 - Matorral Deshidratado)</option>
              <option value="MODERATE">MODERATE (NDVI 0.45 - Humedad Normal)</option>
            </select>
            <div className="text-[10px] text-slate-500">Temporada seca / Fenómeno de El Niño</div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 shadow-xl animate-fade-in border ${
            toastType === 'error'
              ? 'bg-red-950/90 border-red-700 text-red-200'
              : 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
          }`}
          role="status"
        >
          {toastType === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Simulation Results & Isochrones Projection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Projected Isochrones Map Visualizer (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="font-bold text-sm text-slate-100 font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Isócronas de Avance Proyectado del Fuego</span>
            </h4>
            <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800">
              Sector: Cerro Tres Cruces
            </span>
          </div>

          {/* Isochrone Diagram Canvas */}
          <div className="my-3 relative w-full h-[280px] bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden">
            {/* Mountain Grid Background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 opacity-90"></div>

            {/* Isochrone Ellipses Expanding Along Wind Vector */}
            <div className="relative flex items-center justify-center">
              {/* 60 min Contour */}
              <div
                className="absolute border-2 border-purple-500 bg-purple-500/10 rounded-full flex items-center justify-center animate-pulse"
                style={{ width: `${Math.min(270, rateOfSpreadMpm * 8)}px`, height: `${Math.min(180, rateOfSpreadMpm * 5)}px` }}
              >
                <span className="absolute -top-3 right-4 bg-purple-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                  +60 min
                </span>
              </div>

              {/* 45 min Contour */}
              <div
                className="absolute border-2 border-red-500 bg-red-500/15 rounded-full flex items-center justify-center"
                style={{ width: `${Math.min(200, rateOfSpreadMpm * 6)}px`, height: `${Math.min(130, rateOfSpreadMpm * 3.8)}px` }}
              >
                <span className="absolute -top-3 right-3 bg-red-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                  +45 min
                </span>
              </div>

              {/* 30 min Contour */}
              <div
                className="absolute border-2 border-amber-500 bg-amber-500/20 rounded-full flex items-center justify-center"
                style={{ width: `${Math.min(140, rateOfSpreadMpm * 4)}px`, height: `${Math.min(90, rateOfSpreadMpm * 2.5)}px` }}
              >
                <span className="absolute -top-3 right-2 bg-amber-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                  +30 min
                </span>
              </div>

              {/* 15 min Contour */}
              <div
                className="absolute border-2 border-yellow-400 bg-yellow-500/30 rounded-full flex items-center justify-center"
                style={{ width: `${Math.min(80, rateOfSpreadMpm * 2)}px`, height: `${Math.min(50, rateOfSpreadMpm * 1.5)}px` }}
              >
                <span className="absolute -top-3 bg-yellow-500 text-black font-mono text-[8px] font-bold px-1 rounded">
                  +15 min
                </span>
              </div>

              {/* Fire Ignition Point (Center) */}
              <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shadow-lg border-2 border-white z-10 animate-bounce">
                <Flame className="w-3 h-3 text-yellow-300" />
              </div>
            </div>

            {/* Direction Arrow */}
            <div className="absolute bottom-3 right-3 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
              <span>Vector Viento: {windDirection}</span>
              <span>➔</span>
            </div>
          </div>

          {/* Action to broadcast */}
          <div className="flex gap-2">
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs font-mono transition flex items-center justify-center gap-1.5"
            >
              {isSimulating ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Play className="w-3.5 h-3.5 fill-white" />
              )}
              <span>{isSimulating ? 'Ejecutando Rothermel en el servidor...' : 'Ejecutar Modelo de Propagación'}</span>
            </button>
            <button
              onClick={handleBroadcastSimulation}
              disabled={isBroadcasting}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-mono transition flex items-center gap-1.5 disabled:opacity-60"
            >
              {isBroadcasting ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Enviar a WhatsApp Bot</span>
            </button>
          </div>

          {/* Server-side model feedback */}
          {modelError && (
            <div
              className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/70 text-red-200 text-[11px] font-mono flex items-start gap-2 animate-fade-in"
              role="alert"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <span>{modelError}</span>
            </div>
          )}

          {serverResult && !modelError && (
            <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/60 text-[11px] font-mono text-purple-200">
              <span className="font-bold text-purple-300">Resultado del servidor (POST /api/simulate/spread):</span>{' '}
              ROS {serverResult.rateOfSpreadMetersPerMinute} m/min ({serverResult.rateOfSpreadKmPerHour} km/h) · llama{' '}
              {serverResult.flameLengthMeters} m · cota urbana en {serverResult.timeToUrbanPerimeterMinutes ?? 'n/a'} min
            </div>
          )}
        </div>

        {/* Right: Tactical Metrics & Impact Timeline (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
            <Activity className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-sm text-slate-100 font-mono">
              Comportamiento Táctico Estimado
            </h4>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">Velocidad Avance (ROS)</span>
              <span className="text-base font-bold text-amber-400">{rateOfSpreadMpm} m/min</span>
              <span className="text-[10px] text-slate-500 block">({rateOfSpreadKmh.toFixed(2)} km/h)</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">Longitud de Llama</span>
              <span className="text-base font-bold text-red-400">{flameLengthM} metros</span>
              <span className="text-[10px] text-slate-500 block">Ataque directo imposible si &gt; 2.5m</span>
            </div>
          </div>

          {/* Urban Impact Alert Box */}
          {threatensUrbanPerimeter ? (
            <div className="bg-red-950/40 p-3 rounded-xl border border-red-800/60 text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 text-red-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Tiempo Estimado de Impacto Urbano:</span>
              </div>
              <div className="text-white text-sm font-extrabold">
                {timeToUrbanMin} minutos hasta cota residencial
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Basado en pendiente de {slopeDeg}° y ráfagas continuas de {windSpeed} km/h ({windDirection}) empujando
                hacia Ecoparque Bataclán y sector Juanambú.
              </p>
            </div>
          ) : (
            <div className="bg-cyan-950/40 p-3 rounded-xl border border-cyan-800/60 text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <Wind className="w-4 h-4 text-cyan-400" />
                <span>Sin amenaza directa a la cota urbana:</span>
              </div>
              <div className="text-white text-sm font-extrabold">
                Viento {windDirection} → hacia la cordillera
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                El vector {windDirection} arrastra el frente y el humo hacia el interior de la Cordillera Occidental, en
                lugar de hacia Juanambú / Bataclán. Riesgo de impacto urbano por humo: bajo en este escenario.
              </p>
            </div>
          )}

          {/* Chronological Impact Timeline (derived from the computed ETA) */}
          <div className="space-y-1.5 text-xs font-mono">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              {threatensUrbanPerimeter ? 'Cronograma estimado de amenazas:' : 'Avance estimado del frente:'}
            </span>
            {(threatensUrbanPerimeter
              ? [
                  { at: Math.max(1, Math.round(timeToUrbanMin * 0.25)), label: 'Senderos Ecoparque Bataclán', tone: 'text-yellow-400' },
                  { at: Math.max(1, Math.round(timeToUrbanMin * 0.5)), label: 'Antenas de Telecomunicaciones', tone: 'text-amber-400' },
                  { at: Math.max(1, Math.round(timeToUrbanMin * 0.75)), label: 'Barrio Juanambú (Comuna 2)', tone: 'text-red-400' },
                  { at: Math.max(1, timeToUrbanMin), label: 'Avenida 6ta y Granada (Humo Severo)', tone: 'text-purple-400' }
                ]
              : [
                  { at: Math.max(1, Math.round(timeToUrbanMin * 0.25)), label: 'Ladera occidental del Cerro Tres Cruces', tone: 'text-cyan-400' },
                  { at: Math.max(1, Math.round(timeToUrbanMin * 0.5)), label: 'Cresta y antenas de la cima', tone: 'text-cyan-300' },
                  { at: Math.max(1, timeToUrbanMin), label: 'Interfaz de bosque hacia la cordillera', tone: 'text-emerald-400' }
                ])
            .map((step) => (
              <div
                key={step.label}
                className="p-2 rounded bg-slate-950 border border-slate-800 flex justify-between text-[11px]"
              >
                <span className={`${step.tone} font-bold`}>A los {step.at} min:</span>
                <span className="text-slate-200">{step.label}</span>
              </div>
            ))}
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed pt-1">
              Hitos escalados sobre el ETA calculado (
              {threatensUrbanPerimeter
                ? `${timeToUrbanMin} min a la cota urbana con viento ${windDirection}`
                : `${timeToUrbanMin} min al ritmo de propagación con viento ${windDirection} hacia la cordillera`}
              ).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
