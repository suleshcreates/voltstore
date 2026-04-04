import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';

const router = express.Router();

// ── Intent classifier ───────────────────────────────────────────────────
function classifyIntent(message) {
  const m = message.toLowerCase();
  if (/low|short|finish|khatam|stock out|running out|reorder point/.test(m)) return 'low_stock';
  if (/top sell|best sell|fast|most sold|popular|trending/.test(m))          return 'top_sellers';
  if (/theft|anomal|missing|discrepanc|suspicious|chori/.test(m))           return 'anomaly';
  if (/reorder|order|supplier|purchase|buy|mangana/.test(m))                return 'reorder';
  if (/today|aaj|sale|revenue|kitna hua|how much/.test(m))                  return 'today_sales';
  if (/forecast|predict|next week|next month|aage/.test(m))                 return 'forecast';
  if (/alert|warning|critical|urgent/.test(m))                              return 'alerts';
  if (/margin|profit|discount|bargain/.test(m))                             return 'margin';
  if (/hello|hi|namaste|help|kya kar|what can/.test(m))                     return 'greeting';
  return 'unknown';
}

// ── Answer builders ─────────────────────────────────────────────────────

async function answerLowStock(tenantId) {
  const { data } = await supabaseAdmin
    .from('products')
    .select('name, brand, current_stock, reorder_point, unit')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('current_stock', { ascending: true });

  if (!data) return "Couldn't fetch product data right now.";

  const critical = data.filter(p => parseFloat(p.current_stock) <= parseFloat(p.reorder_point));
  const warning = data.filter(p => {
    const s = parseFloat(p.current_stock), r = parseFloat(p.reorder_point);
    return s > r && s <= r * 1.3;
  });

  if (critical.length === 0 && warning.length === 0) {
    return "✅ All products are well stocked right now. No reorder needed today.";
  }

  let reply = '';
  if (critical.length > 0) {
    reply += `🔴 **Critical — reorder immediately (${critical.length} items):**\n`;
    critical.forEach(p => {
      reply += `• ${p.name} (${p.brand || 'N/A'}) — ${p.current_stock} ${p.unit} left (reorder at ${p.reorder_point})\n`;
    });
  }
  if (warning.length > 0) {
    reply += `\n🟡 **Running low — reorder soon (${warning.length} items):**\n`;
    warning.forEach(p => {
      reply += `• ${p.name} (${p.brand || 'N/A'}) — ${p.current_stock} ${p.unit} left\n`;
    });
  }
  return reply;
}

async function answerTopSellers(tenantId) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: saleItems } = await supabaseAdmin
    .from('sale_items')
    .select('quantity, total, product_id, products(name, brand, tenant_id), sales(sold_at)')
    .order('total', { ascending: false });

  if (!saleItems || saleItems.length === 0) {
    return "No sales recorded yet. Once you record some sales, I'll show you the top performers.";
  }

  // Filter by tenant and this week
  const filtered = saleItems.filter(r =>
    r.products?.tenant_id === tenantId &&
    r.sales?.sold_at >= weekAgo
  );

  if (filtered.length === 0) {
    return "No sales recorded this week yet. Once you record some sales, I'll show you the top performers.";
  }

  const sellerMap = {};
  filtered.forEach(item => {
    const pid = item.product_id;
    if (!sellerMap[pid]) {
      sellerMap[pid] = {
        name: item.products?.name || 'Unknown',
        brand: item.products?.brand || '',
        units: 0,
        revenue: 0,
      };
    }
    sellerMap[pid].units += parseFloat(item.quantity);
    sellerMap[pid].revenue += parseFloat(item.total);
  });

  const sorted = Object.values(sellerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  let reply = `📈 **Top selling items this week:**\n`;
  sorted.forEach((p, i) => {
    reply += `${i + 1}. ${p.name} (${p.brand || 'N/A'}) — ${p.units} sold · ₹${p.revenue.toLocaleString('en-IN')}\n`;
  });
  return reply;
}

async function answerAnomalies(tenantId) {
  const { data } = await supabaseAdmin
    .from('alerts')
    .select('title, message, severity, created_at')
    .eq('tenant_id', tenantId)
    .eq('type', 'anomaly')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false });

  if (!data || data.length === 0) {
    return "✅ No anomalies detected. All stock movements are matching your sales records.";
  }

  let reply = `⚠️ **${data.length} anomaly alert${data.length > 1 ? 's' : ''} detected:**\n`;
  data.forEach(a => {
    reply += `\n**${a.title}**\n${a.message}\n`;
  });
  reply += `\nI recommend doing a physical stock count for these items.`;
  return reply;
}

