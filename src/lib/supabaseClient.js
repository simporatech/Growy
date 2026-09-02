import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://tbvkbnxocwnnropvtgpu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_UuW9bgQ2wLEgsv7et4H4Xg_QvdANLlI';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
