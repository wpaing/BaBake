
import { createClient } from '@supabase/supabase-js';

// In a real production environment, these are injected via environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const isPlaceholder = supabaseUrl.includes('placeholder') || supabaseAnonKey === 'placeholder';

// Create the real client instance
// @ts-ignore - We know the types might mismatch if we are in placeholder mode, but it's fine for runtime
const realClient = isPlaceholder ? null : createClient(supabaseUrl, supabaseAnonKey);

/**
 * World-class Proxy wrapper to handle placeholder environments.
 * If the credentials are placeholders, we intercept auth-related methods
 * to return mock data instead of performing real network requests
 * that would result in "Failed to fetch" console errors.
 */
export const supabase = isPlaceholder ? new Proxy({} as any, {
  get(target, prop) {
    if (prop === 'auth') {
      return {
        getSession: async () => ({
          data: {
            session: {
              user: { email: 'designer@babake.pro', id: 'mock-user-123' },
              access_token: 'mock-token'
            }
          },
          error: null
        }),
        onAuthStateChange: (callback: any) => {
          // Immediately trigger the callback with the mock session
          callback('SIGNED_IN', { user: { email: 'designer@babake.pro' } });
          return {
            data: {
              subscription: {
                unsubscribe: () => { }
              }
            }
          };
        },
        signInWithPassword: async () => ({
          data: {
            session: { user: { email: 'designer@babake.pro' } }
          },
          error: null
        }),
        signInWithOAuth: async (options: any) => {
          console.log("Mock OAuth sign in with:", options);
          return {
            data: {
              url: 'http://localhost:5173', // Mock redirect
              provider: options.provider
            },
            error: null
          };
        },
        signUp: async () => ({
          data: {
            user: { email: 'designer@babake.pro' }
          },
          error: null
        }),
        signOut: async () => ({ error: null }),
      };
    }
    return (target as any)[prop];
  }
}) : realClient!;
