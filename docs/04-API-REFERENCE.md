# 📡 Referencia Completa de la API & Endpoints

La API de **NatureIntelligence** es compatible con HTTP/1.1 y HTTP/2, y cuenta con **CORS universal (`Access-Control-Allow-Origin: *`)** para consumo directo desde cualquier navegador, frontend web, backend o microcontrolador físico.

---

## 📋 Catálogo Rápido de Endpoints

| Método | Ruta | Tipo | Descripción |
| :---: | :--- | :--- | :--- |
| `GET` | **`/stream`** | SSE (Tiempo Real) | Flujo continuo de eventos de alertas (`alert`) y sensores (`sensor_update`). |
| `GET` | **`/api/alerts`** | REST JSON | Obtiene alertas con filtrado por decisión de IA (`?decision=confirmed,discarded,monitored`). |
| `POST` | **`/api/alerts`** | REST JSON | Publica una nueva alerta desde drones o sistemas externos. |
| `POST` | **`/api/alerts/evaluate-ai`** | REST JSON | Evalúa un foco con el motor de IA y clasifica si se despacha o se descarta. |
| `GET` | **`/api/sensors`** | REST JSON | Lista de estaciones IoT terrestres con sus métricas en vivo. |
| `POST` | **`/api/sensors/ingest`** | REST JSON | Ingesta telemetría directa desde hardware físico (ESP32, Arduino, LoRaWAN). |
| `POST` | **`/api/simulate/event`** | REST JSON | Inyecta escenarios simulados en el Sandbox de pruebas. |
| `POST` | **`/api/simulate/spread`** | REST JSON | Modelo Rothermel de propagación (ROS, llama, ETA a la cota urbana). |
| `GET` | **`/stream/alerts`** | REST JSON | Snapshot JSON de las alertas almacenadas en memoria. |
| `POST` | **`/api/whatsapp/dispatch`**| REST JSON | Dispara notificación del bot de WhatsApp a la Central de Bomberos. |
| `GET` | **`/api/goes16`** | REST JSON | Detecciones térmicas del satélite geoestacionario NOAA GOES-16. |
| `GET` | **`/api/cameras`** | REST JSON | Estado y detecciones de visión artificial (YOLOv8) en cámaras térmicas PTZ. |
| `POST` | **`/api/verify`** | REST JSON | Verificación analítica de riesgo y recomendación táctica como servicio. |
| `GET` | **`/api/health`** | REST JSON | Diagnóstico de salud, uptime y clientes conectados. |
| `GET` | **`/api/docs`** | OpenAPI JSON | Especificación de la API en formato OpenAPI / JSON. |

---

## 1. Streaming en Tiempo Real: `GET /stream`

Abre una conexión permanente Server-Sent Events (SSE).

- **Headers:** `Accept: text/event-stream`
- **Parámetros Query:**
  - `channel`: `alerts` | `telemetry` | `all` (por defecto `all`).

```bash
curl -N -H "Accept: text/event-stream" "https://<tu-app-url>/stream?channel=all"
```

### Eventos Emitidos:

El nombre del evento (`event:`) es **estable por canal**, y el tipo concreto de mensaje viaja dentro de `data.type`:

- **`event: connected`**: Saludo con ID de sesión y clientes activos (emisión directa al conectar).
- **`event: initial_alerts`**: Snapshot de alertas recientes al suscribirse.
- **`event: alert`** (canal `alerts`): Notificación de incendio detectado o verificado (`data.type`: `EMERGENCY_ALERT`, `AI_FILTERING_DECISION`, `WHATSAPP_DISPATCH_TRIGGERED`, ...).
- **`event: sensor_update`** (canal `telemetry`): Actualización de telemetría de una estación IoT (`data.type`: `SENSOR_UPDATE`).
- **`event: analysis`** (canal `analysis`): Salida del verificador IA en streaming (`data.type`: `STREAM_START`, `STREAM_CHUNK`, `STREAM_COMPLETE`, `STREAM_ERROR`).
- **`event: incident_update`** (canal `incidents`): Cambios de estado de los escenarios monitorizados.
- **`event: <canal>`** para cualquier otro canal definido.

> Los `POST` del gateway comparten un límite de **60/min por IP** (`429`) y el canal SSE admite hasta **250 escuchas simultáneas** (`503`).

---

## 2. Ingesta de Sensores Físicos: `POST /api/sensors/ingest`

Permite a dispositivos en campo actualizar sus variables ambientales.

#### Petición (cURL):
```bash
curl -X POST "https://<tu-app-url>/api/sensors/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "iot-cali-tres-cruces-01",
    "pm25": 185.2,
    "co": 18.4,
    "temp": 34.0,
    "humidity": 19,
    "windSpeed": 32.5,
    "windDir": "WNW",
    "flame": true
  }'
```

