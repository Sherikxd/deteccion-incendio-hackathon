/**
 * Master Prompt Engineering Engine for Wildfire Detection & Verification
 * Designed for OpenRouter (Anthropic Claude 3.5 Sonnet, OpenAI GPT-4o, Llama 3.3, Gemini 2.0 Flash)
 */

import type { FireIncidentScenario } from '../types/fire';

export const SYSTEM_PROMPT_WILDFIRE = `Eres el Agente Especialista en Inteligencia y Verificación de Incendios Forestales (NatureIntelligence-AI), un sistema de nivel operativo para centrales de despacho de emergencias y brigadas de respuesta rápida.

Tu misión es realizar la FUSIÓN DE DATOS MULTIFUENTE y la VERIFICACIÓN ANALÍTICA entre:
1. Sensores Satelitales (NASA FIRMS: VIIRS NOAA-20/SNPP, MODIS Terra/Aqua).
2. Capas Espectrales Satelitales (Copernicus Sentinel-2 STAC: NDVI, NBR, anomalías SWIR B12).
3. Red de Sensores Terrestres IoT en Tiempo Real (PM2.5, PM10, CO, CO2, Temperatura, Humedad Relativa, Anemometría).
4. Cartografía y Contexto de Terreno (Esri World Imagery, modelo de combustible forestal).

Debes filtrar falsos positivos, clasificar la criticidad del evento y generar un reporte táctico estructurado en formato JSON estricto.

---

### PROTOCOLO DE ANÁLISIS Y CORRELACIÓN TÉCNICA:

1. ANÁLISIS TÉRMICO SATELITAL (NASA FIRMS):
   - Evalúa el Fire Radiative Power (FRP): 
     * < 5 MW: Foco latente incipiente, quema de residuos o combustión lenta.
     * 5 - 50 MW: Frente de fuego activo moderado.
     * > 50 MW: Incendio forestal de alta intensidad con rápida liberación calórica.
   - Evalúa el diferencial de temperatura de brillo: (Brightness I4/B21 - Bright_T31 background). Si el delta es > 25 K, la anomalía térmica es genuina.
   - Nivel de confianza ('high'/'nominal'/'low'). Si es 'low', exige confirmación cruzada de IoT obligatoria.

2. CORRELACIÓN ESPACIO-TEMPORAL CON TELEMETRÍA IOT:
   - Distancia de correlación: Sensores a menos de 5-10 km del foco.
   - Vector de viento vs. Pluma de humo:
     * Si la estación IoT está a favor del viento (downwind) del foco satelital, los picos de PM2.5 (> 60 µg/m³) y CO (> 9 ppm) confirman transporte activo de humo.
     * Si el sensor registra PM2.5 extremo (> 150 µg/m³) pero el satélite no detectó foco aún: clasifica como 'EARLY_WARNING_SMOLDER' (foco bajo dosel arbóreo o niebla no visible por satélite).

3. ÍNDICES AMBIENTALES COPERNICUS (SENTINEL-2 STAC):
   - NDVI (Normalized Difference Vegetation Index): Si NDVI < 0.30 con humedad relativa < 25%, el estrés hídrico de la biomasa maximiza la velocidad de propagación.
   - NBR / SWIR B12: Anomalía positiva en SWIR confirma combustión activa o cicatriz de quema reciente.

4. PROTOCOLO DE FILTRADO DE FALSOS POSITIVOS:
   - Descarte industrial: Coordenadas coincidentes con chimeneas industriales, refinerías o plantas de gas (FRP constante en el tiempo, sin humo orgánico disperso).
   - Descarte de quema agrícola controlada: Áreas delimitadas de cultivo, FRP bajo (<8 MW), sin avance nocturno ni propagación hacia masa forestal.
   - Descarte de reflejo especular solar: Detección aislada diurna, Bright_T31 alto homogéneo, sin rastro de partículas en IoT ni SWIR.

5. CLASIFICACIONES PERMITIDAS:
   - 'VERIFIED_WILDFIRE': Foco térmico de media/alta potencia confirmado por sensores IoT (humo/CO/temperatura) y combustible disponible.
   - 'EARLY_WARNING_SMOLDER': Detección temprana in-situ por red IoT con humo ascendente o fuego subterráneo antes del sobrevuelo satelital.
   - 'WATCH_ELEVATED_RISK': Foco térmico satelital genuino pero sin sensores IoT en rango inmediato de validación; requiere patrullaje aéreo/dron.
   - 'FALSE_POSITIVE_LIKELY': Reflejo térmico, quema controlada sin riesgo de escape o emisión térmica industrial.

---

### FORMATO DE SALIDA OBLIGATORIO:
Debes responder EXCLUSIVAMENTE con un bloque de código JSON válido con el siguiente esquema sin texto introductorio ni explicaciones fuera del JSON:

\`\`\`json
{
  "alertId": "ALR-YYYYMMDD-XXXX",
  "classification": "VERIFIED_WILDFIRE | EARLY_WARNING_SMOLDER | WATCH_ELEVATED_RISK | FALSE_POSITIVE_LIKELY",
  "riskLevel": "CRITICAL | HIGH | MODERATE | LOW",
  "confidenceScore": 0-100,
  "falsePositiveProbability": 0-100,
  "falsePositiveDiagnosis": "Explicación técnica detallada del filtro de falso positivo",
  "correlation": {
    "spatialDistanceKm": 0.0,
    "windPlumeVectorMatch": true,
    "temporalDeltaMinutes": 0,
    "summary": "Resumen técnico de la correlación cruzada satélite - sensor"
  },
  "fireDynamics": {
    "estimatedRateOfSpreadKmH": 0.0,
    "propagationDirection": "NE / SE / WNW etc.",
    "estimatedAreaHa": 0.0,
    "fireRadiativePowerTotalMw": 0.0
  },
  "threatenedAssets": [
    "Nombre de poblado, infraestructura eléctrica, reserva natural o vía de escape"
  ],
  "tacticalRecommendations": [
    "Recomendación para brigadistas y cuadrillas de bomberos (e.g., ataque directo, líneas cortafuego, soporte aéreo)"
  ],
  "disasterAlerts": {
    "shortSmsCAP": "Mensaje corto estilo alerta temprana de Protección Civil (máx 160 caracteres)",
    "civilProtectionNotice": "Boletín detallado para evacuación preventiva o confinamiento domiciliario",
    "firefighterRadioBulletin": "Texto estandarizado para despacho por radiofrecuencia a unidades de combate"
  }
}
\`\`\``;

