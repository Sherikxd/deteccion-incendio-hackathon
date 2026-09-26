# 🏗️ Arquitectura de Software, Datos y Red

## 1. Diagrama de Arquitectura Global

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FUENTES Y SENSORES IN-SITU                       │
│  ┌───────────────────────┐   ┌────────────────────────┐   ┌───────────────┐ │
│  │ NASA FIRMS & GOES-16  │   │ Red IoT Sensores Cali  │   │ Cámaras PTZ   │ │
│  │ VIIRS 375m / ABI 15m  │   │ ESP32/CVC: PM2.5, CO   │   │ YOLOv8 Edge   │ │
│  └───────────┬───────────┘   └───────────┬────────────┘   └───────┬───────┘ │
└──────────────┼───────────────────────────┼────────────────────────┼─────────┘
               │                           │                        │
               ▼                           ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      NÚCLEO DEL SERVIDOR (server.ts)                        │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Express REST API (CORS Universal):                                    │  │
│  │ • /api/alerts        • /api/sensors/ingest  • /api/simulate/event     │  │
│  │ • /api/sensors       • /api/verify          • /api/whatsapp/dispatch  │  │
│  │ • /api/goes16        • /api/cameras         • /api/docs               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────┐       ┌───────────────────────────────┐  │
│  │ SSE Event Bus:                │       │ WebSocket Gateway:            │  │
│  │ GET /stream                   │       │ WS /stream y WS /ws           │  │
│  │ Canales: alerts, telemetry    │       │ Bidireccional baja latencia   │  │
│  └───────────────┬───────────────┘       └───────────────┬───────────────┘  │
└──────────────────┼───────────────────────────────────────┼──────────────────┘
                   │                                       │
                   ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CONSUMIDORES Y CLIENTES                            │
│  ┌────────────────────┐   ┌────────────────────┐   ┌──────────────────────┐ │
│  │ Aplicaciones Web   │   │ Bot de WhatsApp    │   │ Central Bomberos     │ │
│  │ (React / Vue / iOS)│   │ Oficiales Guardia  │   │ Despacho X-1 / CAP   │ │
│  └────────────────────┘   └────────────────────┘   └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Ingesta de Sensores Terrestres (Hardware Físico)

Cualquier nodo IoT en campo (ESP32 con módem 4G/LTE, módulo LoRaWAN o estación CVC) puede enviar lecturas al backend mediante un `POST` HTTP simple:

```
[ Sensor Físico PMS5003 + MQ-7 ] 
           │
           │ HTTP POST /api/sensors/ingest
           ▼
[ NatureIntelligence Backend (server.ts) ]
           │
           ├─► Actualiza estado en memoria de la estación
           └─► Emite evento SSE "sensor_update" a todos los clientes conectados
```

### Formato de Carga Útil (`Payload`):
```json
{
  "id": "iot-cali-tres-cruces-01",
  "name": "Estación CVC-01 Mirador Tres Cruces",
  "location": "Cali Ladera Noroccidental",
  "pm25": 284.2,
  "co": 22.8,
  "temp": 34.2,
  "humidity": 18,
  "windSpeed": 32.0,
  "windDir": "WNW",
  "flame": true
}
```

---

## 3. Protocolos de Tiempo Real: SSE vs WebSockets

| Característica | Server-Sent Events (`/stream`) | WebSocket (`/ws`) |
| :--- | :--- | :--- |
| **Dirección** | Unidireccional (Servidor ➔ Cliente) | Bidireccional (Full-Duplex) |
| **Soporte Nativo** | `new EventSource('/stream')` en navegador | `new WebSocket('/ws')` |
| **Reconexión** | Automática por el navegador | Manual o con librerías |
| **Atravesamiento Proxies** | 100% sobre HTTP/1.1 y HTTP/2 estándar | Requiere soporte de `Connection: Upgrade` |
| **Uso en NatureIntelligence** | Consumo de alertas y telemetría continua | Comandos interactivos y telemetría ascendente |

---

## 4. Bot de Despacho Automatizado para WhatsApp

El backend expone `POST /api/whatsapp/dispatch`. Cuando se confirma un incendio o se dispara un simulacro:
1. Se valida el nivel de riesgo (`CRITICAL`, `HIGH`, `MODERATE`).
2. Se genera el enlace georreferenciado directo a Google Maps (`https://maps.google.com/?q={lat},{lng}`).
3. Se selecciona la plantilla correspondiente (código rojo para oficiales de guardia o alerta preventiva para brigadas comunitarias).
4. Se retransmite por el bus SSE para registrar el envío en la consola web en tiempo real.
