import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  throw new Error('Supabase configuration is missing. Please check your environment variables.');
}

if (supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
  console.error('❌ Supabase credentials are literal "undefined" strings!');
  throw new Error('Environment variables are not being loaded correctly.');
}

console.log('✅ Supabase URL configured:', supabaseUrl);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
