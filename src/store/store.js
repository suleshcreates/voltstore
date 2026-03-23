import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { chatMessages as initialChatMessages } from '../data/mockData';

const useStore = create((set, get) => ({
  // Initialization & Realtime
  isInitialized: false,
  initStore: async () => {
    if (get().isInitialized) return;
    await get().fetchProducts();
    await get().fetchAlerts();
    get().initRealtime();
    set({ isInitialized: true });
  },
  initRealtime: () => {
    supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        get().fetchProducts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        get().fetchAlerts();
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
        if (stock <= reorderAt) {
          status = 'critical';
        } else if (stock <= reorderAt * 1.5) {
          status = 'warning';
        }
        
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
        };
      });
      set({ products: mapped, isLoadingProducts: false });
    } else {
      set({ isLoadingProducts: false });
      console.error('Error fetching products', error);
    }
  },

  updateProductStock: async (id, newStock) => {
    // Optimistic update
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, stock: newStock } : p
      ),
    }));
    await supabase.from('products').update({ current_stock: newStock }).eq('id', id);
  },

  // Alerts
  alerts: [],
  alertCount: 0,
  fetchAlerts: async () => {
    const { data, error } = await supabase.from('alerts').select('*').eq('is_resolved', false).order('created_at', { ascending: false });
    if (data) {
      const mapped = data.map(a => ({
        id: a.id,
        type: a.type === 'shortage' ? 'critical' : a.type === 'anomaly' ? 'anomaly' : a.type === 'hot_item' ? 'hot' : 'forecast',
        icon: a.type === 'shortage' ? '⚠️' : a.type === 'anomaly' ? '🔍' : a.type === 'hot_item' ? '🔥' : '📊',
        badge: a.severity.toUpperCase(),
        title: a.title,
        body: a.message,
        action: a.action_label || 'View',
        time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      set({ alerts: mapped, alertCount: mapped.length });
    }
  },
  
  dismissAlert: async (id) => {
    // Optimistic update
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
        return {
          cart: state.cart.map((c) =>
            c.id === product.id ? { ...c, qty: c.qty + qty } : c
          ),
        };
      }
      return { cart: [...state.cart, { ...product, qty }] };
    }),
  removeFromCart: (id) =>
    set((state) => ({ cart: state.cart.filter((c) => c.id !== id) })),
  updateCartQty: (id, qty) =>
    set((state) => ({
      cart: state.cart.map((c) => (c.id === id ? { ...c, qty } : c)),
    })),
  clearCart: () => set({ cart: [] }),
  getCartTotal: () => get().cart.reduce((sum, c) => sum + c.price * c.qty, 0),
  completeSale: async (customerPhone) => {
    const { cart, getCartTotal } = get();
    if (cart.length === 0) return;
    
    // Clear cart immediately for UI responsiveness
    set({ cart: [] });

    const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
    if (!tenant) return;

    const total = getCartTotal();
    const { data: sale } = await supabase.from('sales').insert({
      tenant_id: tenant.id,
      customer_phone: customerPhone,
      total: total,
      subtotal: total
    }).select().single();

    if (sale) {
      const items = cart.map(c => ({
        sale_id: sale.id,
        product_id: c.id,
        quantity: c.qty,
        unit_price: c.price,
        total: c.price * c.qty
      }));
      await supabase.from('sale_items').insert(items);

      // Decrement stock in products
      for (const c of cart) {
        const { data: p } = await supabase.from('products').select('current_stock').eq('id', c.id).single();
        if (p) {
          await supabase.from('products').update({ current_stock: Number(p.current_stock) - c.qty }).eq('id', c.id);
        }
      }
    }
  },

  // Chat
  messages: initialChatMessages,
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  isAiTyping: false,
  setAiTyping: (v) => set({ isAiTyping: v }),

  // AI Whisper
  whisperMessages: {
    inventory: '4mm wire velocity up 340% today',
    sales: 'AI updated forecast · MCB 16A demand +12% this week',
    reports: 'Forecast accuracy: 94% this week',
    dashboard: 'Watching 11 products · 4 alerts active',
  },

  // Settings
  whatsappEnabled: true,
  smsEnabled: false,
  emailEnabled: true,
  toggleWhatsapp: () => set((s) => ({ whatsappEnabled: !s.whatsappEnabled })),
  toggleSms: () => set((s) => ({ smsEnabled: !s.smsEnabled })),
  toggleEmail: () => set((s) => ({ emailEnabled: !s.emailEnabled })),
}));

export default useStore;
