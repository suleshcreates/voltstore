import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useStore = create((set, get) => ({
  // Initialization & Realtime
  isInitialized: false,
  initStore: async () => {
    if (get().isInitialized) return;
    await get().fetchProducts();
    await get().fetchAlerts();
    await get().fetchReorderThresholds();
    await get().fetchNotificationSettings();
    await get().fetchTodayStats();
    get().initRealtime();
    set({ isInitialized: true });
  },
  initRealtime: () => {
    supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        get().fetchProducts();
        get().fetchTodayStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        get().fetchAlerts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        get().fetchTodayStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reorder_thresholds' }, () => {
        get().fetchReorderThresholds();
      })
      .subscribe();
  },

  // Products / Inventory
  products: [],
  isLoadingProducts: true,
  fetchProducts: async () => {
    set({ isLoadingProducts: true });
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (data) {
      const mapped = data.map(p => {
        const stock = Number(p.current_stock);
        const reorderAt = Number(p.reorder_point);
        let status = 'healthy';
        if (stock <= reorderAt) status = 'critical';
        else if (stock <= reorderAt * 1.5) status = 'warning';

        return {
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          stock,
          unit: p.unit === 'meters' ? 'm' : (p.unit === 'pcs' ? 'units' : p.unit),
          reorderAt,
          price: Number(p.sell_price),
          priceUnit: p.unit === 'meters' ? '/m' : '',
          status,
          raw: p,
        };
      });
      set({ products: mapped, isLoadingProducts: false });
    } else {
      set({ isLoadingProducts: false });
      console.error('Error fetching products', error);
    }
  },

  updateProductStock: async (id, newStock) => {
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, stock: newStock } : p
      ),
    }));
    await supabase.from('products').update({ current_stock: newStock }).eq('id', id);
  },

  // Dashboard Stats (computed from DB)
  todayStats: { sales: 0, lowStockCount: 0, stockValue: 0, topSeller: null },
  topSellersWeek: [],
  fetchTodayStats: async () => {
    const products = get().products;
    const lowStockCount = products.filter(p => p.status === 'critical').length;
    const stockValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

    // Get today's sales from sales table
    const today = new Date().toISOString().split('T')[0];
    const { data: salesData } = await supabase
      .from('sales')
      .select('total, sold_at')
      .gte('sold_at', today + 'T00:00:00')
      .lte('sold_at', today + 'T23:59:59');

    const todaySales = salesData ? salesData.reduce((sum, s) => sum + Number(s.total), 0) : 0;

    // Get top sellers from sale_items joined with products
    const { data: topData } = await supabase
      .from('sale_items')
      .select('quantity, total, product_id, products(name, brand)')
      .order('total', { ascending: false })
      .limit(10);

    const sellerMap = {};
    if (topData) {
      topData.forEach(item => {
        const pid = item.product_id;
        if (!sellerMap[pid]) {
          sellerMap[pid] = {
            name: item.products?.name || 'Unknown',
            brand: item.products?.brand || '',
            units: 0,
            revenue: 0,
          };
        }
        sellerMap[pid].units += Number(item.quantity);
        sellerMap[pid].revenue += Number(item.total);
      });
    }

    const topSellers = Object.values(sellerMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((s, i) => ({ rank: i + 1, ...s }));

    const topSeller = topSellers.length > 0 ? topSellers[0] : { name: '-', brand: '-', revenue: 0, units: 0 };

    set({
      todayStats: { sales: todaySales, lowStockCount, stockValue, topSeller },
      topSellersWeek: topSellers,
    });
  },

  // Alerts
  alerts: [],
  alertCount: 0,
  fetchAlerts: async () => {
    const { data } = await supabase.from('alerts').select('*').eq('is_resolved', false).order('created_at', { ascending: false });
    if (data) {
      const mapped = data.map(a => ({
        id: a.id,
        type: a.type === 'shortage' ? 'critical' : a.type === 'anomaly' ? 'anomaly' : a.type === 'hot_item' ? 'hot' : 'forecast',
        icon: a.type === 'shortage' ? '⚠️' : a.type === 'anomaly' ? '🔍' : a.type === 'hot_item' ? '🔥' : '📊',
        badge: a.severity.toUpperCase(),
        title: a.title,
        body: a.message,
        action: a.action_label || 'View',
        time: getTimeAgo(a.created_at),
      }));
      set({ alerts: mapped, alertCount: mapped.length });
    }
  },

  dismissAlert: async (id) => {
    set((state) => {
      const filtered = state.alerts.filter((a) => a.id !== id);
      return { alerts: filtered, alertCount: filtered.length };
    });
    await supabase.from('alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
  },

  // Cart / Sales
  cart: [],
  addToCart: (product, qty = 1) =>
    set((state) => {
      const existing = state.cart.find((c) => c.id === product.id);
      if (existing) {
        return { cart: state.cart.map((c) => c.id === product.id ? { ...c, qty: c.qty + qty } : c) };
      }
      return { cart: [...state.cart, { ...product, qty }] };
    }),
  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((c) => c.id !== id) })),
  updateCartQty: (id, qty) => set((state) => ({ cart: state.cart.map((c) => (c.id === id ? { ...c, qty } : c)) })),
  clearCart: () => set({ cart: [] }),
  getCartTotal: () => get().cart.reduce((sum, c) => sum + c.price * c.qty, 0),
  completeSale: async (customerPhone) => {
    const { cart, getCartTotal } = get();
    if (cart.length === 0) return;
    set({ cart: [] });

    const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
    if (!tenant) return;

    const total = getCartTotal();
    const { data: sale } = await supabase.from('sales').insert({
      tenant_id: tenant.id, customer_phone: customerPhone, total, subtotal: total,
    }).select().single();

    if (sale) {
      const items = cart.map(c => ({
        sale_id: sale.id, product_id: c.id, quantity: c.qty, unit_price: c.price, total: c.price * c.qty,
      }));
      await supabase.from('sale_items').insert(items);
      for (const c of cart) {
        const { data: p } = await supabase.from('products').select('current_stock').eq('id', c.id).single();
        if (p) await supabase.from('products').update({ current_stock: Number(p.current_stock) - c.qty }).eq('id', c.id);
      }
      get().fetchTodayStats();
    }
  },

  // Chat
  messages: [
    { id: 1, role: 'ai', text: 'Hey! I\'m your AI inventory assistant. Ask me about stock levels, sales trends, or reorder suggestions.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ],
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  isAiTyping: false,
  setAiTyping: (v) => set({ isAiTyping: v }),

  // AI Whisper
  whisperMessages: {
    inventory: '4mm wire velocity up 340% today',
    sales: 'AI updated forecast · MCB 16A demand +12% this week',
    reports: 'Forecast accuracy: 94% this week',
    dashboard: 'Watching products · alerts active',
  },

  // Settings — Notification toggles (from DB)
  whatsappEnabled: true,
  smsEnabled: false,
  emailEnabled: true,
  fetchNotificationSettings: async () => {
    const { data } = await supabase.from('notification_settings').select('*').limit(1).single();
    if (data) {
      set({
        whatsappEnabled: data.whatsapp_alerts,
        smsEnabled: data.sms_alerts,
        emailEnabled: data.email_reports,
      });
    }
  },
  toggleWhatsapp: async () => {
    const next = !get().whatsappEnabled;
    set({ whatsappEnabled: next });
    await supabase.from('notification_settings').update({ whatsapp_alerts: next }).neq('id', '00000000-0000-0000-0000-000000000000');
  },
  toggleSms: async () => {
    const next = !get().smsEnabled;
    set({ smsEnabled: next });
    await supabase.from('notification_settings').update({ sms_alerts: next }).neq('id', '00000000-0000-0000-0000-000000000000');
  },
  toggleEmail: async () => {
    const next = !get().emailEnabled;
    set({ emailEnabled: next });
    await supabase.from('notification_settings').update({ email_reports: next }).neq('id', '00000000-0000-0000-0000-000000000000');
  },

  // Reorder Thresholds (from DB)
  reorderThresholds: [],
  fetchReorderThresholds: async () => {
    const { data } = await supabase.from('reorder_thresholds').select('*').order('category');
    if (data) {
      set({
        reorderThresholds: data.map(t => ({
          id: t.id,
          category: t.category,
          threshold: Number(t.threshold),
          unit: t.unit === 'meters' ? 'm' : (t.unit === 'pcs' ? 'units' : t.unit),
        })),
      });
    }
  },
  updateThreshold: async (id, newVal) => {
    set((state) => ({
      reorderThresholds: state.reorderThresholds.map(t => t.id === id ? { ...t, threshold: newVal } : t),
    }));
    await supabase.from('reorder_thresholds').update({ threshold: newVal }).eq('id', id);
  },

  // Tenant info (for Settings)
  tenant: null,
  fetchTenant: async () => {
    const { data } = await supabase.from('tenants').select('*').limit(1).single();
    if (data) set({ tenant: data });
  },
}));

// Helper
function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? 's' : ''} ago`;
}

export default useStore;
