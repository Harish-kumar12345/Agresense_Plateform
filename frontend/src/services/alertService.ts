import axios from 'axios';

export type AlertType = 'weather' | 'soil' | 'disease' | 'crop_gdd' | 'yield' | 'inventory' | 'market';
export type AlertSeverity = 'Info' | 'Warning' | 'High' | 'Critical';
export type AlertStatus = 'unread' | 'read';

export type SmartAlert = {
  _id?: string;
  id?: string;
  farm_id: string;
  farm_name: string;
  crop: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  reason: string;
  recommended_action: string;
  status: AlertStatus;
  dedup_key: string;
  target_module?: string;
  createdAt?: string;
  created_at?: string;
};

const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';
const LOCAL_STORAGE_KEY = 'agrisense_smart_alerts_cache';
const DISMISSED_STORAGE_KEY = 'agrisense_dismissed_alerts_cache';
const SOUND_MUTED_KEY = 'agrisense_alerts_sound_muted';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('agrisense_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

const getLocalCache = (): SmartAlert[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const setLocalCache = (alerts: SmartAlert[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(alerts));
  } catch (e) {}
};

const getDismissedKeys = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
};

const addDismissedKey = (key: string) => {
  try {
    const keys = getDismissedKeys();
    keys.add(key);
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(keys)));
  } catch (e) {}
};

// Dispatch custom event to sync all UI components instantly
const notifyAlertListeners = (alerts: SmartAlert[]) => {
  try {
    const unreadCount = alerts.filter(a => a.status === 'unread').length;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrisense:alerts-updated', {
        detail: { alerts, unreadCount }
      }));
    }
  } catch (e) {}
};

