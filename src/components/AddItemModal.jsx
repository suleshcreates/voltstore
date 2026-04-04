import { useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

const CATEGORIES = [
  'Circuit Breakers', 'Wires', 'Lighting', 'Switches',
  'Accessories', 'Panels', 'Fans', 'Tools', 'Other'
];
const UNITS = ['pcs', 'meters', 'boxes', 'rolls', 'sets', 'pairs'];

const empty = {
  name: '', brand: '', category: 'Circuit Breakers',
  unit: 'pcs', current_stock: '',
  cost_price: '', sell_price: '', min_sell_price: '', sku: '',
};

export default function AddItemModal({ onClose, onSaved }) {
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (!form.name.trim()) return setError('Item name is required');
      if (!form.sell_price) return setError('Selling price is required');
      if (!form.current_stock && form.current_stock !== 0 && form.current_stock !== '0')
        return setError('Opening stock is required');

      setLoading(true);

      // Get tenant ID
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', user?.id)
        .single();

      if (userErr || !userData?.tenant_id) {
        setLoading(false);
        return setError(userErr?.message || 'Could not find shop profile');
      }

      const { error: err } = await supabase.from('products').insert({
        tenant_id: userData.tenant_id,
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        category: form.category,
        unit: form.unit,
        current_stock: parseFloat(form.current_stock) || 0,
        reorder_point: 0, // removed from UI per user request
        cost_price: parseFloat(form.cost_price) || 0,
        sell_price: parseFloat(form.sell_price) || 0,
        min_sell_price: form.min_sell_price ? parseFloat(form.min_sell_price) : null,
        sku: form.sku.trim() || null,
      });

      if (err) throw err;

      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.title}>Add new item</div>
            <div style={s.sub}>Fill in the details below</div>
          </div>
          <button type="button" style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} style={s.form}>

          {/* Name + Brand */}
          <div style={s.row}>
            <Field label="Item name *" name="name" value={form.name}
              onChange={handle} placeholder="e.g. MCB 32A" />
            <Field label="Brand" name="brand" value={form.brand}
              onChange={handle} placeholder="e.g. Havells" />
          </div>

          {/* Category + Unit */}
          <div style={s.row}>
            <SelectField label="Category *" name="category"
              value={form.category} onChange={handle} options={CATEGORIES} />
            <SelectField label="Unit *" name="unit"
              value={form.unit} onChange={handle} options={UNITS} />
          </div>

          {/* Stock */}
          <div style={s.row}>
            <Field label="Opening stock *" name="current_stock" type="number"
              value={form.current_stock} onChange={handle} placeholder="0" />
          </div>

          {/* Prices */}
          <div style={s.row}>
            <Field label="Cost price (₹)" name="cost_price" type="number"
              value={form.cost_price} onChange={handle} placeholder="0" />
            <Field label="Selling price (₹) *" name="sell_price" type="number"
              value={form.sell_price} onChange={handle} placeholder="0" />
          </div>

          {/* Min price + SKU */}
          <div style={s.row}>
            <Field label="Minimum price (₹)" name="min_sell_price" type="number"
              value={form.min_sell_price} onChange={handle} placeholder="Optional" />
            <Field label="SKU / Product code" name="sku"
              value={form.sku} onChange={handle} placeholder="e.g. HVL-MCB-32A" />
          </div>

          {error && <div style={s.error}>{error}</div>}

          {/* Actions */}
          <div style={s.actions}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" style={s.saveBtn} disabled={loading}>
              {loading ? 'Saving...' : 'Add item →'}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

// ── Reusable field components ──────────────────────────────────────────────

function Field({ label, name, value, onChange, type = 'text', placeholder }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={s.label}>{label}</label>
      <input
        style={s.input} type={type} name={name}
        value={value} onChange={onChange} placeholder={placeholder}
        step={type === 'number' ? 'any' : undefined}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={s.label}>{label}</label>
      <select style={s.select} name={name} value={value} onChange={onChange}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
  },
  modal: {
    background: '#16161D',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    width: '100%', maxWidth: '560px',
    maxHeight: '90vh', overflowY: 'auto',
    animation: 'slideUp 0.2s ease',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '24px 24px 0',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '20px', fontWeight: 600, color: '#F0EDE8',
  },
  sub: { fontSize: '13px', color: 'var(--muted)', marginTop: '3px' },
  closeBtn: {
    background: 'none', border: 'none', color: 'var(--muted)',
    fontSize: '18px', cursor: 'pointer', padding: '4px',
  },
  form: {
    padding: '20px 24px 24px',
    display: 'flex', flexDirection: 'column', gap: '14px',
  },
  row: { display: 'flex', gap: '14px' },
  label: {
    display: 'block', fontSize: '11px', color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '5px',
  },
  input: {
    width: '100%', background: 'var(--black-2)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', padding: '10px 12px',
    color: '#F0EDE8', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%', background: 'var(--black-2)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', padding: '10px 12px',
    color: '#F0EDE8', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', cursor: 'pointer',
  },
  error: {
    color: 'var(--critical)', fontSize: '13px',
    background: 'rgba(229,57,53,0.08)',
    padding: '10px 14px', borderRadius: '8px',
  },
  actions: {
    display: 'flex', gap: '10px', justifyContent: 'flex-end',
    marginTop: '6px',
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'none',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', color: 'var(--muted)',
    fontSize: '14px', cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 24px',
    background: 'var(--anchor)', border: 'none',
    borderRadius: '8px', color: 'var(--black-1)',
    fontSize: '14px', fontWeight: 600,
    cursor: 'pointer',
  },
};
