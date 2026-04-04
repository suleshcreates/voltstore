import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Plus, X, Loader2, CheckCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { supabase } from '../../lib/supabase';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli',
  'Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const CATEGORIES = ['Circuit Breakers', 'Wires', 'Lighting', 'Switches', 'Fans', 'Accessories', 'Panels', 'Other'];

const SHOP_TYPES = [
  { value: 'retail', icon: '🏪', label: 'Retail' },
  { value: 'wholesale', icon: '🏭', label: 'Wholesale' },
  { value: 'both', icon: '🔄', label: 'Both' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const session = useAuthStore((s) => s.session);
  const loadTenant = useAuthStore((s) => s.loadTenant);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1 state
  const [shopForm, setShopForm] = useState({
    shopName: '', shopType: 'retail', city: '', state: 'Maharashtra',
    whatsapp: '', gstNumber: '',
  });

  // Step 2 state
  const [selectedCategory, setSelectedCategory] = useState('Circuit Breakers');
  const [productForm, setProductForm] = useState({
    name: '', brand: '', category: 'Circuit Breakers',
    current_stock: '', unit: 'pcs', sell_price: '', cost_price: '',
  });
  const [products, setProducts] = useState([]);

  // Step 3 computed
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Resume from saved step
  useEffect(() => {
    if (tenant?.onboarding_step >= 1) setStep(Math.min(tenant.onboarding_step + 1, 3));
  }, [tenant]);

  // ─── STEP 1: Save shop details ──────────────────────────────────
  const handleSaveShop = async () => {
    if (!shopForm.shopName || !shopForm.city || !shopForm.state || !shopForm.whatsapp) {
      setError('Please fill all required fields');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          shopName: shopForm.shopName,
          ownerName: user?.user_metadata?.owner_name || user?.user_metadata?.name || '',
          phone: shopForm.whatsapp,
          whatsapp: shopForm.whatsapp,
          city: shopForm.city,
          state: shopForm.state,
          shopType: shopForm.shopType,
          gstNumber: shopForm.gstNumber,
          onboardingStep: 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      if (user) await loadTenant(user);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── STEP 2: Add products ──────────────────────────────────────
  const addProduct = () => {
    if (!productForm.name || !productForm.sell_price || !productForm.current_stock) {
      setError('Name, stock and selling price are required');
      return;
    }
    setError('');
    setProducts([...products, { ...productForm, id: Date.now() }]);
    setProductForm({ name: '', brand: '', category: selectedCategory, current_stock: '', unit: 'pcs', sell_price: '', cost_price: '' });
  };

  const handleSaveProducts = async () => {
    if (products.length === 0) {
      setError('Add at least 1 product');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      // Get tenant id
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('auth_id', user.id).maybeSingle();
      if (!userData) throw new Error('User profile not found');

      const items = products.map((p) => ({
        tenant_id: userData.tenant_id,
        name: p.name,
        brand: p.brand || null,
        category: p.category,
        unit: p.unit,
        current_stock: parseFloat(p.current_stock) || 0,
        sell_price: parseFloat(p.sell_price) || 0,
        cost_price: parseFloat(p.cost_price) || 0,
      }));
      const { error: insertErr } = await supabase.from('products').insert(items);
      if (insertErr) throw insertErr;

      // Update onboarding step
      await supabase.from('tenants').update({ onboarding_step: 2 }).eq('id', userData.tenant_id);
      if (user) await loadTenant(user);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipProducts = async () => {
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('auth_id', user.id).maybeSingle();
      if (userData) await supabase.from('tenants').update({ onboarding_step: 2 }).eq('id', userData.tenant_id);
      if (user) await loadTenant(user);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── STEP 3: Finish ──────────────────────────────────────
  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('auth_id', user.id).maybeSingle();
      if (userData) {
        await supabase.from('tenants').update({ onboarding_completed: true, onboarding_step: 3 }).eq('id', userData.tenant_id);
      }
      if (user) await loadTenant(user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabels = ['Shop details', 'Products', 'Done'];

  return (
    <div className="auth-page">
      <div className="onboarding-container">
        {/* Logo */}
        <div className="auth-logo" style={{ marginBottom: 24 }}>
          <Zap size={28} className="text-amber" />
          <span>VoltStore</span>
        </div>

        {/* Progress */}
        <div className="onboarding-progress">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const completed = step > n;
            const active = step === n;
            return (
              <div key={n} className="onboarding-step-indicator">
                <div className={`step-dot ${completed ? 'completed' : active ? 'active' : ''}`}>
                  {completed ? <CheckCircle size={16} /> : n}
                </div>
                <span className={`step-label ${active ? 'active' : ''}`}>{label}</span>
                {i < 2 && <div className={`step-line ${completed ? 'completed' : ''}`} />}
              </div>
            );
          })}
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* ── Step 1: Shop Details ── */}
        {step === 1 && (
          <div className="onboarding-step-content slide-in">
            <h2 className="onboarding-heading">Tell us about your shop</h2>
            <p className="onboarding-sub">This helps us customize VoltStore for your business.</p>

            <div className="form-group">
              <label className="form-label">Shop name *</label>
              <input className="input" placeholder="e.g. Raju Electricals"
                value={shopForm.shopName} onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Shop type *</label>
              <div className="shop-type-cards">
                {SHOP_TYPES.map((t) => (
                  <button key={t.value} type="button"
                    className={`shop-type-card ${shopForm.shopType === t.value ? 'selected' : ''}`}
                    onClick={() => setShopForm({ ...shopForm, shopType: t.value })}>
                    <span className="shop-type-icon">{t.icon}</span>
                    <span className="shop-type-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">City *</label>
                <input className="input" placeholder="e.g. Nagpur"
                  value={shopForm.city} onChange={(e) => setShopForm({ ...shopForm, city: e.target.value })} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">State *</label>
                <select className="input" value={shopForm.state} onChange={(e) => setShopForm({ ...shopForm, state: e.target.value })}>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp number *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="input" style={{ width: 60, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a7a8a' }}>+91</span>
                <input className="input" placeholder="98765 43210" style={{ flex: 1 }}
                  value={shopForm.whatsapp} onChange={(e) => setShopForm({ ...shopForm, whatsapp: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">GST Number (optional)</label>
              <input className="input" placeholder="e.g. 29ABCDE1234F1ZH"
                value={shopForm.gstNumber} onChange={(e) => setShopForm({ ...shopForm, gstNumber: e.target.value })} />
            </div>

            <button className="btn btn-primary btn-large" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              onClick={handleSaveShop} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={18} className="spin" /> Saving…</> : 'Next →'}
            </button>
          </div>
        )}

        {/* ── Step 2: Products ── */}
        {step === 2 && (
          <div className="onboarding-step-content slide-in">
            <h2 className="onboarding-heading">What do you stock?</h2>
            <p className="onboarding-sub">Add a few products to get started. You can add more later.</p>

            {/* Category chips */}
            <div className="category-chips" style={{ marginBottom: 16 }}>
              {CATEGORIES.map((cat) => (
                <button key={cat} type="button"
                  className={`category-chip ${selectedCategory === cat ? 'selected' : ''}`}
                  onClick={() => { setSelectedCategory(cat); setProductForm({ ...productForm, category: cat }); }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Inline product form */}
            <div className="product-add-form">
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Product name *</label>
                  <input className="input" placeholder="e.g. 32A MCB" value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Brand</label>
                  <input className="input" placeholder="e.g. Havells" value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Opening stock *</label>
                  <input className="input" type="number" placeholder="0" value={productForm.current_stock}
                    onChange={(e) => setProductForm({ ...productForm, current_stock: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Unit</label>
                  <select className="input" value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}>
                    <option value="pcs">pcs</option>
                    <option value="meters">meters</option>
                    <option value="rolls">rolls</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Selling price ₹ *</label>
                  <input className="input" type="number" placeholder="0" value={productForm.sell_price}
                    onChange={(e) => setProductForm({ ...productForm, sell_price: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Cost price ₹</label>
                  <input className="input" type="number" placeholder="0" value={productForm.cost_price}
                    onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })} />
                </div>
              </div>
              <button type="button" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={addProduct}>
                <Plus size={16} /> Add product
              </button>
            </div>

            {/* Product list */}
            {products.length > 0 && (
              <div className="onboarding-product-list">
                {products.map((p, i) => (
                  <div key={p.id} className="onboarding-product-row product-slide-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: '0.88rem' }}>{p.name}</span>
                      {p.brand && <span style={{ color: '#7a7a8a', fontSize: '0.78rem', marginLeft: 8 }}>{p.brand}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '0.82rem', color: '#7a7a8a' }}>{p.current_stock} {p.unit}</span>
                      <span style={{ fontSize: '0.82rem', color: '#F5A623', fontWeight: 500 }}>₹{p.sell_price}</span>
                      <button className="btn btn-ghost" onClick={() => setProducts(products.filter((_, j) => j !== i))}>
                        <X size={14} style={{ color: '#F0595A' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary btn-large" style={{ flex: 2, justifyContent: 'center' }}
                  onClick={handleSaveProducts} disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 size={18} className="spin" /> Saving…</> : `Next → (${products.length} product${products.length !== 1 ? 's' : ''})`}
                </button>
              </div>
              <button className="btn-text-muted" onClick={handleSkipProducts} disabled={isSubmitting}>
                Skip for now →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="onboarding-step-content">
            <h2 className="onboarding-heading" style={{ fontSize: '1.6rem' }}>VoltStore is ready for you</h2>
            <p className="onboarding-sub">Here's what we've set up:</p>

            <div className="confirmation-cards">
              <div className="confirmation-card fade-in-up" style={{ animationDelay: '0ms' }}>
                <CheckCircle size={20} style={{ color: '#2DD4A0', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.92rem' }}>
                    {tenant?.shop_name || shopForm.shopName || 'Your Shop'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#7a7a8a' }}>
                    {tenant?.city || shopForm.city}, {tenant?.state || shopForm.state}
                  </div>
                </div>
              </div>

              <div className="confirmation-card fade-in-up" style={{ animationDelay: '100ms' }}>
                <CheckCircle size={20} style={{ color: '#2DD4A0', flexShrink: 0 }} />
                <span style={{ fontWeight: 500, fontSize: '0.92rem' }}>
                  {products.length} product{products.length !== 1 ? 's' : ''} added
                </span>
              </div>

              <div className="confirmation-card fade-in-up" style={{ animationDelay: '200ms' }}>
                <CheckCircle size={20} style={{ color: '#2DD4A0', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.92rem' }}>14-day free trial active</div>
                  <div style={{ fontSize: '0.78rem', color: '#7a7a8a' }}>Ends {trialEnd}</div>
                </div>
              </div>
            </div>

            {/* WhatsApp alerts toggle */}
            <div className="whatsapp-toggle-card">
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>WhatsApp alerts</div>
                <div style={{ fontSize: '0.78rem', color: '#7a7a8a' }}>Get low stock & anomaly alerts</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#7a7a8a' }}>
                +91 {tenant?.whatsapp || shopForm.whatsapp}
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2DD4A0' }} />
              </div>
            </div>

            <button className="btn btn-primary btn-large cta-pulse" style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}
              onClick={handleFinish} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={18} className="spin" /> Launching…</> : 'Go to Dashboard →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
