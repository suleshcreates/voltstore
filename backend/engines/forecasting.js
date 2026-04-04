import { supabaseAdmin } from '../supabaseClient.js';

export async function runForecasting() {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const prevWeek = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('is_active', true);

  if (error || !products) {
    console.error('Forecasting: failed to fetch products', error);
    return;
  }

  for (const product of products) {
    const pid = product.id;
    const tid = product.tenant_id;
    const stock = parseFloat(product.current_stock);

    // Get all sale_items for this product
    const { data: allItems } = await supabaseAdmin
      .from('sale_items')
      .select('quantity, sales(sold_at)')
      .eq('product_id', pid);

    if (!allItems) continue;

    const unitsBetween = (from, to) =>
      allItems
        .filter(r => r.sales && r.sales.sold_at >= from && (!to || r.sales.sold_at < to))
        .reduce((sum, r) => sum + parseFloat(r.quantity), 0);

    const units30d = unitsBetween(monthAgo);
    const units7d = unitsBetween(weekAgo);
    const unitsPrev7d = unitsBetween(prevWeek, weekAgo);

    if (units30d === 0) continue; // no sales history — skip

    const dailyAvg = units30d / 30;
    const trendFactor = Math.min(Math.max(
      unitsPrev7d > 0 ? units7d / unitsPrev7d : 1.0,
      0.5), 2.0);

    const predicted7d = dailyAvg * 7 * trendFactor;
    const adjustedDaily = dailyAvg * trendFactor;
    const daysUntilOut = adjustedDaily > 0 ? Math.floor(stock / adjustedDaily) : null;

    // Confidence based on data richness
    const daysWithData = Math.min(30, Math.floor(units30d / Math.max(dailyAvg, 0.1)));
    const confidence =
      daysWithData >= 25 ? 0.85 :
      daysWithData >= 14 ? 0.65 :
      daysWithData >= 7  ? 0.45 : 0.25;

    // Upsert forecast
    await supabaseAdmin.from('forecasts').upsert({
      tenant_id: tid,
      product_id: pid,
      forecast_date: today,
      predicted_qty: Math.round(predicted7d * 10) / 10,
      confidence: Math.round(confidence * 1000) / 1000,
      model_used: 'rule_based_v1',
      days_until_out: daysUntilOut,
    }, { onConflict: 'product_id,forecast_date' });

    // Create forecast alert if running out soon
    if (daysUntilOut !== null && daysUntilOut <= 5) {
      const { data: existing } = await supabaseAdmin
        .from('alerts')
        .select('id')
        .eq('product_id', pid)
        .eq('type', 'forecast')
        .eq('is_resolved', false);

      const reorderQty = Math.max(Math.floor(parseFloat(product.reorder_point) * 2), 10);
      const alert = {
        tenant_id: tid,
        product_id: pid,
        type: 'forecast',
        severity: daysUntilOut <= 2 ? 'critical' : 'high',
        title: `${product.name} — Stock Depletion Warning`,
        message:
          `At current sales rate, stock will run out in ~${daysUntilOut} days. ` +
          `Current: ${stock} ${product.unit}. ` +
          `Daily avg: ${dailyAvg.toFixed(1)}. ` +
          `Suggested reorder: ${reorderQty} ${product.unit}.`,
        action_label: 'Reorder Now',
        action_data: {
          days_until_out: daysUntilOut,
          suggested_reorder: reorderQty,
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
}
