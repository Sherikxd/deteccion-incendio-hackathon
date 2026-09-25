import React, { useState, useEffect } from 'react';
import {
  Activity,
  Wind,
  Thermometer,
  Droplets,
  AlertTriangle,
  Radio,
  Flame,
  CheckCircle2,
  Cpu,
  Send,
  Code2,
  Copy,
  Check,
  RefreshCw,
  Compass,
  Gauge,
  Wifi,
  ExternalLink
} from 'lucide-react';

interface SensorItem {
  id: string;
  name: string;
  location: string;
  pm25: number;
  co: number;
  temp: number;
  humidity: number;
  windSpeed: number;
  windDir: string;
  flame: boolean;
  status: 'critical' | 'elevated' | 'normal';
}

export const SensorsMetricsDashboard: React.FC = () => {
  const [sensors, setSensors] = useState<SensorItem[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Manual test ingest form state
  const [testPm25, setTestPm25] = useState<number>(185);
  const [testCo, setTestCo] = useState<number>(16.5);
  const [testWind, setTestWind] = useState<number>(32);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchSensors = async () => {
    try {
      const res = await fetch('/api/sensors');
      const data = await res.json();
      if (data.sensors) {
        setSensors(data.sensors);
        if (!selectedSensorId && data.sensors.length > 0) {
          setSelectedSensorId(data.sensors[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching sensors:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();

    // Listen to real-time telemetry stream
    const eventSource = new EventSource('/stream?channel=telemetry');
    eventSource.addEventListener('sensor_update', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.data?.sensor) {
          const updated = payload.data.sensor;
          setSensors((prev) =>
            prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
          );
        }
      } catch (err) {
        // ignore
      }
    });

    return () => {
      eventSource.close();
    };
  }, []);

  const selectedSensor = sensors.find((s) => s.id === selectedSensorId) || sensors[0];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendTestReading = async () => {
    if (!selectedSensor) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/sensors/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSensor.id,
          name: selectedSensor.name,
          location: selectedSensor.location,
          pm25: testPm25,
          co: testCo,
          temp: selectedSensor.temp,
          humidity: selectedSensor.humidity,
          windSpeed: testWind,
          windDir: selectedSensor.windDir,
          flame: testPm25 > 200
        })
      });

      const data = await res.json();
      if (data.sensor) {
        setSensors((prev) =>
          prev.map((s) => (s.id === data.sensor.id ? data.sensor : s))
        );
      }
      setToastMessage(`¡Lectura de prueba inyectada exitosamente a ${selectedSensor.name}!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAqiCategory = (pm25: number) => {
    if (pm25 > 150) return { label: 'PELIGROSO (Humo Denso)', color: 'text-red-400 bg-red-950/60 border-red-800' };
    if (pm25 > 55) return { label: 'DAÑINO A LA SALUD', color: 'text-amber-400 bg-amber-950/60 border-amber-800' };
    if (pm25 > 35) return { label: 'MODERADO', color: 'text-yellow-400 bg-yellow-950/60 border-yellow-800' };
    return { label: 'BUENO (Aire Limpio)', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' };
  };

  return (
    <div className="space-y-5 text-slate-100">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-white">
                  RED DE SENSORES IoT & TELEMETRÍA AMBIENTAL CALI
                </h2>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{sensors.length} Estaciones en Línea</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoreo in-situ en tiempo real: Partículas PM2.5, Monóxido de Carbono (CO), Viento del Pacífico y detección infrarroja de llama.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSensors}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refrescar</span>
            </button>

            <a
              href="/api/sensors"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-mono border border-cyan-800 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GET /api/sensors</span>
            </a>
          </div>
        </div>

        {/* Sensor Station Selection Tabs */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono">
          {sensors.map((sensor) => {
            const isCrit = sensor.status === 'critical';
            const isElev = sensor.status === 'elevated';
            const isSelected = selectedSensorId === sensor.id;

            return (
              <button
                key={sensor.id}
                onClick={() => setSelectedSensorId(sensor.id)}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2.5 border ${
                  isSelected
                    ? 'bg-amber-600 text-white border-amber-400 font-bold shadow-lg scale-[1.02]'
                    : isCrit
                    ? 'bg-red-950/50 text-red-300 border-red-800/80 hover:bg-red-900/60'
                    : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isCrit ? 'bg-red-500 animate-ping' : isElev ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                ></span>
                <span>{sensor.name}</span>
                <span className="text-[10px] opacity-80">({sensor.pm25} µg/m³)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-700 rounded-xl text-emerald-200 text-xs flex items-center gap-2 shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Selected Sensor Display */}
      {selectedSensor && (
        <div className="space-y-4">
          {/* Station Title Header */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-amber-400 font-bold text-sm block">{selectedSensor.name}</span>
              <span className="text-slate-400">{selectedSensor.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
                ID: <strong className="text-cyan-400">{selectedSensor.id}</strong>
              </span>
              <span
                className={`px-3 py-1 rounded font-bold border ${getAqiCategory(selectedSensor.pm25).color}`}
              >
                {getAqiCategory(selectedSensor.pm25).label}
              </span>
            </div>
          </div>

          {/* Large Visible Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* PM2.5 Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-cyan-400" /> Humo PM2.5
                </span>
                <span className="text-[10px] text-slate-500">µg/m³</span>
              </div>
              <div className="my-3">
                <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                  {selectedSensor.pm25}
                  <span className="text-sm font-normal text-slate-400 ml-1">µg/m³</span>
                </div>
                <div className="text-xs mt-1 text-slate-300 font-sans">
                  {selectedSensor.pm25 > 150
                    ? 'Concentración severa de humo de combustión forestal.'
                    : 'Niveles dentro del rango aceptable para ladera.'}
                </div>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    selectedSensor.pm25 > 150 ? 'bg-red-500' : selectedSensor.pm25 > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, (selectedSensor.pm25 / 300) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Monóxido de Carbono (CO) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-amber-400" /> Monóxido (CO)
                </span>
                <span className="text-[10px] text-slate-500">ppm</span>
              </div>
              <div className="my-3">
                <div className="text-3xl font-extrabold font-mono text-amber-400 tracking-tight">
                  {selectedSensor.co}
                  <span className="text-sm font-normal text-slate-400 ml-1">ppm</span>
                </div>
                <div className="text-xs mt-1 text-slate-300 font-sans">
                  {selectedSensor.co > 15
                    ? 'Combustión incompleta activa de madera u hojarasca.'
                    : 'Nivel normal de línea base de montaña.'}
                </div>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    selectedSensor.co > 15 ? 'bg-red-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, (selectedSensor.co / 35) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Viento del Pacífico */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-blue-400" /> Viento del Pacífico
                </span>
                <span className="text-[10px] text-cyan-300 font-bold">{selectedSensor.windDir}</span>
              </div>
              <div className="my-3">
                <div className="text-3xl font-extrabold font-mono text-blue-300 tracking-tight">
                  {selectedSensor.windSpeed}
                  <span className="text-sm font-normal text-slate-400 ml-1">km/h</span>
                </div>
                <div className="text-xs mt-1 text-slate-300 font-sans">
                  Vector de propagación desde cordillera hacia el valle.
                </div>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (selectedSensor.windSpeed / 50) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Temperatura y Humedad */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-red-400" /> Temp & Humedad
                </span>
                <span className="text-[10px] text-slate-500">In-Situ</span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-orange-400">
                    {selectedSensor.temp}°C
                  </span>
                  <span className="text-slate-400 font-mono text-sm">/ {selectedSensor.humidity}% HR</span>
                </div>
                <div className="text-xs mt-1 text-slate-300 font-sans">
                  {selectedSensor.humidity < 25 ? 'Condición de desecación crítica de pasto.' : 'Humedad ambiental estable.'}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-800">
                <span>Sensor de Llama:</span>
                <strong className={selectedSensor.flame ? 'text-red-400' : 'text-emerald-400'}>
                  {selectedSensor.flame ? '🔥 DETECTADA' : 'INACTIVA'}
                </strong>
              </div>
            </div>
          </div>

          {/* Quick Hardware Ingest Tester & Hardware Integration Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2">
            {/* Ingest Tester Panel (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Cpu className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100 font-mono">
                  Inyectar Lectura Manual a Esta Estación
                </h3>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">PM2.5 a Enviar:</span>
                    <strong className="text-cyan-300">{testPm25} µg/m³</strong>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="350"
                    value={testPm25}
                    onChange={(e) => setTestPm25(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">CO a Enviar:</span>
                    <strong className="text-amber-300">{testCo} ppm</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="35"
                    step="0.5"
                    value={testCo}
                    onChange={(e) => setTestCo(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Viento a Enviar:</span>
                    <strong className="text-blue-300">{testWind} km/h</strong>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={testWind}
                    onChange={(e) => setTestWind(Number(e.target.value))}
                    className="w-full accent-blue-400 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleSendTestReading}
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Transmitiendo...' : 'Actualizar Estación vía POST /api/sensors/ingest'}</span>
                </button>
              </div>
            </div>

            {/* Hardware Code Snippet for ESP32 / Arduino / Python (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-sm text-slate-100 font-mono">
                    Conectar Sensor Físico (ESP32 / Arduino / LoRaWAN)
                  </h3>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      getHardwareSnippet(selectedSensor.id),
                      'hw_snippet'
                    )
                  }
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800"
                >
                  {copiedKey === 'hw_snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar Código</span>
                </button>
              </div>

              <div className="my-2">
                <p className="text-[11px] text-slate-400 mb-2">
                  Envía telemetría desde tu microcontrolador mediante una petición HTTP POST estándar a <code className="text-cyan-300 font-mono">/api/sensors/ingest</code>:
                </p>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-48 leading-relaxed">
                  {getHardwareSnippet(selectedSensor.id)}
                </pre>
              </div>

              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                <span>Endpoint: <strong>POST /api/sensors/ingest</strong></span>
                <span className="text-emerald-400 font-bold">Retransmisión a /stream en &lt; 15 ms</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getHardwareSnippet(sensorId: string) {
  return `// Código C++ para ESP32 / Arduino con WiFi
#include <WiFi.h>
#include <HTTPClient.h>

const char* serverUrl = "https://<tu-app-url>/api/sensors/ingest";

void enviarTelemetria() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Leer valores de pines analógicos / I2C (PMS5003 + MQ-7)
    float pm25 = 145.2; // Sensor PMS5003
    float co = 12.8;    // Sensor MQ-7
    float temp = 31.4;  // BME280

    String json = "{\\"id\\":\\"${sensorId}\\",\\"pm25\\":" + String(pm25) +
                  ",\\"co\\":" + String(co) + ",\\"temp\\":" + String(temp) + "}";

    int httpResponseCode = http.POST(json);
    http.end();
  }
}`;
}