#### Respuesta (200 OK):
```json
{
  "success": true,
  "message": "Telemetría de sensor IoT ingerida y transmitida a /stream",
  "sensor": {
    "id": "iot-cali-tres-cruces-01",
    "name": "Estación CVC-01 Mirador Tres Cruces",
    "pm25": 185.2,
    "co": 18.4,
    "temp": 34,
    "humidity": 19,
    "windSpeed": 32.5,
    "windDir": "WNW",
    "flame": true,
    "status": "critical"
  }
}
```

---

## 3. Alertas Filtradas por Decisión de IA: `GET /api/alerts`

Permite obtener únicamente las alertas que hayan pasado por el motor de razonamiento de IA con filtros específicos.

- **Parámetros Query:**
  - `decision`:
    - `confirmed`: Solo incendios verificados con despacho ordenado de bomberos.
    - `discarded`: Solo falsos positivos descartados por IA (quemas de caña o chimeneas industriales).
    - `monitored`: Focos latentes bajo dosel arbóreo en monitoreo preventivo.
    - `all`: Todas las alertas analizadas.
  - `min_confidence`: Porcentaje mínimo de confianza algorítmica (ej. `min_confidence=95`).

#### Petición:
```bash
curl -s "https://<tu-app-url>/api/alerts?decision=confirmed"
```

#### Respuesta:
```json
{
  "success": true,
  "region": "Santiago de Cali & Valle del Cauca",
  "filterApplied": "confirmed",
  "decisionSummary": {
    "totalAnalyzed": 5,
    "confirmedDispatches": 2,
    "discardedFalsePositives": 2,
    "monitoredSmoldering": 1,
    "totalResourcesSavedCop": 3700000
  },
  "total": 2,
  "alerts": [
    {
      "alertId": "ALR-CALI-2026-8901",
      "sector": "Cerro de las Tres Cruces & Bataclán",
      "riskLevel": "CRITICAL",
      "frpMw": 175.2,
      "aiDecision": {
        "decision": "DISPATCH_CONFIRMED",
        "confidence": 98.4,
        "model": "claude-3.5-sonnet",
        "reasoning": "Confirmación inequívoca: Foco en cresta con pendiente de 32° y vientos WNW del Pacífico hacia Juanambú.",
        "rulesEvaluated": [
          "PENDIENTE_LADERA_CRITICA_32_DEG",
          "VECTOR_VIENTO_DIRECTO_A_RESIDENCIAL",
          "FRP_EXCEDE_UMBRAL_CALOR_ALTO"
        ]
      }
    }
  ]
}
```

---

## 4. Evaluador de Focos por IA como Servicio: `POST /api/alerts/evaluate-ai`

Permite a drones, patrullas o sistemas GIS enviar telemetría cruda y recibir el dictamen instantáneo de la IA sobre si despachar o descartar.

#### Petición:
```bash
curl -X POST "https://<tu-app-url>/api/alerts/evaluate-ai" \
  -H "Content-Type: application/json" \
  -d '{
    "sector": "Valle Geográfico Rozo",
    "frp": 16.5,
    "slopeDeg": 0,
    "windSpeed": 14,
    "windDirection": "NE",
    "isAgriculturalZone": true
  }'
```

#### Respuesta (200 OK):
```json
{
  "success": true,
  "evaluationId": "AI-DEC-MUH754K1",
  "sector": "Valle Geográfico Rozo",
  "decision": "DISCARDED_FALSE_POSITIVE",
  "confidence": 96.5,
  "reasoning": "Foco en zona agrícola plana (pendiente 0°): FRP moderado (16.5 MW) y viento en dirección al valle. Se descarta riesgo para infraestructura urbana de Cali.",
  "evaluatedRules": [
    "ZONIFICACION_AGRICOLA_CANA",
    "PENDIENTE_PLANA_0_5_DEG",
    "FRP_BAJO_RESIDUAL"
  ],
  "tacticalAction": "NINGUNA. Quema agrícola autorizada de caña de azúcar descartada por la IA.",
  "resourcesSavedEstimateCop": 1850000,
  "timestamp": "2026-09-25T16:35:00.000Z"
}
```

---

## 3. Banco de Pruebas: `POST /api/simulate/event`

Inyecta escenarios simulados para probar el comportamiento de clientes y bots sin alarmas reales.

