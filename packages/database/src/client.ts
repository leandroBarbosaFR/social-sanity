import {createClient, type SupabaseClient} from '@supabase/supabase-js'
import type {SupabaseConfig} from './env'
import type {Database} from './types'

export type ServiceClient = SupabaseClient<Database>

/**
 * Service-role Supabase client. Bypasses RLS: use on the server only, never ship to a browser.
 */
export function createServiceClient(config: SupabaseConfig): ServiceClient {
  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
    global: {headers: {'X-Client-Info': 'social-studio-server'}},
  })
}
