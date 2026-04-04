import { supabaseAdmin } from '../supabaseClient.js';

export async function runHotItemDetection() {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('is_active', true);

  if (error || !products) {
    console.error('HotItems: failed to fetch products', error);
    return;
  }

  for (const product of products) {
    const pid = product.id;
    const tid = product.tenant_id;

    // Get all sale_items for this product
    const { data: allItems } = await supabaseAdmin
      .from('sale_items')
      .select('quantity, total, sales(sold_at)')
      .eq('product_id', pid);

    if (!allItems || allItems.length === 0) continue;

    const unitsBetween = (from, to) =>
      allItems
        .filter(r => r.sales && r.sales.sold_at >= from && (!to || r.sales.sold_at < to))
        .reduce((sum, r) => sum + parseFloat(r.quantity), 0);

    const units7d = unitsBetween(weekAgo);
    const units30d = unitsBetween(monthAgo);
    const weeklyAvg = (units30d / 30) * 7;

    if (weeklyAvg < 1) continue;

    const spikePct = ((units7d - weeklyAvg) / weeklyAvg) * 100;
    if (spikePct < 100) continue; // not hot enough

    const severity =
      spikePct >= 400 ? 'critical' :
      spikePct >= 200 ? 'high' : 'medium';

    // Revenue this week
    const revenue7d = allItems
      .filter(r => r.sales && r.sales.sold_at >= weekAgo)
      .reduce((sum, r) => sum + parseFloat(r.total), 0);

    const { data: existing } = await supabaseAdmin
      .from('alerts')
      .select('id')
      .eq('product_id', pid)
      .eq('type', 'hot_item')
      .eq('is_resolved', false);

    const alert = {
      tenant_id: tid,
      product_id: pid,
      type: 'hot_item',
      severity,
      title: `${product.name} (${product.brand || ''}) — Velocity Spike`,
      message:
        `Selling ${spikePct.toFixed(0)}% above normal. ` +
        `${units7d.toFixed(0)} ${product.unit} sold this week ` +
        `vs ${weeklyAvg.toFixed(0)} weekly average. ` +
        `Revenue: ₹${revenue7d.toLocaleString('en-IN')}. Stock may deplete faster than expected.`,
      action_label: 'View Trend',
      action_data: {
        velocity_7d: Math.round(units7d * 10) / 10,
        velocity_avg: Math.round(weeklyAvg * 10) / 10,
        spike_pct: Math.round(spikePct * 10) / 10,
        revenue_7d: Math.round(revenue7d * 100) / 100,
      },
      is_read: false,
      is_resolved: false,
    };

    if (existing && existing.length > 0) {
      await supabaseAdmin.from('alerts').update(alert).eq('id', existing[0].id);
    } else {
      await supabaseAdmin.from('alerts').insert(alert);
    }
  }
}
