import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import useStore from '../store/store';
import AIWhisper from '../components/AIWhisper';
import StockVisual from '../components/StockVisual';
import AddItemModal from '../components/AddItemModal';
import EditItemModal from '../components/EditItemModal';

const statusFilters = ['all', 'critical', 'warning', 'healthy', 'hot'];

export default function Inventory() {
  const products = useStore((s) => s.products);
  const updateProductStock = useStore((s) => s.updateProductStock);
  const whisper = useStore((s) => s.whisperMessages.inventory);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === 'all' || p.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditValue(String(product.stock));
  };

  const saveEdit = (id) => {
    const val = parseInt(editValue) || 0;
    updateProductStock(id, val);
    setEditingId(null);
  };

  const counts = {
    all: products.length,
    critical: products.filter((p) => p.status === 'critical').length,
    warning: products.filter((p) => p.status === 'warning').length,
    healthy: products.filter((p) => p.status === 'healthy').length,
    hot: products.filter((p) => p.status === 'hot').length,
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Inventory</h1>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <AIWhisper message={whisper} />
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search className="search-icon" />
          <input
            placeholder="Search products, brands, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          {statusFilters.map((f) => (
            <button
              key={f}
              className={`chip ${f} ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Stock</th>
              <th style={{ width: 120 }}>Level</th>
              <th>Reorder At</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr 
                key={p.id} 
                className="inventory-row"
                onClick={(e) => {
                  if (e.target.tagName !== 'INPUT') {
                    setEditProduct(p.raw);
                  }
                }}
              >
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td><span className="tag brand">{p.brand}</span></td>
                <td><span className="tag category">{p.category}</span></td>
                <td>
                  {editingId === p.id ? (
                    <div className="inline-edit">
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(p.id)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id)}
                        autoFocus
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{p.unit}</span>
                    </div>
                  ) : (
                    <span
                      onClick={() => startEdit(p)}
                      style={{ cursor: 'pointer', borderBottom: '1px dashed var(--muted)' }}
                      title="Click to edit"
                    >
                      {p.stock}{p.unit !== 'units' ? p.unit : ''}
                    </span>
                  )}
                </td>
                <td>
                  <StockVisual stock={p.stock} reorderAt={p.reorderAt} status={p.status} unit={p.unit} />
                </td>
                <td>{p.reorderAt}{p.unit !== 'units' ? p.unit : ''}</td>
                <td className="rupee">₹{p.price.toLocaleString('en-IN')}{p.priceUnit || ''}</td>
                <td>
                  <span className={`tag ${p.status}`}>
                    {p.status === 'hot' ? '🔥 HOT' : p.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 'var(--space-md)', fontSize: '0.82rem', color: 'var(--muted)' }}>
        Showing {filtered.length} of {products.length} items
      </div>

      {showAdd && (
        <AddItemModal onClose={() => setShowAdd(false)} />
      )}
      
      {editProduct && (
        <EditItemModal 
          product={editProduct} 
          onClose={() => setEditProduct(null)} 
        />
      )}
    </div>
  );
}
