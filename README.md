# 🔥 PyroWatch Valle

**Detección temprana de incendios forestales y verificación con IA en tiempo real para Santiago de Cali y el Valle del Cauca.**

PyroWatch Valle es una plataforma que combina telemetría satelital (NASA FIRMS/VIIRS, NOAA GOES-16), una red de estaciones IoT en las laderas de Cali, cámaras térmicas PTZ con visión artificial y un motor de decisiones con inteligencia artificial. Su objetivo: detectar focos de incendio, verificarlos contra falsos positivos y transmitir alertas al instante a los centros de despacho —sin movilizar recursos innecesarios.

## ✨ Características principales

- **Alertas en tiempo real** vía Server-Sent Events (`/stream`) y WebSockets (`/ws`).
- **Motor de verificación con IA** que clasifica cada alerta: despacho confirmado, falso positivo descartado o monitoreo temprano.
- **API REST** para consumir alertas, consultar sensores e ingerir telemetría de hardware físico (ESP32, Raspberry Pi, LoRaWAN).
- **Sandbox de simulación** con escenarios de incendio de prueba.
- **Panel web** con mapa interactivo, cámaras térmicas, simulador de propagación (Rothermel) y despacho por WhatsApp.

## 🚀 Inicio rápido

**Requisitos:** Node.js 20.19+ o 22+

```bash
npm install
cp .env.example .env   # agrega tu OPENROUTER_API_KEY
npm run dev            # http://localhost:3000
```

## 🐳 Despliegue con Docker

```bash
docker build -t pyrowatch .
docker run -d -p 3000:3000 -e OPENROUTER_API_KEY=sk-... pyrowatch
```

## 📚 Documentación

Esta es solo una presentación breve del proyecto. **La documentación completa está en la carpeta [`docs/`](docs/README.md):**

| Documento | Contenido |
| :--- | :--- |
| [01 - Cómo funciona](docs/01-COMO-FUNCIONA.md) | Flujo de satélites, sensores IoT y cámaras térmicas. |
| [02 - Arquitectura](docs/02-ARQUITECTURA.md) | Diagrama de bloques y capas del backend. |
| [03 - Integración web](docs/03-INTEGRACION-WEB.md) | Código listo para React, ESP32/Arduino, Python y WhatsApp. |
| [04 - Referencia de la API](docs/04-API-REFERENCE.md) | Todos los endpoints REST, SSE y WebSocket. |
