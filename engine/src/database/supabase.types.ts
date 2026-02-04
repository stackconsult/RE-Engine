// Generated database types for RE Engine Supabase integration
// Based on current CSV schema and business requirements

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      approvals: {
        Row: {
          approval_id: string;
          ts_created: string;
          lead_id: string;
          channel: 'email' | 'whatsapp' | 'telegram' | 'linkedin' | 'facebook';
          action_type: 'send' | 'reply' | 'forward' | 'draft';
          draft_subject: string | null;
          draft_text: string;
          draft_to: string;
          status: 'draft' | 'pending' | 'approved' | 'rejected' | 'sent' | 'failed';
          approved_by: string | null;
          approved_at: string | null;
          notes: string | null;
          metadata: Json | null;
          idempotency_key: string | null;
          retry_count: number | null;
          last_retry_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          ts_created?: never;
          lead_id: string;
          channel: 'email' | 'whatsapp' | 'telegram' | 'linkedin' | 'facebook';
          action_type: 'send' | 'reply' | 'forward' | 'draft';
          draft_subject?: string | null;
          draft_text: string;
          draft_to: string;
          status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'sent' | 'failed';
          approved_by?: string | null;
          approved_at?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          idempotency_key?: string | null;
          retry_count?: number | null;
          last_retry_at?: string | null;
          created_at?: never;
          updated_at?: never;
        };
        Update: {
          ts_created?: never;
          lead_id?: string;
          channel?: 'email' | 'whatsapp' | 'telegram' | 'linkedin' | 'facebook';
          action_type?: 'send' | 'reply' | 'forward' | 'draft';
          draft_subject?: string | null;
          draft_text?: string;
          draft_to?: string;
          status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'sent' | 'failed';
          approved_by?: string | null;
          approved_at?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          idempotency_key?: string | null;
          retry_count?: number | null;
          last_retry_at?: string | null;
          created_at?: never;
          updated_at?: never;
        };
      };
      leads: {
        Row: {
          lead_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone_e164: string | null;
          city: string | null;
          province: string | null;
          source: string;
          tags: string[] | null;
          status: 'active' | 'inactive' | 'dnc' | 'bounced' | 'unsubscribed';
          created_at: string;
          updated_at: string;
          metadata: Json | null;
          last_contacted_at: string | null;
          contact_count: number | null;
        };
        Insert: {
          lead_id?: never;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone_e164?: string | null;
          city?: string | null;
          province?: string | null;
          source: string;
          tags?: string[] | null;
          status?: 'active' | 'inactive' | 'dnc' | 'bounced' | 'unsubscribed';
          created_at?: never;
          updated_at?: never;
          metadata?: Json | null;
          last_contacted_at?: string | null;
          contact_count?: number | null;
        };
        Update: {
          lead_id?: never;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone_e164?: string | null;
          city?: string | null;
          province?: string | null;
          source?: string;
          tags?: string[] | null;
          status?: 'active' | 'inactive' | 'dnc' | 'bounced' | 'unsubscribed';
          created_at?: never;
          updated_at?: never;
          metadata?: Json | null;
          last_contacted_at?: string | null;
          contact_count?: number | null;
        };
      };
      events: {
        Row: {
          event_id: string;
          event_type: string;
          source: string;
          data: Json | null;
          timestamp: string;
          metadata: Json | null;
        };
        Insert: {
          event_id?: never;
          event_type: string;
          source: string;
          data?: Json | null;
          timestamp?: never;
          metadata?: Json | null;
        };
        Update: {
          event_id?: never;
          event_type?: string;
          source?: string;
          data?: Json | null;
          timestamp?: never;
          metadata?: Json | null;
        };
      };
      contacts: {
        Row: {
          contact_id: string;
          channel: string;
          identifier: string;
          display_name: string | null;
          verified: boolean;
          created_at: string;
          updated_at: string;
          metadata: Json | null;
        };
        Insert: {
          contact_id?: never;
          channel: string;
          identifier: string;
          display_name?: string | null;
          verified?: boolean;
          created_at?: never;
          updated_at?: never;
          metadata?: Json | null;
        };
        Update: {
          contact_id?: never;
          channel?: string;
          identifier?: string;
          display_name?: string | null;
          verified?: boolean;
          created_at?: never;
          updated_at?: never;
          metadata?: Json | null;
        };
      };
      identities: {
        Row: {
          identity_id: string;
          platform: string;
          profile_url: string | null;
          auth_status: string;
          cookies: string | null;
          credentials: string | null;
          last_used: string | null;
          created_at: string;
          updated_at: string;
          metadata: Json | null;
        };
        Insert: {
          identity_id?: never;
          platform: string;
          profile_url?: string | null;
          auth_status?: string;
          cookies?: string | null;
          credentials?: string | null;
          last_used?: string | null;
          created_at?: never;
          updated_at?: never;
          metadata?: Json | null;
        };
        Update: {
          identity_id?: never;
          platform?: string;
          profile_url?: string | null;
          auth_status?: string;
          cookies?: string | null;
          credentials?: string | null;
          last_used?: string | null;
          created_at?: never;
          updated_at?: never;
          metadata?: Json | null;
        };
      };
      icp_profiles: {
        Row: {
          icp_id: string;
          name: string;
          description: string | null;
          criteria_locations: Json;
          criteria_investment: Json;
          criteria_professional: Json;
          criteria_behavior: Json;
          criteria_platforms: Json;
          settings_maxLeadsPerDay: number;
          settings_discoveryFrequency: string;
          settings_confidenceThreshold: number;
          settings_excludeDuplicates: boolean;
          settings_enrichmentEnabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          icp_id?: never;
          name: string;
          description?: string | null;
          criteria_locations: Json;
          criteria_investment: Json;
          criteria_professional: Json;
          criteria_behavior: Json;
          criteria_platforms: Json;
          settings_maxLeadsPerDay?: number;
          settings_discoveryFrequency?: string;
          settings_confidenceThreshold?: number;
          settings_excludeDuplicates?: boolean;
          settings_enrichmentEnabled?: boolean;
          created_at?: never;
          updated_at?: never;
        };
        Update: {
          icp_id?: never;
          name?: string;
          description?: string | null;
          criteria_locations?: Json;
          criteria_investment?: Json;
          criteria_professional?: Json;
          criteria_behavior?: Json;
          criteria_platforms?: Json;
          settings_maxLeadsPerDay?: number;
          settings_discoveryFrequency?: string;
          settings_confidenceThreshold?: number;
          settings_excludeDuplicates?: boolean;
          settings_enrichmentEnabled?: boolean;
          created_at?: never;
          updated_at?: never;
        };
      };
    };
  };
}

// Helper types for common operations
export type Approval = Database['public']['Tables']['approvals']['Row'];
export type ApprovalInsert = Database['public']['Tables']['approvals']['Insert'];
export type ApprovalUpdate = Database['public']['Tables']['approvals']['Update'];

export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadInsert = Database['public']['Tables']['leads']['Insert'];
export type LeadUpdate = Database['public']['Tables']['leads']['Update'];

export type Event = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];

export type Contact = Database['public']['Tables']['contacts']['Row'];
export type ContactInsert = Database['public']['Tables']['contacts']['Insert'];

export type Identity = Database['public']['Tables']['identities']['Row'];
export type IdentityInsert = Database['public']['Tables']['identities']['Insert'];

export type ICPProfile = Database['public']['Tables']['icp_profiles']['Row'];
export type ICPProfileInsert = Database['public']['Tables']['icp_profiles']['Insert'];
