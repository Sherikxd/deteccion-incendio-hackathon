import { Goes16Hotspot, ThermalCameraFeed, WhatsAppDispatchMessage } from '../types/fire';

// REAL PRODUCTION STATE: En condiciones normales reales en Cali NO hay incendios activos en las laderas.
// Las anomalías simuladas se reservan para el Modo Sandbox / Pruebas.
export const GOES16_DETECTIONS: Goes16Hotspot[] = [];

export const THERMAL_CAMERAS: ThermalCameraFeed[] = [
  {
    id: 'cam-ptz-tres-cruces-01',
    name: 'Cámara PTZ Térmica 360° — Cima Tres Cruces',
    location: 'Cali Ladera Norte (Mirador Bataclán)',
    elevationM: 1465,
    lat: 3.4682,
    lng: -76.5415,
    status: 'ONLINE',
    currentMode: 'THERMAL',
    thermalPalette: 'ironbow',
    maxTempC: 31,
    ambientTempC: 28,
    fps: 30,
    latencyMs: 24,
    detections: []
  },
  {
    id: 'cam-ptz-cristo-rey-02',
    name: 'Cámara FLIR — Torre Mirador Cristo Rey',
    location: 'Corregimiento Los Andes / Los Cristales',
    elevationM: 1435,
    lat: 3.4345,
    lng: -76.5642,
    status: 'ONLINE',
    currentMode: 'THERMAL',
    thermalPalette: 'rainbow',
    maxTempC: 29,
    ambientTempC: 27,
    fps: 30,
    latencyMs: 28,
    detections: []
  },
  {
    id: 'cam-ptz-siloe-bandera-03',
    name: 'Detección Óptica — Mirador La Bandera / Siloé',
    location: 'Comuna 20 (Ladera Suroccidental)',
    elevationM: 1280,
    lat: 3.4215,
    lng: -76.5528,
    status: 'ONLINE',
    currentMode: 'OPTICAL',
    thermalPalette: 'whitehot',
    maxTempC: 30,
    ambientTempC: 28,
    fps: 25,
    latencyMs: 32,
    detections: []
  },
  {
    id: 'cam-ptz-farallones-penas-04',
    name: 'Torre Vigilancia Forestal — PNN Farallones',
    location: 'Sector Peñas Blancas / Pichindé',
    elevationM: 1980,
    lat: 3.3872,
    lng: -76.6235,
    status: 'ONLINE',
    currentMode: 'THERMAL',
    thermalPalette: 'ironbow',
    maxTempC: 23,
    ambientTempC: 21,
    fps: 20,
    latencyMs: 45,
    detections: []
  }
];

export const INITIAL_WHATSAPP_DISPATCHES: WhatsAppDispatchMessage[] = [
  {
    id: 'wa-msg-guardia-01',
    recipientGroup: 'Central X-1 Bomberos Cali (Oficiales de Guardia)',
    recipientPhone: '+57 315 222 1119 (Grupo Emergencias)',
    timestamp: 'Hace 5 minutos (Guardia Activa)',
    status: 'READ',
    alertId: 'INFO-CALI-GUARDIA',
    sector: 'Laderas Urbanas y PNN Farallones',
    riskLevel: 'MODERATE',
    headline: 'GUARDIA PREVENTIVA ACTIVA: Sin novedades de incendios forestales en curso en Santiago de Cali. Red de sensores CVC y cámaras en parámetros normales.',
    googleMapsUrl: 'https://maps.google.com/?q=3.4516,-76.5320',
    windSpeed: 14,
    windDir: 'WNW',
    unitsDispatched: ['En Estación (Guardia Permanente)']
  }
];

// DATOS SIMULADOS PARA EL MODO SANDBOX (PRUEBAS):
export const SIMULATED_GOES16_HOTSPOTS: Goes16Hotspot[] = [
  {
    id: 'sim-goes16-tc-01',
    latitude: 3.4712,
    longitude: -76.5428,
    scanTime: 'Hace 4 minutos (Escaneo Simulado Mesoscala)',
    band: 'ABI_BAND_7',
    fireTemperatureK: 378.2,
    firePowerMW: 92.4,
    fireAreaM2: 12500,
    confidence: 'HIGH',
    scanType: 'MESOSCALE'
  }
];
