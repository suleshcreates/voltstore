import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, AlertTriangle, MessageCircle, BarChart3, Settings, Zap } from 'lucide-react';
import useStore from '../store/store';

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
    </aside>
  );
}
