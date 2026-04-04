import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useStore from '../store/store';
import { FileText, FileSpreadsheet, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { downloadRawSalesCSV, downloadRawSalesPDF } from '../utils/exportReports';

const formatRupee = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function SaleRow({ sale }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr style={{ borderBottom: expanded ? 'none' : '1px solid var(--black-3)', cursor: 'pointer', background: expanded ? 'var(--surface-2)' : 'transparent' }} onClick={() => setExpanded(!expanded)}>
        <td style={td}>#{sale.sale_number}</td>
        <td style={td}>{new Date(sale.sold_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td style={td}>
          <div style={{ fontWeight: 500 }}>{sale.customer_name || 'Walk-in'}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{sale.customer_phone || 'N/A'}</div>
        </td>
        <td style={{ ...td, color: 'var(--anchor)' }}>{sale.payment_method.toUpperCase()}</td>
        <td style={{ ...td, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{formatRupee(sale.total)}</td>
        <td style={{ ...td, textAlign: 'right', paddingRight: '1rem' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--black-3)' }}>
          <td colSpan={6} style={{ padding: '0 0 16px 40px' }}>
            <table style={{ width: '95%', borderLeft: '2px solid var(--black-3)', paddingLeft: '16px', display: 'block', margin: '4px 0' }}>
              <tbody>
                {sale.sale_items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 12px', width: '250px' }}>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{item.products?.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{item.products?.brand}</div>
                    </td>
                    <td style={{ padding: '6px 12px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                      Qty: {item.quantity}
                    </td>
                    <td style={{ padding: '6px 12px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                      @ {formatRupee(item.unit_price)}
                    </td>
                    <td style={{ padding: '6px 12px', fontSize: '0.85rem', fontWeight: 500, fontFamily: 'var(--font-display)' }}>
                      {formatRupee(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

export default function History() {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const tenant = useStore(s => s.tenant);

  useEffect(() => {
    async function fetchHistory() {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (name, brand)
          )
        `)
        .order('sold_at', { ascending: false });
        
      if (!error && data) {
        setSalesData(data);
      }
      setLoading(false);
    }
    fetchHistory();
  }, []);

  const filteredSales = salesData.filter(s => 
    s.sale_number.toString().includes(searchTerm) || 
    (s.customer_phone && s.customer_phone.includes(searchTerm))
  );

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Sales History</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Detailed transaction log of all your sales.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-outline" onClick={() => downloadRawSalesPDF(filteredSales, tenant)}>
            <FileText size={16} /> Export PDF
          </button>
          <button className="btn btn-outline" onClick={() => downloadRawSalesCSV(filteredSales)}>
            <FileSpreadsheet size={16} /> Export Excel
          </button>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: 'var(--space-lg)', position: 'relative', maxWidth: 400 }}>
        <Search className="search-icon" size={18} style={{ position: 'absolute', left: 16, top: 14, color: 'var(--muted)' }} />
        <input
          className="input"
          placeholder="Search Invoice # or Mobile..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: 42, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, height: 46 }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--black-2)', borderBottom: '1px solid var(--black-3)' }}>
              <th style={th}>Invoice #</th>
              <th style={th}>Date & Time</th>
              <th style={th}>Customer</th>
              <th style={th}>Method</th>
              <th style={th}>Total</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading history...</td></tr>
            ) : filteredSales.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No sales found matching your criteria.</td></tr>
            ) : (
              filteredSales.map(sale => <SaleRow key={sale.id} sale={sale} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = {
  textAlign: 'left', padding: '14px 16px', fontSize: '0.78rem',
  color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
  fontWeight: 600,
};
const td = {
  padding: '14px 16px', verticalAlign: 'middle',
};
