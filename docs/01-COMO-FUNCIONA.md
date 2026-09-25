# 🔍 Cómo Funciona PyroWatch Valle

## 1. Introducción y Propósito
**PyroWatch Valle** resuelve el problema crítico de la latencia y los falsos positivos en la detección de incendios de cobertura vegetal en laderas urbanas y reservas forestales de **Santiago de Cali y el Valle del Cauca**.

El fuego en pendientes pronunciadas (como el Cerro de las Tres Cruces o Cristo Rey) se propaga a velocidades superiores a **2.5 km/h**, empujado por los vientos vespertinos del Océano Pacífico que entran por el cañón del Río Cali en dirección WNW hacia el área urbana residencial.

PyroWatch Valle integra 5 pilares tecnológicos en tiempo real:
1. **Detección Satelital Continua:** Satélites polares de alta resolución (NASA VIIRS a 375m) complementados con el satélite geoestacionario **NOAA GOES-16 (cada 10-15 minutos)**.
2. **Red de Sensores Terrestres IoT:** Nodos físicos in-situ que miden humo fino (PM2.5), monóxido de carbono (CO), velocidad y dirección del viento, y sensor de llama.
3. **Red de Cámaras Térmicas PTZ con Visión Artificial (IA Edge):** Cámaras 360° en las cimas que ejecutan inferencia ligera (YOLOv8 Edge) para detectar columnas de humo en menos de 30 segundos.
4. **Fusión Táctica con IA (OpenRouter):** Descarte de quemas agrícolas de caña de azúcar en la planicie del río Cauca y chimeneas de la zona industrial de Yumbo.
5. **Canal de Transmisión Inmediata (`/stream`) & Bot de WhatsApp:** Distribución masiva en tiempo real (SSE) y despacho georreferenciado a grupos de Bomberos Cali (Central X-1).

---

## 2. Los Dos Modos de Operación del Sistema

### 🟢 Modo 1: Datos Reales (En Producción)
- **Objetivo:** Monitoreo operacional in-situ para autoridades y brigadas de emergencia.
- **Fuentes:**
  - Pases orbitales reales de VIIRS y MODIS.
  - Escaneos cada 10-15 min de GOES-16 (Banda 7 IR 3.9 µm).
  - Telemetría en vivo de las estaciones meteorológicas e IoT de la CVC y DAGRD.
  - Video y bounding boxes de cámaras térmicas instaladas en los cerros tutelares.
  - Notificaciones reales a la Central de Bomberos Cali vía WhatsApp.

### 🧪 Modo 2: Datos Simulados / Pruebas (Sandbox)
- **Objetivo:** Permite a desarrolladores, bomberos y operadores probar integraciones y disparar simulacros sin activar despachos de emergencia reales.
- **Capacidades del Sandbox:**
  - Inyectar foco crítico en *Cerro Tres Cruces* (FRP 185 MW, PM2.5 320 µg/m³, viento a 38 km/h).
  - Inyectar combustión bajo dosel en *Farallones de Cali* (pico de CO a 29 ppm con nubosidad orográfica).
  - Inyectar falso positivo de quema agrícola en *Palmira / Rozo* para verificar cómo la IA descarta el evento automáticamente.
  - Inyectar telemetría sintética o restablecer todo a valores normales de calma.
  - Monitor en vivo que muestra la trama JSON exacta emitida por el canal SSE `/stream`.

---

## 3. El Flujo Técnico en 5 Etapas

```
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│ 1. SATÉLITES NRT        │  │ 2. CÁMARAS TÉRMICAS PTZ │  │ 3. SENSORES IoT CALI    │
│ • VIIRS (375m)          │  │ • Cima Tres Cruces      │  │ • Estación CVC-01       │
│ • GOES-16 (cada 15 min) │  │ • FLIR Cristo Rey       │  │ • Guardaparques PNN     │
│ • FRP, Temp. de Brillo  │  │ • YOLOv8 Edge (< 30 ms) │  │ • PM2.5, CO, Viento WNW │
└────────────┬────────────┘  └────────────┬────────────┘  └────────────┬────────────┘
             │                            │                            │
             └────────────────────────────┼────────────────────────────┘
                                          ▼
                      ┌───────────────────────────────────────┐
                      │ 4. MOTOR DE FUSIÓN TÁCTICA CON IA     │
                      │ (OpenRouter: Claude-3.5 / GPT-4o)     │
                      │ • Descarte de quemas agrícolas plano  │
                      │ • Correlación viento-pendiente        │
                      │ • Estimación de tiempo a cota urbana  │
                      └───────────────────┬───────────────────┘
                                          ▼
                      ┌───────────────────────────────────────┐
                      │ 5. CANAL /stream & BOT WHATSAPP       │
                      │ • EventSource SSE universal (CORS *)  │
                      │ • Despacho georreferenciado WhatsApp  │
                      │ • Apps Web, Móviles, Consola Bomberos │
                      └───────────────────────────────────────┘
```

---

## 4. Detalles de las Variables Ambientales Clave

| Variable | Sensor Físico | Rango Normal | Umbral de Alarma | Significado Operativo |
| :--- | :--- | :--- | :--- | :--- |
| **PM2.5 (µg/m³)** | Láser Óptico (PMS5003 / CVC) | 10 – 35 | &gt; 120 | Humo denso de combustión de pasto o bosque. |
| **CO (ppm)** | Electroquímico (MQ-7) | 0.8 – 3.0 | &gt; 15.0 | Combustión incompleta. Detecta fuego latente bajo copas densas. |
| **Viento (km/h y Dir)** | Anemómetro Ultrasónico | 10 – 20 | &gt; 30 (WNW) | Ráfagas del Pacífico que empujan el fuego ladera abajo hacia viviendas. |
| **FRP (MW)** | Satelital (VIIRS / GOES-16) | 0 | &gt; 25.0 | Potencia calorífica liberada por el frente de llama. |
| **Visión IA (%)** | Cámara Infrarroja FLIR | 0% | &gt; 85% | Bounding box confirmado por YOLOv8 en menos de 30 segundos. |
