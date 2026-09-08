import React from 'react';
import { Maximize2, Layers, MapPin, AlertCircle } from 'lucide-react';
import * as turf from '@turf/turf';

type Point = [number, number]; // [lat, lng]

interface FarmAreaCalculatorProps {
  polygonPoints: Point[];
  onAreaCalculated?: (metrics: {
    areaSqm: number;
    areaHectares: number;
    areaAcres: number;
    areaBigha: number;
  }) => void;
}

// Spherical geodesic polygon area fallback calculation (WGS84 Earth radius R = 6378137m)
function calculateGeodesicArea(points: Point[]): number {
  if (points.length < 3) return 0;
  
  const R = 6378137; // meters
  let area = 0;
  
  if (points.length > 2) {
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      const lat1 = (p1[0] * Math.PI) / 180;
      const lat2 = (p2[0] * Math.PI) / 180;
      const lng1 = (p1[1] * Math.PI) / 180;
      const lng2 = (p2[1] * Math.PI) / 180;
      
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    area = (area * R * R) / 2;
  }
  
  return Math.abs(area);
}

export const FarmAreaCalculator: React.FC<FarmAreaCalculatorProps> = ({
  polygonPoints,
  onAreaCalculated
}) => {
  let areaSqm = 0;

  if (polygonPoints.length >= 3) {
    try {
      // Turf requires [lng, lat] coordinates closed polygon
      const coords = polygonPoints.map(p => [p[1], p[0]]);
      coords.push([polygonPoints[0][1], polygonPoints[0][0]]); // Close loop
      const polygon = turf.polygon([coords]);
      areaSqm = turf.area(polygon);
    } catch (e) {
      areaSqm = calculateGeodesicArea(polygonPoints);
    }
  }

  const areaHectares = areaSqm / 10000;
  const areaAcres = areaSqm / 4046.8564224;
  // Standard Pucca Bigha conversion (~2508.38 sq meters per Bigha)
  const areaBigha = areaSqm / 2508.38;

  React.useEffect(() => {
    if (polygonPoints.length >= 3 && onAreaCalculated) {
      onAreaCalculated({
        areaSqm: Number(areaSqm.toFixed(2)),
        areaHectares: Number(areaHectares.toFixed(2)),
        areaAcres: Number(areaAcres.toFixed(2)),
        areaBigha: Number(areaBigha.toFixed(2))
      });
    }
  }, [polygonPoints, areaSqm]);

  return (
    <div className="saas-card p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
            <Maximize2 className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-sm font-display">Farm Area Calculation</h3>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-medium">
          {polygonPoints.length >= 3 ? 'Geodesic Calculated' : 'Awaiting Boundary'}
        </span>
      </div>

      {polygonPoints.length < 3 ? (
        <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8 text-amber-400" />
          <p className="text-sm font-medium text-slate-300">Draw a boundary on the map to calculate area</p>
          <p className="text-xs text-slate-500">Click at least 3 points around your farm field</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center">
              <span className="text-xs text-slate-400 font-medium block">Hectares</span>
              <span className="text-2xl font-bold text-emerald-400 font-display">{areaHectares.toFixed(2)}</span>
              <span className="text-[10px] text-emerald-400/70 block font-semibold">ha</span>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-center">
              <span className="text-xs text-slate-400 font-medium block">Acres</span>
              <span className="text-2xl font-bold text-sky-400 font-display">{areaAcres.toFixed(2)}</span>
              <span className="text-[10px] text-sky-400/70 block font-semibold">ac</span>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-center">
              <span className="text-xs text-slate-400 font-medium block">Sq Meters</span>
              <span className="text-2xl font-bold text-purple-400 font-display">{Math.round(areaSqm).toLocaleString()}</span>
              <span className="text-[10px] text-purple-400/70 block font-semibold">m²</span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-center">
              <span className="text-xs text-slate-400 font-medium block">Bigha (Standard)</span>
              <span className="text-2xl font-bold text-amber-400 font-display">{areaBigha.toFixed(2)}</span>
              <span className="text-[10px] text-amber-400/70 block font-semibold">bigha*</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic text-right">
            * Note: Bigha conversion uses standard Pucca Bigha (approx. 2,508 m²). Regional variations may apply.
          </p>
        </div>
      )}
    </div>
  );
};
