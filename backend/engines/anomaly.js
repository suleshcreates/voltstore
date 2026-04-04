import { supabaseAdmin } from '../supabaseClient.js';

export async function runAnomalyDetection() {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('is_active', true);

  if (error || !products) {
    console.error('Anomaly: failed to fetch products', error);
    return;
  }

  for (const product of products) {
    const pid = product.id;
    const tid = product.tenant_id;
    const current = parseFloat(product.current_stock);

    // Expected = opening + purchases + returns - sales - damage
    const { data: movements } = await supabaseAdmin
      .from('stock_movements')
      .select('type, quantity')
      .eq('product_id', pid);

    if (!movements || movements.length === 0) continue;

    let expected = 0;
    for (const m of movements) {
      const qty = parseFloat(m.quantity);
      if (['purchase', 'return', 'opening'].includes(m.type)) {
        expected += qty;
      } else if (['sale', 'damage'].includes(m.type)) {
        expected -= qty;
      } else if (m.type === 'adjustment') {
        expected += qty; // can be negative
      }
    }

    const discrepancy = expected - current;

    // Flag only meaningful discrepancies
    if (expected <= 0 || discrepancy < 5) continue;
    const discPct = (discrepancy / expected) * 100;
    if (discPct < 15) continue;

    const severity = discrepancy >= 10 && discPct >= 25 ? 'critical' : 'high';

    const { data: existing } = await supabaseAdmin
      .from('alerts')
      .select('id')
      .eq('product_id', pid)
      .eq('type', 'anomaly')
      .eq('is_resolved', false);

    const alert = {
      tenant_id: tid,
      product_id: pid,
      type: 'anomaly',
      severity,
      title: `${product.name} (${product.brand || ''}) — Stock Discrepancy Detected`,
      message:
        `${Math.floor(discrepancy)} ${product.unit} missing with no matching sales record. ` +
        `Expected: ${Math.floor(expected)}, Current: ${Math.floor(current)}. ` +
        `Possible theft or miscounting (${discPct.toFixed(1)}% discrepancy).`,
      action_label: 'Investigate',
      action_data: {
        expected_stock: Math.floor(expected),
        current_stock: Math.floor(current),
        missing_units: Math.floor(discrepancy),
        discrepancy_pct: Math.round(discPct * 10) / 10,
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
