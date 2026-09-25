import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Flame,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Send,
  Wifi,
  WifiOff,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Terminal,
  Clock,
  Compass,
  Wind,
  CheckCircle2,
  BellRing,
  Filter,
  Play,
  Square
} from 'lucide-react';

interface StreamLiveChannelProps {
  currentIncidentTitle?: string;
}

export const StreamLiveChannel: React.FC<StreamLiveChannelProps> = ({ currentIncidentTitle }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeChannel, setActiveChannel] = useState<'all' | 'alerts' | 'telemetry' | 'analysis'>('all');
  const [events, setEvents] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeListeners, setActiveListeners] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom alert trigger form state
  const [customSector, setCustomSector] = useState<string>('Cerro de las Tres Cruces (Sector Bataclán)');
  const [customRisk, setCustomRisk] = useState<'CRITICAL' | 'HIGH' | 'MODERATE'>('CRITICAL');
  const [customHeadline, setCustomHeadline] = useState<string>(
    'Frente de fuego activo con avance acelerado hacia el Ecoparque Bataclán'
  );
  const [customFrp, setCustomFrp] = useState<number>(145);
  const [customWind, setCustomWind] = useState<number>(32);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const eventsBottomRef = useRef<HTMLDivElement>(null);

  // Connect to the real /stream endpoint via native EventSource
  useEffect(() => {
    connectToStream(activeChannel);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [activeChannel]);

  const connectToStream = (channel: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const streamUrl = `/stream?channel=${channel}`;
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    // Generic messages
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        handleIncomingPacket('message', parsed);
      } catch (e) {
        console.error('Error parsing SSE event data', e);
      }
    };

    // Specific SSE event listeners
    es.addEventListener('connected', (event: any) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.totalActiveListeners) {
          setActiveListeners(parsed.totalActiveListeners);
        }
        handleIncomingPacket('connected', parsed);
      } catch (e) {}
    });

    es.addEventListener('initial_alerts', (event: any) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.alerts && Array.isArray(parsed.alerts)) {
          parsed.alerts.forEach((alert: any) => {
            handleIncomingPacket('alert', { channel: 'alerts', data: { type: 'EMERGENCY_ALERT', alert } });
          });
        }
      } catch (e) {}
    });

    es.addEventListener('alert', (event: any) => {
      try {
        const parsed = JSON.parse(event.data);
        handleIncomingPacket('alert', parsed);
      } catch (e) {}
    });

    es.addEventListener('emergency_alert', (event: any) => {
      try {
        const parsed = JSON.parse(event.data);
        handleIncomingPacket('alert', parsed);
      } catch (e) {}
    });

    es.addEventListener('telemetry', (event: any) => {
      try {
        const parsed = JSON.parse(event.data);
        handleIncomingPacket('telemetry', parsed);
      } catch (e) {}
    });

    es.addEventListener('sensor_update', (event: any) => {
      try {
        const parsed = JSON.parse(event.data);
        handleIncomingPacket('telemetry', parsed);
      } catch (e) {}
    });

    es.addEventListener('analysis', (event: any) => {
      try {
        const parsed = JSON.parse(event.data);
        handleIncomingPacket('analysis', parsed);
      } catch (e) {}
    });

    es.onerror = () => {
      setIsConnected(false);
    };
  };

  const handleIncomingPacket = (eventType: string, data: any) => {
    setEvents((prev) => [
      {
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        eventType,
        receivedAt: new Date().toLocaleTimeString(),
        data
      },
      ...prev.slice(0, 99)
    ]);
  };

  const handleDisconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  };

  const handleReconnect = () => {
    connectToStream(activeChannel);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Trigger test alert to /stream via POST
  const handleTriggerTestAlert = async () => {
    setIsTriggering(true);
    try {
      const payload = {
        sector: customSector,
        riskLevel: customRisk,
        headline: customHeadline,
        frpMw: customFrp,
        windSpeedKmh: customWind,
        windDirection: 'WNW',
        pm25UgM3: customRisk === 'CRITICAL' ? 295 : 160,
        threatenedAssets: [
          'Viviendas perimetrales en comuna de ladera',
          'Reserva de vegetación y fauna silvestre',
          'Vía de evacuación y antenas de comunicaciones'
        ],
        tacticalAction: 'Despacho de 2 carros cisterna y unidad forestal de Bomberos Cali (X-1). Línea cortafuego táctica.',
        capNotice: `ALERTA ${customRisk} BOMBEROS CALI: DETECCIÓN EN ${customSector.toUpperCase()}. ATENDER INSTRUCCIONES DE EVACUACIÓN.`,
        radioDispatch: `Central X-1 a Móviles: Confirmado frente activo en ${customSector}. Viento a ${customWind} km/h.`
      };

      const res = await fetch('/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setToastMessage('¡Alerta transmitida en tiempo real al canal /stream!');
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTriggering(false);
    }
  };

  const streamFullUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}/stream`
      : 'http://localhost:3000/stream';

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-center ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}
            >
              {isConnected ? <Wifi className="w-5 h-5 animate-pulse" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-white tracking-wide">
                  Canal de Streaming /stream (Tiempo Real)
                </h2>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                    isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                >
                  {isConnected ? 'EN LÍNEA (STREAM SSE ACTIVO)' : 'DESCONECTADO'}
                </span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  {activeListeners} Clientes Conectados
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Canal HTTP Server-Sent Events (SSE) y WebSocket abierto para suscripción en vivo a alertas de incendios y telemetría de Cali.
              </p>
            </div>
          </div>

          {/* Quick Connect / Disconnect and Copy URL */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
              <code className="text-amber-300">{streamFullUrl}</code>
              <button
                onClick={() => copyToClipboard(streamFullUrl, 'streamurl')}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Copiar URL"
              >
                {copiedKey === 'streamurl' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <a
                href="/stream"
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Abrir /stream directo en nueva pestaña"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 text-xs font-semibold transition"
              >
                <Square className="w-3 h-3 fill-red-300" />
                <span>Pausar</span>
              </button>
            ) : (
              <button
                onClick={handleReconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Conectar</span>
              </button>
            )}
          </div>
        </div>

        {/* Channel Filters */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-mono text-[11px]">Filtrar Canal de /stream:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'alerts', 'telemetry', 'analysis'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition ${
                  activeChannel === ch
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
                }`}
              >
                #{ch}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-700 rounded-xl text-emerald-200 text-xs flex items-center gap-2 shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Grid: Live Feed (7 cols) + Trigger & Dispatcher (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Real-time Alert & Event Feed (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[600px] bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-400 animate-pulse" />
              <h3 className="font-bold text-sm text-slate-100 font-mono">
                Flujo de Eventos en Vivo ({events.length} recibidos)
              </h3>
            </div>
            <button
              onClick={() => setEvents([])}
              className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded hover:bg-slate-800 transition"
            >
              Limpiar Flujo
            </button>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1">
            {events.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-xl">
                <Wifi className="w-8 h-8 text-slate-600 mb-2 animate-bounce" />
                <p className="text-sm font-semibold text-slate-300">Conexión activa a /stream</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Esperando paquetes de telemetría y alertas automáticas de Cali y Valle del Cauca...
                </p>
              </div>
            ) : (
              events.map((evt) => {
                const isAlert = evt.data?.data?.type === 'EMERGENCY_ALERT' || evt.data?.alert || evt.eventType === 'alert';
                const alertData = evt.data?.data?.alert || evt.data?.alert;
                const isTelemetry = evt.data?.channel === 'telemetry' || evt.data?.data?.type === 'SENSOR_UPDATE';
                const isConnectedEvt = evt.eventType === 'connected';

                if (isAlert && alertData) {
                  return (
                    <div
                      key={evt.id}
                      className="p-3.5 rounded-xl border border-red-800/80 bg-red-950/30 shadow-lg space-y-2 animate-fade-in"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-red-600 text-white">
                            <Flame className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <span className="text-xs font-bold font-mono text-red-300 uppercase">
                              {alertData.sector}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              ID: {alertData.alertId} • Recibido: {evt.receivedAt}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            alertData.riskLevel === 'CRITICAL'
                              ? 'bg-red-500 text-white animate-pulse'
                              : 'bg-amber-500 text-black'
                          }`}
                        >
                          Riesgo: {alertData.riskLevel}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-white leading-snug">
                        {alertData.headline}
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1.5 px-2 bg-slate-950/70 rounded-lg text-center font-mono text-[11px] border border-slate-800">
                        <div>
                          <div className="text-[9px] text-slate-400">Potencia FRP</div>
                          <div className="font-bold text-red-400">{alertData.frpMw} MW</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400">Viento Pacífico</div>
                          <div className="font-bold text-cyan-300">
                            {alertData.windSpeedKmh} km/h {alertData.windDirection}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400">PM2.5 Humo</div>
                          <div className="font-bold text-amber-300">{alertData.pm25UgM3} µg/m³</div>
                        </div>
                      </div>

                      {alertData.tacticalAction && (
                        <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800/80">
                          <strong className="text-amber-400 font-mono">Despacho Bomberos Cali:</strong>{' '}
                          {alertData.tacticalAction}
                        </div>
                      )}
                    </div>
                  );
                }

                if (isTelemetry && evt.data?.data?.sensor) {
                  const sensor = evt.data.data.sensor;
                  return (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs font-mono flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-200">{sensor.name}</span>
                          <span className="text-slate-500 text-[10px] ml-2">({evt.receivedAt})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className={sensor.pm25 > 50 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                          PM2.5: {sensor.pm25}
                        </span>
                        <span className="text-cyan-300">
                          {sensor.windSpeed} km/h {sensor.windDir}
                        </span>
                        <span className="text-amber-300">{sensor.temp}°C</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={evt.id}
                    className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 text-xs font-mono truncate"
                  >
                    <span className="text-cyan-400 font-semibold">[{evt.eventType.toUpperCase()}]</span>{' '}
                    <span className="text-slate-400 text-[10px]">({evt.receivedAt})</span>{' '}
                    {JSON.stringify(evt.data)}
                  </div>
                );
              })
            )}
            <div ref={eventsBottomRef} />
          </div>
        </div>

        {/* Right: Trigger Alert to /stream + Quick Test (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Manual Alert Injector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
              <Send className="w-4 h-4 text-red-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-100 font-mono">
                  Emitir Alerta a /stream (Simulador)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Transmite un paquete JSON POST hacia /stream que se enviará instantáneamente a todos los clientes.
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2.5 text-xs font-mono">
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Sector de Cali / Valle</label>
                <input
                  type="text"
                  value={customSector}
                  onChange={(e) => setCustomSector(e.target.value)}
                  className="w-full bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Nivel de Riesgo</label>
                  <select
                    value={customRisk}
                    onChange={(e: any) => setCustomRisk(e.target.value)}
                    className="w-full bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 text-xs text-amber-300"
                  >
                    <option value="CRITICAL">CRITICAL (Rojo)</option>
                    <option value="HIGH">HIGH (Naranja)</option>
                    <option value="MODERATE">MODERATE (Amarillo)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">FRP Satelital (MW)</label>
                  <input
                    type="number"
                    value={customFrp}
                    onChange={(e) => setCustomFrp(Number(e.target.value))}
                    className="w-full bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 text-xs text-red-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Titular de Emergencia</label>
                <textarea
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 text-xs text-slate-200 resize-none font-sans"
                />
              </div>

              <button
                onClick={handleTriggerTestAlert}
                disabled={isTriggering}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-semibold text-xs shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {isTriggering ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Transmitiendo a /stream...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-3.5 h-3.5" />
                    <span>Disparar Alerta en Vivo a /stream</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick cURL Instructions */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-xs font-mono text-slate-200">
                  Conexión Inmediata con cURL
                </span>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    `curl -N -H "Accept: text/event-stream" "${streamFullUrl}"`,
                    'curlcmd'
                  )
                }
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedKey === 'curlcmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copiar</span>
              </button>
            </div>

            <pre className="mt-2.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
              curl -N -H "Accept: text/event-stream" "{streamFullUrl}"
            </pre>
            <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              Ejecuta este comando en cualquier terminal de Linux, Mac o Windows. Mantendrá una conexión HTTP abierta imprimiendo cada alerta en tiempo real en formato SSE.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
