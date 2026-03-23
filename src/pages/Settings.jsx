import { useState } from 'react';
import { UserCircle, Bell, Sliders, CreditCard, Truck, Plus } from 'lucide-react';
import useStore from '../store/store';
import { reorderThresholds, suppliers } from '../data/mockData';

export default function SettingsPage() {
  const whatsappEnabled = useStore((s) => s.whatsappEnabled);
  const smsEnabled = useStore((s) => s.smsEnabled);
  const emailEnabled = useStore((s) => s.emailEnabled);
  const toggleWhatsapp = useStore((s) => s.toggleWhatsapp);
  const toggleSms = useStore((s) => s.toggleSms);
  const toggleEmail = useStore((s) => s.toggleEmail);

  const [thresholds, setThresholds] = useState(reorderThresholds);

  const updateThreshold = (idx, val) => {
    setThresholds((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, threshold: Math.max(0, val) } : t))
    );
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Shop Profile */}
      <div className="settings-section">
        <h3><UserCircle size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Shop Profile</h3>
        <div className="form-group">
          <label className="form-label">Shop Name</label>
          <input className="input" defaultValue="Raju Electricals" />
        </div>
        <div className="form-group">
          <label className="form-label">Owner</label>
          <input className="input" defaultValue="Raju Sharma" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="input" defaultValue="+91 98765 43210" />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="input" defaultValue="Nagpur, Maharashtra" />
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 8 }}>Save Changes</button>
      </div>

      {/* Notifications */}
      <div className="settings-section">
        <h3><Bell size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Notifications</h3>

        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">📱 WhatsApp Alerts</div>
            <div className="setting-desc">Get critical alerts and daily summary on WhatsApp</div>
          </div>
          <button className={`toggle-track ${whatsappEnabled ? 'on' : ''}`} onClick={toggleWhatsapp}>
            <div className="toggle-thumb" />
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">💬 SMS Alerts</div>
            <div className="setting-desc">Receive SMS for critical stock alerts</div>
          </div>
          <button className={`toggle-track ${smsEnabled ? 'on' : ''}`} onClick={toggleSms}>
            <div className="toggle-thumb" />
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-label">📧 Email Reports</div>
            <div className="setting-desc">Weekly report delivered to your email</div>
          </div>
          <button className={`toggle-track ${emailEnabled ? 'on' : ''}`} onClick={toggleEmail}>
            <div className="toggle-thumb" />
          </button>
        </div>
      </div>

      {/* Reorder Thresholds */}
      <div className="settings-section">
        <h3><Sliders size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Reorder Thresholds</h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Threshold</th>
              <th>Unit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {thresholds.map((t, idx) => (
              <tr key={t.category}>
                <td style={{ fontWeight: 500 }}>{t.category}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => updateThreshold(idx, t.threshold - 1)}
                      style={{ padding: '4px 8px' }}
                    >−</button>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, minWidth: 30, textAlign: 'center' }}>
                      {t.threshold}
                    </span>
                    <button
                      className="btn btn-ghost"
                      onClick={() => updateThreshold(idx, t.threshold + 1)}
                      style={{ padding: '4px 8px' }}
                    >+</button>
                  </div>
                </td>
                <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{t.unit}</td>
                <td>
                  {t.aiRecommended && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 500 }}>AI Recommended</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Subscription */}
      <div className="settings-section">
        <h3><CreditCard size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Subscription</h3>
        <div className="setting-row">
          <div className="setting-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="setting-label">VoltStore Pro</span>
              <span className="tag brand">Active</span>
            </div>
            <div className="setting-desc">Renews April 22, 2026</div>
            <div className="setting-desc" style={{ marginTop: 4 }}>Unlimited products · AI alerts · WhatsApp integration · Reports</div>
          </div>
          <button className="btn btn-outline">Manage →</button>
        </div>
      </div>

      {/* Supplier Contacts */}
      <div className="settings-section">
        <h3><Truck size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Supplier Contacts</h3>
        {suppliers.map((s) => (
          <div className="setting-row" key={s.id}>
            <div className="setting-info">
              <div className="setting-label">{s.name}</div>
              <div className="setting-desc">{s.city} · {s.phone}</div>
            </div>
          </div>
        ))}
        <button className="btn btn-outline" style={{ marginTop: 'var(--space-md)' }}>
          <Plus size={14} /> Add Supplier
        </button>
      </div>
    </div>
  );
}
