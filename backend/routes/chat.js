import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';

const router = express.Router();

// ── NLP Intent Classifier ────────────────────────────────────────────────
// Weighted keyword scoring with fuzzy matching, synonym expansion,
// multi-word phrase detection, and Hinglish support. Zero-cost, no API.

const INTENT_KEYWORDS = {
  low_stock: {
    weight: 1,
    keywords: [
      'low', 'stock', 'short', 'shortage', 'finish', 'finished', 'empty',
      'out', 'running out', 'stock out', 'reorder point', 'below',
      'less', 'depleted', 'insufficient', 'scarce', 'need more',
      'not enough', 'remaining', 'left', 'critical stock', 'danger',
      // Hinglish
      'khatam', 'kam', 'nahi hai', 'kuch nahi', 'bacha', 'thoda',
      'kitna bacha', 'stock kam', 'khatam hone wala',
    ],
    phrases: [
      'whats low', 'what is low', 'low stock', 'out of stock', 'running low',
      'stock status', 'stock check', 'need to order', 'almost finished',
      'about to finish', 'stock level', 'inventory check', 'inventory status',
    ],
  },
  top_sellers: {
    weight: 1,
    keywords: [
      'top', 'best', 'seller', 'selling', 'sold', 'popular', 'trending',
      'fast', 'fastest', 'moving', 'hot', 'demand', 'performing',
      'performer', 'winner', 'highest', 'most', 'maximum', 'rank',
      // Hinglish
      'sabse', 'zyada', 'bikta', 'bikne', 'chalte', 'hit',
    ],
    phrases: [
      'top seller', 'best seller', 'most sold', 'fast moving', 'top selling',
      'best selling', 'highest selling', 'which items sell', 'what sells',
      'popular items', 'trending items', 'what moved', 'weekly top',
    ],
  },
  anomaly: {
    weight: 1.2, // higher weight — important alerts
    keywords: [
      'theft', 'steal', 'stolen', 'anomaly', 'missing', 'discrepancy',
      'suspicious', 'mismatch', 'count', 'miscount', 'shrinkage',
      'pilferage', 'loss', 'unaccounted', 'variance', 'differ',
      // Hinglish
      'chori', 'gayab', 'galat', 'gadbad', 'ghotala',
    ],
    phrases: [
      'theft alert', 'any theft', 'stock mismatch', 'something missing',
      'inventory mismatch', 'stock discrepancy', 'anomaly detected',
      'suspicious activity', 'stock count', 'physical count',
    ],
  },
  reorder: {
    weight: 1,
    keywords: [
      'reorder', 'order', 'supplier', 'purchase', 'buy', 'procure',
      'replenish', 'refill', 'restock', 'supply', 'vendor', 'distributor',
      'wholesale', 'bulk', 'indent',
      // Hinglish
      'mangana', 'manga', 'mangwao', 'order karo', 'lena', 'khareed',
    ],
    phrases: [
      'what to order', 'what to reorder', 'reorder list', 'order list',
      'need to buy', 'purchase list', 'supplier order', 'what should i order',
      'restock list', 'replenish list',
    ],
  },
  today_sales: {
    weight: 1,
    keywords: [
      'today', 'sales', 'sale', 'revenue', 'income', 'earning',
      'turnover', 'collection', 'amount', 'business', 'money',
      // Hinglish
      'aaj', 'bikri', 'paisa', 'kitna', 'hua', 'kamai', 'karobar',
    ],
    phrases: [
      'today sale', 'todays sale', 'how much sold', 'how much sale',
      'total sales', 'daily sales', 'today revenue', 'kitna hua',
      'aaj kitna', 'kitna bikaa', 'sales today', 'today business',
      'how much did i sell', 'how much i sold', 'total collection',
    ],
  },
  forecast: {
    weight: 1,
    keywords: [
      'forecast', 'predict', 'prediction', 'future', 'next', 'week',
      'month', 'demand', 'expected', 'projection', 'estimate', 'upcoming',
      'anticipate', 'outlook', 'plan', 'planning', 'ahead',
      // Hinglish
      'aage', 'aane wala', 'agla', 'bhavishya',
    ],
    phrases: [
      'next week', 'next month', 'demand forecast', 'what will sell',
      'sales forecast', 'predict demand', 'stock forecast', 'run out',
      'will run out', 'when will', 'going to finish', 'stock prediction',
    ],
  },
  alerts: {
    weight: 1,
    keywords: [
      'alert', 'alerts', 'warning', 'warnings', 'critical', 'urgent',
      'notification', 'notify', 'issue', 'problem', 'attention',
      'danger', 'risk', 'flag', 'flagged',
      // Hinglish
      'khabar', 'chetawni', 'dikkat', 'samasya',
    ],
    phrases: [
      'any alerts', 'show alerts', 'active alerts', 'what alerts',
      'any warnings', 'any issues', 'any problems', 'needs attention',
      'whats wrong', 'any danger',
    ],
  },
  margin: {
    weight: 1,
    keywords: [
      'margin', 'profit', 'discount', 'discounting', 'bargain', 'markup',
      'cost', 'pricing', 'price', 'loss', 'earning', 'percentage',
      'undercut', 'cheap', 'expensive',
      // Hinglish
      'munafa', 'fayda', 'nuksaan', 'sasta', 'mehnga', 'bachat',
    ],
    phrases: [
      'margin check', 'profit margin', 'discount analysis', 'price analysis',
      'too much discount', 'where losing', 'losing money', 'most discounted',
      'am i discounting', 'profit analysis', 'margin analysis',
    ],
  },
  greeting: {
    weight: 0.8, // lower weight — catch only clear greetings
    keywords: [
      'hello', 'hi', 'hey', 'help', 'start', 'menu', 'options',
      // Hinglish
      'namaste', 'namaskar', 'kaise', 'kya',
    ],
    phrases: [
      'what can you do', 'kya kar sakte', 'how to use', 'show me',
      'good morning', 'good evening', 'how are you',
    ],
  },
};