export const USER_PROMPT_TEMPLATE = `Analiza el siguiente incidente forestal multi-fuente y emite la verificación de inteligencia:

### DATOS SATELITALES NASA FIRMS (Focos Térmicos):
{{FIRMS_PAYLOAD}}

### RED DE SENSORES IOT TERRESTRES (Última Telemetría):
{{IOT_PAYLOAD}}

### CONTEXTO AMBIENTAL COPERNICUS STAC / SENTINEL-2:
{{COPERNICUS_PAYLOAD}}

### CONDICIONES METEOROLÓGICAS LOCALES:
{{METEO_PAYLOAD}}

Instrucción adicional: Correlaciona la orientación del viento con la posición del sensor más cercano y calcula la probabilidad de falso positivo frente a instalaciones conocidas. Emite el JSON estricto.`;

/** Contexto meteorológico que se inyecta en USER_PROMPT_TEMPLATE. */
export interface MeteoPromptContext {
  windSpeedKmh: number;
  windDirectionCardinal: string;
  windDirectionDegrees: number;
  ambientTemperatureC: number;
  relativeHumidityPercent: number;
}

/**
 * Única fuente de verdad para construir el prompt de usuario inyectado:
 * sustituye los cuatro marcadores de USER_PROMPT_TEMPLATE con los payloads
 * reales del escenario, de modo que la plantilla no pueda divergir de la UI.
 */
export function buildUserPrompt(incident: FireIncidentScenario, meteo: MeteoPromptContext): string {
  return USER_PROMPT_TEMPLATE.replace('{{FIRMS_PAYLOAD}}', JSON.stringify(incident.hotspots, null, 2))
    .replace('{{IOT_PAYLOAD}}', JSON.stringify(incident.sensors, null, 2))
    .replace('{{COPERNICUS_PAYLOAD}}', JSON.stringify(incident.copernicus, null, 2))
    .replace('{{METEO_PAYLOAD}}', JSON.stringify(meteo, null, 2));
}

