import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Flame,
  CheckCircle2,
  RotateCcw,
  Send,
  MessageSquare,
  Activity,
  Terminal,
  Play,
  Cpu,
} from 'lucide-react';

export const SandboxTestingPanel: React.FC = () => {
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [receivedEvents, setReceivedEvents] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Listen to real-time events via SSE
    const es = new EventSource('/stream?channel=all');

    es.addEventListener('alert', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        setReceivedEvents((prev) => [
          {
            type: 'ALERTA_RECIBIDA',
            channel: 'alerts',
            timestamp: new Date().toLocaleTimeString(),
            data: payload.data?.alert || payload
          },
          ...prev.slice(0, 15)
        ]);
      } catch (err) {
        // ignore
      }
    });

    es.addEventListener('sensor_update', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        setReceivedEvents((prev) => [
          {
            type: 'TELEMETRIA_ACTUALIZADA',
            channel: 'telemetry',
            timestamp: new Date().toLocaleTimeString(),
            data: payload.data?.sensor || payload
          },
          ...prev.slice(0, 15)
        ]);
      } catch (err) {
        // ignore
      }
    });

    return () => {
      es.close();
    };
  }, []);

  const handleRunSimulation = async (scenarioKey: string, scenarioName: string) => {
    setRunningScenario(scenarioKey);

    try {
      const res = await fetch('/api/simulate/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioKey })
      });

      await res.json();
      setToastMessage(`¡Escenario ejecutado: ${scenarioName}!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e: any) {
      console.error(e);
      setToastMessage('Error al ejecutar escenario simulado.');
    } finally {
      setRunningScenario(null);
    }
  };

  return (
    <div className="space-y-5 text-neutral-100">
      {/* Top Banner */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-md bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  BANCO DE PRUEBAS & DATOS SIMULADOS (SANDBOX)
                </h2>
                <span className="text-[10px] bg-neutral-500/20 text-neutral-300 border border-neutral-500/30 px-2.5 py-0.5 rounded font-semibold">
                  Ambiente Seguro de Pruebas
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Inyecta datos simulados para probar la respuesta del sistema, los eventos de <code className="text-neutral-300 font-mono">/stream</code>, la API REST y el bot de WhatsApp sin activar un despacho real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunSimulation('RESET_NORMAL', 'Restablecer Todo a Normal')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 text-xs border border-emerald-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Todo a Normal</span>
            </button>
          </div>
        </div>

        {/* 4 Interactive Test Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
          {/* Scenario 1: Incendio Crítico Tres Cruces */}
          <div className="bg-neutral-950 p-4 rounded-md border border-red-900/60 hover:border-red-600 transition flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-red-400 font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> 1. Fuego Crítico
                </span>
                <span className="text-[9px] bg-red-950 px-1.5 py-0.5 rounded border border-red-800">ROJO</span>
              </div>
              <p className="text-neutral-300 text-[11px] font-sans leading-relaxed">
                Inyecta foco en <strong>Cerro Tres Cruces</strong> con FRP de 185 MW, PM2.5 a 320 µg/m³ y viento del WNW a 38 km/h hacia Bataclán.
              </p>
            </div>
            <button
              onClick={() => handleRunSimulation('CRITICAL_FIRE_TRES_CRUCES', 'Incendio Crítico en Tres Cruces')}
              disabled={runningScenario !== null}
              className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Inyectar Fuego Crítico</span>
            </button>
          </div>

          {/* Scenario 2: Foco Latente Farallones */}
          <div className="bg-neutral-950 p-4 rounded-md border border-amber-900/60 hover:border-amber-600 transition flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-amber-400 font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> 2. Foco Bajo Dosel
                </span>
                <span className="text-[9px] bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">NARANJA</span>
              </div>
              <p className="text-neutral-300 text-[11px] font-sans leading-relaxed">
                Simula combustión lenta oculta bajo bosque de niebla en <strong>PNN Farallones</strong> con pico de CO a 29 ppm y FRP satelital de 0 MW.
              </p>
            </div>
            <button
              onClick={() => handleRunSimulation('SMOLDER_FARALLONES', 'Foco Latente en Farallones')}
              disabled={runningScenario !== null}
              className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Inyectar Foco Latente</span>
            </button>
          </div>

          {/* Scenario 3: Falso Positivo Quema Agrícola */}
          <div className="bg-neutral-950 p-4 rounded-md border border-neutral-900/60 hover:border-neutral-600 transition flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-neutral-400 font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" /> 3. Falso Positivo
                </span>
                <span className="text-[9px] bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">VERDE</span>
              </div>
              <p className="text-neutral-300 text-[11px] font-sans leading-relaxed">
                Quema controlada de caña en <strong>Palmira / Rozo</strong>. Prueba cómo la IA la descarta automáticamente sin despachar bomberos.
              </p>
            </div>
            <button
              onClick={() => handleRunSimulation('SUGARCANE_BURN_PALMIRA_FALSE_POSITIVE', 'Falso Positivo Quema Agrícola')}
              disabled={runningScenario !== null}
              className="w-full py-2 rounded-lg bg-neutral-600 hover:bg-neutral-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Probar Filtro IA</span>
            </button>
          </div>

          {/* Scenario 4: Despacho WhatsApp */}
          <div className="bg-neutral-950 p-4 rounded-md border border-emerald-900/60 hover:border-emerald-600 transition flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-emerald-500 font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> 4. Bot WhatsApp
                </span>
                <span className="text-[9px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">BOT</span>
              </div>
              <p className="text-neutral-300 text-[11px] font-sans leading-relaxed">
                Prueba el despacho automatizado con enlace georreferenciado a Google Maps enviado al grupo de oficiales de guardia.
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/whatsapp/dispatch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      recipientGroup: 'Central X-1 Bomberos Cali',
                      sector: 'Cerro de las Tres Cruces (Simulación)',
                      riskLevel: 'CRITICAL',
                      headline: 'SIMULACRO OPERATIVO: Verificación de despacho por WhatsApp'
                    })
                  });
                  setToastMessage('¡Mensaje de WhatsApp simulado despachado con éxito!');
                  setTimeout(() => setToastMessage(null), 3500);
                } catch (e) {
                  console.error(e);
                }
              }}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Probar Notificación</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-700 rounded-md text-emerald-400 text-xs flex items-center gap-2 shadow-sm animate-fade-in font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Live Event Stream Monitor (Shows actual incoming SSE events from tests) */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-neutral-400" />
            <h3 className="font-bold text-sm text-neutral-100">
              Monitor en Vivo de Tramas SSE (`/stream`)
            </h3>
          </div>
          <span className="text-[10px] bg-neutral-950 px-2 py-0.5 rounded text-neutral-400 border border-neutral-800">
            Escuchando canal unificado en tiempo real
          </span>
        </div>

        <div className="bg-neutral-950 p-3 rounded-md border border-neutral-800 max-h-[300px] overflow-y-auto space-y-2 font-mono text-xs">
          {receivedEvents.length === 0 ? (
            <div className="py-8 text-center text-neutral-400">
              Presiona cualquiera de los botones de prueba superiores para ver las tramas recibidas en tiempo real.
            </div>
          ) : (
            receivedEvents.map((evt, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col space-y-1 text-[11px]"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-bold ${
                      evt.type === 'ALERTA_RECIBIDA' ? 'text-red-400' : 'text-neutral-400'
                    }`}
                  >
                    [{evt.type}]
                  </span>
                  <span className="text-neutral-400 text-[10px]">{evt.timestamp}</span>
                </div>
                <pre className="text-neutral-300 text-[10px] overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(evt.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
