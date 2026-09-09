import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  User,
  MapPin,
  FileCheck,
  Shield
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface FarmerQuery {
  _id: string;
  id?: string;
  farmer_name?: string;
  farmer_phone?: string;
  district?: string;
  crop?: string;
  text: string;
  response?: string;
  status: 'pending' | 'answered' | 'error';
  metadata?: {
    crop_stage?: string;
    soil_moisture?: number;
    disease_risk?: string;
    submitted_at?: string;
    answered_by_officer?: string;
    answered_at?: string;
    farmContext?: any;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface OfficerQueriesViewProps {
  token: string;
  backendUrl: string;
}

const RESPONSE_TEMPLATES = [
  {
    label: 'Foliar Fungicide Protocol',
    text: 'Recommended Application: Apply systemic fungicide (Azoxystrobin 18.2% + Difenoconazole 11.4% SC @ 1 ml/L or Copper Oxychloride 50% WP @ 2.5 g/L). Spray during non-rainy morning hours. Ensure lower leaf sheath coverage.'
  },
  {
    label: 'Nitrogen Deficiency Top-Dress',
    text: 'Recommended Practice: Apply Neem-coated Urea @ 30-35 kg/ha as targeted top-dressing immediately after draining excess standing water. Supplement with 1% Urea foliar spray for rapid chlorosis recovery.'
  },
  {
    label: 'Soil Liming & pH Correction',
    text: 'Soil Remediation: Apply agricultural lime (calcium carbonate) @ 500 kg/ha broadcast evenly over moist but unflooded soil 14 days prior to fertilization. Recheck pH after 3 weeks.'
  },
  {
    label: 'Moisture Drainage & Aeration',
    text: 'Agronomic Guidance: Immediately open drainage furrows to prevent root zone anoxia. Allow topsoil to aerate for 48 hours before applying any secondary macro-nutrients or potassium.'
  }
];

export const OfficerQueriesView: React.FC<OfficerQueriesViewProps> = ({ token, backendUrl }) => {
  const [queries, setQueries] = useState<FarmerQuery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ANSWERED'>('ALL');

  // Resolution editor state per query ID
  const [activeResolutions, setActiveResolutions] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchQueries = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${backendUrl}/api/officer/queries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data && data.queries) {
        setQueries(data.queries);
      }
    } catch (err: any) {
      console.error('Failed to fetch officer queries:', err);
      setError(err?.response?.data?.error || 'Failed to load farmer queries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, [token]);

  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && q.status !== 'answered') ||
        (statusFilter === 'ANSWERED' && q.status === 'answered');

      const matchesSearch =
        q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.farmer_name && q.farmer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.district && q.district.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.crop && q.crop.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [queries, searchTerm, statusFilter]);

  const pendingCount = useMemo(() => {
    return queries.filter((q) => q.status !== 'answered').length;
  }, [queries]);

  const handleResolve = async (queryId: string) => {
    const text = activeResolutions[queryId]?.trim();
    if (!text) return;

    setSubmittingId(queryId);
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/officer/queries/${queryId}/resolve`,
        { resolution: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data && data.success) {
        setQueries((prev) =>
          prev.map((item) => (item._id === queryId || item.id === queryId ? data.query : item))
        );
        setActiveResolutions((prev) => {
          const next = { ...prev };
          delete next[queryId];
          return next;
        });
        setSuccessToast('Official agronomist resolution dispatched to farmer and logged in audit trail.');
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err: any) {
      console.error('Error resolving query:', err);
      setError(err?.response?.data?.error || 'Failed to dispatch resolution.');
    } finally {
      setSubmittingId(null);
    }
  };

  const applyTemplate = (queryId: string, templateText: string) => {
    setActiveResolutions((prev) => ({
      ...prev,
      [queryId]: prev[queryId] ? `${prev[queryId]}\n\n${templateText}` : templateText
    }));
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white font-display">
              Farmer Advisory Queries & Field Tickets
            </h2>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Direct communication hub for resolving farmer telemetry inquiries, pest alerts, and agronomic guidance tickets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchQueries}
            disabled={loading}
          >
            Refresh Tickets
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by farmer, district, crop, or symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 bg-slate-900 border border-white/5 hover:text-white'
            }`}
          >
            All Tickets ({queries.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 bg-slate-900 border border-white/5 hover:text-white'
            }`}
          >
            Pending Action ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ANSWERED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'ANSWERED'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 bg-slate-900 border border-white/5 hover:text-white'
            }`}
          >
            Resolved ({queries.length - pendingCount})
          </button>
        </div>
      </div>

      {/* Query List */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading farmer inquiries and field tickets...</p>
        </div>
      ) : filteredQueries.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/50 border border-white/5 text-center text-slate-400 space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="font-semibold text-white text-sm">No inquiries found matching your filters.</p>
          <p className="text-xs text-slate-500">Farmers can submit questions through the precision AI chat module.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQueries.map((query) => {
            const queryId = query._id || query.id || '';
            const isAnswered = query.status === 'answered';
            const draftText = activeResolutions[queryId] ?? '';
            const isSubmitting = submittingId === queryId;

            return (
              <Card
                key={queryId}
                variant="elevated"
                className={`p-5 space-y-4 transition-all ${
                  isAnswered ? 'border-white/10' : 'border-rose-500/30 bg-rose-950/10'
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-emerald-400 text-xs">
                      {query.farmer_name ? query.farmer_name[0] : <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">
                          {query.farmer_name || 'Registered Farmer'}
                        </h4>
                        {query.crop && (
                          <Badge variant="emerald" size="sm">
                            {query.crop}
                          </Badge>
                        )}
                        {query.district && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {query.district}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {query.farmer_phone && `${query.farmer_phone} • `}
                        Ticket ID: {queryId.slice(-8)} • {new Date(query.createdAt || Date.now()).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isAnswered ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Resolved & Sealed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5 text-rose-400" />
                        Action Required
                      </span>
                    )}
                  </div>
                </div>

                {/* Farmer Question */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Farmer's Field Question:
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    "{query.text}"
                  </p>
                </div>

                {/* Agronomic Context / Telemetry Metadata if present */}
                {query.metadata && (query.metadata.crop_stage || query.metadata.soil_moisture || query.metadata.disease_risk) && (
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                    <span className="font-semibold text-slate-300">Field Telemetry at Query:</span>
                    {query.metadata.crop_stage && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-slate-300">
                        Growth Stage: <strong className="text-emerald-300">{query.metadata.crop_stage}</strong>
                      </span>
                    )}
                    {query.metadata.soil_moisture && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-slate-300">
                        Soil Moisture: <strong className="text-sky-300">{query.metadata.soil_moisture}%</strong>
                      </span>
                    )}
                    {query.metadata.disease_risk && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-slate-300">
                        Risk Flag: <strong className="text-amber-300">{query.metadata.disease_risk}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Response Section */}
                {isAnswered ? (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold border-b border-emerald-500/10 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        Official Agronomist Resolution Dispatched
                      </span>
                      {query.metadata?.answered_by_officer && (
                        <span className="text-slate-400 font-normal">
                          By {query.metadata.answered_by_officer}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {query.response}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {/* Quick Response Templates */}
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1.5">
                        Quick Agronomic Advisory Templates:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {RESPONSE_TEMPLATES.map((tmpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => applyTemplate(queryId, tmpl.text)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-[10px] text-emerald-300 font-medium transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            {tmpl.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Official Resolution Textarea */}
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        placeholder="Compose official agronomist recommendation for the farmer..."
                        value={draftText}
                        onChange={(e) =>
                          setActiveResolutions((prev) => ({
                            ...prev,
                            [queryId]: e.target.value
                          }))
                        }
                        className="w-full p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-emerald-400" />
                          Resolutions are digitally sealed into the Immutable Officer Audit Trail
                        </span>

                        <Button
                          size="sm"
                          variant="primary"
                          icon={<Send className="w-3.5 h-3.5" />}
                          disabled={!draftText.trim() || isSubmitting}
                          onClick={() => handleResolve(queryId)}
                        >
                          {isSubmitting ? 'Dispatching Resolution...' : 'Dispatch Resolution'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
