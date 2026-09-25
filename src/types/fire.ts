export interface FirmsHotspot {
  id: string;
  latitude: number;
  longitude: number;
  brightness: number; // Kelvin (e.g., 345.8)
  scan: number;
  track: number;
  acq_date: string; // YYYY-MM-DD
  acq_time: string; // HHMM UTC
  satellite: 'VIIRS_NOAA20' | 'VIIRS_SNPP' | 'MODIS_Terra' | 'MODIS_Aqua';
  instrument: 'VIIRS' | 'MODIS';
  confidence: 'nominal' | 'high' | 'low' | number;
  version: string;
  bright_t31: number; // Kelvin background
  frp: number; // Fire Radiative Power in MW
  daynight: 'D' | 'N';
}

export interface IoTSensorNode {
  id: string;
  name: string;
  locationName: string;
  lat: number;
  lng: number;
  elevationM: number;
  status: 'normal' | 'elevated' | 'critical' | 'offline';
  lastPing: string;
  metrics: {
    tempC: number;
    humidityPercent: number;
    pressureHpa: number;
    pm25: number; // µg/m³
    pm10: number; // µg/m³
    coPpm: number; // CO in parts per million
    co2Ppm: number;
    vocIndex: number;
    flameDetected: boolean;
    windSpeedKmh: number;
    windDirectionDeg: number;
    windDirectionCardinal: string;
    batteryPercent: number;
  };
}

export interface CopernicusContext {
  stacSceneId: string;
  acquisitionDate: string;
  cloudCoverPercent: number;
  meanNdvi: number; // -1 to 1 (Vegetation Health)
  currentNbr: number; // Normalized Burn Ratio
  swirAnomalyScore: number; // SWIR B12 reflectance indicator
  fuelDrynessIndex: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
  historicalBurnScarProximityKm: number;
}

export interface AIVerificationResult {
  alertId: string;
  timestamp: string;
  modelUsed: string;
  classification: 'VERIFIED_WILDFIRE' | 'EARLY_WARNING_SMOLDER' | 'WATCH_ELEVATED_RISK' | 'FALSE_POSITIVE_LIKELY';
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  confidenceScore: number; // 0 to 100
  falsePositiveProbability: number; // 0 to 100
  falsePositiveDiagnosis: string;
  correlation: {
    spatialDistanceKm: number;
    windPlumeVectorMatch: boolean;
    temporalDeltaMinutes: number;
    summary: string;
  };
  fireDynamics: {
    estimatedRateOfSpreadKmH: number;
    propagationDirection: string;
    estimatedAreaHa: number;
    fireRadiativePowerTotalMw: number;
  };
  threatenedAssets: string[];
  tacticalRecommendations: string[];
  disasterAlerts: {
    shortSmsCAP: string;
    civilProtectionNotice: string;
    firefighterRadioBulletin: string;
  };
  rawJsonResponse: string;
  executionTimeMs?: number;
}

export interface FireIncidentScenario {
  id: string;
  title: string;
  region: string;
  country: string;
  center: [number, number];
  zoom: number;
  description: string;
  hotspots: FirmsHotspot[];
  sensors: IoTSensorNode[];
  copernicus: CopernicusContext;
  groundTruthType: 'NORMAL_WATCH' | 'NORMAL_CONDITIONS' | 'WILDFIRE' | 'AGRICULTURAL_BURN' | 'SMOLDERING_CANOPY' | 'INDUSTRIAL_FLARE';
}

export interface Goes16Hotspot {
  id: string;
  latitude: number;
  longitude: number;
  scanTime: string;
  band: 'ABI_BAND_7' | 'ABI_BAND_14';
  fireTemperatureK: number;
  firePowerMW: number;
  fireAreaM2: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  scanType: 'MESOSCALE' | 'FULL_DISK';
}

export interface ThermalCameraFeed {
  id: string;
  name: string;
  location: string;
  elevationM: number;
  lat: number;
  lng: number;
  status: 'ONLINE' | 'ALARM' | 'STANDBY';
  currentMode: 'THERMAL' | 'OPTICAL';
  thermalPalette: 'ironbow' | 'rainbow' | 'whitehot';
  maxTempC: number;
  ambientTempC: number;
  fps: number;
  latencyMs: number;
  detections: {
    id: string;
    label: string;
    type: 'SMOKE' | 'FLAME' | 'HOTSPOT';
    confidence: number;
    bbox: { x: number; y: number; w: number; h: number };
    tempC?: number;
  }[];
}

export interface WhatsAppDispatchMessage {
  id: string;
  recipientGroup: string;
  recipientPhone: string;
  timestamp: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'SIMULATED';
  alertId: string;
  sector: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE';
  headline: string;
  googleMapsUrl: string;
  windSpeed: number;
  windDir: string;
  unitsDispatched: string[];
}

export interface AIDecisionMeta {
  decision: 'DISPATCH_CONFIRMED' | 'DISCARDED_FALSE_POSITIVE' | 'EARLY_WARNING_MONITOR';
  confidence: number; // e.g. 97.5%
  model: string; // e.g. 'claude-3.5-sonnet' or 'gemini-2.0-flash'
  reasoning: string;
  rulesEvaluated: string[];
  resourcesSavedEstimateCop?: number;
}

export interface FireEmergencyAlert {
  alertId: string;
  timestamp: string;
  sector: string;
  region: string;
  country: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  category: 'WILDFIRE' | 'SMOLDERING' | 'AGRICULTURAL_BURN' | 'INDUSTRIAL';
  headline: string;
  description: string;
  windSpeedKmh: number;
  windDirection: string;
  pm25UgM3: number;
  frpMw: number;
  threatenedAssets: string[];
  tacticalAction: string;
  capNotice?: string;
  radioDispatch?: string;
  aiDecision?: AIDecisionMeta;
}

