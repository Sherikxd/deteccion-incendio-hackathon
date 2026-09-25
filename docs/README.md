# 📖 PyroWatch Valle — Documentación Técnica del Sistema

Bienvenido a la documentación oficial de **PyroWatch Valle**, la plataforma de detección temprana, verificación de incendios de cobertura vegetal y transmisión de alertas en tiempo real para **Santiago de Cali y el Valle del Cauca**.

Esta carpeta contiene la documentación detallada sobre el funcionamiento interno, la arquitectura de datos satelitales e IoT, y las guías prácticas de integración en aplicaciones web, móviles y microcontroladores físicos.

---

## 🗂️ Índice de Contenidos

| Documento | Descripción |
| :--- | :--- |
| [**1. Cómo Funciona el Sistema (`01-COMO-FUNCIONA.md`)**](./01-COMO-FUNCIONA.md) | Flujo completo: Satélites (VIIRS + GOES-16), red de sensores IoT en Cali, cámaras térmicas PTZ con visión artificial (YOLOv8 Edge), modo Datos Reales vs Sandbox de Pruebas. |
| [**2. Arquitectura de Software & Datos (`02-ARQUITECTURA.md`)**](./02-ARQUITECTURA.md) | Diagrama de bloques, capas del backend (Express + SSE + WebSockets), ingesta de hardware físico (`/api/sensors/ingest`) y bot de WhatsApp. |
| [**3. Guía de Integración Web, Móvil e IoT (`03-INTEGRACION-WEB.md`)**](./03-INTEGRACION-WEB.md) | Ejemplos prácticos y código listo para producción en **React / Next.js**, **ESP32 / Arduino (C++)**, **Python (Raspberry Pi)**, cURL y webhooks de WhatsApp. |
| [**4. Referencia de la API & Endpoints (`04-API-REFERENCE.md`)**](./04-API-REFERENCE.md) | Catálogo de endpoints REST (`/api/alerts`, `/api/sensors`, `/api/sensors/ingest`, `/api/simulate/event`, `/api/whatsapp/dispatch`, `/api/goes16`, `/api/cameras`), canal Server-Sent Events (`/stream`) y esquemas JSON. |

---

## ⚡ Inicio Rápido (30 Segundos)

### 1. Escuchar Alertas en Tiempo Real desde la Terminal (SSE)
```bash
curl -N -H "Accept: text/event-stream" "https://<tu-dominio>/stream?channel=all"
```

### 2. Consultar Alertas Activas en Formato JSON
```bash
curl -s "https://<tu-dominio>/api/alerts"
```

### 3. Consultar Sensores IoT de Ladera en Cali
```bash
curl -s "https://<tu-dominio>/api/sensors"
```

### 4. Enviar Telemetría desde un Microcontrolador Físico (ESP32 / Python)
```bash
curl -X POST "https://<tu-dominio>/api/sensors/ingest" \
  -H "Content-Type: application/json" \
  -d '{"id":"iot-cali-tres-cruces-01","pm25":185.0,"co":16.2,"windSpeed":32.0}'
```

### 5. Inyectar un Incendio Simulado en el Sandbox de Pruebas
```bash
curl -X POST "https://<tu-dominio>/api/simulate/event" \
  -H "Content-Type: application/json" \
  -d '{"scenario":"CRITICAL_FIRE_TRES_CRUCES"}'
```

---

## 🏛️ Entidades y Contexto Operativo
- **Región:** Santiago de Cali & Valle del Cauca, Colombia.
- **Sectores Críticos:** Cerro de las Tres Cruces, Cerro Cristo Rey, PNN Farallones de Cali (Peñas Blancas / Pichindé), Corredor Dapa - Yumbo.
- **Entidades Vinculadas:** Benemérito Cuerpo de Bomberos Voluntarios de Cali (Central X-1), Corporación Autónoma Regional del Valle del Cauca (CVC), DAGRD (Alcaldía de Cali) y Parques Nacionales Naturales de Colombia.
