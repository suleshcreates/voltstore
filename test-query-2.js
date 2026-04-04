import { createClient } from '@supabase/supabase-js';

// Hardcode envs for this quick test based on user's project
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const envUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const envKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(envUrl, envKey);

async function test() {
  console.log('Logging in...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'suleshwaghmare7875@gmail.com',
    password: 'pass123'
  });
  if (authErr) return console.error('Auth Error:', authErr.message);

  const user = authData.user;
  console.log('Logged in. User ID:', user.id);

  console.log('Wait 2s before querying to avoid any instant cancellation...');
  await new Promise(r => setTimeout(r, 2000));

  console.log('Querying users table for tenant_id...');
  
  // Set a timeout to catch hang
  const timeoutId = setTimeout(() => {
    console.error('HANG DETECTED: Query took longer than 5 seconds!');
    process.exit(1);
  }, 5000);

  console.log('Executing step 1:');
  const userRes = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single();
    
  console.log('Executing step 2:');
  const tenantRes = await supabase
    .from('tenants')
    .select('shop_name, city')
    .eq('id', userRes.data.tenant_id)
    .single();
    
  clearTimeout(timeoutId);

  console.log('Result:', { userData: userRes.data, tenantData: tenantRes.data });
}

test();
