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
  { name: 'Tres Cruces', center: [3.4682, -76.5415] as [number, number], zoom: 14 },
  { name: 'Cristo Rey', center: [3.4355, -76.5560] as [number, number], zoom: 14 },
  { name: 'Farallones de Cali', center: [3.4150, -76.6200] as [number, number], zoom: 13 },
  { name: 'Dapa / Yumbo', center: [3.5650, -76.5450] as [number, number], zoom: 13 },
  { name: 'Valle del Cauca (General)', center: [3.5000, -76.4800] as [number, number], zoom: 11 }
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
              { sticky: true, className: 'bg-neutral-900 text-amber-400 text-xs px-2 py-1 rounded shadow-sm border border-neutral-700' }
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
              <span class=" absolute inline-flex h-8 w-8 rounded-full opacity-75" style="background-color: ${pulseColor};"></span>
              <div class="relative inline-flex rounded-full h-7 w-7 items-center justify-center shadow-sm border-2 border-white" style="background-color: ${pulseColor};">
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
          { className: 'bg-neutral-900 text-neutral-100 text-xs px-2.5 py-1.5 rounded-md border border-neutral-700 shadow-sm' }
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
              ${isAlert ? '<span class=" absolute inline-flex h-9 w-9 rounded-full bg-red-500 opacity-60"></span>' : ''}
              <div class="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm border-2 border-white transition-transform transform group-hover:scale-110" style="background-color: ${markerBg};">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
                  <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                  <circle cx="12" cy="12" r="2"/>
                  <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
                  <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
                </svg>
              </div>
              <div class="mt-1 px-1.5 py-0.5 rounded bg-neutral-900/90 text-[10px] font-mono font-semibold text-neutral-200 border border-neutral-700 whitespace-nowrap shadow">
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
          { className: 'bg-neutral-900 text-neutral-100 text-xs px-2.5 py-1.5 rounded-md border border-neutral-700 shadow-sm' }
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
                <span class=" absolute inline-flex h-9 w-9 rounded-full bg-neutral-400 opacity-60"></span>
                <div class="h-8 w-8 rounded-full bg-neutral-600 border-2 border-white shadow-sm flex items-center justify-center text-white transition-transform transform group-hover:scale-110">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13 7 9 3 5 7l4 4"/>
                    <path d="m17 11 4 4-4 4-4-4"/>
                    <path d="m8 12 8 8"/>
                    <path d="m16 4-8 8"/>
                  </svg>
                </div>
                <div class="mt-1 px-1.5 py-0.5 rounded bg-neutral-950 text-[9px] font-mono font-bold text-neutral-200 border border-neutral-700 shadow whitespace-nowrap">
                  GOES-16: ${goes.firePowerMW} MW
                </div>
              </div>
            `,
            iconSize: [36, 44],
            iconAnchor: [18, 22]
          });

          const marker = L.marker([goes.latitude, goes.longitude], { icon: goesIcon });
          marker.bindTooltip(
            `<strong>NOAA GOES-16 (Banda 7 IR 3.9µm)</strong><br/>${goes.scanTime}<br/>Potencia FRP: ${goes.firePowerMW} MW | Temp: ${goes.fireTemperatureK} K<br/>Área Térmica: ${(goes.fireAreaM2 / 10000).toFixed(1)} ha`,
            { className: 'bg-neutral-900 text-neutral-300 text-xs px-2.5 py-1.5 rounded-md border border-neutral-800 shadow-sm' }
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
                ${isAlarm ? '<span class=" absolute inline-flex h-9 w-9 rounded-full bg-amber-500 opacity-60"></span>' : ''}
                <div class="h-8 w-8 rounded-lg ${isAlarm ? 'bg-amber-600' : 'bg-neutral-800'} border-2 border-white shadow-sm flex items-center justify-center text-white transition-transform transform group-hover:scale-110">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                </div>
                <div class="mt-1 px-1.5 py-0.5 rounded bg-neutral-900 text-[9px] font-mono font-bold text-amber-400 border border-neutral-700 shadow whitespace-nowrap">
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
            { className: 'bg-neutral-900 text-amber-300 text-xs px-2.5 py-1.5 rounded-md border border-amber-800 shadow-sm' }
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
    <div className="relative w-full h-full min-h-[460px] rounded-md overflow-hidden border border-neutral-800 bg-neutral-950 shadow-sm flex flex-col">
      {/* Top Map Controls Bar + Sector Navigator (apilados en columna para no solaparse en móvil) */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Layer Controls & Toggles — una fila con scroll horizontal en móvil */}
          <div className="flex items-center gap-2 bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-800 shadow-sm text-xs text-neutral-200 pointer-events-auto flex-nowrap overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-500 mr-1">
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Capas GIS:</span>
          </div>

          {/* Base Layer Switcher */}
          <div className="flex bg-neutral-800/80 p-0.5 rounded-md border border-neutral-700">
            <button
              onClick={() => setActiveBaseLayer('esri')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                activeBaseLayer === 'esri'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">Esri Satélite</span>
              <span className="sm:hidden">Esri</span>
            </button>
            <button
              onClick={() => setActiveBaseLayer('topo')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                activeBaseLayer === 'topo'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">Topografía IGAC</span>
              <span className="sm:hidden">Topo</span>
            </button>
            <button
              onClick={() => setActiveBaseLayer('osm')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                activeBaseLayer === 'osm'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">Calles Cali (OSM)</span>
              <span className="sm:hidden">OSM</span>
            </button>
          </div>

          {/* NASA GIBS WMTS Toggle */}
          <button
            onClick={() => setShowGibsOverlay(!showGibsOverlay)}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium border text-[11px] transition ${
              showGibsOverlay
                ? 'bg-neutral-950 text-neutral-300 border-neutral-700 shadow'
                : 'bg-neutral-800/60 text-neutral-400 border-neutral-700 hover:text-neutral-200'
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
                ? 'bg-amber-950 text-amber-400 border-amber-700 shadow'
                : 'bg-neutral-800/60 text-neutral-400 border-neutral-700 hover:text-neutral-200'
            }`}
          >
            <Wind className="w-3 h-3" />
            <span className="hidden sm:inline">Vectores Viento</span>
            <span className="sm:hidden">Viento</span>
          </button>

          {/* NOAA GOES-16 ABI Satellite Layer Toggle */}
          <button
            onClick={() => setShowGoes16(!showGoes16)}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium border text-[11px] transition ${
              showGoes16
                ? 'bg-neutral-950 text-neutral-300 border-neutral-600 shadow'
                : 'bg-neutral-800/60 text-neutral-400 border-neutral-700 hover:text-neutral-200'
            }`}
            title="Detección geoestacionaria NOAA GOES-16 cada 10-15 minutos (Banda 7 IR 3.9 µm)"
          >
            <Satellite className="w-3 h-3 text-neutral-400" />
            <span className="hidden sm:inline">GOES-16 ABI (15 min)</span>
            <span className="sm:hidden">GOES-16</span>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 ml-0.5"></span>
          </button>

          {/* Thermal Cameras Layer Toggle */}
          <button
            onClick={() => setShowThermalCameras(!showThermalCameras)}
            className={`flex items-center gap-1 px-2 py-1 rounded font-medium border text-[11px] transition ${
              showThermalCameras
                ? 'bg-amber-950 text-amber-400 border-amber-600 shadow'
                : 'bg-neutral-800/60 text-neutral-400 border-neutral-700 hover:text-neutral-200'
            }`}
            title="Cámaras PTZ ópticas y térmicas con visión artificial en cerros de Cali"
          >
            <Camera className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Cámaras Térmicas</span>
            <span className="sm:hidden">Cámaras</span>
          </button>
        </div>

        {/* Quick Pan to Cali Center Button */}
        <button
          onClick={handleCenterCali}
          className="pointer-events-auto shrink-0 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg border border-amber-400/40 text-xs font-semibold shadow-sm transition active:scale-95"
          title="Centrar vista en Santiago de Cali"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Centrar en Cali</span>
        </button>
        </div>

        {/* Valle del Cauca Quick Sector Navigator Bar — scroll horizontal en móvil */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 shadow-sm flex-nowrap overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible sm:self-start">
          <span className="text-amber-400 font-mono font-semibold flex items-center gap-1 mr-1 shrink-0">
            <MapPin className="w-3 h-3" /> Sectores Cali:
          </span>
          {CALI_LANDMARKS.map((landmark) => (
            <button
              key={landmark.name}
              onClick={() => handlePanToLandmark(landmark.center, landmark.zoom)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800/80 hover:bg-amber-600 hover:text-white border border-neutral-700/80 text-neutral-300 transition text-[11px] shrink-0 whitespace-nowrap"
            >
              <span>{landmark.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-neutral-900 px-3 py-2.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 shadow-sm space-y-1.5">
        <div className="font-semibold text-neutral-200 text-xs mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Simbología Operativa</span>
          </div>
          <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
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
          <span className="w-3 h-3 rounded-full bg-neutral-500 border border-white inline-block"></span>
          <span>NOAA GOES-16 Geoestacionario (Banda 7 ABI cada 15m)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-amber-600 border border-white inline-block"></span>
          <span>Cámaras Térmicas PTZ con Visión Artificial (Cerros de Cali)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500 inline-block"></span>
          <span>Vector Viento del Pacífico hacia Cali</span>
        </div>
      </div>

      {/* Selected Element Quick Inspector Modal/Drawer */}
      {selectedElement && (
        <div className="absolute top-28 right-3 z-[1000] w-80 bg-neutral-900 p-4 rounded-md border border-neutral-700 shadow-sm text-xs text-neutral-200">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <span className="font-semibold uppercase tracking-wide text-neutral-400 flex items-center gap-1.5">
              {selectedElement.type === 'hotspot' ? (
                <>
                  <Flame className="w-4 h-4 text-red-500" /> Foco Térmico Satelital
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 text-emerald-500" /> Estación Telemetría IoT
                </>
              )}
            </span>
            <button
              onClick={() => setSelectedElement(null)}
              className="text-neutral-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>

          {selectedElement.type === 'hotspot' ? (
            <div className="mt-3 space-y-2 font-mono">
              <div className="flex justify-between py-0.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Sensor/Satélite:</span>
                <span className="text-white font-semibold">{selectedElement.data.instrument} ({selectedElement.data.satellite})</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Potencia Radiativa (FRP):</span>
                <span className="text-red-400 font-bold">{selectedElement.data.frp} MW</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Temp. Brillo (I4):</span>
                <span className="text-amber-400 font-semibold">{selectedElement.data.brightness} K</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Confianza Algoritmo:</span>
                <span className="text-emerald-500 capitalize">{selectedElement.data.confidence}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Ubicación:</span>
                <span className="text-neutral-200">{selectedElement.data.latitude.toFixed(4)}, {selectedElement.data.longitude.toFixed(4)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-neutral-400">Hora Adquisición:</span>
                <span className="text-neutral-200">{selectedElement.data.acq_date} {selectedElement.data.acq_time} UTC</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2 font-mono">
              <div className="font-semibold text-neutral-100 text-sm mb-1">{selectedElement.data.name}</div>
              <div className="text-[11px] text-neutral-400 mb-2">{selectedElement.data.locationName} (Alt: {selectedElement.data.elevationM} msnm)</div>
              
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-neutral-800/80 p-2 rounded border border-neutral-700">
                  <div className="text-[10px] text-neutral-400">PM2.5 (Humo)</div>
                  <div className={`text-base font-bold ${selectedElement.data.metrics.pm25 > 50 ? 'text-red-400' : 'text-emerald-500'}`}>
                    {selectedElement.data.metrics.pm25} µg/m³
                  </div>
                </div>
                <div className="bg-neutral-800/80 p-2 rounded border border-neutral-700">
                  <div className="text-[10px] text-neutral-400">Monóxido CO</div>
                  <div className={`text-base font-bold ${selectedElement.data.metrics.coPpm > 10 ? 'text-red-400' : 'text-neutral-200'}`}>
                    {selectedElement.data.metrics.coPpm} ppm
                  </div>
                </div>
                <div className="bg-neutral-800/80 p-2 rounded border border-neutral-700">
                  <div className="text-[10px] text-neutral-400">Temperatura</div>
                  <div className="text-sm font-semibold text-amber-400">{selectedElement.data.metrics.tempC} °C</div>
                </div>
                <div className="bg-neutral-800/80 p-2 rounded border border-neutral-700">
                  <div className="text-[10px] text-neutral-400">Viento Pacífico</div>
                  <div className="text-sm font-semibold text-neutral-300">
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
