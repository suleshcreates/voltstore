import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { FileText, FileSpreadsheet, TrendingDown, TrendingUp } from 'lucide-react';
import AIWhisper from '../components/AIWhisper';
import useStore from '../store/store';
import { supabase } from '../lib/supabase';
import { downloadCSV, downloadReportPDF } from '../utils/exportReports';

const formatRupee = (n) => '₹' + Number(n).toLocaleString('en-IN');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

const TurnoverTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--black-2)', border: '1px solid var(--black-3)', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem' }}>
        <div style={{ color: 'var(--off-white)', fontWeight: 500 }}>{label}</div>
        <div style={{ color: 'var(--anchor)', fontWeight: 600 }}>{payload[0].value.toFixed(1)}×</div>
      </div>
    );
  }
  return null;
};

function getDiscountColor(pct) {
  if (pct <= 5) return '#00FF88';
  if (pct <= 10) return 'var(--anchor)';
  return 'var(--critical)';
}

export default function Reports() {
  const whisper = useStore((s) => s.whisperMessages.reports);
  const products = useStore((s) => s.products);
  const [period, setPeriod] = useState('week');
  const [marginData, setMarginData] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [turnoverData, setTurnoverData] = useState([]);
  const [topSellers, setTopSellers] = useState([]);

  // ─── Fetch sales trend from DB ──────────────────────────────────
  useEffect(() => {
    async function fetchSalesTrend() {
      const days = period === 'week' ? 7 : 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data } = await supabase
        .from('sales')
        .select('total, sold_at')
        .gte('sold_at', since.toISOString())
        .order('sold_at', { ascending: true });

      if (!data || data.length === 0) {
        setSalesTrend([]);
        return;
      }

      // Group by day
      const grouped = {};
      data.forEach((sale) => {
        const d = new Date(sale.sold_at);
        const key = period === 'week'
          ? DAY_NAMES[d.getDay()]
          : `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
        grouped[key] = (grouped[key] || 0) + Number(sale.total);
      });

      // Build ordered array
      if (period === 'week') {
        const today = new Date().getDay();
        const ordered = [];
        for (let i = 6; i >= 0; i--) {
          const dayIdx = (today - i + 7) % 7;
          const label = DAY_NAMES[dayIdx];
          ordered.push({ day: label, sales: Math.round(grouped[label] || 0) });
        }
        setSalesTrend(ordered);
      } else {
        // Last 30 days
        const ordered = [];
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
          ordered.push({ day: label, sales: Math.round(grouped[label] || 0) });
        }
        setSalesTrend(ordered);
      }
    }
    fetchSalesTrend();
  }, [period]);

  // ─── Fetch top sellers from DB ──────────────────────────────────
  useEffect(() => {
    async function fetchTopSellers() {
      const days = period === 'week' ? 7 : 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data } = await supabase
        .from('sale_items')
        .select('quantity, total, products(name, brand)')
        .gte('created_at', since.toISOString());

      if (data) {
        const productStats = {};
        data.forEach(si => {
          const name = si.products?.name;
          if (!name) return;
          if (!productStats[name]) {
            productStats[name] = { name, brand: si.products.brand, units: 0, revenue: 0 };
          }
          productStats[name].units += Number(si.quantity);
          productStats[name].revenue += Number(si.total);
        });

        const sorted = Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        setTopSellers(sorted.map((s, i) => ({ ...s, rank: i + 1 })));
      } else {
        setTopSellers([]);
      }
    }
    fetchTopSellers();
  }, [period]);

  // ─── Fetch stock turnover from DB ──────────────────────────────
  useEffect(() => {
    async function fetchTurnover() {
      // Units sold per category in last 30 days
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data: salesData } = await supabase
        .from('sale_items')
        .select('quantity, products(category)')
        .gte('created_at', since.toISOString());

      // Total stock value per category from products
      const categoryStock = {};
      products.forEach((p) => {
        if (!categoryStock[p.category]) categoryStock[p.category] = 0;
        categoryStock[p.category] += p.stock;
      });

      // Units sold per category
      const categorySold = {};
      if (salesData) {
        salesData.forEach((si) => {
          const cat = si.products?.category;
          if (cat) {
            categorySold[cat] = (categorySold[cat] || 0) + Number(si.quantity);
          }
        });
      }

      // Compute turnover ratio = units sold / avg stock (approximate)
      const allCats = new Set([...Object.keys(categoryStock), ...Object.keys(categorySold)]);
      const result = [];
      allCats.forEach((cat) => {
        const stock = categoryStock[cat] || 1;
        const sold = categorySold[cat] || 0;
        const rate = parseFloat((sold / stock).toFixed(1));
        result.push({ category: cat, rate });
      });

      // Sort descending
      result.sort((a, b) => b.rate - a.rate);
      setTurnoverData(result);
    }

    if (products.length > 0) fetchTurnover();
  }, [products]);

  // ─── Fetch pricing insights ──────────────────────────────────
  useEffect(() => {
    async function fetchMarginAnalysis() {
      const { data } = await supabase
        .from('v_margin_analysis')
        .select('*')
        .order('total_revenue', { ascending: false });
      if (data) setMarginData(data);
    }
    fetchMarginAnalysis();
  }, []);

  // Compute callout insights
  const mostDiscounted = marginData.length > 0
    ? marginData.reduce((max, item) => (Number(item.avg_discount_pct || 0) > Number(max.avg_discount_pct || 0) ? item : max), marginData[0])
    : null;
  const bestMargin = marginData.length > 0
    ? marginData.reduce((max, item) => (Number(item.avg_margin_pct || 0) > Number(max.avg_margin_pct || 0) ? item : max), marginData[0])
    : null;

  // Category breakdown from live products
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

  // Slowest movers from live products
  const bottomProducts = [...products]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 3)
    .map(p => ({ name: p.name, brand: p.brand, units: p.stock, revenue: p.price * p.stock }));

  // Totals
  const totalSales = salesTrend.reduce((s, d) => s + d.sales, 0);
  const avgTurnover = turnoverData.length > 0
    ? (turnoverData.reduce((s, d) => s + d.rate, 0) / turnoverData.length).toFixed(1)
    : '0.0';

  const periodLabel = period === 'week' ? 'this week' : 'this month';

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
            <span className="rupee text-amber" style={{ fontSize: '1.1rem' }}>
              {totalSales > 0 ? `${formatRupee(totalSales)} ${periodLabel}` : `No sales ${periodLabel}`}
            </span>
          </h3>
          {salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--black-3)" />
                <XAxis dataKey="day" stroke="var(--muted)" fontSize={12}
                  interval={period === 'month' ? Math.floor(salesTrend.length / 8) : 0} />
                <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="sales" stroke="var(--anchor)" strokeWidth={2.5} dot={period === 'week' ? { fill: 'var(--anchor)', r: 4 } : false} activeDot={{ r: 6, fill: 'var(--anchor)' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.88rem' }}>
              No sales recorded yet — make your first sale to see trends!
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="report-card">
          <h3>Category Breakdown</h3>
          {categoryBreakdown.length > 0 ? (
            <>
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
            </>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.88rem' }}>
              Add products to see category distribution
            </div>
          )}
        </div>

        {/* Stock Turnover */}
        <div className="report-card">
          <h3>
            Stock Turnover
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>
              avg {avgTurnover}×
            </span>
          </h3>
          {turnoverData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={turnoverData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--black-3)" />
                <XAxis type="number" stroke="var(--muted)" fontSize={11} />
                <YAxis type="category" dataKey="category" stroke="var(--muted)" fontSize={11} width={100} />
                <Tooltip content={<TurnoverTooltip />} />
                <Bar dataKey="rate" fill="var(--anchor)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.88rem' }}>
              Turnover data will appear after your first sales
            </div>
          )}
        </div>

        {/* Top 5 Products */}
        <div className="report-card">
          <h3>Top 5 Products</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {topSellers.length > 0 ? topSellers.map((item) => (
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
            {bottomProducts.length > 0 ? bottomProducts.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--black-3)' }}>
                <div>
                  <div style={{ fontSize: '0.87rem', fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.brand} · {item.units} in stock</div>
                </div>
                <span className="rupee" style={{ fontSize: '0.87rem', color: 'var(--muted)' }}>{formatRupee(item.revenue)}</span>
              </div>
            )) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 'var(--space-xl)' }}>Add products to see slow movers</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Pricing Insights ──────────────────────────────────────────────── */}
      {marginData.length > 0 && (
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: 'var(--space-lg)' }}>
            Pricing Insights
          </h2>

          {/* Callout Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            {mostDiscounted && Number(mostDiscounted.avg_discount_pct || 0) > 0 && (
              <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '16px 20px' }}>
                <TrendingDown size={24} style={{ color: 'var(--critical)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Most Discounted</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 500 }}>
                    {mostDiscounted.product_name} — avg {Number(mostDiscounted.avg_discount_pct).toFixed(1)}% off
                  </div>
                </div>
              </div>
            )}
            {bestMargin && Number(bestMargin.avg_margin_pct || 0) > 0 && (
              <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '16px 20px' }}>
                <TrendingUp size={24} style={{ color: '#00FF88', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Best Margin</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 500 }}>
                    {bestMargin.product_name} — {Number(bestMargin.avg_margin_pct).toFixed(1)}% margin
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Margin Analysis Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--black-2)', borderBottom: '1px solid var(--black-3)' }}>
                  <th style={th}>Product</th>
                  <th style={th}>Avg Selling</th>
                  <th style={th}>List Price</th>
                  <th style={th}>Avg Discount</th>
                  <th style={th}>Avg Margin</th>
                  <th style={th}>Sold</th>
                </tr>
              </thead>
              <tbody>
                {marginData.map((row, i) => {
                  const avgDiscount = Number(row.avg_discount_pct || 0);
                  const avgMargin = Number(row.avg_margin_pct || 0);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--black-3)' }}>
                      <td style={td}>
                        <div style={{ fontWeight: 500 }}>{row.product_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{row.brand}</div>
                      </td>
                      <td style={{ ...td, fontFamily: 'var(--font-display)' }}>
                        {formatRupee(Number(row.avg_selling_price || 0).toFixed(0))}
                      </td>
                      <td style={{ ...td, color: 'var(--muted)' }}>
                        {formatRupee(Number(row.list_price || 0))}
                      </td>
                      <td style={td}>
                        <span style={{ color: getDiscountColor(avgDiscount), fontWeight: 500 }}>
                          {avgDiscount.toFixed(1)}%
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{ color: avgMargin > 15 ? '#00FF88' : avgMargin > 5 ? 'var(--anchor)' : 'var(--critical)', fontWeight: 500 }}>
                          {formatRupee(Number(row.avg_margin_amount || 0).toFixed(0))} ({avgMargin.toFixed(1)}%)
                        </span>
                      </td>
                      <td style={{ ...td, fontFamily: 'var(--font-display)' }}>
                        {Number(row.times_sold || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
        <button className="btn btn-outline" onClick={() => downloadReportPDF(marginData, useStore.getState().tenant || {}, period)}>
          <FileText size={16} /> Export PDF
        </button>
        <button className="btn btn-outline" onClick={() => downloadCSV(marginData, `VoltStore_Margin_Report_${period}`)}>
          <FileSpreadsheet size={16} /> Export Excel
        </button>
      </div>
    </div>
  );
}

const th = {
  textAlign: 'left', padding: '10px 14px', fontSize: '0.75rem',
  color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
  fontWeight: 500,
};
const td = {
  padding: '10px 14px', verticalAlign: 'middle',
};
