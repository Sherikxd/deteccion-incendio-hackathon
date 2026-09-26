import React, { useState, useEffect, useRef } from 'react';
import { wsClient, WebSocketMessage, StreamChannel } from '../services/websocketService';
import { FireIncidentScenario } from '../types/fire';
import { AVAILABLE_MODELS } from '../services/openRouterService';
import {
  Sparkles,
  Zap,
  Activity,
  Terminal,
  Code2,
  Copy,
  Check,
  Send,
  Wifi,
  WifiOff,
  Filter,
  Trash2,
  CheckCircle2,
  Server,
  AlertTriangle
} from 'lucide-react';
import { copyTextToClipboard } from '../utils/copyToClipboard';

interface WebSocketStreamStudioProps {
  currentIncident: FireIncidentScenario;
}

/** Terminal frame with a stable React key (msg.timestamp alone is not unique enough). */
type TerminalFrame = WebSocketMessage & { __id: number };

const defaultPromptFor = (incident: FireIncidentScenario): string =>
  `Emitir boletín de emergencia táctico inmediato para el ${incident.title}. Reportar velocidad de viento, riesgo a la interfaz urbana y activar unidades de Bomberos Cali.`;

export const WebSocketStreamStudio: React.FC<WebSocketStreamStudioProps> = ({
  currentIncident
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latency, setLatency] = useState<number | undefined>(undefined);
  const [selectedChannel, setSelectedChannel] = useState<StreamChannel>('all');
  const [messages, setMessages] = useState<TerminalFrame[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const frameIdCounter = useRef<number>(0);

  // AI Stream state
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);
  const [aiPrompt, setAiPrompt] = useState<string>(defaultPromptFor(currentIncident));
  // Tracks the auto-generated default so a prompt edited by the operator is not
  // silently overwritten when they switch sector.
  const lastDefaultPromptRef = useRef<string>(defaultPromptFor(currentIncident));
  const [isStreamingAi, setIsStreamingAi] = useState<boolean>(false);
  const [streamedText, setStreamedText] = useState<string>('');
  const [streamTokensCount, setStreamTokensCount] = useState<number>(0);
  const [streamError, setStreamError] = useState<string | null>(null);

  // The server assigns the streamId in STREAM_START; chunks broadcast on the shared
  // #analysis channel must be filtered by it, otherwise concurrent streams from other
  // operators get mixed into this output window.
  const activeStreamIdRef = useRef<string | null>(null);
  const streamWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ingestion Simulator state
  const [customSensorName, setCustomSensorName] = useState<string>('Dron Térmico Bomberos Cali #3');
  const [customPm25, setCustomPm25] = useState<number>(260);
  const [customWindSpeed, setCustomWindSpeed] = useState<number>(34);
  const [customWindDir, setCustomWindDir] = useState<string>('WNW');
  const [sentPacketToast, setSentPacketToast] = useState<string | null>(null);

  // Code snippet tab
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'nodejs' | 'curl' | 'browser'>('python');

  const terminalRef = useRef<HTMLDivElement>(null);

  const clearStreamWatchdog = () => {
    if (streamWatchdogRef.current) {
      clearTimeout(streamWatchdogRef.current);
      streamWatchdogRef.current = null;
    }
  };

  // If STREAM_START never arrives (socket dropped mid-handshake), release the spinner
  // instead of leaving the UI spinning forever.
  const startStreamWatchdog = () => {
    clearStreamWatchdog();
    streamWatchdogRef.current = setTimeout(() => {
      setIsStreamingAi(false);
      setStreamError('Sin respuesta del stream de IA. Verifica la conexión o vuelve a intentarlo.');
      streamWatchdogRef.current = null;
    }, 20000);
  };

  // Newest frames are prepended, so keep the viewport pinned to the top of the terminal
  useEffect(() => {
    terminalRef.current?.scrollTo({ top: 0 });
  }, [messages.length]);

  // Update the default prompt when the incident changes, but never clobber a
  // customized prompt: only replace it while it still matches the previous default.
  useEffect(() => {
    const next = defaultPromptFor(currentIncident);
    setAiPrompt((prev) => (prev === lastDefaultPromptRef.current ? next : prev));
    lastDefaultPromptRef.current = next;
  }, [currentIncident.id, currentIncident.title]);

  // Connect to WebSocket client
  useEffect(() => {
    wsClient.connect();

    const unsubStatus = wsClient.addStatusListener((connected, lat) => {
      setIsConnected(connected);
      if (lat !== undefined) setLatency(lat);
    });

    const unsubMessages = wsClient.addMessageListener((msg) => {
      setMessages((prev) => [{ ...msg, __id: frameIdCounter.current++ }, ...prev.slice(0, 99)]); // keep last 100 messages

      // Handle AI stream chunks (only for the stream this component started)
      if (msg.channel === 'analysis') {
        if (msg.type === 'STREAM_START') {
          activeStreamIdRef.current = msg.streamId || null;
          setIsStreamingAi(true);
          setStreamedText('');
          setStreamTokensCount(0);
          setStreamError(null);
          startStreamWatchdog();
        } else if (msg.type === 'STREAM_CHUNK') {
          if (msg.streamId && msg.streamId === activeStreamIdRef.current && msg.chunk) {
            setStreamedText((prev) => prev + msg.chunk);
            setStreamTokensCount((prev) => prev + 1);
          }
        } else if (msg.type === 'STREAM_COMPLETE') {
          if (msg.streamId && msg.streamId === activeStreamIdRef.current) {
            clearStreamWatchdog();
            setIsStreamingAi(false);
            if (msg.fullText) {
              setStreamedText(msg.fullText);
            }
          }
        } else if (msg.type === 'STREAM_ERROR') {
          if (msg.streamId && msg.streamId === activeStreamIdRef.current) {
            clearStreamWatchdog();
            setIsStreamingAi(false);
            setStreamError(msg.error || 'El stream de IA finalizó con un error desconocido.');
          }
        }
      }
    });

    return () => {
      clearStreamWatchdog();
      unsubStatus();
      unsubMessages();
      // This component is the only consumer of the shared client: close the socket
      // instead of leaving it reconnecting forever in the background.
      wsClient.disconnect();
    };
  }, []);

  const handleStartAiStream = () => {
    setIsStreamingAi(true);
    setStreamedText('');
    setStreamTokensCount(0);
    setStreamError(null);
    startStreamWatchdog();

    // send() queues the frame while the handshake is still in progress and flushes it
    // on open, so calling connect() here cannot make the request get lost.
    if (!wsClient.isConnectedNow()) {
      wsClient.connect();
    }
    const accepted = wsClient.requestAiStream(aiPrompt, selectedModel);
    if (!accepted) {
      clearStreamWatchdog();
      setIsStreamingAi(false);
      setStreamError('No hay conexión con el gateway WebSocket. Pulsa Conectar e inténtalo de nuevo.');
    }
  };

  const handleSendCustomTelemetry = () => {
    const sensorPayload = {
      id: `ext-${Date.now().toString(36)}`,
      name: customSensorName,
      locationName: currentIncident.region,
      lat: currentIncident.center[0],
      lng: currentIncident.center[1],
      pm25: customPm25,
      temp: 33.5,
      humidity: 20,
      windSpeed: customWindSpeed,
      windDir: customWindDir,
      flame: customPm25 > 200,
      source: 'APLICACION_EXTERNA_WS'
    };

    wsClient.publishTelemetry(sensorPayload);
    setSentPacketToast(`Paquete de telemetría transmitido por WebSocket (ID: ${sensorPayload.id})`);
    setTimeout(() => setSentPacketToast(null), 3000);
  };

  const copyToClipboard = (text: string, id: string) => {
    copyTextToClipboard(text).then((copied) => {
      if (!copied) return;
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const filteredMessages =
    selectedChannel === 'all'
      ? messages
      : messages.filter((m) => m.channel === selectedChannel || m.channel === 'system');

  const currentWsUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      : 'ws://localhost:3000/ws';

  return (
    <div className="space-y-4">
      {/* Top Banner: WebSocket Server Status & Config */}
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
                  Servidor WebSocket & Canal de Stream
                </h2>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                    isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                >
                  {isConnected ? 'EN LÍNEA (STREAM ACTIVO)' : 'RECONECTANDO'}
                </span>
                {latency !== undefined && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    Ping: {latency} ms
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Gateway de transmisión en tiempo real con OpenRouter AI para integración con apps móviles, GIS y bomberos.
              </p>
            </div>
          </div>

          {/* Connection URL Bar */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
            <Server className="w-3.5 h-3.5 text-amber-400 ml-1" />
            <code className="text-xs font-mono text-amber-300 px-1">{currentWsUrl}</code>
            <button
              onClick={() => copyToClipboard(currentWsUrl, 'wsurl')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition"
            >
              {copiedKey === 'wsurl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'wsurl' ? 'Copiado' : 'Copiar URL'}</span>
            </button>
          </div>
        </div>

        {/* Channel Filter Selector */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-mono text-[11px]">Canales de Transmisión:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'telemetry', 'incidents', 'analysis', 'alerts'] as StreamChannel[]).map((ch) => (
              <button
                key={ch}
                onClick={() => {
                  setSelectedChannel(ch);
                  wsClient.setSubscribedChannels([ch]);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition ${
                  selectedChannel === ch
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

      {/* Main Grid: Stream Executer + Terminal Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Live OpenRouter AI Stream through WebSocket (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100 font-mono">
                    Canal #analysis — Stream IA con OpenRouter
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ejecuta inferencia y transmite chunks token a token por WebSocket
                  </p>
                </div>
              </div>

              {/* Model Selector */}
              <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs">
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
            </div>

            {/* Prompt input */}
            <div className="mt-3 space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400">
                Instrucción Táctica para Inferencia Streaming:
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none font-mono"
              />
            </div>

            {/* Stream trigger button */}
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Escenario actual: <span className="text-amber-400 font-semibold">{currentIncident.region}</span>
              </span>

              <button
                onClick={handleStartAiStream}
                disabled={isStreamingAi}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-semibold text-xs shadow-lg shadow-red-950/50 transition transform active:scale-95 disabled:opacity-50"
              >
                {isStreamingAi ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Transmitiendo Stream WebSocket...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                    <span>Iniciar Stream de Tokens</span>
                  </>
                )}
              </button>
            </div>

            {/* Stream Output Window */}
            <div className="mt-3 flex-1 min-h-[220px] bg-slate-950 rounded-xl border border-slate-800 p-3.5 flex flex-col font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span className="text-[11px] text-cyan-300 font-semibold uppercase tracking-wider">
                    {isStreamingAi ? 'Flujo de Tokens Activo (OpenRouter SSE → WS)' : 'Buffer de Salida Stream'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <span>Chunks recibidos: <strong className="text-white">{streamTokensCount}</strong></span>
                  {streamedText && (
                    <button
                      onClick={() => copyToClipboard(streamedText, 'streamout')}
                      className="hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      {copiedKey === 'streamout' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-slate-200 leading-relaxed font-sans text-xs max-h-[240px]">
                {streamedText || (
                  <span className="text-slate-500 italic font-mono text-[11px]">
                    Presiona "Iniciar Stream de Tokens" para emitir el diagnóstico en vivo a través del socket...
                  </span>
                )}
                {isStreamingAi && (
                  <span className="inline-block w-2 h-4 bg-amber-400 ml-1 animate-pulse"></span>
                )}
              </div>

              {streamError && (
                <div
                  className="mt-2 p-2.5 rounded-lg bg-red-950/60 border border-red-800/70 text-red-200 text-[11px] font-mono flex items-start gap-2 animate-fade-in"
                  role="alert"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <span>{streamError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ingestion & Broadcast Simulator for External Applications */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100 font-mono">
                    Simulador de Ingestión Externa (Canal #telemetry)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Transmite datos desde una aplicación externa hacia el WebSocket para que todos los clientes los reciban
                  </p>
                </div>
              </div>
            </div>

            {sentPacketToast && (
              <div className="mt-2.5 p-2 bg-emerald-950/90 border border-emerald-700/80 rounded-lg text-emerald-200 text-xs flex items-center gap-2 shadow">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{sentPacketToast}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mt-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Nombre Dispositivo / Sensor
                </label>
                <input
                  type="text"
                  value={customSensorName}
                  onChange={(e) => setCustomSensorName(e.target.value)}
                  className="w-full bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  PM2.5 Humo (µg/m³)
                </label>
                <input
                  type="number"
                  value={customPm25}
                  onChange={(e) => setCustomPm25(Number(e.target.value))}
                  className="w-full bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 text-xs text-amber-300 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Viento (km/h & Dir)
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={customWindSpeed}
                    onChange={(e) => setCustomWindSpeed(Number(e.target.value))}
                    className="w-16 bg-slate-950 px-2 py-1.5 rounded border border-slate-800 text-xs text-cyan-300 font-mono"
                  />
                  <input
                    type="text"
                    value={customWindDir}
                    onChange={(e) => setCustomWindDir(e.target.value)}
                    className="w-16 bg-slate-950 px-2 py-1.5 rounded border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={handleSendCustomTelemetry}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Emitir Paquete a Canal WebSocket</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Stream Terminal & Frame Inspector (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-[560px] bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-slate-100 font-mono">
                Terminal de Tramas WebSocket
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {filteredMessages.length} tramas
              </span>
              <button
                onClick={() => setMessages([])}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Limpiar terminal"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Terminal Logs List */}
          <div ref={terminalRef} className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
            {filteredMessages.length === 0 ? (
              <div className="text-slate-500 italic p-4 text-center">
                Esperando tramas por el canal WebSocket...
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isTelemetry = msg.channel === 'telemetry';
                const isAnalysis = msg.channel === 'analysis';
                const isSystem = msg.channel === 'system';

                return (
                  <div
                    key={msg.__id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                            isTelemetry
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isAnalysis
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isSystem
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          #{msg.channel}
                        </span>
                        <span className="text-slate-200 font-bold">{msg.type}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.timestamp || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Preview details */}
                    {isTelemetry && msg.data?.sensor && (
                      <div className="text-slate-300 text-[10px]">
                        Sensor: <strong className="text-white">{msg.data.sensor.name}</strong> • PM2.5:{' '}
                        <strong className="text-amber-300">{msg.data.sensor.pm25} µg/m³</strong> • Viento:{' '}
                        <strong className="text-cyan-300">{msg.data.sensor.windSpeed} km/h {msg.data.sensor.windDir}</strong>
                      </div>
                    )}

                    {isAnalysis && msg.chunk && (
                      <div className="text-slate-400 truncate text-[10px]">
                        Chunk: <span className="text-amber-200">"{msg.chunk}"</span>
                      </div>
                    )}

                    {isAnalysis && msg.type === 'STREAM_COMPLETE' && (
                      <div className="text-emerald-400 text-[10px]">
                        ✓ Transmisión completa ({msg.totalLength} bytes recibidos)
                      </div>
                    )}

                    {isSystem && msg.message && (
                      <div className="text-cyan-300 text-[10px]">{msg.message}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Code Snippets for Developers & External Systems Integration */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-100 font-mono">
              Integración con Otras Aplicaciones (SDK / Snippets)
            </h3>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setCodeLanguage('python')}
              className={`px-3 py-1 rounded transition ${
                codeLanguage === 'python' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setCodeLanguage('nodejs')}
              className={`px-3 py-1 rounded transition ${
                codeLanguage === 'nodejs' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Node.js
            </button>
            <button
              onClick={() => setCodeLanguage('browser')}
              className={`px-3 py-1 rounded transition ${
                codeLanguage === 'browser' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Frontend (JS/TS)
            </button>
            <button
              onClick={() => setCodeLanguage('curl')}
              className={`px-3 py-1 rounded transition ${
                codeLanguage === 'curl' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              cURL / REST
            </button>
          </div>
        </div>

        <div className="mt-3 relative">
          <button
            onClick={() => {
              const code = getSnippetCode(codeLanguage, currentWsUrl);
              copyToClipboard(code, `code_${codeLanguage}`);
            }}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 font-mono z-10"
          >
            {copiedKey === `code_${codeLanguage}` ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedKey === `code_${codeLanguage}` ? 'Copiado' : 'Copiar Código'}</span>
          </button>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-amber-200/90 overflow-x-auto leading-relaxed">
            {getSnippetCode(codeLanguage, currentWsUrl)}
          </pre>
        </div>
      </div>
    </div>
  );
};

function getSnippetCode(lang: 'python' | 'nodejs' | 'curl' | 'browser', wsUrl: string) {
  if (lang === 'python') {
    return `# Instalar: pip install websockets asyncio
import asyncio
import json
import websockets

WS_URL = "${wsUrl}"

async def listen_natureintelligence_stream():
    async with websockets.connect(WS_URL) as ws:
        print(f"[*] Conectado al Stream NatureIntelligence: {WS_URL}")
        
        # 1. Suscribirse a canales específicos (o 'all')
        sub_msg = {
            "type": "subscribe",
            "channels": ["telemetry", "analysis", "alerts"]
        }
        await ws.send(json.dumps(sub_msg))

        # 2. Solicitar análisis en tiempo real con OpenRouter
        ai_request = {
            "type": "request_ai_stream",
            "model": "anthropic/claude-3.5-sonnet",
            "prompt": "Alerta de incendio forestal en Cerro de las Tres Cruces, Cali."
        }
        await ws.send(json.dumps(ai_request))

        # 3. Escuchar flujo continuo
        async for message in ws:
            packet = json.loads(message)
            channel = packet.get("channel")
            msg_type = packet.get("type")
            
            if channel == "analysis" and msg_type == "STREAM_CHUNK":
                print(packet.get("chunk"), end="", flush=True)
            elif channel == "telemetry":
                sensor = packet.get("data", {}).get("sensor", {})
                print(f"\\n[IoT Cali] {sensor.get('name')}: PM2.5={sensor.get('pm25')} µg/m³ Viento={sensor.get('windSpeed')} km/h")

if __name__ == "__main__":
    asyncio.run(listen_natureintelligence_stream())
`;
  }

  if (lang === 'nodejs') {
    return `// Instalar: npm install ws
import WebSocket from 'ws';

const ws = new WebSocket('${wsUrl}');

ws.on('open', () => {
  console.log('[*] Conectado al WebSocket NatureIntelligence');

  // Suscribirse a canales
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['telemetry', 'incidents', 'analysis']
  }));

  // Solicitar inferencia en streaming con OpenRouter
  ws.send(JSON.stringify({
    type: 'request_ai_stream',
    model: 'anthropic/claude-3.5-sonnet',
    prompt: 'Generar despacho radial para Bomberos Cali en Cerro Cristo Rey.'
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.channel === 'analysis' && msg.type === 'STREAM_CHUNK') {
    process.stdout.write(msg.chunk);
  } else if (msg.channel === 'telemetry') {
    console.log('\\n[Telemetría IoT]', msg.data);
  }
});
`;
  }

  if (lang === 'browser') {
    return `// JavaScript / TypeScript en el navegador
const ws = new WebSocket('${wsUrl}');

ws.onopen = () => {
  console.log('Conectado al Gateway de Stream');
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['telemetry', 'analysis']
  }));
};

ws.onmessage = (event) => {
  const packet = JSON.parse(event.data);
  if (packet.channel === 'analysis' && packet.type === 'STREAM_CHUNK') {
    document.getElementById('ai-output').textContent += packet.chunk;
  }
};
`;
  }

  return `# 1. Chequeo de Salud del Gateway
curl -X GET "${wsUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '/api/health')}"

# 2. Obtener Información de Canales y Endpoints
curl -X GET "${wsUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '/api/stream/info')}"

# 3. Transmitir Paquete a Canal WebSocket (vía REST)
curl -X POST "${wsUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '/api/stream/broadcast')}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "alerts",
    "data": {
      "type": "ALERTA_BOMBEROS_CALI",
      "sector": "Cerro de las Tres Cruces",
      "nivel": "CRITICO",
      "despacho": "Forestal 1 y Máquina 4 en ruta"
    }
  }'
`;
}
