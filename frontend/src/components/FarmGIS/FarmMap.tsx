import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, Search } from 'lucide-react';
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
    <div className="relative w-full h-[450px] sm:h-[500px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Tile Switcher Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl shadow-xl border border-white/10">
        <button
          type="button"
          onClick={() => setMapTileType('satellite')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            mapTileType === 'satellite'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          🛰️ Satellite
        </button>
        <button
          type="button"
          onClick={() => setMapTileType('street')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            mapTileType === 'street'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          🗺️ Street Map
        </button>
      </div>

      {/* Map Hint Badge */}
      {isDrawing && !isClosed && (
        <div className="absolute top-4 left-4 z-[1000] bg-emerald-700/90 text-white backdrop-blur-sm px-3.5 py-1.5 rounded-xl text-xs font-medium shadow-lg animate-pulse flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
          Click on the map to add boundary corner points
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
              <div className="p-1 text-center font-sans">
                <span className="font-bold text-emerald-700 block text-xs">📍 Current Location</span>
                <span className="text-[11px] text-slate-500 block">
                  {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                </span>
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
                  <div className="p-1 font-sans">
                    <h4 className="font-bold text-slate-900 text-sm">{farm.farm_name}</h4>
                    <p className="text-xs text-emerald-700 font-medium">{farm.crop} ({farm.season})</p>
                    <p className="text-xs text-slate-600 mt-1">Area: <strong>{farm.area_hectares} ha</strong> ({farm.area_acres} ac)</p>
                    <p className="text-[11px] text-slate-500">{farm.location_name}</p>
                    {onSelectSavedFarm && (
                      <button
                        type="button"
                        onClick={() => onSelectSavedFarm(farm)}
                        className="mt-2 text-xs w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-2 rounded-md shadow-sm transition-colors"
                      >
                        Load to Dashboard
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
