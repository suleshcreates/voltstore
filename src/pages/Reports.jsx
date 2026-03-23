import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { FileText, FileSpreadsheet } from 'lucide-react';
import AIWhisper from '../components/AIWhisper';
import useStore from '../store/store';

const formatRupee = (n) => '₹' + n.toLocaleString('en-IN');

const turnoverData = [
  { category: 'Wires', rate: 6.1 },
  { category: 'Circuit Breakers', rate: 4.8 },
  { category: 'Lighting', rate: 3.5 },
  { category: 'Switches', rate: 3.2 },
  { category: 'Accessories', rate: 2.8 },
  { category: 'Fans', rate: 1.5 },
  { category: 'Panels', rate: 1.2 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--black-2)', border: '1px solid var(--black-3)', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem' }}>
        <div style={{ color: 'var(--off-white)', fontWeight: 500 }}>{label}</div>
        <div style={{ color: 'var(--anchor)', fontWeight: 600 }}>{formatRupee(payload[0].value)}</div>
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const whisper = useStore((s) => s.whisperMessages.reports);
  const topSellersWeek = useStore((s) => s.topSellersWeek);
  const products = useStore((s) => s.products);
  const [period, setPeriod] = useState('week');

  // Compute category breakdown from live products
  const categoryBreakdown = (() => {
    const catTotals = {};
    products.forEach(p => {
      catTotals[p.category] = (catTotals[p.category] || 0) + (p.price * p.stock);
    });
    const total = Object.values(catTotals).reduce((s, v) => s + v, 0) || 1;
    const colors = ['#00FF88', '#F5A623', '#666', '#888', '#444', '#5C9DFF', '#333'];
    return Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, val], i) => ({
        name,
        value: Math.round((val / total) * 100),
        color: colors[i % colors.length],
      }));
  })();

  // Compute bottom products from live data
  const bottomProducts = [...products]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 3)
    .map(p => ({ name: p.name, brand: p.brand, units: p.stock, revenue: p.price * p.stock }));

  // Placeholder sales trend (will be replaced when sales data exists)
  const salesTrend = [
    { day: 'Mon', sales: 12400 },
    { day: 'Tue', sales: 15800 },
    { day: 'Wed', sales: 18420 },
    { day: 'Thu', sales: 14200 },
    { day: 'Fri', sales: 16800 },
    { day: 'Sat', sales: 21000 },
    { day: 'Sun', sales: 9500 },
  ];

  const totalSales = salesTrend.reduce((s, d) => s + d.sales, 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <AIWhisper message={whisper} />
          <div className="filter-chips">
            {['week', 'month'].map((p) => (
              <button key={p} className={`chip ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                This {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="reports-grid">
        {/* Sales Trend */}
        <div className="report-card full-width">
          <h3>
            Sales Trend
            <span className="rupee text-amber" style={{ fontSize: '1.1rem' }}>{formatRupee(totalSales)} this week</span>
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--black-3)" />
              <XAxis dataKey="day" stroke="var(--muted)" fontSize={12} />
              <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="sales" stroke="var(--anchor)" strokeWidth={2.5} dot={{ fill: 'var(--anchor)', r: 4 }} activeDot={{ r: 6, fill: 'var(--anchor)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="report-card">
          <h3>Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                {categoryBreakdown.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 8 }}>
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                <span style={{ color: 'var(--muted)' }}>{cat.name} ({cat.value}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Turnover */}
        <div className="report-card">
          <h3>
            Stock Turnover
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>avg 4.2×</span>
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={turnoverData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--black-3)" />
              <XAxis type="number" stroke="var(--muted)" fontSize={11} />
              <YAxis type="category" dataKey="category" stroke="var(--muted)" fontSize={11} width={90} />
              <Tooltip formatter={(v) => `${v}×`} />
              <Bar dataKey="rate" fill="var(--anchor)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 Products */}
        <div className="report-card">
          <h3>Top 5 Products</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {topSellersWeek.length > 0 ? topSellersWeek.map((item) => (
              <div key={item.rank} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--black-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: item.rank <= 3 ? 'var(--anchor)' : 'var(--muted)', fontSize: '1.1rem', width: 24 }}>
                    {item.rank}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.87rem', fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.brand} · {item.units} units</div>
                  </div>
                </div>
                <span className="rupee text-amber" style={{ fontWeight: 600, fontSize: '0.87rem' }}>{formatRupee(item.revenue)}</span>
              </div>
            )) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 'var(--space-xl)' }}>No sales data yet — make your first sale!</div>
            )}
          </div>
        </div>

        {/* Bottom Products */}
        <div className="report-card">
          <h3>Slowest Movers</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {bottomProducts.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--black-3)' }}>
                <div>
                  <div style={{ fontSize: '0.87rem', fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.brand} · {item.units} in stock</div>
                </div>
                <span className="rupee" style={{ fontSize: '0.87rem', color: 'var(--muted)' }}>{formatRupee(item.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
        <button className="btn btn-outline">
          <FileText size={16} /> Export PDF
        </button>
        <button className="btn btn-outline">
          <FileSpreadsheet size={16} /> Export Excel
        </button>
      </div>
    </div>
  );
}
