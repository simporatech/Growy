import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tbvkbnxocwnnropvtgpu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UuW9bgQ2wLEgsv7et4H4Xg_QvdANLlI';

console.log('📡 [Supabase Client] Inicializado con URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
