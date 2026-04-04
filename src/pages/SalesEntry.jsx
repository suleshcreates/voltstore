import { useState } from 'react';
import { Search, Plus, Minus, X, AlertTriangle, Download, Share2, RefreshCw } from 'lucide-react';
import useStore from '../store/store';
import useAuthStore from '../store/authStore';
import AIWhisper from '../components/AIWhisper';
import { generateInvoice } from '../utils/pdfGenerator';

const formatRupee = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function SalesEntry() {
  const tenant = useAuthStore((s) => s.tenant);
  const products = useStore((s) => s.products);
  const cart = useStore((s) => s.cart);
  const addToCart = useStore((s) => s.addToCart);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const updateCartQty = useStore((s) => s.updateCartQty);
  const updateCartPrice = useStore((s) => s.updateCartPrice);
  const clearCart = useStore((s) => s.clearCart);
  const completeSale = useStore((s) => s.completeSale);
  const whisper = useStore((s) => s.whisperMessages.sales);

  const [search, setSearch] = useState('');
  const [whatsappReceipt, setWhatsappReceipt] = useState(true);
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [completedSale, setCompletedSale] = useState(null);
  const [completedItems, setCompletedItems] = useState(null);

  // Totals
  const totalMRP = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const finalTotal = cart.reduce((sum, c) => sum + (c.actualPrice ?? c.price) * c.qty, 0);
  const totalDiscount = totalMRP - finalTotal;
  const hasDiscount = totalDiscount > 0;

  const searchResults = search.length > 0
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.brand.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const quickProducts = products.slice(0, 6);

  const handleCompleteSale = async () => {
    if (cart.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const saleData = await completeSale(phone, customerName);
      if (saleData) {
        setCompletedSale(saleData);
        setCompletedItems([...cart]); // save cart snapshot to pass to PDF generator
        setShowSuccess(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewSale = () => {
    clearCart();
    setCompletedSale(null);
    setCompletedItems(null);
    setShowSuccess(false);
    setPhone('');
    setCustomerName('');
  };

  const handlePreviewPDF = () => {
    if (completedSale && completedItems) {
      const pdfUrl = generateInvoice(completedSale, completedItems, tenant || {}, 'bloburl');
      window.open(pdfUrl, '_blank');
    }
  };

  const handleDownloadPDF = () => {
    if (completedSale && completedItems) {
      generateInvoice(completedSale, completedItems, tenant || {}, 'save');
    }
  };

  const handleWhatsAppShare = async () => {
    if (!completedSale || !completedItems) return;
    
    // 1. Check if Mobile/Tablet Native Share is available (Can attach actual PDF file)
    if (navigator.share && navigator.canShare) {
      try {
        const pdfBlob = generateInvoice(completedSale, completedItems, tenant || {}, 'blob');
        const file = new File([pdfBlob], `Invoice_${completedSale.sale_number}.pdf`, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Invoice #${completedSale.sale_number}`,
            text: `Thank you for shopping at ${tenant?.shop_name || 'VoltStore'}! Attached is your invoice.`,
            files: [file]
          });
          return; // If successful, we are done!
        }
      } catch (err) {
        console.log("Native share failed", err);
      }
    }
    
    // 2. Desktop Fallback: browsers block auto-attaching files to WhatsApp Web URLs.
    // Solution: Automatically download the PDF, then open WhatsApp Web so the user can easily drag & drop it.
    
    // Download the PDF
    generateInvoice(completedSale, completedItems, tenant || {}, 'save');

    // Open WhatsApp Web with a brief prompt
    const text = `*${tenant?.shop_name || 'VoltStore'}* - Invoice #${completedSale.sale_number}\n\nHere is your bill!`;
    const encodedText = encodeURIComponent(text);
    const targetPhone = completedSale.customer_phone || '';
    const waUrl = targetPhone 
      ? `https://wa.me/91${targetPhone}?text=${encodedText}` 
      : `https://wa.me/?text=${encodedText}`;
    
    setTimeout(() => {
      window.open(waUrl, '_blank');
    }, 500);
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
              disabled={showSuccess}
            />
          </div>

          {/* Search Results */}
          {!showSuccess && searchResults.length > 0 && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <div style={sectionLabel}>Search Results</div>
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
          {!showSuccess && search.length === 0 && (
            <div>
              <div style={sectionLabel}>Quick Select</div>
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
          {!showSuccess && (
            cart.length > 0 ? (
              <div style={{ marginTop: 'var(--space-xl)' }}>
                <div style={sectionLabel}>Cart ({cart.length} items)</div>
                <div className="card" style={{ padding: 0 }}>
                  {cart.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onQtyChange={(qty) => updateCartQty(item.id, qty)}
                      onPriceChange={(price) => updateCartPrice(item.id, price)}
                      onRemove={() => removeFromCart(item.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', color: 'var(--muted)', padding: 'var(--space-xl)', fontSize: '0.88rem' }}>
                Search or tap a product to add it
              </div>
            )
          )}
        </div>

        {/* Right: Bill Summary */}
        <div className="bill-summary">
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>
              {showSuccess ? 'Sale Completed' : 'Bill Summary'}
            </h3>

            {showSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,255,136,0.1)', color: '#00FF88', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: 8 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                
                <h2 className="rupee" style={{ fontSize: '2rem', color: 'var(--off-white)', fontWeight: 700, margin: 0 }}>
                  {formatRupee(completedSale?.total)}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '8px' }}>
                  Invoice #{completedSale?.sale_number} has been recorded.
                </p>

                <button className="btn btn-outline" onClick={handlePreviewPDF} style={{ width: '100%', justifyContent: 'center', padding: '12px', marginBottom: '8px' }}>
                  Preview Invoice
                </button>
                <button className="btn btn-outline" onClick={handleDownloadPDF} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  <Download size={18} /> Download Invoice
                </button>
                
                <button className="btn" onClick={handleWhatsAppShare} style={{ width: '100%', justifyContent: 'center', padding: '12px', background: '#25D366', color: 'white', border: 'none' }}>
                  <Share2 size={18} /> Send via WhatsApp
                </button>

                <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--black-3)' }}>
                  <button className="btn btn-ghost" onClick={handleNewSale} style={{ width: '100%', justifyContent: 'center', color: 'var(--anchor)' }}>
                    <RefreshCw size={18} /> Start New Sale
                  </button>
                </div>
              </div>
            ) : (
              cart.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: 'var(--space-xl) 0' }}>
                  No items added yet
                </p>
              ) : (
                <>
                  {cart.map((item) => {
                    const linePrice = (item.actualPrice ?? item.price) * item.qty;
                    const lineMRP = item.price * item.qty;
                    const hasLineDiscount = lineMRP > linePrice;
                    return (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.87rem' }}>
                        <span>{item.name} × {item.qty}</span>
                        <div style={{ textAlign: 'right' }}>
                          {hasLineDiscount && (
                            <span style={{ color: 'var(--muted)', textDecoration: 'line-through', marginRight: 8, fontSize: '0.8rem' }}>
                              {formatRupee(lineMRP)}
                            </span>
                          )}
                          <span className="rupee">{formatRupee(linePrice)}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ borderTop: '1px solid var(--black-3)', marginTop: 8, paddingTop: 12 }}>
                    {hasDiscount && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--muted)', marginBottom: 4 }}>
                          <span>Subtotal (MRP)</span>
                          <span style={{ textDecoration: 'line-through' }}>{formatRupee(totalMRP)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#00FF88', marginBottom: 8 }}>
                          <span>Discount</span>
                          <span>−{formatRupee(totalDiscount)}</span>
                        </div>
                      </>
                    )}
                    <div className="cart-total" style={{ color: 'var(--anchor)' }}>
                      TOTAL: {formatRupee(finalTotal)}
                    </div>
                  </div>

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
                    <div style={{ marginBottom: 'var(--space-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        className="input"
                        placeholder="Customer Name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                      <input
                        className="input"
                        placeholder="+91 Phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  )}

                  <button
                    className="btn btn-primary btn-large"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleCompleteSale}
                    disabled={cart.length === 0 || isSaving}
                  >
                    {isSaving ? 'Processing...' : 'Complete Sale ✓'}
                  </button>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cart Item Row with editable price ──────────────────────────────────────
function CartItemRow({ item, onQtyChange, onPriceChange, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [tempPrice, setTempPrice] = useState(String(item.actualPrice ?? item.price));

  const mrp = item.price;
  const actualPrice = item.actualPrice ?? mrp;
  const discountAmt = mrp - actualPrice;
  const discountPct = mrp > 0 ? ((discountAmt / mrp) * 100) : 0;
  const costPrice = Number(item.raw?.cost_price ?? 0);
  const minSellPrice = item.raw?.min_sell_price != null ? Number(item.raw.min_sell_price) : null;
  const floor = minSellPrice ?? costPrice;
  const isBelowFloor = actualPrice < floor && floor > 0;
  const hasDiscount = discountAmt > 0;

  const commitPrice = () => {
    const val = parseFloat(tempPrice);
    if (!isNaN(val) && val >= 0) {
      onPriceChange(val);
    } else {
      setTempPrice(String(actualPrice));
    }
    setEditing(false);
  };

  return (
    <div className="cart-item" style={{ flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {/* Product info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            {item.brand} · {item.category}
          </div>
        </div>

        {/* Qty stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn btn-ghost" onClick={() => onQtyChange(Math.max(1, item.qty - 1))}>
            <Minus size={14} />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, minWidth: 24, textAlign: 'center' }}>
            {item.qty}
          </span>
          <button className="btn btn-ghost" onClick={() => onQtyChange(item.qty + 1)}>
            <Plus size={14} />
          </button>
        </div>

        {/* Editable unit price */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 80, marginLeft: 12 }}>
          {editing ? (
            <input
              type="number"
              value={tempPrice}
              onChange={(e) => setTempPrice(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => e.key === 'Enter' && commitPrice()}
              autoFocus
              style={priceInputActive}
            />
          ) : (
            <button
              onClick={() => { setTempPrice(String(actualPrice)); setEditing(true); }}
              style={priceInputIdle}
              title="Click to change price"
            >
              {formatRupee(actualPrice)} ✎
            </button>
          )}
        </div>

        {/* Line total */}
        <span className="rupee" style={{ fontWeight: 600, minWidth: 70, textAlign: 'right', marginLeft: 8 }}>
          {formatRupee(actualPrice * item.qty)}
        </span>

        {/* Remove */}
        <button className="btn btn-ghost" onClick={onRemove} style={{ color: 'var(--critical)', marginLeft: 4 }}>
          <X size={14} />
        </button>
      </div>

      {/* Discount badge & warnings */}
      {(hasDiscount || isBelowFloor) && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingLeft: 2, marginTop: 2 }}>
          {hasDiscount && (
            <span style={discountBadge}>
              {formatRupee(discountAmt)} off ({discountPct.toFixed(1)}%)
            </span>
          )}
          {isBelowFloor && (
            <span style={belowCostWarning}>
              <AlertTriangle size={12} style={{ marginRight: 3 }} />
              Below {minSellPrice != null ? 'min price' : 'cost price'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const sectionLabel = {
  fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8,
  textTransform: 'uppercase', letterSpacing: '0.08em',
};

const priceInputIdle = {
  background: 'none', border: 'none', color: 'var(--anchor)',
  fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer',
  padding: '4px 6px', borderRadius: 6,
  transition: 'background 0.15s',
};

const priceInputActive = {
  width: 80, background: 'var(--black-2)',
  border: '1px solid var(--anchor)', borderRadius: 6,
  padding: '4px 6px', color: '#F0EDE8', fontSize: '0.88rem',
  outline: 'none', textAlign: 'right', boxSizing: 'border-box',
  /* Hide number spinners */
  MozAppearance: 'textfield',
};

const discountBadge = {
  display: 'inline-flex', alignItems: 'center',
  fontSize: '0.72rem', color: 'var(--anchor)',
  background: 'rgba(245,166,35,0.1)',
  padding: '2px 8px', borderRadius: 10, fontWeight: 500,
};

const belowCostWarning = {
  display: 'inline-flex', alignItems: 'center',
  fontSize: '0.72rem', color: 'var(--critical)',
  fontWeight: 500,
};
