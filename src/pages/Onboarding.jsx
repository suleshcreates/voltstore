import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

const categories = ['Circuit Breakers', 'Wires', 'Lighting', 'Switches', 'Accessories', 'Panels', 'Fans'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    whatsapp: '',
    sameAsPhone: true,
    city: '',
    categories: [],
  });

  const toggleCategory = (cat) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <div className="onboarding-page">
      <form className="onboarding-card" onSubmit={handleSubmit}>
        <div className="onboarding-logo">
          <span className="text-amber"><Zap size={32} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} /></span>
          VoltStore
        </div>
        <p className="onboarding-tagline">Your shop's AI brain. Set up in 60 seconds.</p>

        <div className="form-group">
          <label className="form-label">Shop Name</label>
          <input
            className="input"
            placeholder="e.g., Raju Electricals"
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Owner Name</label>
          <input
            className="input"
            placeholder="e.g., Raju Sharma"
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="input" style={{ width: 60, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>+91</span>
            <input
              className="input"
              placeholder="98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label className="form-label" style={{ margin: 0 }}>WhatsApp Number</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
              <span style={{ color: 'var(--muted)' }}>Same as phone?</span>
              <button
                type="button"
                className={`toggle-track ${form.sameAsPhone ? 'on' : ''}`}
                onClick={() => setForm({ ...form, sameAsPhone: !form.sameAsPhone })}
              >
                <div className="toggle-thumb" />
              </button>
            </label>
          </div>
          {!form.sameAsPhone && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="input" style={{ width: 60, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>+91</span>
              <input
                className="input"
                placeholder="98765 43210"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">City</label>
          <input
            className="input"
            placeholder="e.g., Nagpur"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Product Categories</label>
          <div className="category-chips">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-chip ${form.categories.includes(cat) ? 'selected' : ''}`}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-large" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          Launch VoltStore →
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 24 }}>
          <span className="ai-whisper-dot" />
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>AI will learn your shop's patterns within 48 hours</span>
        </div>
      </form>
    </div>
  );
}
