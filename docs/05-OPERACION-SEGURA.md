# Operación segura de la demo

NatureIntelligence mantiene dos tipos de comportamiento:

- **Datos de demostración:** sensores, cámaras y escenarios locales que permiten mostrar la interfaz y probar el flujo de alertas.
- **Datos externos:** payloads enviados por integraciones autorizadas a los endpoints REST o al canal `/stream`.

## Alertas y telemetría

Las alertas externas y las lecturas IoT se validan antes de retransmitirse. Los valores numéricos tienen límites razonables y los payloads JSON están limitados a 256 KB. Las solicitudes `POST` tienen un límite temporal por IP para evitar que una integración defectuosa sature el gateway en memoria.

El estado actual es efímero: las alertas y sensores viven en memoria y se pierden al reiniciar el proceso. Para una operación persistente se debe añadir un almacenamiento y autenticación propios.

## Simulación

`POST /api/simulate/event` está pensado para pruebas de la demo. Solo acepta los escenarios documentados y no debe exponerse como mecanismo público de despacho. Los escenarios no deben compartir un canal de notificación real.

## WhatsApp

`POST /api/whatsapp/dispatch` devuelve `SIMULATED` mientras no exista un proveedor configurado. No envía mensajes a WhatsApp. La integración con Meta Cloud API o Twilio requiere credenciales, control de destinatarios y confirmación de entrega del proveedor.

## IA externa

Los endpoints de OpenRouter permanecen opcionales. Sin `OPENROUTER_API_KEY` responden que la inferencia externa está deshabilitada. Los modelos recibidos por API se limitan a la lista conocida y los prompts se recortan para controlar el consumo.