async function answerReorder(tenantId) {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, brand, current_stock, reorder_point, unit, sell_price')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  const { data: forecasts } = await supabaseAdmin
    .from('forecasts')
    .select('product_id, predicted_qty, days_until_out, confidence')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  const forecastMap = {};
  if (forecasts) forecasts.forEach(f => { forecastMap[f.product_id] = f; });

  const needsReorder = (products || []).filter(p =>
    parseFloat(p.current_stock) <= parseFloat(p.reorder_point)
  );

  if (needsReorder.length === 0) {
    return "✅ All stock levels are above their reorder points. No immediate reorder needed.";
  }

  let reply = `📦 **Reorder list for this week:**\n\n`;
  needsReorder.forEach(p => {
    const qty = Math.max(parseInt(p.reorder_point) * 2, 10);
    const forecast = forecastMap[p.id];
    const daysStr = forecast?.days_until_out
      ? ` ⏰ Runs out in ~${forecast.days_until_out} days`
      : '';
    reply += `• **${p.name}** (${p.brand || 'N/A'})${daysStr}\n`;
    reply += `  Current: ${p.current_stock} ${p.unit} · Suggest ordering: ${qty} ${p.unit}\n\n`;
  });
  return reply;
}

async function answerTodaySales(tenantId) {
  const today = new Date().toISOString().split('T')[0];

  const { data: salesData } = await supabaseAdmin
    .from('sales')
    .select('total')
    .eq('tenant_id', tenantId)
    .gte('sold_at', today + 'T00:00:00')
    .lte('sold_at', today + 'T23:59:59');

  const todaySales = (salesData || []).reduce((sum, s) => sum + parseFloat(s.total), 0);

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('current_stock, sell_price, reorder_point')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  const totalSkus = (products || []).length;
  const lowStockCount = (products || []).filter(p =>
    parseFloat(p.current_stock) <= parseFloat(p.reorder_point)
  ).length;
  const stockValue = (products || []).reduce((sum, p) =>
    sum + parseFloat(p.current_stock) * parseFloat(p.sell_price), 0);

  return (
    `💰 **Today's sales: ₹${todaySales.toLocaleString('en-IN')}**\n\n` +
    `• Total products in stock: ${totalSkus}\n` +
    `• Low stock items: ${lowStockCount}\n` +
    `• Total stock value: ₹${Math.round(stockValue).toLocaleString('en-IN')}`
  );
}

async function answerForecast(tenantId) {
  const { data } = await supabaseAdmin
    .from('forecasts')
    .select('product_id, predicted_qty, days_until_out, confidence, products(name, brand, unit)')
    .eq('tenant_id', tenantId)
    .order('days_until_out', { ascending: true, nullsFirst: false })
    .limit(5);

  if (!data || data.length === 0) {
    return "Not enough sales history yet to generate forecasts. Record some sales first and I'll predict demand for you.";
  }

  let reply = `🔮 **Demand forecast — next 7 days:**\n\n`;
  data.forEach(f => {
    const p = f.products;
    const conf = Math.round(f.confidence * 100);
    const daysStr = f.days_until_out ? ` · Runs out in ~${f.days_until_out} days` : '';
    reply += `• **${p?.name || 'Unknown'}** (${p?.brand || 'N/A'})\n`;
    reply += `  Predicted: ${f.predicted_qty} ${p?.unit || 'units'} · Confidence: ${conf}%${daysStr}\n\n`;
  });
  return reply;
}

async function answerAlerts(tenantId) {
  const { data } = await supabaseAdmin
    .from('alerts')
    .select('type, severity, title, message')
    .eq('tenant_id', tenantId)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data || data.length === 0) {
    return "✅ No active alerts right now. Your inventory looks healthy.";
  }

  const icons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
  let reply = `🚨 **${data.length} active alert${data.length > 1 ? 's' : ''}:**\n\n`;
  data.forEach(a => {
    reply += `${icons[a.severity] || '⚪'} **${a.title}**\n${a.message}\n\n`;
  });
  return reply;
}