// Generate bigrams for fuzzy matching
function bigrams(str) {
  const s = str.toLowerCase();
  const result = new Set();
  for (let i = 0; i < s.length - 1; i++) {
    result.add(s.slice(i, i + 2));
  }
  return result;
}

// Dice coefficient similarity (0-1)
function similarity(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

// Tokenize message into words and n-grams
function tokenize(message) {
  const clean = message.toLowerCase().replace(/[?!.,;:'"()]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ');
  const tokens = [...words];
  // Add bigrams (2-word phrases)
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(words[i] + ' ' + words[i + 1]);
  }
  // Add trigrams (3-word phrases)
  for (let i = 0; i < words.length - 2; i++) {
    tokens.push(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
  }
  return { words, tokens, fullText: clean };
}

const FUZZY_THRESHOLD = 0.65;
const CONFIDENCE_THRESHOLD = 1.5;

function classifyIntent(message) {
  const { words, tokens, fullText } = tokenize(message);
  const scores = {};

  for (const [intent, config] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;

    // 1. Exact keyword matching
    for (const keyword of config.keywords) {
      if (keyword.includes(' ')) {
        // Multi-word keyword — check in full text
        if (fullText.includes(keyword)) {
          score += 2 * config.weight;
        }
      } else {
        // Single-word keyword — check in word list
        if (words.includes(keyword)) {
          score += 1.5 * config.weight;
        }
      }
    }

    // 2. Phrase matching (higher bonus)
    for (const phrase of config.phrases) {
      if (fullText.includes(phrase)) {
        score += 3 * config.weight;
      }
    }

    // 3. Fuzzy matching for typo tolerance
    for (const word of words) {
      if (word.length < 3) continue; // skip tiny words
      for (const keyword of config.keywords) {
        if (keyword.includes(' ')) continue; // skip phrase keywords
        if (keyword.length < 3) continue;
        const sim = similarity(word, keyword);
        if (sim >= FUZZY_THRESHOLD && !words.includes(keyword)) {
          score += sim * config.weight;
        }
      }
    }

    scores[intent] = score;
  }

  // Find the winner
  let bestIntent = 'unknown';
  let bestScore = 0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Require minimum confidence
  if (bestScore < CONFIDENCE_THRESHOLD) {
    return 'unknown';
  }

  return bestIntent;
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
