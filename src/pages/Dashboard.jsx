import { useNavigate } from 'react-router-dom';
import { TrendingUp, AlertTriangle, Package, Crown, MessageCircle } from 'lucide-react';
import useStore from '../store/store';
import { useCountUp } from '../hooks/useCountUp';
import { useRealtime } from '../hooks/useRealtime';
import { todayStats, topSellersWeek } from '../data/mockData';
import AlertCard from '../components/AlertCard';

const formatRupee = (n) => '₹' + n.toLocaleString('en-IN');

export default function Dashboard() {
  const allAlerts = useStore((s) => s.alerts);
  const alerts = allAlerts.slice(0, 3);
  const navigate = useNavigate();

  const salesCount = useCountUp(todayStats.sales);
  const stockValue = useCountUp(todayStats.stockValue);
  const lowCount = useCountUp(todayStats.lowStockCount, 600);
  const liveSales = useRealtime(todayStats.sales, { interval: 10000, variance: 0.02 });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card">
          <div className="stat-label">Today's Sales</div>
          <div className="stat-value text-amber rupee">{formatRupee(salesCount)}</div>
          <div className="stat-delta positive">
            <TrendingUp size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            ↑ 12% vs yesterday
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Low Stock Items</div>
          <div className="stat-value text-red">{lowCount}</div>
          <div className="stat-delta" style={{ color: 'var(--muted)' }}>items need attention</div>
        </div>
        <div className="card">
          <div className="stat-label">Stock Value</div>
          <div className="stat-value rupee">{formatRupee(stockValue)}</div>
          <div className="stat-delta" style={{ color: 'var(--muted)' }}>across 11 products</div>
        </div>
        <div className="card">
          <div className="stat-label">Top Seller Today</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>4mm Copper Wire</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
            <span className="tag brand">Finolex</span>
            <span className="text-amber" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatRupee(todayStats.topSeller.revenue)}</span>
          </div>
        </div>
      </div>

      {/* Two columns: AI Insights + Top Sellers */}
      <div className="grid-2">
        {/* AI Insights */}
        <div>
          <div className="section-title">
            <AlertTriangle size={18} className="text-amber" /> AI Insights
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>

        {/* Top Sellers */}
        <div>
          <div className="section-title">
            <Crown size={18} className="text-amber" /> Top Sellers This Week
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Units</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topSellersWeek.map((item) => (
                  <tr key={item.rank}>
                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: item.rank <= 3 ? 'var(--anchor)' : 'var(--muted)' }}>
                      {item.rank}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{item.brand}</div>
                    </td>
                    <td>{item.units}</td>
                    <td className="text-amber rupee">{formatRupee(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Chat FAB */}
      <button className="ai-fab" onClick={() => navigate('/assistant')} title="Ask AI anything">
        <MessageCircle size={24} />
      </button>
    </div>
  );
}
