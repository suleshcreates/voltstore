export default function AlertCard({ alert, onAction }) {
  return (
    <div className={`alert-card ${alert.type}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.1rem' }}>{alert.icon}</span>
        <span className={`alert-badge ${alert.type}`}>{alert.badge}</span>
      </div>
      <h4 className="alert-title">{alert.title}</h4>
      <p className="alert-body">{alert.body}</p>
      <div className="alert-meta">
        <span className="alert-time">{alert.time}</span>
        <button
          className="btn btn-primary"
          onClick={() => onAction && onAction(alert)}
        >
          {alert.action} →
        </button>
      </div>
    </div>
  );
}
