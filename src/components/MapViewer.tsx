import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { FireIncidentScenario, FirmsHotspot, IoTSensorNode } from '../types/fire';
import { GOES16_DETECTIONS, THERMAL_CAMERAS } from '../data/advancedSensors';
import {
  Flame,
  Radio,
  Wind,
  Eye,
  Layers,
  Compass,
  MapPin,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Mountain,
  Satellite,
  Camera
} from 'lucide-react';

interface MapViewerProps {
  incident: FireIncidentScenario;
  onSelectHotspot?: (hotspot: FirmsHotspot) => void;
  onSelectSensor?: (sensor: IoTSensorNode) => void;
}

// Cali & Valle del Cauca key landmarks for quick map navigation
const CALI_LANDMARKS = [
  { name: 'Tres Cruces', center: [3.4682, -76.5415] as [number, number], zoom: 14, icon: '⛰️' },
  { name: 'Cristo Rey', center: [3.4355, -76.5560] as [number, number], zoom: 14, icon: '⛪' },
  { name: 'Farallones de Cali', center: [3.4150, -76.6200] as [number, number], zoom: 13, icon: '🌲' },
  { name: 'Dapa / Yumbo', center: [3.5650, -76.5450] as [number, number], zoom: 13, icon: '🌿' },
  { name: 'Valle del Cauca (General)', center: [3.5000, -76.4800] as [number, number], zoom: 11, icon: '🗺️' }
];

