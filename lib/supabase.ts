import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith("http") &&
  supabaseAnonKey &&
  supabaseAnonKey.length > 10
);

function createSafeSupabaseClient(): SupabaseClient {
  if (isSupabaseConfigured) {
    try {
      return createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
        realtime: {
          timeout: 5000,
        },
      });
    } catch (err) {
      console.warn("Failed to initialize Supabase client:", err);
    }
  }

  // Safe fallback mock client that prevents SSR and runtime crashes
  return {
    channel: () => ({
      on: function () {
        return this;
      },
      subscribe: () => ({
        unsubscribe: () => {},
      }),
    }),
    removeChannel: () => {},
    removeAllChannels: () => {},
  } as unknown as SupabaseClient;
}

export const supabase = createSafeSupabaseClient();
