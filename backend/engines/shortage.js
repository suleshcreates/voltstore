import { supabaseAdmin } from '../supabaseClient.js';

export async function runShortageDetection() {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('is_active', true);

  if (error || !products) {
    console.error('Shortage: failed to fetch products', error);
    return;
  }

  for (const product of products) {
    const pid = product.id;
    const tid = product.tenant_id;
    const stock = parseFloat(product.current_stock);
    const reorder = parseFloat(product.reorder_point);

    if (stock > reorder * 1.3) continue; // healthy — skip

    // Get units sold last 7 days for velocity
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: salesRows } = await supabaseAdmin
      .from('sale_items')
      .select('quantity, sales(sold_at)')
      .eq('product_id', pid);

    const units7d = (salesRows || [])
      .filter(r => r.sales && r.sales.sold_at >= weekAgo)
      .reduce((sum, r) => sum + parseFloat(r.quantity), 0);

    const dailyAvg = units7d / 7;
    const daysUntilOut = dailyAvg > 0 ? stock / dailyAvg : null;

    // Determine severity
    let severity;
    if (stock === 0) {
      severity = 'critical';
    } else if (daysUntilOut && daysUntilOut <= 2) {
      severity = 'critical';
    } else if (daysUntilOut && daysUntilOut <= 5) {
      severity = 'high';
    } else if (stock <= reorder) {
      severity = 'high';
    } else {
      severity = 'medium';
    }

    const reorderQty = Math.max(Math.floor(reorder * 2), 10);
    const daysStr = daysUntilOut ? ` Will run out in ~${Math.floor(daysUntilOut)} days.` : '';
    const msg =
      `Only ${stock} ${product.unit} remaining. ` +
      `Daily avg: ${dailyAvg.toFixed(1)} ${product.unit}.` +
      daysStr +
      ` Suggested reorder: ${reorderQty} ${product.unit}.`;

    // Upsert — avoid duplicate alerts
    const { data: existing } = await supabaseAdmin
      .from('alerts')
      .select('id')
      .eq('product_id', pid)
      .eq('type', 'shortage')
      .eq('is_resolved', false);

    const alert = {
      tenant_id: tid,
      product_id: pid,
      type: 'shortage',
      severity,
      title: `${product.name} (${product.brand || ''}) — ${severity === 'critical' ? 'Critically Low' : 'Low Stock'}`,
      message: msg,
      action_label: 'Reorder Now',
      action_data: {
        reorder_qty: reorderQty,
        days_until_out: daysUntilOut ? Math.floor(daysUntilOut) : null,
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
