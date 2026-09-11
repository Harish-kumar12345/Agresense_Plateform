import axios from 'axios';

export type InventoryItem = {
  _id: string;
  name: string;
  category: 'Fertilizer' | 'Pesticide';
  type: string;
  quantity: number;
  unit: string;
  purchase_date?: string;
  expiry_date?: string;
  cost?: number;
  notes?: string;
  status: 'Available' | 'Low Stock' | 'Expired' | 'Out of Stock';
  createdAt?: string;
};

export type ApplicationLog = {
  _id: string;
  date: string;
  crop: string;
  field: string;
  product_id?: string;
  product_name: string;
  category: 'Fertilizer' | 'Pesticide';
  quantity_used: number;
  unit: string;
  target_nutrient_or_pest: string;
  notes?: string;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper: get auth headers if a token exists
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('agrisense_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

const INITIAL_LOCAL_ITEMS: InventoryItem[] = [
  {
    _id: 'local_f1',
    name: 'Urea 46% Nitrogen',
    category: 'Fertilizer',
    type: 'Nitrogenous',
    quantity: 45,
    unit: 'kg',
    purchase_date: '2026-01-10',
    expiry_date: '2027-01-10',
    cost: 320,
    notes: 'High nitrogen booster for vegetative stage',
    status: 'Available'
  },
  {
    _id: 'local_f2',
    name: 'Di-Ammonium Phosphate (DAP 18-46-0)',
    category: 'Fertilizer',
    type: 'Phosphatic',
    quantity: 25,
    unit: 'kg',
    purchase_date: '2026-02-01',
    expiry_date: '2027-02-01',
    cost: 1350,
    notes: 'Root formation and early tiller establishment',
    status: 'Available'
  },
  {
    _id: 'local_f3',
    name: 'Muriate of Potash (MOP 60% K2O)',
    category: 'Fertilizer',
    type: 'Potassic',
    quantity: 3,
    unit: 'kg',
    purchase_date: '2025-05-10',
    expiry_date: '2026-11-10',
    cost: 850,
    notes: 'Grain filling and drought resistance',
    status: 'Low Stock'
  },
  {
    _id: 'local_p1',
    name: 'Neem Oil Bio-Pesticide (10000 ppm)',
    category: 'Pesticide',
    type: 'Bio-Pesticide',
    quantity: 4,
    unit: 'liters',
    purchase_date: '2026-03-01',
    expiry_date: '2027-03-01',
    cost: 450,
    notes: 'Organic repellent for sucking insects & aphids',
    status: 'Available'
  },
  {
    _id: 'local_p2',
    name: 'Tricyclazole 75% WP (Blast Fungicide)',
    category: 'Pesticide',
    type: 'Fungicide',
    quantity: 1,
    unit: 'kg',
    purchase_date: '2025-08-01',
    expiry_date: '2026-08-01',
    cost: 650,
    notes: 'Systemic fungicide for Rice Blast control',
    status: 'Low Stock'
  }
];

const INITIAL_LOCAL_LOGS: ApplicationLog[] = [
  {
    _id: 'log_loc_1',
    date: '2026-08-01',
    crop: 'Rice',
    field: 'Main Registered Field',
    product_id: 'local_f1',
    product_name: 'Urea 46% Nitrogen',
    category: 'Fertilizer',
    quantity_used: 10,
    unit: 'kg',
    target_nutrient_or_pest: 'Nitrogen Deficiency Correction',
    notes: 'Applied during tillering phase'
  }
];

// Helper to determine status
const calcStatus = (qty: number, expDate?: string): InventoryItem['status'] => {
  if (qty <= 0) return 'Out of Stock';
  if (expDate && new Date(expDate) < new Date()) return 'Expired';
  if (qty <= 5) return 'Low Stock';
  return 'Available';
};

export const inventoryService = {
  getLocalItems(): InventoryItem[] {
    try {
      const saved = localStorage.getItem('agrisense_inventory_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    localStorage.setItem('agrisense_inventory_v1', JSON.stringify(INITIAL_LOCAL_ITEMS));
    return INITIAL_LOCAL_ITEMS;
  },

  setLocalItems(items: InventoryItem[]) {
    localStorage.setItem('agrisense_inventory_v1', JSON.stringify(items));
  },

  getLocalLogs(): ApplicationLog[] {
    try {
      const saved = localStorage.getItem('agrisense_app_logs_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    localStorage.setItem('agrisense_app_logs_v1', JSON.stringify(INITIAL_LOCAL_LOGS));
    return INITIAL_LOCAL_LOGS;
  },

  setLocalLogs(logs: ApplicationLog[]) {
    localStorage.setItem('agrisense_app_logs_v1', JSON.stringify(logs));
  },

  async getInventory(category?: 'Fertilizer' | 'Pesticide', status?: string, search?: string): Promise<InventoryItem[]> {
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (status) params.status = status;
      if (search) params.search = search;

      const res = await axios.get(`${API_BASE}/api/inventory`, {
        params,
        headers: getAuthHeaders(),
        timeout: 5000
      });
      if (res.data && res.data.success) {
        return res.data.items;
      }
    } catch (e) {
      console.warn('Backend inventory fetch fallback to localStorage:', e);
    }

    let items = this.getLocalItems();
    if (category) items = items.filter(i => i.category === category);
    if (status) items = items.filter(i => i.status === status);
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

    return items;
  },

  async addItem(item: Omit<InventoryItem, '_id' | 'status'>): Promise<InventoryItem> {
    const qty = Number(item.quantity) || 0;
    const status = calcStatus(qty, item.expiry_date);

    try {
      const res = await axios.post(`${API_BASE}/api/inventory`, item, {
        headers: getAuthHeaders(),
        timeout: 5000
      });
      if (res.data && res.data.success) {
        return res.data.item;
      }
    } catch (e) {
      console.warn('Backend inventory add fallback:', e);
    }

    const newItem: InventoryItem = {
      _id: 'item_' + Date.now(),
      ...item,
      quantity: qty,
      status
    };

    const current = this.getLocalItems();
    current.unshift(newItem);
    this.setLocalItems(current);

    return newItem;
  },

  async updateItem(id: string, updateData: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const res = await axios.put(`${API_BASE}/api/inventory/${id}`, updateData, {
        headers: getAuthHeaders(),
        timeout: 5000
      });
      if (res.data && res.data.success) {
        return res.data.item;
      }
    } catch (e) {
      console.warn('Backend inventory update fallback:', e);
    }

    const current = this.getLocalItems();
    const idx = current.findIndex(i => i._id === id);
    if (idx !== -1) {
      const newQty = updateData.quantity !== undefined ? Number(updateData.quantity) : current[idx].quantity;
      const newExp = updateData.expiry_date || current[idx].expiry_date;
      current[idx] = {
        ...current[idx],
        ...updateData,
        quantity: newQty,
        status: calcStatus(newQty, newExp)
      };
      this.setLocalItems(current);
      return current[idx];
    }

    throw new Error('Item not found');
  },

  async deleteItem(id: string): Promise<boolean> {
    try {
      const res = await axios.delete(`${API_BASE}/api/inventory/${id}`, {
        headers: getAuthHeaders(),
        timeout: 5000
      });
      if (res.data && res.data.success) {
        return true;
      }
    } catch (e) {
      console.warn('Backend inventory delete fallback:', e);
    }

    const current = this.getLocalItems();
    const updated = current.filter(i => i._id !== id);
    this.setLocalItems(updated);

    return true;
  },

  async recordApplication(payload: {
    product_id: string;
    crop: string;
    field?: string;
    quantity_used: number;
    target_nutrient_or_pest?: string;
    notes?: string;
  }): Promise<{ updatedItem: InventoryItem; log: ApplicationLog }> {
    try {
      const res = await axios.post(`${API_BASE}/api/inventory/apply`, payload, {
        headers: getAuthHeaders(),
        timeout: 5000
      });
      if (res.data && res.data.success) {
        return { updatedItem: res.data.updatedItem, log: res.data.log };
      }
    } catch (e) {
      console.warn('Backend record application fallback:', e);
    }

    const items = this.getLocalItems();
    const idx = items.findIndex(i => i._id === payload.product_id);

    if (idx === -1) {
      throw new Error('Product not found in inventory');
    }

    const used = Number(payload.quantity_used);
    if (isNaN(used) || used <= 0) {
      throw new Error('Quantity used must be a positive number greater than 0.');
    }

    if (items[idx].quantity < used) {
      throw new Error(`Insufficient stock: requested ${used} ${items[idx].unit || 'units'}, but only ${items[idx].quantity} remaining.`);
    }

    const newQty = items[idx].quantity - used;
    const newStatus = calcStatus(newQty, items[idx].expiry_date);

    items[idx].quantity = newQty;
    items[idx].status = newStatus;
    this.setLocalItems(items);

    const logs = this.getLocalLogs();
    const newLog: ApplicationLog = {
      _id: 'log_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      crop: payload.crop,
      field: payload.field || 'Main Registered Field',
      product_id: payload.product_id,
      product_name: items[idx].name,
      category: items[idx].category,
      quantity_used: used,
      unit: items[idx].unit,
      target_nutrient_or_pest: payload.target_nutrient_or_pest || 'Field Application',
      notes: payload.notes || ''
    };

    logs.unshift(newLog);
    this.setLocalLogs(logs);

    return { updatedItem: items[idx], log: newLog };
  },

  async getApplicationLogs(): Promise<ApplicationLog[]> {
    try {
      const res = await axios.get(`${API_BASE}/api/inventory/logs`, {
        headers: getAuthHeaders(),
        timeout: 5000
      });
      if (res.data && res.data.success) {
        return res.data.logs;
      }
    } catch (e) {
      console.warn('Backend logs fetch fallback to localStorage:', e);
    }

    return this.getLocalLogs();
  }
};
