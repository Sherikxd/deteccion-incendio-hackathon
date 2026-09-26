# 💻 Guía de Integración Web, Móvil y Hardware IoT

Esta guía contiene ejemplos de código listos para producción para integrar **NatureIntelligence** en cualquier aplicación frontend (React, Vue, Next.js), backend (Node.js, Python), app móvil (Flutter, React Native) o microcontrolador físico (ESP32 / Arduino).

---

## 1. Integración en React / Next.js / Vite (Consumir Alertas y Sensores)

### Hook Completo: `useNatureIntelligence.ts`
```typescript
import { useState, useEffect } from 'react';

export interface FireAlert {
  alertId: string;
  sector: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  headline: string;
  windSpeedKmh: number;
  windDirection: string;
  frpMw: number;
  pm25UgM3: number;
  tacticalAction: string;
  timestamp: string;
}

export interface SensorNode {
  id: string;
  name: string;
  pm25: number;
  co: number;
  temp: number;
  windSpeed: number;
  status: 'critical' | 'elevated' | 'normal';
}

export function useNatureIntelligence(baseUrl: string = 'https://<tu-app-url>') {
  const [alerts, setAlerts] = useState<FireAlert[]>([]);
  const [sensors, setSensors] = useState<SensorNode[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // 1. Cargar estado inicial por REST
    Promise.all([
      fetch(`${baseUrl}/api/alerts`).then((r) => r.json()),
      fetch(`${baseUrl}/api/sensors`).then((r) => r.json())
    ]).then(([alertsData, sensorsData]) => {
      if (alertsData.alerts) setAlerts(alertsData.alerts);
      if (sensorsData.sensors) setSensors(sensorsData.sensors);
    }).catch(console.error);

    // 2. Conexión en tiempo real con Server-Sent Events
    const es = new EventSource(`${baseUrl}/stream?channel=all`);

    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);

    // Evento de nueva alerta de incendio
    es.addEventListener('alert', (event: any) => {
      try {
        const payload = JSON.parse(event.data);
        const newAlert = payload.data?.alert || payload.alert;
        if (newAlert) {
          setAlerts((prev) => [newAlert, ...prev]);
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Evento de actualización periódica de sensores
    es.addEventListener('sensor_update', (event: any) => {
      try {
        const payload = JSON.parse(event.data);
        const updated = payload.data?.sensor || payload.sensor;
        if (updated) {
          setSensors((prev) =>
            prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
          );
        }
      } catch (e) {
        console.error(e);
      }
    });

    return () => es.close();
  }, [baseUrl]);

  return { alerts, sensors, isConnected };
}
```

---

## 2. Conectar Sensor Físico (ESP32 con WiFi / LTE)

Código C++ para cargar en un **ESP32** o **Arduino** con sensor láser de humo **PMS5003** y sensor de gas **MQ-7**:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "TU_WIFI_CALI";
const char* password = "TU_PASSWORD";
const char* serverUrl = "https://<tu-app-url>/api/sensors/ingest";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado.");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Lecturas de sensores físicos en campo
    float pm25 = 185.4; // Leer desde pin serial PMS5003
    float co = 16.2;    // Leer desde pin analógico A0 (MQ-7)
    float temp = 33.5;  // BME280
    int humidity = 21;  // BME280
    float wind = 32.0;  // Anemómetro

    String json = "{\"id\":\"iot-cali-tres-cruces-01\","
                  "\"pm25\":" + String(pm25) + ","
                  "\"co\":" + String(co) + ","
                  "\"temp\":" + String(temp) + ","
                  "\"humidity\":" + String(humidity) + ","
                  "\"windSpeed\":" + String(wind) + ","
                  "\"windDir\":\"WNW\","
                  "\"flame\":false}";

    int code = http.POST(json);
    Serial.printf("Respuesta backend: %d\n", code);
    http.end();
  }
  delay(5000); // Enviar cada 5 segundos
}
```

---

## 3. Integración en Python (Scripts de Monitoreo o Raspberry Pi)

```python
import requests
import json

BASE_URL = "https://<tu-app-url>"

# A) Enviar lectura de sensor desde Raspberry Pi
def enviar_lectura_estacion():
    payload = {
        "id": "iot-dapa-medio",
        "name": "Nodo Ambiental Dapa - Yumbo",
        "pm25": 142.5,
        "co": 11.2,
        "temp": 32.0,
        "humidity": 24,
        "windSpeed": 35.0,
        "windDir": "NW",
        "flame": False
    }
    r = requests.post(f"{BASE_URL}/api/sensors/ingest", json=payload)
    print("Respuesta sensor:", r.json())

# B) Escuchar en vivo canal de alertas continuas
def escuchar_alertas():
    print(f"[*] Conectando a {BASE_URL}/stream?channel=alerts...")
    r = requests.get(f"{BASE_URL}/stream?channel=alerts", stream=True)
    for line in r.iter_lines():
        if line and line.startswith(b"data: "):
            alerta = json.loads(line[6:].decode("utf-8"))
            print("🚨 Alerta recibida:", alerta)

if __name__ == "__main__":
    enviar_lectura_estacion()
    escuchar_alertas()
```

---

## 4. Disparar Despacho por Bot de WhatsApp desde tu Sistema

Puedes integrar el envío de WhatsApp en tus pipelines de alerta:

```bash
curl -X POST "https://<tu-app-url>/api/whatsapp/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientGroup": "Central X-1 Bomberos Cali",
    "sector": "Cerro de las Tres Cruces",
    "riskLevel": "CRITICAL",
    "headline": "Incendio con avance a Bataclán. Vientos del Pacífico a 32 km/h empujando llamas hacia zona urbana."
  }'
```

---

## 5. Inyectar Eventos en el Sandbox de Pruebas

Para automatizar pruebas de integración continua (CI/CD) o demostraciones:

```bash
# Inyectar incendio crítico simulado
curl -X POST "https://<tu-app-url>/api/simulate/event" \
  -H "Content-Type: application/json" \
  -d '{"scenario": "CRITICAL_FIRE_TRES_CRUCES"}'

# Probar descarte de falso positivo (quema agrícola de caña)
curl -X POST "https://<tu-app-url>/api/simulate/event" \
  -H "Content-Type: application/json" \
  -d '{"scenario": "SUGARCANE_BURN_PALMIRA_FALSE_POSITIVE"}'

# Restablecer todo a condiciones normales
curl -X POST "https://<tu-app-url>/api/simulate/event" \
  -H "Content-Type: application/json" \
  -d '{"scenario": "RESET_NORMAL"}'
```