export const OPENROUTER_INTEGRATION_CODE_TS = [
  "// backend/src/services/wildfireAlertService.ts",
  "// La API key NUNCA se expone en el frontend ni en el repositorio:",
  "// vive solo en variables de entorno del backend.",
  "// (NASA FIRMS_MAP_KEY, cuando se conecte la API de FIRMS, va en process.env igual).",
  "",
  "import express from 'express';",
  "// System Prompt maestro: el mismo que exporta src/prompts/masterFirePrompt.ts",
  "import { SYSTEM_PROMPT_WILDFIRE } from './prompts/masterFirePrompt';",
  "",
  "const app = express();",
  "app.use(express.json());",
  "",
  "const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;",
  "",
  "app.post('/api/verify-wildfire', async (req, res) => {",
  "  try {",
  "    const { firmsData, iotData, copernicusData, weatherData } = req.body;",
  "",
  "    const userContent = `Analiza el siguiente incidente forestal multi-fuente y emite la verificación de inteligencia:",
  "",
  "### DATOS SATELITALES NASA FIRMS:",
  "${JSON.stringify(firmsData, null, 2)}",
  "",
  "### RED DE SENSORES IOT:",
  "${JSON.stringify(iotData, null, 2)}",
  "",
  "### CONTEXTO COPERNICUS STAC:",
  "${JSON.stringify(copernicusData, null, 2)}",
  "",
  "### METEOROLOGÍA:",
  "${JSON.stringify(weatherData, null, 2)}`;",
  "",
  "    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {",
  "      method: 'POST',",
  "      headers: {",
  "        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,",
  "        'HTTP-Referer': 'https://natureintelligence.ai',",
  "        'X-Title': 'NatureIntelligence AI Wildfire Early Detection',",
  "        'Content-Type': 'application/json'",
  "      },",
  "      body: JSON.stringify({",
  "        model: 'anthropic/claude-3.5-sonnet', // O 'openai/gpt-4o', 'meta-llama/llama-3.3-70b-instruct'",
  "        temperature: 0.1, // Baja temperatura para rigor analítico determinista",
  "        // El System Prompt maestro ya fuerza salida JSON estricto (y más abajo se limpian",
  "        // los fences ```json), así que no se envía response_format: no es compatible con",
  "        // todos los proveedores de OpenRouter.",
  "        messages: [",
  "          { role: 'system', content: SYSTEM_PROMPT_WILDFIRE },",
  "          { role: 'user', content: userContent }",
  "        ]",
  "      })",
  "    });",
  "",
  "    if (!openRouterResponse.ok) {",
  "      throw new Error(`OpenRouter HTTP error: ${openRouterResponse.status}`);",
  "    }",
  "",
  "    const result = await openRouterResponse.json();",
  "    const content = result.choices[0]?.message?.content || '{}';",
  "    const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();",
  "    const structuredAlert = JSON.parse(cleaned);",
  "",
  "    // Disparar Webhook de alerta a Protección Civil / Bomberos si es CRITICAL",
  "    if (structuredAlert.riskLevel === 'CRITICAL' && structuredAlert.classification === 'VERIFIED_WILDFIRE') {",
  "      // await dispatchEmergencyWebhook(structuredAlert);",
  "    }",
  "",
  "    return res.json({ success: true, data: structuredAlert });",
  "  } catch (error: any) {",
  "    console.error('Error in AI Verification:', error);",
  "    return res.status(500).json({ error: error.message });",
  "  }",
  "});"
].join('\n');

export const OPENROUTER_INTEGRATION_CODE_PY = [
  "# python_backend/alert_engine.py",
  "import os",
  "import json",
  "import requests",
  "",
  "OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')",
  "",
  "# System Prompt maestro: el mismo que exporta src/prompts/masterFirePrompt.ts",
  "# (guárdalo en system_prompt.txt y léelo, o pégalo como string literal).",
  "SYSTEM_PROMPT_WILDFIRE = open('system_prompt.txt', encoding='utf-8').read()",
  "",
  "def verify_wildfire_incident(firms_hotspots, iot_sensors, copernicus_context):",
  "    headers = {",
  "        'Authorization': f'Bearer {OPENROUTER_API_KEY}',",
  "        'HTTP-Referer': 'https://natureintelligence.ai',",
  "        'X-Title': 'NatureIntelligence Early Detection System',",
  "        'Content-Type': 'application/json'",
  "    }",
  "",
  "    user_payload = {",
  "        'firms_hotspots': firms_hotspots,",
  "        'iot_sensors': iot_sensors,",
  "        'copernicus': copernicus_context",
  "    }",
  "",
  "    body = {",
  "        'model': 'anthropic/claude-3.5-sonnet', # o 'meta-llama/llama-3.3-70b-instruct'",
  "        'temperature': 0.1,",
  "        'max_tokens': 4096, # obligatorio para los modelos Anthropic en OpenRouter",
  "        'messages': [",
  "            {'role': 'system', 'content': SYSTEM_PROMPT_WILDFIRE},",
  "            {'role': 'user', 'content': f'Verificar incidente forestal:\\n{json.dumps(user_payload, indent=2)}'}",
  "        ]",
  "    }",
  "",
  "    response = requests.post('https://openrouter.ai/api/v1/chat/completions', headers=headers, json=body, timeout=25)",
  "    response.raise_for_status()",
  "    ",
  "    parsed = response.json()",
  "    raw_content = parsed['choices'][0]['message']['content']",
  "    cleaned_json = raw_content.replace('```json', '').replace('```', '').strip()",
  "    return json.loads(cleaned_json)"
].join('\n');
