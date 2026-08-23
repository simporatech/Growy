import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ [Supabase Client] Variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY no encontradas. Verifique su archivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
