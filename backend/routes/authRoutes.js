import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';

const router = express.Router();

router.post('/onboarding', async (req, res) => {
  const { shopName, ownerName, phone, whatsapp, city, categories } = req.body;
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
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .maybeSingle();

    let tenantId = userData?.tenant_id;

    if (!tenantId) {
      // Create new tenant
      const { data: newTenant, error: newTenantErr } = await supabaseAdmin
        .from('tenants')
        .insert({
          shop_name: shopName,
          owner_name: ownerName,
          phone,
          whatsapp: whatsapp || phone,
          city,
        })
        .select('id')
        .single();
      
      if (newTenantErr) throw newTenantErr;
      tenantId = newTenant.id;

      // Create new user
      const { error: newUserErr } = await supabaseAdmin
        .from('users')
        .insert({
          tenant_id: tenantId,
          auth_id: user.id,
          name: ownerName,
          role: 'owner',
          phone,
        });
      
      if (newUserErr) throw newUserErr;
    } else {
      // Update existing tenant
      const { error: tenantError } = await supabaseAdmin
        .from('tenants')
        .update({
          shop_name: shopName,
          owner_name: ownerName,
          phone,
          whatsapp: whatsapp || phone,
          city,
        })
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      // Update existing user
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({
          name: ownerName,
          phone,
        })
        .eq('auth_id', user.id);

      if (userError) throw userError;
    }

    // 3. Update reorder thresholds if customized tags were provided
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
