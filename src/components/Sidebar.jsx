import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, AlertTriangle, MessageCircle, BarChart3, Settings, Zap, LogOut } from 'lucide-react';
import useStore from '../store/store';
import useAuthStore from '../store/authStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/alerts', icon: AlertTriangle, label: 'AI Alerts', hasBadge: true },
  { to: '/assistant', icon: MessageCircle, label: 'AI Assistant' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const alertCount = useStore((s) => s.alertCount);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="bolt"><Zap size={22} /></span>
        <span>VoltStore</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label, hasBadge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? 'active' : ''}
            end={to === '/'}
          >
            <Icon className="nav-icon" size={20} />
            <span className="nav-label">{label}</span>
            {hasBadge && alertCount > 0 && (
              <span className="nav-badge">{alertCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '0 var(--space-sm)', marginTop: 'auto' }}>
        <button
          className="btn btn-ghost"
          onClick={handleSignOut}
          style={{
            width: '100%',
            justifyContent: 'flex-start',
            padding: 'var(--space-md)',
            gap: 'var(--space-md)',
            fontSize: '0.9rem',
            color: 'var(--muted)',
          }}
        >
          <LogOut size={20} />
          <span className="nav-label">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
