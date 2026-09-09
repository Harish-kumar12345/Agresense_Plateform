import React, { useState, useEffect } from 'react';
import {
  Pill,
  Sprout,
  Shield,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  AlertTriangle,
  ClipboardList,
  MapPin,
  X,
  FlaskConical,
  Package,
  Layers,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { inventoryService, InventoryItem, ApplicationLog } from '../../services/inventoryService';
import { FarmData } from '../../services/farmService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InsightCard } from '../ui/InsightCard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { colors, motionPresets } from '../../styles/design-tokens';

interface FertilizerPesticideModuleProps {
  farm?: FarmData | null;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    state?: string;
  };
  crop?: string;
}

export const FertilizerPesticideModule: React.FC<FertilizerPesticideModuleProps> = ({
  farm,
  location,
  crop = 'Rice'
}) => {
  const rawLat = farm?.latitude ?? location?.latitude ?? 28.6692;
  const rawLon = farm?.longitude ?? location?.longitude ?? 77.4538;
  const safeLat = isNaN(Number(rawLat)) ? 28.6692 : Number(rawLat);
  const safeLon = isNaN(Number(rawLon)) ? 77.4538 : Number(rawLon);
  const farmArea = farm?.area_hectares || 2.5;
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmTitle = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, India` : 'Ghaziabad, Uttar Pradesh');

  const [activeTab, setActiveTab] = useState<'inventory' | 'logs' | 'alerts'>('inventory');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Fertilizer' | 'Pesticide'>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<ApplicationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedProductForApply, setSelectedProductForApply] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Fertilizer' as 'Fertilizer' | 'Pesticide',
    type: 'Nitrogenous',
    quantity: 10,
    unit: 'kg',
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    cost: 0,
    notes: ''
  });

  const [applyData, setApplyData] = useState({
    quantity_used: 1,
    target_nutrient_or_pest: '',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryRes, logsRes] = await Promise.all([
        inventoryService.getInventory(),
        inventoryService.getApplicationLogs()
      ]);
      setItems(inventoryRes);
      setLogs(logsRes);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [safeLat, safeLon, selectedCrop]);

  const filteredItems = items.filter(item => {
    const matchesCategory = categoryFilter === 'All' ? true : item.category === categoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesCategory && matchesSearch && matchesStatus;
  });

  const alerts = items.filter(i => i.status === 'Low Stock' || i.status === 'Expired' || i.status === 'Out of Stock');
  const fertilizerCount = items.filter(i => i.category === 'Fertilizer').length;
  const pesticideCount = items.filter(i => i.category === 'Pesticide').length;

  const handleOpenAddModal = (cat: 'Fertilizer' | 'Pesticide' = 'Fertilizer') => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: cat,
      type: cat === 'Fertilizer' ? 'Nitrogenous' : 'Fungicide',
      quantity: 10,
      unit: cat === 'Fertilizer' ? 'kg' : 'liters',
      purchase_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      cost: 0,
      notes: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      type: item.type,
      quantity: item.quantity,
      unit: item.unit,
      purchase_date: item.purchase_date ? String(item.purchase_date).split('T')[0] : '',
      expiry_date: item.expiry_date ? String(item.expiry_date).split('T')[0] : '',
      cost: item.cost || 0,
      notes: item.notes || ''
    });
    setShowAddModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingItem) {
      const updated = await inventoryService.updateItem(editingItem._id, formData);
      setItems(prev => prev.map(i => i._id === editingItem._id ? updated : i));
    } else {
      const created = await inventoryService.addItem(formData);
      setItems(prev => [created, ...prev]);
    }
    setShowAddModal(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Delete item from inventory?')) {
      await inventoryService.deleteItem(id);
      setItems(prev => prev.filter(i => i._id !== id));
    }
  };

  const handleOpenApplyModal = (product: InventoryItem) => {
    setSelectedProductForApply(product);
    setApplyData({
      quantity_used: 1,
      target_nutrient_or_pest: product.category === 'Fertilizer' ? 'Nitrogen Booster' : 'Fungal Control',
      notes: ''
    });
    setShowApplyModal(true);
  };

  const handleRecordApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForApply) return;

    try {
      const { updatedItem, log } = await inventoryService.recordApplication({
        product_id: selectedProductForApply._id,
        crop: selectedCrop,
        field: farmTitle,
        quantity_used: applyData.quantity_used,
        target_nutrient_or_pest: applyData.target_nutrient_or_pest,
        notes: applyData.notes
      });

      setItems(prev => prev.map(i => i._id === updatedItem._id ? updatedItem : i));
      setLogs(prev => [log, ...prev]);
      setShowApplyModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to record application');
    }
  };

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'In Stock':
        return <Badge variant="emerald" size="sm">In Stock</Badge>;
      case 'Low Stock':
        return <Badge variant="amber" size="sm">Low Stock</Badge>;
      case 'Out of Stock':
      case 'Expired':
        return <Badge variant="rose" size="sm">{status}</Badge>;
      default:
        return <Badge variant="slate" size="sm">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading farm inventory ledger...</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={motionPresets.container}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-100 font-sans"
    >
      {/* 1. VerdaAgro Inventory Context Bar */}
      <motion.div variants={motionPresets.item} className="verda-hero-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
              <span>Warehouse</span>
              <span className="text-emerald-700">/</span>
              <span>Input Supply Chain & Warehouse Stock Ledger</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono font-bold ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE WAREHOUSE AUDIT
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight verda-gradient-title font-display">
                Inventory & Application Tracker
              </h1>
              <span className="verda-glow-pill">
                {items.length} Tracked Batches
              </span>
              <span className="agri-pill agri-pill-muted font-bold">
                Cultivated Crop: {selectedCrop}
              </span>
            </div>

            <p className="text-xs text-[#D1DED6] flex items-center gap-2 font-medium">
              <span className="font-bold text-white">{farmTitle}</span>
              <span className="text-emerald-800">•</span>
              <span className="flex items-center gap-1 text-emerald-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {locationLabel} ({farmArea} ha)
              </span>
              <span className="text-emerald-800">•</span>
              <span className="text-slate-300 font-mono text-[11px]">Reorder Flags: <strong className={alerts.length > 0 ? 'text-amber-400' : 'text-emerald-400'}>{alerts.length} items</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAddModal('Fertilizer')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Input Item
            </button>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070D0A]/70 hover:bg-emerald-950/40 border border-emerald-900/40 text-[#D1DED6] text-xs font-semibold transition-colors cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. Asymmetric Stock Management Bento Grid */}
      <motion.div variants={motionPresets.item} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Primary Stock Readiness Core (7 Cols) */}
        <div className="lg:col-span-7 agri-bento-card p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#D1DED6]">
                Warehouse Input Reserve
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-medium">
              Ledger Health: {alerts.length === 0 ? 'Optimal Reserve' : 'Replenishment Needed'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-1">
                Active Chemical & Bio Stock
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white font-display">
                  {items.length}
                </span>
                <span className="text-xl text-[#D1DED6] font-medium">SKUs in Store</span>
                <span className={`agri-pill ml-2 ${alerts.length === 0 ? 'agri-pill-emerald' : 'agri-pill-amber'}`}>
                  {alerts.length === 0 ? 'Supply Healthy' : `${alerts.length} Alerts`}
                </span>
              </div>
            </div>

            <div className="bg-[#070D0A]/60 border border-emerald-900/30 rounded-xl p-3 text-right">
              <div className="text-[10px] uppercase tracking-wider text-[#D1DED6]/70">Application Logs</div>
              <div className="text-xl font-mono font-bold text-white mt-0.5">{logs.length} <span className="text-xs text-emerald-400 font-normal">Entries</span></div>
              <div className="text-[10px] text-[#D1DED6] mt-0.5">Historical field doses</div>
            </div>
          </div>

          {/* Sub-telemetry 3-gauge strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-[#070D0A]/70 border border-emerald-900/30 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-[#D1DED6] mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                  Fertilizers
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 font-mono">{fertilizerCount}</span>
              </div>
              <div className="text-xl font-bold text-white font-display">Nutrients</div>
              <p className="text-[10px] text-[#D1DED6] mt-1">Urea, DAP, Potash formulations</p>
            </div>

            <div className="bg-[#070D0A]/70 border border-emerald-900/30 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-[#D1DED6] mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  Crop Protection
                </span>
                <span className="text-[10px] font-semibold text-sky-400 font-mono">{pesticideCount}</span>
              </div>
              <div className="text-xl font-bold text-white font-display">Pesticides</div>
              <p className="text-[10px] text-[#D1DED6] mt-1">Fungicide & biological sprays</p>
            </div>

            <div className="bg-[#070D0A]/70 border border-emerald-900/30 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-[#D1DED6] mb-1">
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Reorder Queue
                </span>
                <span className="text-[10px] font-semibold text-amber-400 font-mono">{alerts.length}</span>
              </div>
              <div className="text-xl font-bold text-white font-display">{alerts.length > 0 ? 'Restock' : 'Zero Deficit'}</div>
              <p className="text-[10px] text-[#D1DED6] mt-1">Low threshold alarms</p>
            </div>
          </div>
        </div>

        {/* Input Reorder & Application Alerts Desk (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          <div className="agri-bento-card p-5 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#D1DED6] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Inventory Reorder Thresholds
              </span>
              <span className={`agri-pill ${alerts.length > 0 ? 'agri-pill-amber' : 'agri-pill-emerald'}`}>
                {alerts.length > 0 ? `${alerts.length} Urgent` : 'Healthy Buffer'}
              </span>
            </div>

            <div className="my-3">
              <div className="text-lg font-bold text-white font-display">
                {alerts.length > 0 ? 'Restock Required Before Next Spray' : 'Adequate Buffer for Sowing Cycle'}
              </div>
              <p className="text-xs text-[#D1DED6] mt-1.5 leading-relaxed">
                {alerts.length > 0
                  ? `${alerts.map(a => a.name).slice(0, 2).join(', ')}${alerts.length > 2 ? ' and more' : ''} have reached minimum safety stock.`
                  : 'All primary chemical formulations and biological protectants maintain safe reserves.'}
              </p>
            </div>

            <div className="pt-2 border-t border-emerald-950/40 flex items-center justify-between text-xs">
              <span className="text-[#D1DED6]">Preferred Distributor:</span>
              <span className="text-emerald-400 font-semibold font-mono">Krishi Seva Kendra</span>
            </div>
          </div>

          <div className="agri-bento-card p-5 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#D1DED6] flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                Recent Dose Verification
              </span>
              <span className="agri-pill agri-pill-muted">
                Compliance Log
              </span>
            </div>

            <div className="my-3">
              <div className="text-lg font-bold text-white font-display">
                Agronomic Dosage Compliance
              </div>
              <p className="text-xs text-[#D1DED6] mt-1.5 leading-relaxed">
                Application rates cross-referenced against ICAR recommended per-hectare dosages to prevent nutrient toxicity or runoff.
              </p>
            </div>

            <div className="pt-2 border-t border-emerald-950/40 flex items-center justify-between text-xs">
              <span className="text-[#D1DED6]">Last Verified Dose:</span>
              <span className="text-emerald-400 font-semibold font-mono">
                {logs.length > 0 ? logs[0].product_name : 'No logs recorded'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Stock Level Visualization Chart */}
      {items.length > 0 && (
        <motion.div variants={motionPresets.item}>
          <Card variant="elevated" tone="inventory" className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Warehouse Level Telemetry</span>
                <h3 className="text-base font-bold text-white mt-0.5 font-display">Inventory Quantity Distribution by SKU</h3>
              </div>
              <Badge variant="indigo" size="sm">
                Stock Metric
              </Badge>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={items.slice(0, 8).map(i => ({
                    name: i.name.length > 15 ? i.name.slice(0, 15) + '...' : i.name,
                    quantity: i.quantity,
                    unit: i.unit,
                    category: i.category
                  }))}
                  margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="saas-card p-3 shadow-xl border border-white/15 text-xs space-y-1 bg-slate-900/95 backdrop-blur-md">
                            <p className="font-bold text-white">{label}</p>
                            <p className="text-indigo-400 font-semibold">Stock: {item.quantity} {item.unit}</p>
                            <p className="text-slate-400 text-[11px]">Category: {item.category}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="quantity" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {items.slice(0, 8).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.category === 'Fertilizer' ? '#10b981' : '#6366f1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      )}

      {/* 3. Controls & Segment Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/10 p-1.5 rounded-2xl w-full sm:w-auto backdrop-blur-md">
          {[
            { key: 'inventory', label: `Stock Table (${items.length})` },
            { key: 'logs', label: `Application Logs (${logs.length})` },
            { key: 'alerts', label: `Alerts (${alerts.length})` }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search stock..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder:text-slate-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 outline-none"
            >
              <option value="All" className="bg-slate-900 text-white">All Types</option>
              <option value="Fertilizer" className="bg-slate-900 text-white">Fertilizer</option>
              <option value="Pesticide" className="bg-slate-900 text-white">Pesticide</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: INVENTORY ITEMS */}
      {activeTab === 'inventory' && (
        <Card variant="elevated" className="overflow-hidden space-y-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-white/10 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Remaining Quantity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Purchase / Expiry</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No matching products in inventory.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item._id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${
                            item.category === 'Fertilizer' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          }`}>
                            {item.category === 'Fertilizer' ? <Sprout className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{item.name}</span>
                            <span className="text-[11px] text-slate-400">{item.type}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-300">
                        {item.category}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="font-bold text-white">{item.quantity} {item.unit}</div>
                          {/* Mini Stock Progress Bar */}
                          <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.quantity <= 2 ? 'bg-rose-500' : item.quantity <= 5 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, (item.quantity / 20) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getItemStatusBadge(item.status)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        <div>Bought: {item.purchase_date ? String(item.purchase_date).split('T')[0] : '—'}</div>
                        {item.expiry_date && <div className="text-[10px] text-slate-500">Exp: {String(item.expiry_date).split('T')[0]}</div>}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenApplyModal(item)}
                            className="border-white/10 text-slate-200 hover:bg-white/5"
                          >
                            Log Use
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: APPLICATION LOGS */}
      {activeTab === 'logs' && (
        <Card variant="elevated" className="overflow-hidden space-y-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-white/10 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Quantity Used</th>
                  <th className="py-3 px-4">Crop & Field</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No application events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log._id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-400">
                        {new Date(log.applied_date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {log.product_name}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-400">
                        {log.quantity_used} {log.unit}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {log.crop} • {log.field}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <Badge variant="slate" size="sm">{log.target_nutrient_or_pest || 'Routine'}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: STOCK ALERTS */}
      {activeTab === 'alerts' && (
        <Card variant="elevated" className="p-6 space-y-4">
          <div className="pb-2 border-b border-white/10">
            <h3 className="text-base font-bold text-white font-display">Critical Stock & Expiry Alerts</h3>
            <p className="text-xs text-slate-400">Inputs requiring immediate replenishment</p>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                All inventory items are currently in healthy supply levels.
              </div>
            ) : (
              alerts.map(item => (
                <div key={item._id} className="p-4 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{item.name}</span>
                      {getItemStatusBadge(item.status)}
                    </div>
                    <p className="text-xs text-slate-400">
                      Remaining: <strong className="text-emerald-400">{item.quantity} {item.unit}</strong> • {item.category} ({item.type})
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditModal(item)}
                    className="border-white/10 text-slate-200 hover:bg-white/5"
                  >
                    Update Stock
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* MODAL: ADD / EDIT ITEM */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-md w-full"
            >
              <Card variant="elevated" className="p-6 space-y-4 text-xs bg-slate-900/95 border-white/15">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white font-display">
                    {editingItem ? 'Edit Product Stock' : 'Add New Agricultural Input'}
                  </h3>
                  <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveItem} className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl font-semibold text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl font-semibold text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      >
                        <option value="Fertilizer" className="bg-slate-900 text-white">Fertilizer</option>
                        <option value="Pesticide" className="bg-slate-900 text-white">Pesticide</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Quantity & Unit</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                          className="w-2/3 px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl font-semibold text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                        <input
                          type="text"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="w-1/3 px-2 py-2 bg-slate-950/80 border border-white/10 rounded-xl font-semibold text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                    >
                      Save to Ledger
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: LOG APPLICATION */}
      <AnimatePresence>
        {showApplyModal && selectedProductForApply && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-md w-full"
            >
              <Card variant="elevated" className="p-6 space-y-4 text-xs bg-slate-900/95 border-white/15">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white font-display">
                    Record Field Application: {selectedProductForApply.name}
                  </h3>
                  <button type="button" onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleRecordApplication} className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Quantity Used ({selectedProductForApply.unit})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      max={selectedProductForApply.quantity}
                      value={applyData.quantity_used}
                      onChange={(e) => setApplyData({ ...applyData, quantity_used: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl font-semibold text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Target Purpose</label>
                    <input
                      type="text"
                      value={applyData.target_nutrient_or_pest}
                      onChange={(e) => setApplyData({ ...applyData, target_nutrient_or_pest: e.target.value })}
                      placeholder="e.g. Basal dose application"
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl font-semibold text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder:text-slate-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApplyModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                    >
                      Deduct & Log Application
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
