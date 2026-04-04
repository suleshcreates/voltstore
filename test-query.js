import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log('Logging in...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'suleshwaghmare7875@gmail.com',
    password: 'pass123'
  });
  if (authErr) return console.error('Auth Error:', authErr.message);

  const user = authData.user;
  console.log('Logged in. User ID:', user.id);

  console.log('Querying users table for tenant_id...');
  
  // Set a timeout to catch hang
  const timeoutId = setTimeout(() => {
    console.error('HANG DETECTED: Query took longer than 5 seconds!');
    process.exit(1);
  }, 5000);

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single();
    
  clearTimeout(timeoutId);

  console.log('Result:', { userData, userError });
}

test();
