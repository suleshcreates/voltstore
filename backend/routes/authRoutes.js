import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';

const router = express.Router();

router.post('/onboarding', async (req, res) => {
  const {
    shopName, ownerName, phone, whatsapp, city, state,
    shopType, gstNumber, onboardingStep, categories,
  } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // 1. Verify the user's JWT
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 2. See if user record already exists
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .maybeSingle();

    let tenantId = userData?.tenant_id;

    // Build tenant payload from whatever was sent
    const tenantPayload = {};
    if (shopName !== undefined)   tenantPayload.shop_name = shopName;
    if (ownerName !== undefined)  tenantPayload.owner_name = ownerName;
    if (phone !== undefined)      tenantPayload.phone = phone;
    if (whatsapp !== undefined)   tenantPayload.whatsapp = whatsapp;
    if (city !== undefined)       tenantPayload.city = city;
    if (state !== undefined)      tenantPayload.state = state;
    if (shopType !== undefined)   tenantPayload.shop_type = shopType;
    if (gstNumber !== undefined)  tenantPayload.gst_number = gstNumber || null;
    if (onboardingStep !== undefined) tenantPayload.onboarding_step = onboardingStep;

    if (!tenantId) {
      // Create new tenant
      const { data: newTenant, error: newTenantErr } = await supabaseAdmin
        .from('tenants')
        .insert({
          shop_name: shopName || 'My Shop',
          owner_name: ownerName || '',
          phone: phone || whatsapp || '',
          whatsapp: whatsapp || phone || '',
          city: city || '',
          state: state || '',
          shop_type: shopType || 'retail',
          gst_number: gstNumber || null,
          onboarding_step: onboardingStep || 0,
        })
        .select('id')
        .single();

      if (newTenantErr) throw newTenantErr;
      tenantId = newTenant.id;

      // Create new user record
      const { error: newUserErr } = await supabaseAdmin
        .from('users')
        .insert({
          tenant_id: tenantId,
          auth_id: user.id,
          name: ownerName || user.user_metadata?.owner_name || '',
          email: user.email,
          role: 'owner',
          phone: phone || whatsapp || '',
        });

      if (newUserErr) throw newUserErr;
    } else {
      // Update existing tenant (partial update — only sent fields)
      if (Object.keys(tenantPayload).length > 0) {
        const { error: tenantError } = await supabaseAdmin
          .from('tenants')
          .update(tenantPayload)
          .eq('id', tenantId);
        if (tenantError) throw tenantError;
      }

      // Update existing user
      const userPayload = {};
      if (ownerName !== undefined) userPayload.name = ownerName;
      if (phone !== undefined)     userPayload.phone = phone;
      if (Object.keys(userPayload).length > 0) {
        await supabaseAdmin.from('users').update(userPayload).eq('auth_id', user.id);
      }
    }

    // 3. Update reorder thresholds if categories provided
    if (categories && categories.length > 0) {
      await supabaseAdmin.from('reorder_thresholds').delete().eq('tenant_id', tenantId);

      const newThresholds = categories.map(cat => ({
        tenant_id: tenantId,
        category: cat,
        threshold: cat === 'Wires' ? 30 : 15,
        unit: cat === 'Wires' ? 'meters' : 'pcs',
      }));
      await supabaseAdmin.from('reorder_thresholds').insert(newThresholds);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Onboarding Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

export default router;
