// Temporary workaround for Supabase client types during development
import { supabase as originalSupabase } from '@/integrations/supabase/client';

// Create a typed wrapper that bypasses type checking during development
export const supabaseClient = {
  from: (table: string) => (originalSupabase as any).from(table),
  auth: originalSupabase.auth,
  storage: originalSupabase.storage,
  functions: originalSupabase.functions,
  channel: originalSupabase.channel.bind(originalSupabase),
};