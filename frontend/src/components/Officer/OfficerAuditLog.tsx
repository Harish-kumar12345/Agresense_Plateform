import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  FileText,
  Filter,
  Download,
  Calendar,
  User,
  Shield,
  Search,
  ArrowRight,
  Clock,
  CheckCircle2,
  RefreshCw,
  Lock
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { exportAuditLogsToCsv } from '../../utils/officerCsvExport';

interface AuditLogEntry {
  _id: string;
  officer_id: string;
  officer_name: string;
  action_type: string;
  target_id: string;
  target_type: string;
  details: string;
  before_value: any;
  after_value: any;
  ip_address: string;
  created_at: string;
}

interface OfficerAuditLogProps {
  token: string;
  backendUrl: string;
}

export const OfficerAuditLog: React.FC<OfficerAuditLogProps> = ({ token, backendUrl }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [officerFilter, setOfficerFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 200 };
      if (actionFilter !== 'ALL') params.action_type = actionFilter;
      if (officerFilter !== 'ALL') params.officer = officerFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const { data } = await axios.get(`${backendUrl}/api/officer/audit-logs`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data && data.logs) {
        setLogs(data.logs);
      }
    } catch (err: any) {
      console.error('Error loading officer audit logs:', err);
      setError(err?.response?.data?.error || 'Failed to load audit logs from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, officerFilter, startDate, endDate]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesSearch =
        l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.target_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.officer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.action_type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [logs, searchTerm]);

  const uniqueOfficers = useMemo(() => {
    const set = new Set(logs.map((l) => l.officer_name));
    return Array.from(set);
  }, [logs]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ADVISORY_DISPATCHED':
        return <Badge variant="emerald" size="sm">ADVISORY DISPATCHED</Badge>;
      case 'INCIDENT_STATUS_CHANGED':
        return <Badge variant="rose" size="sm">INCIDENT MODIFIED</Badge>;
      case 'INVENTORY_ADJUSTED':
        return <Badge variant="amber" size="sm">INVENTORY ADJUSTED</Badge>;
      case 'HARVEST_UPDATED':
        return <Badge variant="sky" size="sm">HARVEST STATUS</Badge>;
      case 'REPORT_EXPORTED_PDF':
      case 'REPORT_EXPORTED_CSV':
        return <Badge variant="indigo" size="sm">REPORT EXPORTED</Badge>;
      case 'SETTINGS_UPDATED':
        return <Badge variant="slate" size="sm">SETTINGS UPDATED</Badge>;
      default:
        return <Badge variant="emerald" size="sm">{action.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white font-display">
              Immutable Officer Audit Trail
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 text-[10px] font-mono flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-emerald-400" />
              Append-Only
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Cryptographically sealed activity log of all advisory dispatches, inventory movements, incident updates, and report exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchLogs}
            disabled={loading}
          >
            Refresh
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => exportAuditLogsToCsv(filteredLogs)}
            disabled={filteredLogs.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card variant="elevated" className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search action details, target ID or officer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Action Types</option>
              <option value="ADVISORY_DISPATCHED">Advisory Dispatched</option>
              <option value="INCIDENT_STATUS_CHANGED">Incident Status Changed</option>
              <option value="INVENTORY_ADJUSTED">Inventory Adjusted</option>
              <option value="HARVEST_UPDATED">Harvest Status Updated</option>
              <option value="REPORT_EXPORTED_PDF">PDF Report Exported</option>
              <option value="REPORT_EXPORTED_CSV">CSV Report Exported</option>
              <option value="SETTINGS_UPDATED">Settings Updated</option>
            </select>
          </div>

          {/* Officer Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={officerFilter}
              onChange={(e) => setOfficerFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Officers</option>
              {uniqueOfficers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white outline-none"
              title="Filter from date"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white outline-none"
              title="Filter to date"
            />
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card variant="elevated" className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Querying append-only audit trail...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-300 bg-rose-500/10">
            <p>{error}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <p>No audit log events match your selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-semibold border-b border-white/10">
                <tr>
                  <th className="p-3.5">Timestamp (UTC)</th>
                  <th className="p-3.5">Officer</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Target</th>
                  <th className="p-3.5">Activity Description</th>
                  <th className="p-3.5">Before → After State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-[10px]">
                          {log.officer_name[0]}
                        </div>
                        <span className="font-semibold text-white">{log.officer_name}</span>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">{getActionBadge(log.action_type)}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-mono text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                        {log.target_type}:{log.target_id}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-200 min-w-[240px] leading-relaxed">
                      {log.details}
                    </td>
                    <td className="p-3.5 text-[11px]">
                      {log.before_value || log.after_value ? (
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-rose-300 border border-rose-500/20 truncate max-w-[120px]">
                            {log.before_value ? JSON.stringify(log.before_value) : 'NONE'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300 border border-emerald-500/20 truncate max-w-[120px]">
                            {log.after_value ? JSON.stringify(log.after_value) : 'CONFIRMED'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No state transition</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
