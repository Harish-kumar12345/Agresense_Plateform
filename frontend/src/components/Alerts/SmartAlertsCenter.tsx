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
  IndianRupee,
  BarChart3,
  CheckCircle2,
  Volume2,
  VolumeX,
  Bug,
  Radio,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  alertService,
  SmartAlert,
  AlertSeverity,
  AlertType,
  playAgronomicAlertChime
} from '../../services/alertService';

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
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'critical'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => alertService.isSoundMuted());
  const [simulating, setSimulating] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const filterObj = {
        farm_id: isOfficer ? undefined : activeFarmId,
      };
      const res = await alertService.getAlerts(filterObj);
      setAlerts(res.alerts);
      setUnreadCount(res.unreadCount);
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen, activeFarmId]);

  // Listen for real-time alert updates from anywhere in the app
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        if (e.detail.alerts) setAlerts(e.detail.alerts);
        if (typeof e.detail.unreadCount === 'number') setUnreadCount(e.detail.unreadCount);
      }
    };
    window.addEventListener('agrisense:alerts-updated', handleUpdate);
    return () => window.removeEventListener('agrisense:alerts-updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleMarkRead = async (e: React.MouseEvent, alertId?: string) => {
    e.stopPropagation();
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

  const handleDelete = async (e: React.MouseEvent, alertId?: string) => {
    e.stopPropagation();
    if (!alertId) return;
    await alertService.deleteAlert(alertId);
    setAlerts(prev => prev.filter(a => a._id !== alertId && a.id !== alertId));
  };

  const handleClearRead = () => {
    alertService.clearReadAlerts(isOfficer ? undefined : activeFarmId);
    setAlerts(prev => prev.filter(a => a.status === 'unread'));
  };

  const handleToggleSound = () => {
    const nextState = !isSoundMuted;
    setIsSoundMuted(nextState);
    alertService.setSoundMuted(nextState);
    if (!nextState) {
      playAgronomicAlertChime('Warning');
    }
  };

  const handleTriggerSimulation = () => {
    setSimulating(true);
    alertService.triggerSimulationAlert({
      farm_id: activeFarmId,
      severity: 'Critical',
      alert_type: 'disease',
      title: 'Pathogen Spore Spike Detected (89%)',
      reason: 'Canopy sensors recorded leaf wetness (9.5 hrs) & 84% humidity. Immediate sheath rot vector active.',
      recommended_action: 'Apply preventive copper hydroxide or valid bio-fungicide foliar spray immediately.',
      target_module: 'disease'
    });
    setTimeout(() => {
      setSimulating(false);
      fetchAlerts();
    }, 350);
  };

  const handleNavigate = (e: React.MouseEvent, targetModule?: string) => {
    e.stopPropagation();
    if (onNavigateModule && targetModule) {
      onNavigateModule(targetModule);
      onClose();
    }
  };

  const toggleExpand = (id?: string) => {
    if (!id) return;
    setExpandedId(prev => (prev === id ? null : id));
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const now = new Date().getTime();
    const past = new Date(dateStr).getTime();
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (isNaN(past) || diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case 'weather':
        return <CloudRain className="w-4 h-4 text-sky-400" />;
      case 'soil':
        return <Droplets className="w-4 h-4 text-emerald-400" />;
      case 'disease':
        return <Bug className="w-4 h-4 text-rose-400" />;
      case 'crop_gdd':
        return <Sprout className="w-4 h-4 text-emerald-400" />;
      case 'yield':
        return <BarChart3 className="w-4 h-4 text-purple-400" />;
      case 'inventory':
        return <Package className="w-4 h-4 text-amber-400" />;
      case 'market':
        return <IndianRupee className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-400" />;
    }
  };

  // Filter alerts based on activeTab and categoryFilter
  const filteredAlerts = alerts.filter(a => {
    if (activeTab === 'unread' && a.status !== 'unread') return false;
    if (activeTab === 'critical' && a.severity !== 'Critical') return false;
    if (categoryFilter !== 'all' && a.alert_type !== categoryFilter) return false;
    return true;
  });

  const criticalCount = alerts.filter(a => a.severity === 'Critical').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-md transition-opacity">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Floating Right Notification Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg h-full bg-[#070D0A] border-l border-emerald-900/40 shadow-2xl flex flex-col overflow-hidden z-10"
      >
        {/* Modern Notification Header */}
        <div className="px-5 py-4 border-b border-emerald-900/40 bg-[#0D1612]/95 backdrop-blur-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 border border-emerald-300/30">
                <Bell className="w-5 h-5" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#070D0A] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight font-display">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#D1DED6] flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                  <Radio className="w-2.5 h-2.5 animate-pulse" /> Telemetry Live
                </span>
                <span>• Real-time agronomic feed</span>
              </p>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isSoundMuted
                  ? 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}
              title={isSoundMuted ? 'Unmute notification chime' : 'Mute notification chime'}
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors cursor-pointer"
              title="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Segment Tab Controller */}
        <div className="px-5 py-3 bg-[#0D1612]/70 border-b border-emerald-900/30 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center bg-[#070D0A] p-1 rounded-xl border border-emerald-900/40 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-[#D1DED6] hover:text-white'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-[#D1DED6] hover:text-white'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('critical')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'critical'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-[#D1DED6] hover:text-white'
              }`}
            >
              <span>Critical</span>
              {criticalCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500/30 text-rose-300 border border-rose-400/40 font-bold">
                  {criticalCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Action Menu */}
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="p-1.5 text-xs text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center gap-1 transition-all cursor-pointer font-medium"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Mark Read</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleTriggerSimulation}
              disabled={simulating}
              className="p-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center gap-1 transition-all cursor-pointer font-medium"
              title="Test real-time alert toast & notification"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-[11px]">Test Alert</span>
            </button>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="px-5 py-2 border-b border-emerald-900/20 bg-[#070D0A]/90 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pr-1 shrink-0">
            Category:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'weather', label: 'Weather' },
            { id: 'soil', label: 'Soil' },
            { id: 'disease', label: 'Pathogen' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'market', label: 'Mandi Rates' }
          ].map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                categoryFilter === c.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-[#0D1612] text-slate-400 border-emerald-900/30 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Notification Feed List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y-0">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Syncing live telemetry notifications...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-[#0D1612]/50 border border-emerald-900/30 rounded-2xl p-6 mx-auto my-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white font-display">You're all caught up!</h3>
                <p className="text-xs text-[#D1DED6] leading-relaxed max-w-xs mx-auto">
                  No active notifications match your criteria. Field telemetry parameters are nominal.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerSimulation}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Simulate Test Notification</span>
              </button>
            </div>
          ) : (
            <AnimatePresence>
              {filteredAlerts.map(alert => {
                const id = alert._id || alert.id;
                const isUnread = alert.status === 'unread';
                const isExpanded = expandedId === id;

                return (
                  <motion.div
                    key={id || alert.dedup_key}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => toggleExpand(id)}
                    className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isUnread
                        ? 'bg-[#0E1C15] border-emerald-500/40 shadow-md ring-1 ring-emerald-500/20'
                        : 'bg-[#09110D] border-emerald-900/30 hover:border-emerald-700/40 opacity-85 hover:opacity-100'
                    }`}
                  >
                    {/* Unread Left Indicator Dot */}
                    {isUnread && (
                      <div className="absolute top-4 left-2.5 w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400 animate-pulse" />
                    )}

                    <div className={`${isUnread ? 'pl-3' : 'pl-1'} space-y-2`}>
                      {/* Top Row: Icon + Title + Severity Pill + Time */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-[#070D0A] border border-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                            {getTypeIcon(alert.alert_type)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Severity Badge */}
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase ${
                                alert.severity === 'Critical'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : alert.severity === 'High'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : alert.severity === 'Warning'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                              }`}>
                                {alert.severity}
                              </span>

                              <span className="text-[10px] text-slate-400 font-mono">
                                {alert.farm_name} • {alert.crop}
                              </span>
                            </div>

                            <h3 className="text-xs sm:text-sm font-bold text-white mt-1 font-display leading-tight truncate group-hover:text-emerald-300 transition-colors">
                              {alert.title}
                            </h3>
                          </div>
                        </div>

                        {/* Timestamp & Micro Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 pr-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {formatTimeAgo(alert.createdAt || alert.created_at)}
                          </span>

                          {isUnread && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkRead(e, id)}
                              title="Mark as read"
                              className="p-1.5 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/15 rounded-lg transition-colors cursor-pointer"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, id)}
                            title="Dismiss notification"
                            className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Notification Body Preview */}
                      <p className="text-xs text-[#D1DED6] leading-relaxed line-clamp-2">
                        {alert.reason}
                      </p>

                      {/* Expanded Section: Telemetry Diagnostic Details + Remediation */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="pt-2 border-t border-emerald-900/30 space-y-2 text-xs"
                          >
                            <div className="p-2.5 bg-[#070D0A] rounded-xl border border-emerald-900/40 text-[11px] text-[#D1DED6] space-y-1">
                              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[9px] block">
                                Diagnostic Telemetry:
                              </span>
                              <p className="leading-normal">{alert.reason}</p>
                            </div>

                            <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-[11px] text-emerald-300 space-y-1">
                              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[9px] flex items-center gap-1">
                                <Zap className="w-3 h-3 text-emerald-400" /> Agronomic Remediation:
                              </span>
                              <p className="leading-normal text-emerald-100">{alert.recommended_action}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Card Footer Row */}
                      <div className="flex items-center justify-between pt-1.5 text-[11px] text-slate-400">
                        <span className="text-[10px] text-emerald-400/80 font-medium flex items-center gap-1">
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? 'Less details' : 'View diagnostic details'}
                        </span>

                        {onNavigateModule && (
                          <button
                            type="button"
                            onClick={(e) => handleNavigate(e, alert.target_module)}
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer text-[11px]"
                          >
                            <span>Open {alert.target_module ? alert.target_module.toUpperCase() : 'MODULE'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Compact Footer Strip */}
        <div className="px-5 py-2.5 bg-[#0D1612] border-t border-emerald-900/40 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>AgriSense Telemetry Dispatch v2.4</span>
          <button
            type="button"
            onClick={handleClearRead}
            className="text-slate-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Read</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
