/** Hand-written Supabase types matching supabase/migrations/20260926000000_init.sql. */

export type SocialProvider = 'instagram'
export type SocialAccountStatus = 'connected' | 'expired' | 'revoked' | 'disconnected'

export type SocialAccountRow = {
  id: string
  organization_id: string
  client_id: string
  provider: SocialProvider
  provider_account_id: string
  username: string | null
  account_type: string | null
  encrypted_access_token: string
  token_key_version: number
  token_expires_at: string | null
  token_refreshed_at: string | null
  scopes: string[]
  status: SocialAccountStatus
  created_at: string
  updated_at: string
}

export type SocialAccountInsert = {
  id?: string
  organization_id: string
  client_id: string
  provider: SocialProvider
  provider_account_id: string
  username?: string | null
  account_type?: string | null
  encrypted_access_token: string
  token_key_version?: number
  token_expires_at?: string | null
  token_refreshed_at?: string | null
  scopes?: string[]
  status?: SocialAccountStatus
  created_at?: string
  updated_at?: string
}

export type SocialAccountUpdate = Partial<SocialAccountInsert>

export type OAuthStateRow = {
  id: string
  state_hash: string
  provider: SocialProvider
  client_id: string
  organization_id: string
  sanity_user_id: string
  browser_binding_hash: string | null
  launched_at: string | null
  consumed_at: string | null
  expires_at: string
  created_at: string
}

export type OAuthStateInsert = {
  id?: string
  state_hash: string
  provider: SocialProvider
  client_id: string
  organization_id: string
  sanity_user_id: string
  browser_binding_hash?: string | null
  launched_at?: string | null
  consumed_at?: string | null
  expires_at: string
  created_at?: string
}

export type OAuthStateUpdate = Partial<OAuthStateInsert>

export type Database = {
  public: {
    Tables: {
      social_accounts: {
        Row: SocialAccountRow
        Insert: SocialAccountInsert
        Update: SocialAccountUpdate
        Relationships: []
      }
      oauth_states: {
        Row: OAuthStateRow
        Insert: OAuthStateInsert
        Update: OAuthStateUpdate
        Relationships: []
      }
    }
    Views: {[_ in never]: never}
    Functions: {
      delete_expired_oauth_states: {Args: Record<string, never>; Returns: number}
    }
    Enums: {[_ in never]: never}
    CompositeTypes: {[_ in never]: never}
  }
}