async function answerMargin(tenantId) {
  // Calculate margin from sale_items table directly
  const { data: items } = await supabaseAdmin
    .from('sale_items')
    .select('mrp, unit_price, discount_pct, total, product_id, products(name, brand, cost_price, tenant_id)')
    .order('discount_pct', { ascending: false });

  if (!items || items.length === 0) {
    return "No sales data yet to analyse margins. Record some sales and I'll show you which products you're discounting the most.";
  }

  const filtered = items.filter(i => i.products?.tenant_id === tenantId);
  if (filtered.length === 0) {
    return "No sales data yet to analyse margins.";
  }

  // Aggregate by product
  const marginMap = {};
  filtered.forEach(item => {
    const pid = item.product_id;
    if (!marginMap[pid]) {
      marginMap[pid] = {
        name: item.products?.name || 'Unknown',
        brand: item.products?.brand || '',
        costPrice: parseFloat(item.products?.cost_price || 0),
        totalRevenue: 0,
        totalMrp: 0,
        totalDiscount: 0,
        count: 0,
      };
    }
    marginMap[pid].totalRevenue += parseFloat(item.unit_price);
    marginMap[pid].totalMrp += parseFloat(item.mrp);
    marginMap[pid].totalDiscount += parseFloat(item.discount_pct || 0);
    marginMap[pid].count += 1;
  });

  const sorted = Object.values(marginMap)
    .map(p => ({
      ...p,
      avgDiscount: p.count > 0 ? (p.totalDiscount / p.count).toFixed(1) : '0',
      avgSellingPrice: p.count > 0 ? Math.round(p.totalRevenue / p.count) : 0,
      avgListPrice: p.count > 0 ? Math.round(p.totalMrp / p.count) : 0,
    }))
    .sort((a, b) => parseFloat(b.avgDiscount) - parseFloat(a.avgDiscount))
    .slice(0, 5);

  let reply = `📊 **Margin analysis — most discounted items:**\n\n`;
  sorted.forEach(p => {
    const marginPct = p.costPrice > 0
      ? (((p.avgSellingPrice - p.costPrice) / p.avgSellingPrice) * 100).toFixed(1)
      : 'N/A';
    reply += `• **${p.name}** (${p.brand || 'N/A'})\n`;
    reply += `  List: ₹${p.avgListPrice} · Avg sold: ₹${p.avgSellingPrice} · Avg discount: ${p.avgDiscount}% · Margin: ${marginPct}%\n\n`;
  });
  return reply;
}

function answerGreeting() {
  return (
    "Namaste! I'm VoltAI 👋\n\n" +
    "I can help you with:\n" +
    "• **Stock levels** — \"What's low today?\"\n" +
    "• **Top sellers** — \"Which items sold most this week?\"\n" +
    "• **Reorder list** — \"What should I order from supplier?\"\n" +
    "• **Anomalies** — \"Any theft alerts?\"\n" +
    "• **Today's sales** — \"How much did I sell today?\"\n" +
    "• **Forecasts** — \"What will run out next week?\"\n" +
    "• **Margins** — \"Which products am I discounting too much?\"\n\n" +
    "What would you like to know?"
  );
}

async function answerUnknown(tenantId) {
  const today = new Date().toISOString().split('T')[0];
  const { data: salesData } = await supabaseAdmin
    .from('sales')
    .select('total')
    .eq('tenant_id', tenantId)
    .gte('sold_at', today + 'T00:00:00')
    .lte('sold_at', today + 'T23:59:59');

  const todaySales = (salesData || []).reduce((sum, s) => sum + parseFloat(s.total), 0);

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('current_stock, reorder_point')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  const lowCount = (products || []).filter(p =>
    parseFloat(p.current_stock) <= parseFloat(p.reorder_point)
  ).length;

  return (
    `I'm not sure about that specific question. Here's a quick snapshot:\n\n` +
    `• Today's sales: ₹${todaySales.toLocaleString('en-IN')}\n` +
    `• Items needing restock: ${lowCount}\n\n` +
    `Try asking: "What's low on stock?", "Top sellers this week?", or "Any alerts?"`
  );
}

// ── CACHE LAYER (in-memory, ready for Redis upgrade) ────────────────────
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value) {
  cache.set(key, { value, timestamp: Date.now() });
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

// ── MAIN ROUTE ──────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { message, tenant_id } = req.body;

  if (!message || !tenant_id) {
    return res.status(400).json({ error: 'message and tenant_id required' });
  }

  const intent = classifyIntent(message);
  const cacheKey = `${tenant_id}:${intent}`;

  // Return cached answer for same intent within 2 minutes
  const cached = getCached(cacheKey);
  if (cached && intent !== 'greeting' && intent !== 'unknown') {
    return res.json({ reply: cached, intent, cached: true });
  }

  try {
    let reply = '';

    switch (intent) {
      case 'low_stock':    reply = await answerLowStock(tenant_id);   break;
      case 'top_sellers':  reply = await answerTopSellers(tenant_id); break;
      case 'anomaly':      reply = await answerAnomalies(tenant_id);  break;
      case 'reorder':      reply = await answerReorder(tenant_id);    break;
      case 'today_sales':  reply = await answerTodaySales(tenant_id); break;
      case 'forecast':     reply = await answerForecast(tenant_id);   break;
      case 'alerts':       reply = await answerAlerts(tenant_id);     break;
      case 'margin':       reply = await answerMargin(tenant_id);     break;
      case 'greeting':     reply = answerGreeting();                  break;
      default:             reply = await answerUnknown(tenant_id);
    }

    setCache(cacheKey, reply);
    res.json({ reply, intent, cached: false });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Could not process your question. Please try again.' });
  }
});

export default router;
