import { useState } from 'react';
import { Search, Plus, Minus, X, Send } from 'lucide-react';
import useStore from '../store/store';
import AIWhisper from '../components/AIWhisper';

const formatRupee = (n) => '₹' + n.toLocaleString('en-IN');

export default function SalesEntry() {
  const products = useStore((s) => s.products);
  const cart = useStore((s) => s.cart);
  const addToCart = useStore((s) => s.addToCart);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const updateCartQty = useStore((s) => s.updateCartQty);
  const clearCart = useStore((s) => s.clearCart);
  const whisper = useStore((s) => s.whisperMessages.sales);

  const [search, setSearch] = useState('');
  const [whatsappReceipt, setWhatsappReceipt] = useState(true);
  const [phone, setPhone] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  const searchResults = search.length > 0
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.brand.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const quickProducts = products.slice(0, 6);

  const handleCompleteSale = () => {
    if (cart.length === 0) return;
    setShowSuccess(true);
    setTimeout(() => {
      clearCart();
      setShowSuccess(false);
    }, 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">New Sale</h1>
        <AIWhisper message={whisper} />
      </div>

      <div className="sales-layout">
        {/* Left: Product selection */}
        <div>
          {/* Search */}
          <div className="search-bar" style={{ marginBottom: 'var(--space-lg)', position: 'relative' }}>
            <Search className="search-icon" />
            <input
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Search Results
              </div>
              <div className="product-quick-grid">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    className="product-quick-card"
                    onClick={() => { addToCart(p, 1); setSearch(''); }}
                  >
                    <div className="pq-name">{p.name}</div>
                    <div className="pq-brand">{p.brand}</div>
                    <div className="pq-price">{formatRupee(p.price)}{p.priceUnit || ''}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Select */}
          {search.length === 0 && (
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Quick Select
              </div>
              <div className="product-quick-grid">
                {quickProducts.map((p) => (
                  <button
                    key={p.id}
                    className="product-quick-card"
                    onClick={() => addToCart(p, 1)}
                  >
                    <div className="pq-name">{p.name}</div>
                    <div className="pq-brand">{p.brand}</div>
                    <div className="pq-price">{formatRupee(p.price)}{p.priceUnit || ''}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cart Items */}
          {cart.length > 0 && (
            <div style={{ marginTop: 'var(--space-xl)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Cart ({cart.length} items)
              </div>
              <div className="card" style={{ padding: 0 }}>
                {cart.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{item.brand} · {formatRupee(item.price)}{item.priceUnit || ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button className="btn btn-ghost" onClick={() => updateCartQty(item.id, Math.max(1, item.qty - 1))}>
                        <Minus size={14} />
                      </button>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                      <button className="btn btn-ghost" onClick={() => updateCartQty(item.id, item.qty + 1)}>
                        <Plus size={14} />
                      </button>
                      <span className="rupee" style={{ fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                        {formatRupee(item.price * item.qty)}
                      </span>
                      <button className="btn btn-ghost" onClick={() => removeFromCart(item.id)} style={{ color: 'var(--critical)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Bill Summary */}
        <div className="bill-summary">
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>Bill Summary</h3>

            {cart.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: 'var(--space-xl) 0' }}>
                No items added yet
              </p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.87rem' }}>
                    <span>{item.name} × {item.qty}</span>
                    <span className="rupee">{formatRupee(item.price * item.qty)}</span>
                  </div>
                ))}

                <div className="cart-total">
                  TOTAL: {formatRupee(total)}
                </div>
              </>
            )}

            {/* WhatsApp Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md) 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>📱</span>
                <span style={{ fontSize: '0.85rem' }}>Send via WhatsApp</span>
              </div>
              <button
                className={`toggle-track ${whatsappReceipt ? 'on' : ''}`}
                onClick={() => setWhatsappReceipt(!whatsappReceipt)}
              >
                <div className="toggle-thumb" />
              </button>
            </div>

            {whatsappReceipt && (
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <input
                  className="input"
                  placeholder="+91 Customer phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            <button
              className="btn btn-primary btn-large"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleCompleteSale}
              disabled={cart.length === 0}
            >
              {showSuccess ? '✓ Sale Complete!' : 'Complete Sale ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