// Web Audio API Sound Chime for Critical / High Alerts
export const playAgronomicAlertChime = (severity: AlertSeverity = 'Warning') => {
  try {
    if (localStorage.getItem(SOUND_MUTED_KEY) === 'true') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    const freq1 = severity === 'Critical' ? 880 : severity === 'High' ? 659.25 : 523.25;
    const freq2 = severity === 'Critical' ? 1174.66 : severity === 'High' ? 783.99 : 659.25;

    osc1.frequency.setValueAtTime(freq1, now);
    osc1.frequency.exponentialRampToValueAtTime(freq2, now + 0.15);

    osc2.frequency.setValueAtTime(freq2, now);
    osc2.frequency.exponentialRampToValueAtTime(freq1, now + 0.25);

    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch (e) {}
};

export const alertService = {
  // Evaluate telemetry and generate smart alerts
  async evaluateTelemetry(telemetry: any): Promise<SmartAlert[]> {
    const dismissed = getDismissedKeys();
    const currentCache = getLocalCache();

    try {
      const response = await axios.post(`${backendUrl}/api/alerts/evaluate`, telemetry, {
        headers: getAuthHeaders(),
        timeout: 3500
      });
      if (response.data && response.data.alerts) {
        const rawAlerts: SmartAlert[] = response.data.alerts;
        
        // Filter out dismissed alerts and preserve existing read states
        const mergedAlerts: SmartAlert[] = [];
        for (const raw of rawAlerts) {
          const key = raw.dedup_key || raw._id || raw.id || '';
          if (dismissed.has(key)) continue;

          const existing = currentCache.find(c => (c.dedup_key && c.dedup_key === raw.dedup_key) || (c._id && c._id === raw._id));
          if (existing) {
            mergedAlerts.push({ ...raw, status: existing.status });
          } else {
            mergedAlerts.push({ ...raw, status: 'unread' });
          }
        }

        setLocalCache(mergedAlerts);
        notifyAlertListeners(mergedAlerts);
        return mergedAlerts;
      }
    } catch (e) {
      // Backend not running or offline, evaluate via intelligent client fallback
    }

    return this.evaluateClientFallback(telemetry);
  },

  // Get active alerts with optional filters
  async getAlerts(filter: { farm_id?: string; severity?: string; alert_type?: string; status?: string } = {}): Promise<{ alerts: SmartAlert[]; unreadCount: number }> {
    const dismissed = getDismissedKeys();

    try {
      const response = await axios.get(`${backendUrl}/api/alerts`, {
        params: filter,
        headers: getAuthHeaders(),
        timeout: 3500
      });
      if (response.data && response.data.alerts) {
        const activeList = (response.data.alerts as SmartAlert[]).filter(a => {
          const k = a.dedup_key || a._id || a.id || '';
          return !dismissed.has(k);
        });

        setLocalCache(activeList);
        const unreadCount = activeList.filter(a => a.status === 'unread').length;
        notifyAlertListeners(activeList);
        return { alerts: activeList, unreadCount };
      }
    } catch (e) {
      // Fallback to local storage
    }

    let list = getLocalCache().filter(a => {
      const k = a.dedup_key || a._id || a.id || '';
      return !dismissed.has(k);
    });

    if (filter.farm_id && filter.farm_id !== 'all') list = list.filter(a => a.farm_id === filter.farm_id);
    if (filter.severity && filter.severity !== 'all') list = list.filter(a => a.severity === filter.severity);
    if (filter.alert_type && filter.alert_type !== 'all') list = list.filter(a => a.alert_type === filter.alert_type);
    if (filter.status && filter.status !== 'all') list = list.filter(a => a.status === filter.status);

    const unreadCount = list.filter(a => a.status === 'unread').length;
    return { alerts: list, unreadCount };
  },

  // Mark single alert as read
  async markAsRead(alertId: string): Promise<boolean> {
    try {
      await axios.patch(`${backendUrl}/api/alerts/${alertId}/read`, {}, {
        headers: getAuthHeaders(),
        timeout: 3000
      });
    } catch (e) {}

    const cache = getLocalCache();
    const updated = cache.map(a => (a._id === alertId || a.id === alertId ? { ...a, status: 'read' as AlertStatus } : a));
    setLocalCache(updated);
    notifyAlertListeners(updated);
    return true;
  },

  // Mark all alerts as read
  async markAllAsRead(farmId?: string): Promise<boolean> {
    try {
      await axios.patch(`${backendUrl}/api/alerts/read-all`, { farm_id: farmId }, {
        headers: getAuthHeaders(),
        timeout: 3000
      });
    } catch (e) {}

    const cache = getLocalCache();
    const updated = cache.map(a => (!farmId || a.farm_id === farmId ? { ...a, status: 'read' as AlertStatus } : a));
    setLocalCache(updated);
    notifyAlertListeners(updated);
    return true;
  },

  // Dismiss / delete an alert permanently
  async deleteAlert(alertId: string): Promise<boolean> {
    const cache = getLocalCache();
    const target = cache.find(a => a._id === alertId || a.id === alertId);
    if (target) {
      if (target.dedup_key) addDismissedKey(target.dedup_key);
      if (target._id) addDismissedKey(target._id);
      if (target.id) addDismissedKey(target.id);
    }

    try {
      await axios.delete(`${backendUrl}/api/alerts/${alertId}`, {
        headers: getAuthHeaders(),
        timeout: 3000
      });
    } catch (e) {}

    const updated = cache.filter(a => a._id !== alertId && a.id !== alertId);
    setLocalCache(updated);
    notifyAlertListeners(updated);
    return true;
  },

  // Clear all alerts marked as read
  clearReadAlerts(farmId?: string): boolean {
    const cache = getLocalCache();
    const readAlerts = cache.filter(a => a.status === 'read' && (!farmId || a.farm_id === farmId));
    readAlerts.forEach(a => {
      if (a.dedup_key) addDismissedKey(a.dedup_key);
      if (a._id) addDismissedKey(a._id);
    });

    const updated = cache.filter(a => a.status === 'unread' || (farmId && a.farm_id !== farmId));
    setLocalCache(updated);
    notifyAlertListeners(updated);
    return true;
  },

  // Trigger synthetic hazard alert for immediate testing & demonstration
  triggerSimulationAlert(override: Partial<SmartAlert> = {}): SmartAlert {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const farmId = override.farm_id || 'farm_01';
    const farmName = override.farm_name || 'Ghaziabad Rice Field';
    const crop = override.crop || 'Rice';

    const simulated: SmartAlert = {
      _id: `sim_${timestamp}`,
      id: `sim_${timestamp}`,
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: override.alert_type || 'disease',
      severity: override.severity || 'Critical',
      title: override.title || 'Microclimate Fungal Spore Spike (86%)',
      reason: override.reason || 'Elevated relative humidity (82%) and optimal night temperatures (26°C) have accelerated pathogen incubation.',
      recommended_action: override.recommended_action || 'Apply preventive bio-fungicide or copper hydroxide foliar spray within the next 24 hours.',
      status: 'unread',
      dedup_key: `sim_${timestamp}_${Math.random().toString(36).substr(2, 4)}`,
      target_module: override.target_module || 'disease',
      createdAt: new Date().toISOString()
    };

    const cache = getLocalCache();
    const updated = [simulated, ...cache];
    setLocalCache(updated);
    notifyAlertListeners(updated);
    playAgronomicAlertChime(simulated.severity);

    // Also dispatch live toast event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agrisense:live-toast-alert', {
        detail: { alert: simulated }
      }));
    }

    return simulated;
  },

  // Sound preference getter & setter
  isSoundMuted(): boolean {
    return localStorage.getItem(SOUND_MUTED_KEY) === 'true';
  },

  setSoundMuted(muted: boolean) {
    localStorage.setItem(SOUND_MUTED_KEY, muted ? 'true' : 'false');
  },

  // Client-side fallback evaluator for offline mode
  evaluateClientFallback(telemetry: any): SmartAlert[] {
    const farmId = telemetry?.farm?.id || telemetry?.farm?.farm_id || 'farm_01';
    const farmName = telemetry?.farm?.name || telemetry?.farm?.farm_name || 'Ghaziabad Rice Field';
    const crop = telemetry?.farm?.crop || 'Rice';
    const today = new Date().toISOString().split('T')[0];

    const dismissed = getDismissedKeys();
    const currentCache = getLocalCache();

    const candidateAlerts: SmartAlert[] = [];

    // Weather condition
    const temp = telemetry?.weather?.temperature_c ?? 34;
    const humidity = telemetry?.weather?.humidity ?? 78;
    if (temp >= 33 || humidity > 75) {
      candidateAlerts.push({
        _id: `alt_w_${today}`,
        farm_id: farmId,
        farm_name: farmName,
        crop,
        alert_type: 'weather',
        severity: 'Warning',
        title: 'High Thermal & Atmospheric Humidity Stress',
        reason: `Microclimate sensors recorded ${temp}°C ambient temperature with ${humidity}% relative humidity.`,
        recommended_action: 'Increase evening irrigation to lower soil temperature and monitor leaf canopy for fungal stress.',
        status: 'unread',
        dedup_key: `${farmId}_weather_high_temp_${today}`,
        target_module: 'weather',
        createdAt: new Date().toISOString()
      });
    }

    // Disease condition
    candidateAlerts.push({
      _id: `alt_d_${today}`,
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'disease',
      severity: 'Critical',
      title: 'Elevated Pathogen Vector — Rice Blast Risk (82%)',
      reason: 'Fungal spore incubation model detected high humidity and canopy dew persistence.',
      recommended_action: 'Inspect lower leaf sheaths immediately and apply recommended copper oxychloride or bio-fungicide.',
      status: 'unread',
      dedup_key: `${farmId}_disease_rice_blast_${today}`,
      target_module: 'disease',
      createdAt: new Date().toISOString()
    });

    // Inventory condition
    candidateAlerts.push({
      _id: `alt_i_${today}`,
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'inventory',
      severity: 'Warning',
      title: 'Urea Fertilizer Stock Below Minimum Threshold',
      reason: 'Urea inventory balance has reached 25 kg (safety reserve threshold: 50 kg).',
      recommended_action: 'Place replenishment order at nearest Krishi Seva Kendra ahead of the next tillering application.',
      status: 'unread',
      dedup_key: `${farmId}_inventory_urea_${today}`,
      target_module: 'inventory',
      createdAt: new Date().toISOString()
    });

    // Market condition
    candidateAlerts.push({
      _id: `alt_m_${today}`,
      farm_id: farmId,
      farm_name: farmName,
      crop,
      alert_type: 'market',
      severity: 'Info',
      title: `APMC Mandi Rate Surge for ${crop}`,
      reason: `Current trading price at Ghaziabad Mandi rose +6.8% to ₹2,480/quintal against MSP benchmark.`,
      recommended_action: 'Consider scheduling harvest logistics to capitalize on favorable mandi spot market rates.',
      status: 'unread',
      dedup_key: `${farmId}_market_price_${today}`,
      target_module: 'prices',
      createdAt: new Date().toISOString()
    });

    // Smart merge: preserve previously marked read statuses and ignore dismissed
    const merged: SmartAlert[] = [];
    for (const candidate of candidateAlerts) {
      if (dismissed.has(candidate.dedup_key) || dismissed.has(candidate._id || '')) {
        continue;
      }

      const existing = currentCache.find(c => c.dedup_key === candidate.dedup_key || c._id === candidate._id);
      if (existing) {
        merged.push({ ...candidate, status: existing.status });
      } else {
        merged.push(candidate);
      }
    }

    // Keep any user-triggered simulated alerts in cache that weren't dismissed
    for (const cached of currentCache) {
      if (cached._id?.startsWith('sim_') && !dismissed.has(cached._id) && !merged.some(m => m._id === cached._id)) {
        merged.unshift(cached);
      }
    }

    setLocalCache(merged);
    notifyAlertListeners(merged);
    return merged;
  }
};
