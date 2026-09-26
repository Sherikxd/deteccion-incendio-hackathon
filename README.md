# 🔥 NatureIntelligence

**Detección temprana de incendios forestales y verificación con IA en tiempo real para Santiago de Cali y el Valle del Cauca.**

NatureIntelligence es una plataforma que combina telemetría satelital (NASA FIRMS/VIIRS, NOAA GOES-16), una red de estaciones IoT en las laderas de Cali, cámaras térmicas PTZ con visión artificial y un motor de decisiones con inteligencia artificial. Su objetivo: detectar focos de incendio, verificarlos contra falsos positivos y transmitir alertas al instante a los centros de despacho —sin movilizar recursos innecesarios.

## ✨ Características principales

- **Alertas en tiempo real** vía Server-Sent Events (`/stream`) y WebSockets (`/ws`).
- **Motor de verificación con IA** que clasifica cada alerta: despacho confirmado, falso positivo descartado o monitoreo temprano.
- **API REST** para consumir alertas, consultar sensores e ingerir telemetría de hardware físico (ESP32, Raspberry Pi, LoRaWAN).
- **Sandbox de simulación** con escenarios de incendio de prueba.
- **Panel web** con mapa interactivo, cámaras térmicas, simulador de propagación (Rothermel) y despacho por WhatsApp.

> Alcance de esta entrega: la demo deja funcional el flujo local de alertas, telemetría, SSE/WebSocket y simulación. WhatsApp e IA externa permanecen en modo opcional/simulado hasta configurar proveedores reales.

## 🚀 Inicio rápido

**Requisitos:** Node.js 20.19+ o 22+

```bash
npm install
cp .env.example .env   # agrega tu OPENROUTER_API_KEY
npm run dev            # http://localhost:3000
```

## 🧪 Verificación

```bash
npm run check   # typecheck (tsc) + suite de tests
npm test        # sólo tests (vitest run)
npm run test:watch
```

La suite (`tests/`) cubre:

| Archivo | Qué verifica |
| :--- | :--- |
| `sseEvents.test.ts` | Contrato de nombres de evento SSE (alert / sensor_update / analysis / incident_update). |
| `server.test.ts` | Arranca el servidor real y valida SSE en vivo, `/api/simulate/spread`, `/api/alerts` y `/stream/alerts`. |
| `websocketService.test.ts` | Cola de salida durante el handshake, `send()` booleano y cierre manual sin reconexión. |
| `streamLiveChannel.test.tsx` | Suscripciones SSE del cliente, pintado de alertas/telemetría y errores del POST `/stream`. |
| `webSocketStreamStudio.test.tsx` | Filtrado por `streamId`, errores de stream y cierre del socket al desmontar. |
| `fireSpreadSimulator.test.tsx` | Modelo real en el servidor, viento ESE sin amenaza urbana y despacho WhatsApp. |
| `promptEngineeringStudio.test.tsx` | Toggles de reglas opcionales y payload inyectado (`buildUserPrompt`). |
| `masterFirePrompt.test.ts` | Marcadores del prompt y snippets TS/Python. |
| `copyToClipboard.test.ts` | Fallback de portapapeles fuera de contexto seguro. |
| `snippets.test.ts` | Que todos los snippets copiables de la UI compilan (Python, TS, Go, Node, navegador). |

## 🐳 Despliegue con Docker

```bash
docker build -t natureintelligence .
docker run -d -p 3000:3000 -e OPENROUTER_API_KEY=sk-... natureintelligence
```

## 📚 Documentación

Esta es solo una presentación breve del proyecto. **La documentación completa está en la carpeta [`docs/`](docs/README.md):**

| Documento | Contenido |
| :--- | :--- |
| [01 - Cómo funciona](docs/01-COMO-FUNCIONA.md) | Flujo de satélites, sensores IoT y cámaras térmicas. |
| [02 - Arquitectura](docs/02-ARQUITECTURA.md) | Diagrama de bloques y capas del backend. |
| [03 - Integración web](docs/03-INTEGRACION-WEB.md) | Código listo para React, ESP32/Arduino, Python y WhatsApp. |
| [05 - Operación segura](docs/05-OPERACION-SEGURA.md) | Límites, simulación, estado de WhatsApp e IA externa. |
| [04 - Referencia de la API](docs/04-API-REFERENCE.md) | Todos los endpoints REST, SSE y WebSocket. |
