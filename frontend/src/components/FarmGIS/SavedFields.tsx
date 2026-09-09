import React from 'react';
import { Layers, MapPin, Eye, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import { FarmData } from '../../services/farmService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface SavedFieldsProps {
  farms: FarmData[];
  activeFarmId?: string;
  onSelectFarm: (farm: FarmData) => void;
  onViewOnMap: (farm: FarmData) => void;
  onDeleteFarm: (farmId: string) => void;
}

export const SavedFields: React.FC<SavedFieldsProps> = ({
  farms,
  activeFarmId,
  onSelectFarm,
  onViewOnMap,
  onDeleteFarm
}) => {
  if (!farms || farms.length === 0) {
    return (
      <Card variant="elevated" className="p-8 text-center space-y-3">
        <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-2xl w-12 h-12 mx-auto flex items-center justify-center border border-emerald-500/20">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-white text-sm font-display">No Saved Farm Fields Yet</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Draw your farm boundary above and click "Save Farm" to start managing multiple fields.
        </p>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base font-display">My Farm Fields ({farms.length})</h3>
            <p className="text-xs text-slate-400">Select a field to run AgriSense predictive telemetry</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {farms.map((farm) => {
          const isActive = farm.farm_id === activeFarmId;

          return (
            <Card
              key={farm.farm_id}
              variant="default"
              className={`p-4 flex flex-col justify-between transition-all ${
                isActive
                  ? 'border-emerald-500/60 bg-emerald-500/15 shadow-lg ring-2 ring-emerald-500/30'
                  : 'hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-white text-sm">{farm.farm_name}</h4>
                    <p className="text-xs text-emerald-400 font-semibold">{farm.crop} • {farm.season}</p>
                  </div>
                  {isActive && (
                    <Badge variant="emerald" size="sm">
                      <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Active
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 my-3 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Area:</span>
                    <span className="font-bold text-white">{farm.area_hectares} ha ({farm.area_acres} ac)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-medium text-slate-200 truncate max-w-[150px]">{farm.location_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="font-mono text-[11px] text-slate-400">{farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Boundary:</span>
                    <Badge variant={farm.boundary_geojson ? 'emerald' : 'slate'} size="sm">
                      {farm.boundary_geojson ? 'Cadastral ✓' : 'Point'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/10 mt-2">
                <Button
                  size="sm"
                  variant={isActive ? 'primary' : 'outline'}
                  onClick={() => onSelectFarm(farm)}
                  className="flex-1"
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Select
                </Button>

                <button
                  type="button"
                  onClick={() => onViewOnMap(farm)}
                  title="View on Cadastral Map"
                  className="p-2 bg-[#070D0A] hover:bg-emerald-950/40 text-slate-300 hover:text-emerald-400 border border-emerald-900/40 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteFarm(farm.farm_id)}
                  title="Delete Field"
                  className="p-2 bg-[#070D0A] hover:bg-rose-500/15 text-slate-300 hover:text-rose-400 border border-emerald-900/40 hover:border-rose-500/30 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
};