- **Escenarios Admitidos:**
  - `CRITICAL_FIRE_TRES_CRUCES`: Incendio activo de alta intensidad en cresta norte.
  - `SMOLDER_FARALLONES`: Combustión latente bajo dosel arbóreo en Peñas Blancas.
  - `SUGARCANE_BURN_PALMIRA_FALSE_POSITIVE`: Quema agrícola en planicie descartada por IA.
  - `RESET_NORMAL`: Regresa todos los sensores a condiciones de calma.

#### Petición:
```bash
curl -X POST "https://<tu-app-url>/api/simulate/event" \
  -H "Content-Type: application/json" \
  -d '{"scenario": "CRITICAL_FIRE_TRES_CRUCES"}'
```

---

## 3b. Modelo de Propagación Rothermel: `POST /api/simulate/spread`

Calcula velocidad de avance superficial (ROS), longitud de llama y ETA hasta la cota urbana con el modelo Rothermel. Es el endpoint que consume el simulador del Sandbox.

#### Petición:
```bash
curl -X POST "https://<tu-app-url>/api/simulate/spread" \
  -H "Content-Type: application/json" \
  -d '{
    "windSpeed": 32,
    "slopeDeg": 30,
    "fuelMoisture": "EXTREME",
    "windDirection": "WNW"
  }'
```

- `windSpeed`: km/h (`0`–`250`). `slopeDeg`: grados (`0`–`60`).
- `fuelMoisture`: `EXTREME` (`1.8`) | `HIGH` (`1.3`) | `MODERATE` (`0.8`) — factores de combustible idénticos a los del simulador web.
- `windDirection` (opcional): solo se refleja en `inputs`; el modelo es direccionalmente agnóstico.

#### Respuesta (200):
```json
{
  "success": true,
  "model": "Rothermel Wildfire Spread (Surface Model)",
  "inputs": { "windSpeed": 32, "slopeDeg": 30, "fuelMoisture": "EXTREME" },
  "results": {
    "rateOfSpreadMetersPerMinute": 113.9,
    "rateOfSpreadKmPerHour": 6.83,
    "flameLengthMeters": 2.6,
    "timeToUrbanPerimeterMinutes": 12,
    "isochronesEstimated": {
      "min15Meters": 1709,
      "min30Meters": 3417,
      "min45Meters": 5126,
      "min60Meters": 6834
    }
  }
}
```

Devuelve `422` si `fuelMoisture` no es un valor admitido.

---

## 4. Despacho por WhatsApp: `POST /api/whatsapp/dispatch`

Envía una ficha táctica estructurada con enlace a Google Maps al bot de WhatsApp.

#### Petición:
```bash
curl -X POST "https://<tu-app-url>/api/whatsapp/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientGroup": "Central X-1 Bomberos Cali",
    "sector": "Cerro de las Tres Cruces",
    "riskLevel": "CRITICAL",
    "headline": "Incendio forestal activo en cresta norte con avance a Bataclán."
  }'
```

#### Respuesta:
```json
{
  "success": true,
  "status": "DELIVERED",
  "dispatchId": "WA-DISPATCH-MUH7104A",
  "recipient": "Central X-1 Bomberos Cali",
  "message": "Notificación transmitida por WhatsApp Business Bot a la central de bomberos.",
  "timestamp": "2026-09-25T16:25:00.000Z"
}
```

---

## 5. Satélite NOAA GOES-16: `GET /api/goes16`

Retorna las anomalías térmicas capturadas por el sensor ABI en banda 7 cada 10 a 15 minutos.

#### Respuesta:
```json
{
  "success": true,
  "satellite": "NOAA GOES-16 (GOES-East)",
  "sensor": "Advanced Baseline Imager (ABI)",
  "cadence": "Cada 10 a 15 minutos (Mesoscala / Full Disk)",
  "totalDetections": 3,
  "detections": [
    {
      "id": "goes16-cali-abi-701",
      "latitude": 3.4712,
      "longitude": -76.5428,
      "scanTime": "Hace 4 minutos (14:30 UTC)",
      "firePowerMW": 92.4,
      "fireTemperatureK": 378.2,
      "confidence": "HIGH"
    }
  ]
}
```

---

## 6. Cámaras Térmicas PTZ: `GET /api/cameras`

Retorna el estado de los 4 nodos de cámaras PTZ con visión artificial en los cerros de Cali.

#### Respuesta:
```json
{
  "success": true,
  "total": 4,
  "model": "YOLOv8-Wildfire Edge",
  "cameras": [
    {
      "id": "cam-ptz-tres-cruces-01",
      "name": "Cámara PTZ Térmica 360° — Cima Tres Cruces",
      "status": "ALARM",
      "maxTempC": 485,
      "fps": 30,
      "detections": ["Columna de Humo en Cresta (98.4%)", "Frente Térmico Infrarrojo (96.1%)"]
    }
  ]
}
```
