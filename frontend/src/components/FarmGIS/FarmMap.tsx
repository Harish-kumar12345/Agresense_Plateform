import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, Search, Map as MapIcon, Globe, Navigation } from 'lucide-react';
import { FarmData } from '../../services/farmService';

// Fix Leaflet default marker icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const savedFarmIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

type Point = [number, number]; // [lat, lng]

interface FarmMapProps {
  center: Point;
  userLocation: Point | null;
  polygonPoints: Point[];
  isClosed: boolean;
  isDrawing: boolean;
  onMapClick: (point: Point) => void;
  savedFarms?: FarmData[];
  onSelectSavedFarm?: (farm: FarmData) => void;
}

// Controller component to smoothly center map when coordinates change
function MapController({ center }: { center: Point }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 16, { animate: true, duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

// Event handler for map clicks
function MapEventsHandler({ isDrawing, onMapClick }: { isDrawing: boolean; onMapClick: (point: Point) => void }) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    }
  });
  return null;
}

export const FarmMap: React.FC<FarmMapProps> = ({
  center,
  userLocation,
  polygonPoints,
  isClosed,
  isDrawing,
  onMapClick,
  savedFarms = [],
  onSelectSavedFarm
}) => {
  const [mapTileType, setMapTileType] = useState<'street' | 'satellite'>('satellite');

  const tileUrls = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  };

  return (
    <div className={`relative w-full h-[450px] sm:h-[520px] rounded-2xl overflow-hidden border border-emerald-900/40 shadow-2xl ${isDrawing ? 'cursor-crosshair' : ''}`}>
      {/* Tactical Layer Switcher */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center bg-[#070D0A]/90 backdrop-blur-xl p-1 rounded-xl shadow-2xl border border-emerald-900/50">
        <button
          type="button"
          onClick={() => setMapTileType('satellite')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            mapTileType === 'satellite'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-[#D1DED6] hover:text-white hover:bg-white/5'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Satellite</span>
        </button>
        <button
          type="button"
          onClick={() => setMapTileType('street')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            mapTileType === 'street'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-[#D1DED6] hover:text-white hover:bg-white/5'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Cadastral Map</span>
        </button>
      </div>

      {/* Tactical Digitizing Indicator */}
      {isDrawing && !isClosed && (
        <div className="absolute top-4 left-4 z-[1000] bg-[#0D1612]/95 border border-emerald-500/40 text-white backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-medium shadow-xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-semibold text-emerald-300">Plot Mode Active:</span>
          <span className="text-slate-200">Click corners to digitize boundary</span>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url={tileUrls[mapTileType].url}
          attribution={tileUrls[mapTileType].attribution}
          maxZoom={19}
        />

        <MapController center={center} />
        <MapEventsHandler isDrawing={isDrawing} onMapClick={onMapClick} />

        {/* Current User GPS Location Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>
              <div className="p-2 space-y-1 font-sans">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Verified GPS Location</span>
                </div>
                <div className="text-[11px] font-mono text-slate-300">
                  {userLocation[0].toFixed(5)}°N, {userLocation[1].toFixed(5)}°E
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Saved Farms Markers & Polygons */}
        {savedFarms.map(farm => {
          if (!farm.latitude || !farm.longitude) return null;
          
          let boundaryCoords: Point[] = [];
          if (farm.boundary_geojson && farm.boundary_geojson.geometry && farm.boundary_geojson.geometry.coordinates) {
            const rawCoords = farm.boundary_geojson.geometry.coordinates[0]; // [[lng, lat]]
            boundaryCoords = rawCoords.map(c => [c[1], c[0]]); // convert to [lat, lng]
          }

          return (
            <React.Fragment key={farm.farm_id}>
              <Marker position={[farm.latitude, farm.longitude]} icon={savedFarmIcon}>
                <Popup>
                  <div className="p-2 space-y-2 font-sans min-w-[200px]">
                    <div className="flex items-center justify-between border-b border-emerald-900/40 pb-1.5">
                      <h4 className="font-bold text-white text-sm font-display">{farm.farm_name}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                        {farm.crop}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-300">
                      <p><span className="text-slate-400">Season:</span> <span className="font-medium text-white">{farm.season}</span></p>
                      <p><span className="text-slate-400">Plot Area:</span> <strong className="text-emerald-400">{farm.area_hectares} ha</strong> ({farm.area_acres} ac)</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{farm.location_name}</span>
                      </p>
                    </div>
                    {onSelectSavedFarm && (
                      <button
                        type="button"
                        onClick={() => onSelectSavedFarm(farm)}
                        className="w-full mt-2 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        Load to Telemetry Dashboard
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>

              {boundaryCoords.length >= 3 && (
                <Polygon
                  positions={boundaryCoords}
                  pathOptions={{
                    color: '#10b981',
                    fillColor: '#34d399',
                    fillOpacity: 0.35,
                    weight: 2
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Drawn Polygon Points & Boundary Line */}
        {polygonPoints.map((pt, idx) => (
          <Marker
            key={`draw-pt-${idx}`}
            position={pt}
            icon={new L.DivIcon({
              className: 'custom-polygon-point',
              html: `<div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: bold;">${idx + 1}</div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7]
            })}
          />
        ))}

        {polygonPoints.length >= 2 && !isClosed && (
          <Polyline
            positions={polygonPoints}
            pathOptions={{ color: '#10b981', weight: 3, dashArray: '6, 6' }}
          />
        )}

        {polygonPoints.length >= 3 && isClosed && (
          <Polygon
            positions={polygonPoints}
            pathOptions={{
              color: '#059669',
              fillColor: '#34d399',
              fillOpacity: 0.45,
              weight: 3
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};
