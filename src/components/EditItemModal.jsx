import { useState } from 'react';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  'Circuit Breakers', 'Wires', 'Lighting', 'Switches',
  'Accessories', 'Panels', 'Fans', 'Tools', 'Other'
];
const UNITS = ['pcs', 'meters', 'boxes', 'rolls', 'sets', 'pairs'];

export default function EditItemModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:          product.name          ?? '',
    brand:         product.brand         ?? '',
    category:      product.category      ?? 'Circuit Breakers',
    unit:          product.unit          ?? 'pcs',
    current_stock: product.current_stock ?? '',
    cost_price:    product.cost_price    ?? '',
    sell_price:    product.sell_price    ?? '',
    sku:           product.sku           ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: err } = await supabase
        .from('products')
        .update({
          name:          form.name.trim(),
          brand:         form.brand.trim() || null,
          category:      form.category,
          unit:          form.unit,
          current_stock: parseFloat(form.current_stock) || 0,
          cost_price:    parseFloat(form.cost_price)    || 0,
          sell_price:    parseFloat(form.sell_price)    || 0,
          sku:           form.sku.trim() || null,
        })
        .eq('id', product.id);

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

  const archive = async () => {
    if (!window.confirm(`Archive "${product.name}"? It won't appear in inventory.`)) return;
    await supabase.from('products').update({ is_active: false }).eq('id', product.id);
    onSaved?.();
    onClose();
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={header}>
          <div>
            <div style={title}>Edit item</div>
            <div style={sub}>{product.name}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button style={archiveBtn} onClick={archive} type="button">Archive</button>
            <button type="button" style={closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <form onSubmit={submit} style={form_}>
          <div style={row}>
            <Field label="Item name *" name="name" value={form.name} onChange={handle} />
            <Field label="Brand" name="brand" value={form.brand} onChange={handle} placeholder="e.g. Havells" />
          </div>
          <div style={row}>
            <SelectField label="Category" name="category" value={form.category} onChange={handle} options={CATEGORIES} />
            <SelectField label="Unit" name="unit" value={form.unit} onChange={handle} options={UNITS} />
          </div>
          <div style={row}>
            <Field label="Current stock" name="current_stock" type="number" value={form.current_stock} onChange={handle} />
          </div>
          <div style={row}>
            <Field label="Cost price (₹)" name="cost_price" type="number" value={form.cost_price} onChange={handle} />
            <Field label="Selling price (₹)" name="sell_price" type="number" value={form.sell_price} onChange={handle} />
          </div>
          <Field label="SKU (optional)" name="sku" value={form.sku} onChange={handle} placeholder="e.g. HVL-MCB-32A" />

          {error && <div style={errorBox}>{error}</div>}

          <div style={actions}>
            <button type="button" style={cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={saveBtn} disabled={loading}>
              {loading ? 'Saving...' : 'Save changes →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} type={type} name={name} value={value}
        onChange={onChange} placeholder={placeholder} step={type === 'number' ? 'any' : undefined} />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      <select style={selectStyle} name={name} value={value} onChange={onChange}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const overlay  = { position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px' };
const modal    = { background:'#16161D',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'16px',width:'100%',maxWidth:'560px',maxHeight:'90vh',overflowY:'auto', animation: 'slideUp 0.2s ease' };
const header   = { display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'24px 24px 0' };
const title    = { fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:600,color:'#F0EDE8' };
const sub      = { fontSize:'13px',color:'var(--muted)',marginTop:'3px' };
const closeBtn = { background:'none',border:'none',color:'var(--muted)',fontSize:'18px',cursor:'pointer', padding: '4px' };
const archiveBtn = { background:'none',border:'1px solid rgba(229,57,53,0.3)',borderRadius:'6px',color:'var(--critical)',fontSize:'12px',padding:'5px 12px',cursor:'pointer' };
const form_    = { padding:'20px 24px 24px',display:'flex',flexDirection:'column',gap:'14px' };
const row      = { display:'flex',gap:'14px' };
const labelStyle  = { display:'block',fontSize:'11px',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'5px' };
const inputStyle  = { width:'100%',background:'var(--black-2)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'10px 12px',color:'#F0EDE8',fontSize:'14px',outline:'none',boxSizing:'border-box' };
const selectStyle = { ...inputStyle, cursor:'pointer' };
const errorBox = { color:'var(--critical)',fontSize:'13px',background:'rgba(229,57,53,0.08)',padding:'10px 14px',borderRadius:'8px' };
const actions  = { display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'6px' };
const cancelBtn = { padding:'10px 20px',background:'none',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',color:'var(--muted)',fontSize:'14px',cursor:'pointer' };
const saveBtn  = { padding:'10px 24px',background:'var(--anchor)',border:'none',borderRadius:'8px',color:'var(--black-1)',fontSize:'14px',fontWeight:600,cursor:'pointer' };
