import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ [Supabase Client] Variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY no encontradas en el entorno (.env / Vercel).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
