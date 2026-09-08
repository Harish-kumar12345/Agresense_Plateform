import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  X,
  AlertTriangle,
  Info,
  ShieldAlert,
  Zap,
  CloudRain,
  Droplets,
  Sprout,
  Package,
  TrendingUp,
  BarChart2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { alertService, SmartAlert, AlertSeverity, AlertType } from '../../services/alertService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface SmartAlertsCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateModule?: (moduleKey: string) => void;
  activeFarmId?: string;
  isOfficer?: boolean;
}

export const SmartAlertsCenter: React.FC<SmartAlertsCenterProps> = ({
  isOpen,
  onClose,
  onNavigateModule,
  activeFarmId = 'farm_01',
  isOfficer = false
}) => {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const filterObj = {
        farm_id: isOfficer ? undefined : activeFarmId,
        severity: severityFilter,
        alert_type: typeFilter
      };
      const res = await alertService.getAlerts(filterObj);
      setAlerts(res.alerts);
      setUnreadCount(res.unreadCount);
    } catch (e) {
      console.warn('Failed to load alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen, severityFilter, typeFilter, activeFarmId]);

  if (!isOpen) return null;

  const handleMarkRead = async (alertId?: string) => {
    if (!alertId) return;
    await alertService.markAsRead(alertId);
    setAlerts(prev => prev.map(a => ((a._id === alertId || a.id === alertId) ? { ...a, status: 'read' } : a)));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await alertService.markAllAsRead(isOfficer ? undefined : activeFarmId);
    setAlerts(prev => prev.map(a => ({ ...a, status: 'read' })));
    setUnreadCount(0);
  };

  const handleDelete = async (alertId?: string) => {
    if (!alertId) return;
    await alertService.deleteAlert(alertId);
    setAlerts(prev => prev.filter(a => a._id !== alertId && a.id !== alertId));
  };

  const handleNavigate = (targetModule?: string) => {
    if (onNavigateModule && targetModule) {
      onNavigateModule(targetModule);
      onClose();
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'Critical':
        return (
          <Badge variant="rose" size="sm">
            <ShieldAlert className="w-3 h-3 mr-1 inline" /> Critical
          </Badge>
        );
      case 'High':
        return (
          <Badge variant="amber" size="sm">
            <AlertTriangle className="w-3 h-3 mr-1 inline" /> High Risk
          </Badge>
        );
      case 'Warning':
        return (
          <Badge variant="amber" size="sm">
            <AlertTriangle className="w-3 h-3 mr-1 inline" /> Warning
          </Badge>
        );
      default:
        return (
          <Badge variant="slate" size="sm">
            <Info className="w-3 h-3 mr-1 inline" /> Info
          </Badge>
        );
    }
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case 'weather':
        return <CloudRain className="w-4 h-4 text-sky-400" />;
      case 'soil':
        return <Droplets className="w-4 h-4 text-emerald-400" />;
      case 'disease':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'crop_gdd':
        return <Sprout className="w-4 h-4 text-emerald-400" />;
      case 'yield':
        return <BarChart2 className="w-4 h-4 text-purple-400" />;
      case 'inventory':
        return <Package className="w-4 h-4 text-amber-400" />;
      case 'market':
        return <TrendingUp className="w-4 h-4 text-teal-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="relative w-full max-w-2xl h-full bg-[#070D0A] border-l border-emerald-900/40 shadow-2xl flex flex-col overflow-hidden z-10"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-emerald-900/30 bg-[#0D1612]/95 backdrop-blur-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight font-display">
                  Agronomic Alert Engine
                </h2>
                {unreadCount > 0 && (
                  <Badge variant="rose" size="sm">
                    {unreadCount} NEW
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#D1DED6]">
                Multi-category telemetry monitoring with 24-hour deduplication
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                icon={<CheckCheck className="w-3.5 h-3.5 text-emerald-400" />}
                onClick={handleMarkAllRead}
              >
                Mark All Read
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#D1DED6] hover:text-white hover:bg-[#13231B] rounded-xl transition-colors cursor-pointer"
              title="Close Alerts Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-3 border-b border-emerald-900/20 bg-[#0D1612]/80 space-y-2.5 shrink-0">
          {/* Severity Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80 pr-1 shrink-0">
              Severity:
            </span>
            {['all', 'Critical', 'High', 'Warning', 'Info'].map(sev => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-[#070D0A] text-[#D1DED6] border-emerald-900/30 hover:bg-emerald-950/40 hover:text-white'
                }`}
              >
                {sev === 'all' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          {/* Alert Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 pr-1 shrink-0">
              Category:
            </span>
            {[
              { id: 'all', label: 'All Categories' },
              { id: 'weather', label: '🌧️ Weather' },
              { id: 'soil', label: '💧 Soil' },
              { id: 'disease', label: '🦠 Pathogen' },
              { id: 'crop_gdd', label: '🌾 Phenology' },
              { id: 'yield', label: '🤖 Yield' },
              { id: 'inventory', label: '📦 Inventory' },
              { id: 'market', label: '💰 Mandi' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  typeFilter === t.id
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-[#070D0A] text-[#D1DED6] border-emerald-900/30 hover:bg-emerald-950/40 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading agronomic telemetry alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-[#0D1612]/50 border border-emerald-900/30 rounded-2xl p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">All Clear — Field Parameters Nominal</h3>
              <p className="text-xs text-[#D1DED6] max-w-sm mx-auto">
                Zero active telemetry hazards match your filter. Moisture, atmospheric conditions, and pathogen risks are stable.
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {alerts.map(alert => {
                const id = alert._id || alert.id;
                const isUnread = alert.status === 'unread';

                return (
                  <motion.div
                    key={id || alert.dedup_key}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`p-4 rounded-2xl border transition-all ${
                      isUnread
                        ? 'bg-[#0D1612] border-emerald-900/60 shadow-lg shadow-black/60 ring-1 ring-emerald-500/30'
                        : 'bg-[#0D1612]/60 border-emerald-900/20 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[#070D0A] border border-emerald-900/30 shrink-0">
                          {getTypeIcon(alert.alert_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(alert.severity)}
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#070D0A] text-[#D1DED6] border border-emerald-900/30">
                              {alert.farm_name} • {alert.crop}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-white mt-1 font-display">
                            {alert.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(id)}
                            title="Mark as Read"
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(id)}
                          title="Dismiss Alert"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Telemetry Cause Box */}
                    <div className="mt-3 p-3 bg-slate-950/90 rounded-xl border border-white/5 text-xs text-slate-300 space-y-1">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block">
                        Cause & Telemetry Metric:
                      </span>
                      <p className="leading-relaxed">{alert.reason}</p>
                    </div>

                    {/* Action Recommendation Box */}
                    <div className="mt-2 p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                      <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-400" /> Agronomic Remediation:
                      </span>
                      <p className="leading-relaxed">{alert.recommended_action}</p>
                    </div>

                    {/* Footer Bar */}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
                      <span>
                        {alert.createdAt || alert.created_at
                          ? new Date(alert.createdAt || alert.created_at || Date.now()).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: 'short'
                            })
                          : 'Just Now'}
                      </span>

                      {onNavigateModule && (
                        <button
                          type="button"
                          onClick={() => handleNavigate(alert.target_module)}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg font-medium flex items-center gap-1 transition-all cursor-pointer text-xs"
                        >
                          <span>Open {alert.target_module ? alert.target_module.toUpperCase() : 'MODULE'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};
