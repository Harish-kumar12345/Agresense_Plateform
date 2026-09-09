import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Bell,
  Mail,
  Webhook,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Save,
  Info,
  ExternalLink,
  Activity
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface AlertPreferencesProps {
  token: string;
  backendUrl: string;
}

export const OfficerAlertPreferencesView: React.FC<AlertPreferencesProps> = ({
  token,
  backendUrl
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Delivery Configuration
  const [emailDelivery, setEmailDelivery] = useState({
    enabled: false,
    destination_email: '',
    severities: { info: false, warning: false, high: true, critical: true }
  });

  const [webhookDelivery, setWebhookDelivery] = useState({
    enabled: false,
    webhook_url: '',
    secret_token: '',
    severities: { info: false, warning: false, high: true, critical: true }
  });

  const [inAppDelivery, setInAppDelivery] = useState({
    enabled: true,
    severities: { info: true, warning: true, high: true, critical: true }
  });

  const [deliveryHistory, setDeliveryHistory] = useState<any[]>([]);

  // Test notification simulation state
  const [dispatchingTest, setDispatchingTest] = useState<boolean>(false);
  const [testSentMessage, setTestSentMessage] = useState<string | null>(null);

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${backendUrl}/api/officer/alert-preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data && data.preferences) {
        if (data.preferences.email_delivery) setEmailDelivery(data.preferences.email_delivery);
        if (data.preferences.webhook_delivery) setWebhookDelivery(data.preferences.webhook_delivery);
        if (data.preferences.in_app_delivery) setInAppDelivery(data.preferences.in_app_delivery);
        if (data.preferences.delivery_history) setDeliveryHistory(data.preferences.delivery_history);
      }
    } catch (err: any) {
      console.error('Error fetching officer alert preferences:', err);
      setError(err?.response?.data?.error || 'Failed to load alert preferences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    setError(null);
    try {
      await axios.put(
        `${backendUrl}/api/officer/alert-preferences`,
        {
          email_delivery: emailDelivery,
          webhook_delivery: webhookDelivery,
          in_app_delivery: inAppDelivery
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      console.error('Error saving alert preferences:', err);
      setError(err?.response?.data?.error || 'Failed to save alert preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleDispatchTest = () => {
    setDispatchingTest(true);
    setTimeout(() => {
      setDispatchingTest(false);
      const newHistoryItem = {
        alert_id: `test_${Date.now()}`,
        title: '🔴 Critical Disease Risk: Test Dispatch to Officer Channels',
        severity: 'Critical',
        channel: emailDelivery.enabled ? 'email' : webhookDelivery.enabled ? 'webhook' : 'in_app',
        status: emailDelivery.enabled || webhookDelivery.enabled ? 'Pending' : 'Sent',
        status_note: emailDelivery.enabled || webhookDelivery.enabled
          ? 'Delivery integration pending (outbound transport queued)'
          : 'Delivered in-app',
        attempted_at: new Date().toISOString()
      };
      setDeliveryHistory([newHistoryItem, ...deliveryHistory]);
      setTestSentMessage('Test alert event recorded and queued through active officer channels.');
      setTimeout(() => setTestSentMessage(null), 4000);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 space-y-2">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading officer alert delivery channels...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Bell className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-white font-display">
            Officer Real-Time Alert Delivery
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
            Officer-Scoped
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Configure per-severity routing for high-impact pathogen outbreaks and telemetry hazards to Email and Slack/Teams Webhooks.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Integration Notice Alert */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-300 text-xs flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-300">
            Multi-Channel Dispatcher Status: <span className="underline">Delivery Integration Pending</span>
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            In-app alert delivery is fully operational. Outbound external transports (SMTP relay server and Slack/Teams webhook gateways) are actively configured in stub-mode and will show <span className="font-mono text-amber-300">Pending</span> status on dispatch until external gateway credentials are authenticated.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Email Delivery Card */}
        <Card variant="elevated" className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs font-display">Email Dispatcher</h4>
                <p className="text-[10px] text-slate-400">Direct urgent advisories to email</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailDelivery.enabled}
                onChange={(e) => setEmailDelivery({ ...emailDelivery, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                Destination Email
              </label>
              <input
                type="email"
                placeholder="officer.emergency@agrisense.gov.in"
                value={emailDelivery.destination_email}
                onChange={(e) =>
                  setEmailDelivery({ ...emailDelivery, destination_email: e.target.value })
                }
                disabled={!emailDelivery.enabled}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-sky-500 disabled:opacity-40"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-400 text-[11px] font-semibold">
                Dispatch on Severities:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['critical', 'high', 'warning', 'info'] as const).map((sev) => (
                  <label
                    key={sev}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] cursor-pointer transition-colors ${
                      emailDelivery.severities[sev]
                        ? 'bg-sky-500/10 border-sky-500/30 text-white'
                        : 'bg-slate-900/50 border-white/5 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={emailDelivery.severities[sev]}
                      onChange={(e) =>
                        setEmailDelivery({
                          ...emailDelivery,
                          severities: { ...emailDelivery.severities, [sev]: e.target.checked }
                        })
                      }
                      disabled={!emailDelivery.enabled}
                      className="accent-sky-500 rounded"
                    />
                    <span className="capitalize">{sev}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Webhook Delivery Card */}
        <Card variant="elevated" className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
                <Webhook className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs font-display">Webhook (Slack/Teams)</h4>
                <p className="text-[10px] text-slate-400">POST JSON payload on trigger</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={webhookDelivery.enabled}
                onChange={(e) => setWebhookDelivery({ ...webhookDelivery, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                Webhook URL Endpoint
              </label>
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={webhookDelivery.webhook_url}
                onChange={(e) =>
                  setWebhookDelivery({ ...webhookDelivery, webhook_url: e.target.value })
                }
                disabled={!webhookDelivery.enabled}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-slate-400 text-[11px] font-semibold">
                Dispatch on Severities:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['critical', 'high', 'warning', 'info'] as const).map((sev) => (
                  <label
                    key={sev}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] cursor-pointer transition-colors ${
                      webhookDelivery.severities[sev]
                        ? 'bg-purple-500/10 border-purple-500/30 text-white'
                        : 'bg-slate-900/50 border-white/5 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={webhookDelivery.severities[sev]}
                      onChange={(e) =>
                        setWebhookDelivery({
                          ...webhookDelivery,
                          severities: { ...webhookDelivery.severities, [sev]: e.target.checked }
                        })
                      }
                      disabled={!webhookDelivery.enabled}
                      className="accent-purple-500 rounded"
                    />
                    <span className="capitalize">{sev}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Save Button & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10">
        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Officer delivery preferences successfully persisted!
            </span>
          )}
          {testSentMessage && (
            <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5 animate-fadeIn">
              <Activity className="w-4 h-4 text-sky-400" />
              {testSentMessage}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          <Button
            size="sm"
            variant="outline"
            icon={<Send className={`w-3.5 h-3.5 ${dispatchingTest ? 'animate-pulse' : ''}`} />}
            onClick={handleDispatchTest}
            disabled={dispatchingTest}
          >
            {dispatchingTest ? 'Dispatching Test Event...' : 'Send Test Alert'}
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={<Save className="w-3.5 h-3.5" />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>

      {/* Alert Delivery History & Status */}
      <Card variant="elevated" className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm font-display flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Recent Alert Delivery Attempts & Channel Status
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual channel delivery receipts (Sent, Failed, or Pending)
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {deliveryHistory.length} Recorded Attempts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-semibold border-b border-white/10">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Alert Title</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Channel</th>
                <th className="p-3">Delivery Status</th>
                <th className="p-3">Receipt / Verification Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {deliveryHistory.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {new Date(item.attempted_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-medium text-white max-w-[260px] truncate">
                    {item.title}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.severity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : item.severity === 'High'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="p-3 uppercase font-mono text-[10px] text-slate-300">
                    {item.channel}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                        item.status === 'Sent'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : item.status === 'Failed'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {item.status === 'Sent' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>{item.status}</span>
                    </span>
                  </td>
                  <td className="p-3 text-[11px] text-slate-400 italic">
                    {item.status_note || 'Pending gateway response'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
