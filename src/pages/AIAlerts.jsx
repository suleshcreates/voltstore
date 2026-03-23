import { useState } from 'react';
import useStore from '../store/store';
import AlertCard from '../components/AlertCard';

const filterTypes = ['all', 'critical', 'anomaly', 'hot', 'forecast'];

export default function AIAlerts() {
  const alerts = useStore((s) => s.alerts);
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all'
    ? alerts
    : alerts.filter((a) => a.type === activeFilter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Alerts</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>
            {alerts.length} active alerts · Last updated 2 min ago
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-chips" style={{ marginBottom: 'var(--space-xl)' }}>
        {filterTypes.map((f) => (
          <button
            key={f}
            className={`chip ${f} ${activeFilter === f ? 'active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alert Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxWidth: 720 }}>
        {filtered.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--muted)' }}>
            No alerts matching this filter
          </div>
        )}
      </div>
    </div>
  );
}
