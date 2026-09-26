import React from 'react';
import {
  Satellite,
  Layers,
  Server,
  Flame,
  FileCheck2,
  Cpu,
  Lock
} from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-lg font-bold text-white font-mono tracking-wide flex items-center gap-2">
          <Server className="w-5 h-5 text-emerald-400" />
          <span>ARQUITECTURA DE DATOS & INTEGRACIÓN DE FUENTES OFICIALES</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Guía de implementación, límites de tasa, secretos de servidor y consumo de APIs satelitales / IoT
        </p>
      </div>

      {/* Grid of 4 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. NASA FIRMS */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <Flame className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-100 font-mono">1. NASA FIRMS (Focos Térmicos)</h3>
            </div>
            <span className="text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
              Roadmap · aún no conectado
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Proporciona anomalías térmicas casi en tiempo real (NRT) detectadas por los sensores <strong>VIIRS</strong> (S-NPP, NOAA-20, NOAA-21 a 375m) y <strong>MODIS</strong> (Terra, Aqua a 1km). Límite del servicio: <strong>5.000 transacciones por ventana de 10 minutos</strong>.
          </p>

          <div className="bg-amber-950/30 border border-amber-800/50 p-2.5 rounded text-[11px] text-amber-200 leading-relaxed">
            <strong className="font-mono text-amber-300">Estado de implementación:</strong> esta versión del gateway{' '}
            <strong>no consulta aún FIRMS</strong>: las alertas satelitales llegan por <code className="font-mono">POST /api/alerts</code>,{' '}
            <code className="font-mono">POST /stream</code> o el simulador del sandbox. El flujo descrito a continuación es la
            integración objetivo.
          </div>

          <div className="space-y-2 text-xs">
            <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 text-[11px] font-mono text-amber-300">
              GET /api/area/csv/[MAP_KEY]/[SOURCE]/[W,S,E,N]/[DAY_RANGE]/[DATE]
            </div>
            <div className="bg-red-950/30 border border-red-800/40 p-2.5 rounded text-xs text-red-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-red-300">
                <Lock className="w-3.5 h-3.5" />
                <span>Gestión de Seguridad & MAP_KEY:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                • El <code className="text-amber-300">MAP_KEY</code> otorgado por NASA debe residir <strong>estrictamente en variables de entorno del backend</strong> (<code className="text-slate-300">process.env.FIRMS_MAP_KEY</code>). Nunca se expone en código cliente React ni repositorios git.
                <br />• NASA impone un límite estricto de <strong>5.000 transacciones por ventana de 10 minutos</strong>. Peticiones de áreas geográficas muy amplias o rangos de días extensos consumen más de 1 transacción.
                <br />• <strong>Buenas prácticas (al conectar la API):</strong> cachear las respuestas FIRMS 5-10 minutos (Redis u otra caché en memoria), ya que los satélites de órbita polar pasan aproximadamente cada 3 horas. El límite aplica por clave y se factura como transacciones.
              </p>
            </div>
          </div>
        </div>

        {/* 2. NASA GIBS */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Satellite className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-100 font-mono">2. NASA GIBS (Mosaicos WMTS)</h3>
            </div>
            <span className="text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
              Visualización Satelital
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            El servicio <strong>GIBS (Global Imagery Browse Services)</strong> sirve visualizaciones raster en teselas WMTS (Web Map Tile Service) bajo proyección Web Mercator (EPSG:3857) o WGS84 (EPSG:4326).
          </p>

          <div className="space-y-2 text-xs">
            <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 text-[11px] font-mono text-cyan-300">
              https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/[LAYER]/default/[YYYY-MM-DD]/GoogleMapsCompatible_Level9/&#123;z&#125;/&#123;y&#125;/&#123;x&#125;.jpg
            </div>
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
              <strong className="text-cyan-300 font-mono">Capas recomendadas:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-400">
                <li><code className="text-slate-200">MODIS_Terra_CorrectedReflectance_TrueColor</code>: Visualización de columnas de humo diurnas.</li>
                <li><code className="text-slate-200">VIIRS_SNPP_CorrectedReflectance_TrueColor</code>: Mayor resolución espacial (375m).</li>
                <li><strong>Nota clave:</strong> GIBS sirve teselas visuales para inspección visual de nubes/humo; <em>no calcula el porcentaje de riesgo algorítmico</em>.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 3. Esri World Imagery */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-100 font-mono">3. Esri World Imagery (Fondo Base)</h3>
            </div>
            <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
              Cartografía Base HD
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Constituye el fondo cartográfico de alta resolución para visualizar el relieve, caminos forestales, quebradas y masa vegetal de fondo. Es independiente de las detecciones térmicas puntuales de FIRMS.
          </p>

          <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 text-[11px] font-mono text-emerald-300">
            https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/&#123;z&#125;/&#123;y&#125;/&#123;x&#125;
          </div>
        </div>

        {/* 4. Copernicus STAC & Sentinel Hub */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <FileCheck2 className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-100 font-mono">4. Copernicus STAC & Sentinel Hub</h3>
            </div>
            <span className="text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
              Análisis Ambiental Espectral
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Se integra mediante el <strong>Catálogo STAC de Copernicus</strong> y la <strong>Statistical API de Sentinel Hub</strong> para evaluar las propiedades biofísicas del combustible antes y después del fuego. En esta versión los índices <code className="text-amber-300">copernicus</code> (NDVI/NBR) provienen del payload del escenario; la llamada real a Sentinel Hub queda pendiente.
          </p>

          <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <div>• <strong>NDVI (Índice de Vegetación Normalizada):</strong> Refleja el estrés hídrico de la biomasa; un NDVI bajo incrementa la inflamabilidad.</div>
            <div>• <strong>NBR (Normalized Burn Ratio):</strong> Diferencia entre NIR (Banda 8) y SWIR (Banda 12) para delimitar cicatrices de quema previas y frentes activos.</div>
          </div>
        </div>
      </div>

      {/* Integration Pipeline Diagram */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
        <h3 className="font-bold text-sm text-amber-400 font-mono uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          <span>Flujo de Verificación IA con OpenRouter</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono text-red-400 font-bold uppercase">Paso 1: Ingesta de datos</div>
            <div className="text-xs text-slate-300 mt-1">
              Alertas satelitales por <code className="font-mono text-amber-300">POST /api/alerts</code> y{' '}
              <code className="font-mono text-amber-300">POST /stream</code>; telemetría IoT por{' '}
              <code className="font-mono text-amber-300">POST /api/sensors/ingest</code> o el WebSocket{' '}
              <code className="font-mono text-amber-300">publish_telemetry</code>.
            </div>
          </div>

          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono text-purple-400 font-bold uppercase">Paso 2: Enriquecimiento ambiental</div>
            <div className="text-xs text-slate-300 mt-1">
              NDVI/NBR y contexto del escenario (Sentinel / Copernicus) para calcular la sequedad del combustible vegetal.
            </div>
          </div>

          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono text-amber-400 font-bold uppercase">Paso 3: Fusión IA OpenRouter</div>
            <div className="text-xs text-slate-300 mt-1">
              El System Prompt maestro evalúa vector de viento, descarta chimeneas/quemas y clasifica el riesgo (si no hay{' '}
              <code className="font-mono">OPENROUTER_API_KEY</code>, aplica el motor de reglas local).
            </div>
          </div>

          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Paso 4: Difusión & despacho</div>
            <div className="text-xs text-slate-300 mt-1">
              Difusión por SSE/WebSocket a los clientes suscritos, despacho de WhatsApp (simulado en local con{' '}
              <code className="font-mono">/api/whatsapp/dispatch</code>) y trazado en el mapa táctico.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