export const MapViewer: React.FC<MapViewerProps> = ({
  incident,
  onSelectHotspot,
  onSelectSensor
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeBaseLayer, setActiveBaseLayer] = useState<'esri' | 'osm' | 'topo'>('esri');
  const [showGibsOverlay, setShowGibsOverlay] = useState<boolean>(false);
  const [showCorrelationArcs, setShowCorrelationArcs] = useState<boolean>(true);
  const [showGoes16, setShowGoes16] = useState<boolean>(true);
  const [showThermalCameras, setShowThermalCameras] = useState<boolean>(true);
  const [selectedElement, setSelectedElement] = useState<{ type: 'hotspot' | 'sensor'; data: any } | null>(null);

  // Initialize Map centered on Cali / Valle del Cauca
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Santiago de Cali default coordinates: 3.4516, -76.5320
      const initialCenter = incident?.center || [3.4516, -76.5320];
      const initialZoom = incident?.zoom || 13;

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
      layersGroupRef.current = L.layerGroup().addTo(map);

      // Force resize calculation
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      // Clean up if component unmounts
    };
  }, []);

  // Update Base Layer & View when incident changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.flyTo(incident.center, incident.zoom, { duration: 1.2 });
  }, [incident]);

  // Redraw Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing tiles
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    // 1. Base Tile Layer (Esri World Imagery shows Cali mountains & urban interface with great clarity)
    let tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    let attribution = 'Esri, Maxar, Earthstar Geographics';

    if (activeBaseLayer === 'osm') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors';
    } else if (activeBaseLayer === 'topo') {
      tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = 'OpenTopoMap';
    }

    L.tileLayer(tileUrl, {
      maxZoom: 18,
      attribution
    }).addTo(map);

    // 2. NASA GIBS WMTS Overlay
    if (showGibsOverlay) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const gibsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${yesterday}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
      L.tileLayer(gibsUrl, {
        maxZoom: 9,
        opacity: 0.65,
        attribution: 'NASA GIBS / EOSDIS'
      }).addTo(map);
    }

    // 3. Render Hotspots and Sensors
    if (layersGroupRef.current) {
      layersGroupRef.current.clearLayers();

      // Draw Correlation Lines between Hotspots and Sensors
      if (showCorrelationArcs && incident.hotspots.length > 0 && incident.sensors.length > 0) {
        incident.hotspots.forEach((hotspot) => {
          incident.sensors.forEach((sensor) => {
            const latlngs: L.LatLngExpression[] = [
              [hotspot.latitude, hotspot.longitude],
              [sensor.lat, sensor.lng]
            ];

            const isDownwind = sensor.status === 'critical' || sensor.status === 'elevated';
            const polyline = L.polyline(latlngs, {
              color: isDownwind ? '#f97316' : '#64748b',
              weight: isDownwind ? 2.5 : 1,
              dashArray: isDownwind ? '6, 6' : '3, 6',
              opacity: isDownwind ? 0.85 : 0.4
            });

            polyline.bindTooltip(
              `Vector Humo / Viento: ${sensor.metrics.windDirectionCardinal} (${sensor.metrics.windSpeedKmh} km/h) • Hacia Cali`,
              { sticky: true, className: 'bg-slate-900 text-amber-300 text-xs px-2 py-1 rounded shadow-lg border border-slate-700' }
            );

            polyline.addTo(layersGroupRef.current!);
          });
        });
      }

      // Draw FIRMS Hotspots in Cali / Valle
      incident.hotspots.forEach((hotspot) => {
        const isHighPower = hotspot.frp > 50;
        const pulseColor = isHighPower ? '#ef4444' : '#f97316';

        const customIcon = L.divIcon({
          className: 'custom-fire-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full opacity-75" style="background-color: ${pulseColor};"></span>
              <div class="relative inline-flex rounded-full h-7 w-7 items-center justify-center shadow-lg border-2 border-white" style="background-color: ${pulseColor};">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                </svg>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([hotspot.latitude, hotspot.longitude], { icon: customIcon });

        marker.on('click', () => {
          setSelectedElement({ type: 'hotspot', data: hotspot });
          onSelectHotspot?.(hotspot);
        });

        marker.bindTooltip(
          `<strong>Foco FIRMS en Valle del Cauca (${hotspot.instrument})</strong><br/>FRP: ${hotspot.frp} MW | Temp Brillo: ${hotspot.brightness} K<br/>Satélite: ${hotspot.satellite}`,
          { className: 'bg-slate-900 text-slate-100 text-xs px-2.5 py-1.5 rounded-md border border-slate-700 shadow-xl' }
        );

        marker.addTo(layersGroupRef.current!);
      });

      // Draw IoT Sensors in Cali / Valle
      incident.sensors.forEach((sensor) => {
        const isAlert = sensor.status === 'critical';
        const isWarning = sensor.status === 'elevated';
        const markerBg = isAlert ? '#dc2626' : isWarning ? '#d97706' : '#10b981';

        const sensorIcon = L.divIcon({
          className: 'custom-iot-marker',
          html: `
            <div class="relative flex flex-col items-center group cursor-pointer">
              ${isAlert ? '<span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-red-500 opacity-60"></span>' : ''}
              <div class="h-8 w-8 rounded-lg flex items-center justify-center shadow-xl border-2 border-white transition-transform transform group-hover:scale-110" style="background-color: ${markerBg};">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
                  <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                  <circle cx="12" cy="12" r="2"/>
                  <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
                  <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
                </svg>
              </div>
              <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 text-[10px] font-mono font-semibold text-slate-200 border border-slate-700 whitespace-nowrap shadow">
                PM2.5: ${sensor.metrics.pm25}
              </div>
            </div>
          `,
          iconSize: [36, 48],
          iconAnchor: [18, 24]
        });

        const marker = L.marker([sensor.lat, sensor.lng], { icon: sensorIcon });

        marker.on('click', () => {
          setSelectedElement({ type: 'sensor', data: sensor });
          onSelectSensor?.(sensor);
        });

        marker.bindTooltip(
          `<strong>${sensor.name}</strong><br/>${sensor.locationName}<br/>PM2.5: ${sensor.metrics.pm25} µg/m³ | CO: ${sensor.metrics.coPpm} ppm<br/>Viento: ${sensor.metrics.windSpeedKmh} km/h (${sensor.metrics.windDirectionCardinal})`,
          { className: 'bg-slate-900 text-slate-100 text-xs px-2.5 py-1.5 rounded-md border border-slate-700 shadow-xl' }
        );

        marker.addTo(layersGroupRef.current!);
      });

      // 4. Render NOAA GOES-16 Geostationary Detections (Cadencia 10-15 min)
      if (showGoes16) {
        GOES16_DETECTIONS.forEach((goes) => {
          const goesIcon = L.divIcon({
            className: 'custom-goes-marker',
            html: `
              <div class="relative flex flex-col items-center cursor-pointer group">
                <span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-cyan-400 opacity-60"></span>
                <div class="h-8 w-8 rounded-full bg-cyan-600 border-2 border-white shadow-xl flex items-center justify-center text-white transition-transform transform group-hover:scale-110">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13 7 9 3 5 7l4 4"/>
                    <path d="m17 11 4 4-4 4-4-4"/>
                    <path d="m8 12 8 8"/>
                    <path d="m16 4-8 8"/>
                  </svg>
                </div>
                <div class="mt-1 px-1.5 py-0.5 rounded bg-cyan-950 text-[9px] font-mono font-bold text-cyan-200 border border-cyan-700 shadow whitespace-nowrap">
                  GOES-16: ${goes.firePowerMW} MW
                </div>
              </div>
            `,
            iconSize: [36, 44],
            iconAnchor: [18, 22]
          });

          const marker = L.marker([goes.latitude, goes.longitude], { icon: goesIcon });
          marker.bindTooltip(
            `<strong>🛰️ NOAA GOES-16 (Banda 7 IR 3.9µm)</strong><br/>${goes.scanTime}<br/>Potencia FRP: ${goes.firePowerMW} MW | Temp: ${goes.fireTemperatureK} K<br/>Área Térmica: ${(goes.fireAreaM2 / 10000).toFixed(1)} ha`,
            { className: 'bg-slate-900 text-cyan-300 text-xs px-2.5 py-1.5 rounded-md border border-cyan-800 shadow-xl' }
          );
          marker.addTo(layersGroupRef.current!);
        });
      }

      // 5. Render PTZ Thermal Cameras in Cali
      if (showThermalCameras) {
        THERMAL_CAMERAS.forEach((cam) => {
          const isAlarm = cam.status === 'ALARM';
          const camIcon = L.divIcon({
            className: 'custom-cam-marker',
            html: `
              <div class="relative flex flex-col items-center cursor-pointer group">
                ${isAlarm ? '<span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-orange-500 opacity-60"></span>' : ''}
                <div class="h-8 w-8 rounded-lg ${isAlarm ? 'bg-orange-600' : 'bg-slate-800'} border-2 border-white shadow-xl flex items-center justify-center text-white transition-transform transform group-hover:scale-110">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                </div>
                <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-900 text-[9px] font-mono font-bold text-orange-300 border border-slate-700 shadow whitespace-nowrap">
                  ${cam.name.split('—')[0]} (${cam.maxTempC}°C)
                </div>
              </div>
            `,
            iconSize: [36, 44],
            iconAnchor: [18, 22]
          });

          const marker = L.marker([cam.lat, cam.lng], { icon: camIcon });
          marker.bindTooltip(
            `<strong>📹 ${cam.name}</strong><br/>${cam.location} (${cam.elevationM} msnm)<br/>Modo: ${cam.currentMode} | Temp Máx: ${cam.maxTempC}°C<br/>IA: ${cam.detections.length} Focos Detectados (${cam.detections[0]?.label || 'Normal'})`,
            { className: 'bg-slate-900 text-orange-200 text-xs px-2.5 py-1.5 rounded-md border border-orange-800 shadow-xl' }
          );
          marker.addTo(layersGroupRef.current!);
        });
      }
    }
  }, [activeBaseLayer, showGibsOverlay, showCorrelationArcs, showGoes16, showThermalCameras, incident]);

  const handlePanToLandmark = (center: [number, number], zoom: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(center, zoom, { duration: 1.0 });
  };

  const handleCenterCali = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([3.4516, -76.5320], 13, { duration: 1.0 });
  };

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
      {/* Top Map Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Layer Controls & Toggles */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 shadow-xl text-xs text-slate-200 pointer-events-auto">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mr-1">
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Capas GIS:</span>
          </div>

          {/* Base Layer Switcher */}
          <div className="flex bg-slate-800/80 p-0.5 rounded-md border border-slate-700">
            <button
              onClick={() => setActiveBaseLayer('esri')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                activeBaseLayer === 'esri'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Esri Satélite
            </button>
            <button
              onClick={() => setActiveBaseLayer('topo')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                activeBaseLayer === 'topo'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Topografía IGAC
            </button>
            <button
              onClick={() => setActiveBaseLayer('osm')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                activeBaseLayer === 'osm'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Calles Cali (OSM)
            </button>
          </div>

          {/* NASA GIBS WMTS Toggle */}
          <button
            onClick={() => setShowGibsOverlay(!showGibsOverlay)}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium border text-[11px] transition ${
              showGibsOverlay
                ? 'bg-cyan-950 text-cyan-300 border-cyan-700 shadow'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Superponer mosaicos WMTS de reflectancia de satélites NASA EOSDIS"
          >
            <Eye className="w-3 h-3" />
            <span>NASA GIBS</span>
          </button>

          {/* Correlation Vector toggle */}
          <button
            onClick={() => setShowCorrelationArcs(!showCorrelationArcs)}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium border text-[11px] transition ${
              showCorrelationArcs
                ? 'bg-amber-950 text-amber-300 border-amber-700 shadow'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Wind className="w-3 h-3" />
            <span>Vectores Viento</span>
          </button>

          {/* NOAA GOES-16 ABI Satellite Layer Toggle */}
          <button
            onClick={() => setShowGoes16(!showGoes16)}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium border text-[11px] transition ${
              showGoes16
                ? 'bg-cyan-950 text-cyan-300 border-cyan-600 shadow'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Detección geoestacionaria NOAA GOES-16 cada 10-15 minutos (Banda 7 IR 3.9 µm)"
          >
            <Satellite className="w-3 h-3 text-cyan-400" />
            <span>GOES-16 ABI (15 min)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-0.5"></span>
          </button>

          {/* Thermal Cameras Layer Toggle */}
          <button
            onClick={() => setShowThermalCameras(!showThermalCameras)}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium border text-[11px] transition ${
              showThermalCameras
                ? 'bg-orange-950 text-orange-300 border-orange-600 shadow'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Cámaras PTZ ópticas y térmicas con visión artificial en cerros de Cali"
          >
            <Camera className="w-3 h-3 text-orange-400" />
            <span>Cámaras Térmicas</span>
          </button>
        </div>

        {/* Quick Pan to Cali Center Button */}
        <button
          onClick={handleCenterCali}
          className="pointer-events-auto flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg border border-amber-400/40 text-xs font-semibold shadow-lg transition active:scale-95"
          title="Centrar vista en Santiago de Cali"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Centrar en Cali</span>
        </button>
      </div>

      {/* Valle del Cauca Quick Sector Navigator Bar (Floating Below Top Bar) */}
      <div className="absolute top-16 left-3 z-[1000] flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 shadow-lg">
        <span className="text-amber-400 font-mono font-semibold flex items-center gap-1 mr-1">
          <MapPin className="w-3 h-3" /> Sectores Cali:
        </span>
        {CALI_LANDMARKS.map((landmark) => (
          <button
            key={landmark.name}
            onClick={() => handlePanToLandmark(landmark.center, landmark.zoom)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-amber-600 hover:text-white border border-slate-700/80 text-slate-300 transition text-[11px]"
          >
            <span>{landmark.icon}</span>
            <span>{landmark.name}</span>
          </button>
        ))}
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/95 backdrop-blur-md px-3 py-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 shadow-xl space-y-1.5">
        <div className="font-semibold text-slate-200 text-xs mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Simbología Operativa</span>
          </div>
          <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
            Valle del Cauca
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 border border-white inline-block"></span>
          <span>Foco Térmico NASA FIRMS (VIIRS/MODIS)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-red-600 border border-white inline-block"></span>
          <span>Sensor Terrestre IoT (Humo Crítico / Alerta)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-emerald-500 border border-white inline-block"></span>
          <span>Sensor Terrestre IoT (Calidad Normal)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-cyan-500 border border-white inline-block"></span>
          <span>NOAA GOES-16 Geoestacionario (Banda 7 ABI cada 15m)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-orange-600 border border-white inline-block"></span>
          <span>Cámaras Térmicas PTZ con Visión Artificial (Cerros de Cali)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500 inline-block"></span>
          <span>Vector Viento del Pacífico hacia Cali</span>
        </div>
      </div>

      {/* Selected Element Quick Inspector Modal/Drawer */}
      {selectedElement && (
        <div className="absolute top-28 right-3 z-[1000] w-80 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl text-xs text-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              {selectedElement.type === 'hotspot' ? (
                <>
                  <Flame className="w-4 h-4 text-red-500" /> Foco Térmico Satelital
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 text-emerald-400" /> Estación Telemetría IoT
                </>
              )}
            </span>
            <button
              onClick={() => setSelectedElement(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>

          {selectedElement.type === 'hotspot' ? (
            <div className="mt-3 space-y-2 font-mono">
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-400">Sensor/Satélite:</span>
                <span className="text-white font-semibold">{selectedElement.data.instrument} ({selectedElement.data.satellite})</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-400">Potencia Radiativa (FRP):</span>
                <span className="text-red-400 font-bold">{selectedElement.data.frp} MW</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-400">Temp. Brillo (I4):</span>
                <span className="text-amber-300 font-semibold">{selectedElement.data.brightness} K</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-400">Confianza Algoritmo:</span>
                <span className="text-emerald-400 capitalize">{selectedElement.data.confidence}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-400">Ubicación:</span>
                <span className="text-slate-200">{selectedElement.data.latitude.toFixed(4)}, {selectedElement.data.longitude.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Hora Adquisición:</span>
                <span className="text-slate-200">{selectedElement.data.acq_date} {selectedElement.data.acq_time} UTC</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2 font-mono">
              <div className="font-semibold text-slate-100 text-sm mb-1">{selectedElement.data.name}</div>
              <div className="text-[11px] text-slate-400 mb-2">{selectedElement.data.locationName} (Alt: {selectedElement.data.elevationM} msnm)</div>
              
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                  <div className="text-[10px] text-slate-400">PM2.5 (Humo)</div>
                  <div className={`text-base font-bold ${selectedElement.data.metrics.pm25 > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {selectedElement.data.metrics.pm25} µg/m³
                  </div>
                </div>
                <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                  <div className="text-[10px] text-slate-400">Monóxido CO</div>
                  <div className={`text-base font-bold ${selectedElement.data.metrics.coPpm > 10 ? 'text-red-400' : 'text-slate-200'}`}>
                    {selectedElement.data.metrics.coPpm} ppm
                  </div>
                </div>
                <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                  <div className="text-[10px] text-slate-400">Temperatura</div>
                  <div className="text-sm font-semibold text-amber-300">{selectedElement.data.metrics.tempC} °C</div>
                </div>
                <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                  <div className="text-[10px] text-slate-400">Viento Pacífico</div>
                  <div className="text-sm font-semibold text-cyan-300">
                    {selectedElement.data.metrics.windSpeedKmh} km/h {selectedElement.data.metrics.windDirectionCardinal}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaflet Map DOM Root */}
      <div ref={mapContainerRef} className="w-full flex-1 min-h-[460px] z-0" />
    </div>
  );
};
