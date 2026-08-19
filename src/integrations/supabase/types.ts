export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          is_hidden: boolean
          slug: string
          sort_order: number
          tier: string
          title: string
          xp_reward: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          is_hidden?: boolean
          slug: string
          sort_order?: number
          tier?: string
          title: string
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          is_hidden?: boolean
          slug?: string
          sort_order?: number
          tier?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          age_max: number | null
          age_min: number | null
          budget_daily_cents: number
          budget_total_cents: number
          clicks_count: number
          created_at: string
          currency: string
          end_at: string | null
          engagements_count: number
          geo_cities: string[]
          geo_countries: string[]
          id: string
          impressions_count: number
          interests: string[]
          name: string
          objective: Database["public"]["Enums"]["ad_objective"]
          owner_id: string
          placements: Database["public"]["Enums"]["ad_placement"][]
          spent_cents: number
          start_at: string | null
          status: Database["public"]["Enums"]["ad_status"]
          targeting: Json
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          budget_daily_cents?: number
          budget_total_cents?: number
          clicks_count?: number
          created_at?: string
          currency?: string
          end_at?: string | null
          engagements_count?: number
          geo_cities?: string[]
          geo_countries?: string[]
          id?: string
          impressions_count?: number
          interests?: string[]
          name: string
          objective: Database["public"]["Enums"]["ad_objective"]
          owner_id: string
          placements?: Database["public"]["Enums"]["ad_placement"][]
          spent_cents?: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          targeting?: Json
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          budget_daily_cents?: number
          budget_total_cents?: number
          clicks_count?: number
          created_at?: string
          currency?: string
          end_at?: string | null
          engagements_count?: number
          geo_cities?: string[]
          geo_countries?: string[]
          id?: string
          impressions_count?: number
          interests?: string[]
          name?: string
          objective?: Database["public"]["Enums"]["ad_objective"]
          owner_id?: string
          placements?: Database["public"]["Enums"]["ad_placement"][]
          spent_cents?: number
          start_at?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          targeting?: Json
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          body: string | null
          campaign_id: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          headline: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["ad_creative_kind"]
          media_url: string | null
          ref_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          body?: string | null
          campaign_id: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["ad_creative_kind"]
          media_url?: string | null
          ref_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          body?: string | null
          campaign_id?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["ad_creative_kind"]
          media_url?: string | null
          ref_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_events: {
        Row: {
          campaign_id: string
          created_at: string
          creative_id: string | null
          id: number
          kind: Database["public"]["Enums"]["ad_event_kind"]
          meta: Json
          placement: Database["public"]["Enums"]["ad_placement"] | null
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creative_id?: string | null
          id?: number
          kind: Database["public"]["Enums"]["ad_event_kind"]
          meta?: Json
          placement?: Database["public"]["Enums"]["ad_placement"] | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creative_id?: string | null
          id?: number
          kind?: Database["public"]["Enums"]["ad_event_kind"]
          meta?: Json
          placement?: Database["public"]["Enums"]["ad_placement"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_placements: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          duration_days: number
          id: string
          is_available: boolean
          key: string
          label: string
          price_cents: number
          sort: number
          targeting: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_available?: boolean
          key: string
          label: string
          price_cents?: number
          sort?: number
          targeting?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_available?: boolean
          key?: string
          label?: string
          price_cents?: number
          sort?: number
          targeting?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ad_requests: {
        Row: {
          admin_notes: string | null
          audience: string | null
          budget_cents: number
          campaign_id: string | null
          campaign_name: string
          contact_info: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          currency: string
          description: string | null
          end_date: string | null
          id: string
          invoice_id: string | null
          media: Json
          objective: string
          placements: string[]
          price_cents: number | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          service_fee_cents: number | null
          start_date: string | null
          status: string
          target_cities: string[]
          target_countries: string[]
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          audience?: string | null
          budget_cents?: number
          campaign_id?: string | null
          campaign_name: string
          contact_info?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          currency?: string
          description?: string | null
          end_date?: string | null
          id?: string
          invoice_id?: string | null
          media?: Json
          objective?: string
          placements?: string[]
          price_cents?: number | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_fee_cents?: number | null
          start_date?: string | null
          status?: string
          target_cities?: string[]
          target_countries?: string[]
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          audience?: string | null
          budget_cents?: number
          campaign_id?: string | null
          campaign_name?: string
          contact_info?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          currency?: string
          description?: string | null
          end_date?: string | null
          id?: string
          invoice_id?: string | null
          media?: Json
          objective?: string
          placements?: string[]
          price_cents?: number | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_fee_cents?: number | null
          start_date?: string | null
          status?: string
          target_cities?: string[]
          target_countries?: string[]
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_requests_invoice_fk"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_permissions: {
        Row: {
          created_at: string
          label: string | null
          scopes: string[]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          label?: string | null
          scopes?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          label?: string | null
          scopes?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_support_sessions: {
        Row: {
          actions: Json
          admin_id: string
          ended_at: string | null
          expires_at: string
          id: string
          notes: string | null
          reason: string
          started_at: string
          target_user_id: string
        }
        Insert: {
          actions?: Json
          admin_id: string
          ended_at?: string | null
          expires_at: string
          id?: string
          notes?: string | null
          reason: string
          started_at?: string
          target_user_id: string
        }
        Update: {
          actions?: Json
          admin_id?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          notes?: string | null
          reason?: string
          started_at?: string
          target_user_id?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          budget_cents: number
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          media_url: string | null
          starts_at: string | null
          target_url: string | null
          title: string
          vendor_id: string
        }
        Insert: {
          budget_cents?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          media_url?: string | null
          starts_at?: string | null
          target_url?: string | null
          title: string
          vendor_id: string
        }
        Update: {
          budget_cents?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          media_url?: string | null
          starts_at?: string | null
          target_url?: string | null
          title?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: number
          props: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: number
          props?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: number
          props?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          prefix: string
          revoked_at?: string | null
          scopes?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      appeals: {
        Row: {
          action_id: string | null
          created_at: string
          id: string
          message: string
          reviewer_id: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_id?: string | null
          created_at?: string
          id?: string
          message: string
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_id?: string | null
          created_at?: string
          id?: string
          message?: string
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "moderation_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          meta: Json
          target_id: string | null
          target_kind: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: number
          meta?: Json
          target_id?: string | null
          target_kind?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: number
          meta?: Json
          target_id?: string | null
          target_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          scheduled_at: string
          service_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          scheduled_at: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          scheduled_at?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          rating: number
          reviewer_id: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_id: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_id?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          qty: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          qty?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          qty?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_entries: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          post_id: string
          user_id: string
          votes_count: number
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          votes_count?: number
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_entries_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_entry_votes: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entry_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "challenge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      club_badges: {
        Row: {
          awarded_at: string
          club_id: string
          code: string
          id: string
          label: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          club_id: string
          code: string
          id?: string
          label: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          club_id?: string
          code?: string
          id?: string
          label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_badges_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_join_requests: {
        Row: {
          club_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          message: string | null
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_join_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          activity_score: number
          banner_url: string | null
          category: string
          cover_url: string | null
          created_at: string
          description: string | null
          hashtags: string[]
          id: string
          is_private: boolean
          join_policy: string
          location: string | null
          members_count: number
          name: string
          owner_id: string
          rules: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          activity_score?: number
          banner_url?: string | null
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          hashtags?: string[]
          id?: string
          is_private?: boolean
          join_policy?: string
          location?: string | null
          members_count?: number
          name: string
          owner_id: string
          rules?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          activity_score?: number
          banner_url?: string | null
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          hashtags?: string[]
          id?: string
          is_private?: boolean
          join_policy?: string
          location?: string | null
          members_count?: number
          name?: string
          owner_id?: string
          rules?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_articles: {
        Row: {
          author_id: string | null
          body: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_banners: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          slot: string
          sort: number
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          slot: string
          sort?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          slot?: string
          sort?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      collab_requests: {
        Row: {
          brand_name: string
          brand_website: string | null
          budget_cents: number | null
          campaign_type: string | null
          created_at: string
          creator_id: string
          currency: string | null
          id: string
          message: string
          read_at: string | null
          responded_at: string | null
          sender_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          brand_name: string
          brand_website?: string | null
          budget_cents?: number | null
          campaign_type?: string | null
          created_at?: string
          creator_id: string
          currency?: string | null
          id?: string
          message: string
          read_at?: string | null
          responded_at?: string | null
          sender_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          brand_name?: string
          brand_website?: string | null
          budget_cents?: number | null
          campaign_type?: string | null
          created_at?: string
          creator_id?: string
          currency?: string | null
          id?: string
          message?: string
          read_at?: string | null
          responded_at?: string | null
          sender_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_pois: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          id: string
          is_hidden: boolean
          kind: string
          lat: number
          lng: number
          name: string
          note: string | null
          region: string | null
          upvotes_count: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_hidden?: boolean
          kind?: string
          lat: number
          lng: number
          name: string
          note?: string | null
          region?: string | null
          upvotes_count?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_hidden?: boolean
          kind?: string
          lat?: number
          lng?: number
          name?: string
          note?: string | null
          region?: string | null
          upvotes_count?: number
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          club_id: string | null
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          last_message_at: string | null
          title: string | null
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          title?: string | null
        }
        Update: {
          club_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      crash_reports: {
        Row: {
          app_version: string | null
          context: Json
          created_at: string
          id: string
          mechanism: string | null
          message: string
          platform: string | null
          route: string | null
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          context?: Json
          created_at?: string
          id?: string
          mechanism?: string | null
          message: string
          platform?: string | null
          route?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          context?: Json
          created_at?: string
          id?: string
          mechanism?: string | null
          message?: string
          platform?: string | null
          route?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      creator_profiles: {
        Row: {
          accepts_collabs: boolean
          approved_at: string | null
          category: string
          collab_email: string | null
          created_at: string
          featured_post_ids: string[] | null
          id: string
          is_featured: boolean
          is_verified: boolean
          portfolio_url: string | null
          social_links: Json | null
          status: string
          subscribers_count: number
          tagline: string | null
          tips_total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accepts_collabs?: boolean
          approved_at?: string | null
          category?: string
          collab_email?: string | null
          created_at?: string
          featured_post_ids?: string[] | null
          id?: string
          is_featured?: boolean
          is_verified?: boolean
          portfolio_url?: string | null
          social_links?: Json | null
          status?: string
          subscribers_count?: number
          tagline?: string | null
          tips_total_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accepts_collabs?: boolean
          approved_at?: string | null
          category?: string
          collab_email?: string | null
          created_at?: string
          featured_post_ids?: string[] | null
          id?: string
          is_featured?: boolean
          is_verified?: boolean
          portfolio_url?: string | null
          social_links?: Json | null
          status?: string
          subscribers_count?: number
          tagline?: string | null
          tips_total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          creator_id: string
          current_period_end: string | null
          id: string
          status: string
          subscriber_id: string
          tier_id: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          creator_id: string
          current_period_end?: string | null
          id?: string
          status?: string
          subscriber_id: string
          tier_id?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          creator_id?: string
          current_period_end?: string | null
          id?: string
          status?: string
          subscriber_id?: string
          tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "creator_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tiers: {
        Row: {
          benefits: string[]
          created_at: string
          creator_id: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          benefits?: string[]
          created_at?: string
          creator_id: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          benefits?: string[]
          created_at?: string
          creator_id?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_tiers_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_tips: {
        Row: {
          amount_cents: number
          context: string | null
          created_at: string
          creator_id: string
          currency: string
          id: string
          message: string | null
          post_id: string | null
          supporter_id: string
        }
        Insert: {
          amount_cents: number
          context?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          id?: string
          message?: string | null
          post_id?: string | null
          supporter_id: string
        }
        Update: {
          amount_cents?: number
          context?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          id?: string
          message?: string | null
          post_id?: string | null
          supporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_tips_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_tips_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          admin_id: string | null
          body: string
          created_at: string
          done_at: string | null
          due_at: string | null
          id: string
          kind: string
          lead_id: string
        }
        Insert: {
          admin_id?: string | null
          body: string
          created_at?: string
          done_at?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          lead_id: string
        }
        Update: {
          admin_id?: string | null
          body?: string
          created_at?: string
          done_at?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          archived_at: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string
          email: string | null
          id: string
          kind: string
          name: string
          next_follow_up_at: string | null
          notes: string | null
          owner_admin_id: string | null
          phone: string | null
          source: string | null
          stage: string
          updated_at: string
          user_id: string | null
          value_cents: number
          vendor_id: string | null
        }
        Insert: {
          archived_at?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          email?: string | null
          id?: string
          kind?: string
          name: string
          next_follow_up_at?: string | null
          notes?: string | null
          owner_admin_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          user_id?: string | null
          value_cents?: number
          vendor_id?: string | null
        }
        Update: {
          archived_at?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          email?: string | null
          id?: string
          kind?: string
          name?: string
          next_follow_up_at?: string | null
          notes?: string | null
          owner_admin_id?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
          user_id?: string | null
          value_cents?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_stage_fkey"
            columns: ["stage"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "crm_leads_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          key: string
          label: string
          sort: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          key: string
          label: string
          sort?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          key?: string
          label?: string
          sort?: number
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string
          id: string
          label: string | null
          last_seen_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      drag_challenges: {
        Row: {
          challenger_id: string
          created_at: string
          expires_at: string
          id: string
          match_id: string | null
          message: string | null
          opponent_id: string
          stake_xp: number
          status: string
          strip_mode: string
          tree_mode: string
          updated_at: string
        }
        Insert: {
          challenger_id: string
          created_at?: string
          expires_at?: string
          id?: string
          match_id?: string | null
          message?: string | null
          opponent_id: string
          stake_xp?: number
          status?: string
          strip_mode?: string
          tree_mode?: string
          updated_at?: string
        }
        Update: {
          challenger_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          match_id?: string | null
          message?: string | null
          opponent_id?: string
          stake_xp?: number
          status?: string
          strip_mode?: string
          tree_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      drag_match_telemetry: {
        Row: {
          accuracy_m: number | null
          created_at: string
          distance_m: number
          id: number
          lat: number | null
          lng: number | null
          match_id: string
          rider_id: string
          speed_kmh: number
          t_ms: number
        }
        Insert: {
          accuracy_m?: number | null
          created_at?: string
          distance_m?: number
          id?: number
          lat?: number | null
          lng?: number | null
          match_id: string
          rider_id: string
          speed_kmh?: number
          t_ms: number
        }
        Update: {
          accuracy_m?: number | null
          created_at?: string
          distance_m?: number
          id?: number
          lat?: number | null
          lng?: number | null
          match_id?: string
          rider_id?: string
          speed_kmh?: number
          t_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "drag_match_telemetry_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "drag_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      drag_matches: {
        Row: {
          challenge_id: string | null
          created_at: string
          green_at: string | null
          id: string
          margin_s: number | null
          ready_a: boolean
          ready_b: boolean
          result_a: Json | null
          result_b: Json | null
          rider_a: string
          rider_b: string
          stake_xp: number
          status: string
          strip_mode: string
          tree_mode: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          green_at?: string | null
          id?: string
          margin_s?: number | null
          ready_a?: boolean
          ready_b?: boolean
          result_a?: Json | null
          result_b?: Json | null
          rider_a: string
          rider_b: string
          stake_xp?: number
          status?: string
          strip_mode?: string
          tree_mode?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          green_at?: string | null
          id?: string
          margin_s?: number | null
          ready_a?: boolean
          ready_b?: boolean
          result_a?: Json | null
          result_b?: Json | null
          rider_a?: string
          rider_b?: string
          stake_xp?: number
          status?: string
          strip_mode?: string
          tree_mode?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drag_matches_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "drag_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      drag_run_points: {
        Row: {
          accuracy_m: number | null
          altitude_m: number | null
          created_at: string
          heading: number | null
          id: string
          lat: number
          lng: number
          run_id: string
          speed_kmh: number | null
          t_ms: number
        }
        Insert: {
          accuracy_m?: number | null
          altitude_m?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          run_id: string
          speed_kmh?: number | null
          t_ms: number
        }
        Update: {
          accuracy_m?: number | null
          altitude_m?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          run_id?: string
          speed_kmh?: number | null
          t_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "drag_run_points_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "drag_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      drag_runs: {
        Row: {
          anti_cheat_notes: string | null
          aspiration: string | null
          created_at: string
          distance_m: number | null
          duration_s: number | null
          eighth_mile_s: number | null
          eighth_mile_trap_kmh: number | null
          ended_at: string | null
          engine_cc: number | null
          fuel_type: string | null
          id: string
          launch_g: number | null
          location_label: string | null
          location_lat: number | null
          location_lng: number | null
          modifications: string | null
          notes: string | null
          quarter_mile_s: number | null
          quarter_mile_trap_kmh: number | null
          reaction_time_s: number | null
          sixty_to_120_kmh_s: number | null
          started_at: string | null
          status: string
          temp_c: number | null
          top_speed_kmh: number | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
          vehicle_kind: string
          vehicle_name: string | null
          verification_score: number | null
          verified_at: string | null
          verified_by: string | null
          visibility: string
          weather: string | null
          weight_class: string | null
          weight_kg: number | null
          zero_to_100_kmh_s: number | null
          zero_to_60_kmh_s: number | null
        }
        Insert: {
          anti_cheat_notes?: string | null
          aspiration?: string | null
          created_at?: string
          distance_m?: number | null
          duration_s?: number | null
          eighth_mile_s?: number | null
          eighth_mile_trap_kmh?: number | null
          ended_at?: string | null
          engine_cc?: number | null
          fuel_type?: string | null
          id?: string
          launch_g?: number | null
          location_label?: string | null
          location_lat?: number | null
          location_lng?: number | null
          modifications?: string | null
          notes?: string | null
          quarter_mile_s?: number | null
          quarter_mile_trap_kmh?: number | null
          reaction_time_s?: number | null
          sixty_to_120_kmh_s?: number | null
          started_at?: string | null
          status?: string
          temp_c?: number | null
          top_speed_kmh?: number | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
          vehicle_kind: string
          vehicle_name?: string | null
          verification_score?: number | null
          verified_at?: string | null
          verified_by?: string | null
          visibility?: string
          weather?: string | null
          weight_class?: string | null
          weight_kg?: number | null
          zero_to_100_kmh_s?: number | null
          zero_to_60_kmh_s?: number | null
        }
        Update: {
          anti_cheat_notes?: string | null
          aspiration?: string | null
          created_at?: string
          distance_m?: number | null
          duration_s?: number | null
          eighth_mile_s?: number | null
          eighth_mile_trap_kmh?: number | null
          ended_at?: string | null
          engine_cc?: number | null
          fuel_type?: string | null
          id?: string
          launch_g?: number | null
          location_label?: string | null
          location_lat?: number | null
          location_lng?: number | null
          modifications?: string | null
          notes?: string | null
          quarter_mile_s?: number | null
          quarter_mile_trap_kmh?: number | null
          reaction_time_s?: number | null
          sixty_to_120_kmh_s?: number | null
          started_at?: string | null
          status?: string
          temp_c?: number | null
          top_speed_kmh?: number | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
          vehicle_kind?: string
          vehicle_name?: string | null
          verification_score?: number | null
          verified_at?: string | null
          verified_by?: string | null
          visibility?: string
          weather?: string | null
          weight_class?: string | null
          weight_kg?: number | null
          zero_to_100_kmh_s?: number | null
          zero_to_60_kmh_s?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drag_runs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          relation: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          relation?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          relation?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          event_id: string
          id: string
          title: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          event_id: string
          id?: string
          title?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          event_id?: string
          id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checkins: {
        Row: {
          created_at: string
          event_id: string
          lat: number | null
          lng: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          lat?: number | null
          lng?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          lat?: number | null
          lng?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_comments: {
        Row: {
          body: string
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invites: {
        Row: {
          created_at: string
          event_id: string
          invitee_id: string
          inviter_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          invitee_id: string
          inviter_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          invitee_id?: string
          inviter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id: string
          id?: string
          media_type?: string
          media_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          cancelled_at: string | null
          category: string
          club_id: string | null
          comments_count: number
          contact_email: string | null
          contact_phone: string | null
          cover_url: string | null
          cover_video_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_type: string
          gps_lat: number | null
          gps_lng: number | null
          guest_limit: number | null
          hashtags: string[]
          host_id: string
          id: string
          is_featured: boolean
          location: string | null
          max_attendees: number | null
          photos_count: number
          rsvp_count: number
          rules: string | null
          starts_at: string
          status: string
          timezone: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          address?: string | null
          cancelled_at?: string | null
          category?: string
          club_id?: string | null
          comments_count?: number
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          cover_video_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          gps_lat?: number | null
          gps_lng?: number | null
          guest_limit?: number | null
          hashtags?: string[]
          host_id: string
          id?: string
          is_featured?: boolean
          location?: string | null
          max_attendees?: number | null
          photos_count?: number
          rsvp_count?: number
          rules?: string | null
          starts_at: string
          status?: string
          timezone?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          address?: string | null
          cancelled_at?: string | null
          category?: string
          club_id?: string | null
          comments_count?: number
          contact_email?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          cover_video_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          gps_lat?: number | null
          gps_lng?: number | null
          guest_limit?: number | null
          hashtags?: string[]
          host_id?: string
          id?: string
          is_featured?: boolean
          location?: string | null
          max_attendees?: number | null
          photos_count?: number
          rsvp_count?: number
          rules?: string | null
          starts_at?: string
          status?: string
          timezone?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          audience: Json
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          rollout_percent: number
          updated_at: string
        }
        Insert: {
          audience?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          rollout_percent?: number
          updated_at?: string
        }
        Update: {
          audience?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          rollout_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags_v2: {
        Row: {
          category: string
          description: string | null
          enabled: boolean
          key: string
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          description?: string | null
          enabled?: boolean
          key: string
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          enabled?: boolean
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fee_rules: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string | null
          ends_at: string | null
          fixed_cents: number
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["txn_kind"]
          label: string
          max_fee_cents: number | null
          min_fee_cents: number
          notes: string | null
          percent_bps: number
          priority: number
          scope: Database["public"]["Enums"]["fee_scope"]
          scope_value: string | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          ends_at?: string | null
          fixed_cents?: number
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["txn_kind"]
          label: string
          max_fee_cents?: number | null
          min_fee_cents?: number
          notes?: string | null
          percent_bps?: number
          priority?: number
          scope?: Database["public"]["Enums"]["fee_scope"]
          scope_value?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          ends_at?: string | null
          fixed_cents?: number
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["txn_kind"]
          label?: string
          max_fee_cents?: number | null
          min_fee_cents?: number
          notes?: string | null
          percent_bps?: number
          priority?: number
          scope?: Database["public"]["Enums"]["fee_scope"]
          scope_value?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          ip: string | null
          target_id: string | null
          target_kind: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip?: string | null
          target_id?: string | null
          target_kind?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          ip?: string | null
          target_id?: string | null
          target_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_challenges: {
        Row: {
          badge_slug: string | null
          cadence: string
          created_at: string
          description: string
          ends_at: string | null
          goal_count: number
          goal_kind: string
          id: string
          is_active: boolean
          slug: string
          starts_at: string
          title: string
          xp_reward: number
        }
        Insert: {
          badge_slug?: string | null
          cadence?: string
          created_at?: string
          description: string
          ends_at?: string | null
          goal_count?: number
          goal_kind: string
          id?: string
          is_active?: boolean
          slug: string
          starts_at?: string
          title: string
          xp_reward?: number
        }
        Update: {
          badge_slug?: string | null
          cadence?: string
          created_at?: string
          description?: string
          ends_at?: string | null
          goal_count?: number
          goal_kind?: string
          id?: string
          is_active?: boolean
          slug?: string
          starts_at?: string
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "gamification_challenges_badge_slug_fkey"
            columns: ["badge_slug"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["slug"]
          },
        ]
      }
      group_ride_members: {
        Row: {
          group_ride_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_ride_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_ride_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_ride_members_group_ride_id_fkey"
            columns: ["group_ride_id"]
            isOneToOne: false
            referencedRelation: "group_rides"
            referencedColumns: ["id"]
          },
        ]
      }
      group_ride_pings: {
        Row: {
          battery: number | null
          created_at: string
          group_ride_id: string
          heading: number | null
          id: number
          lat: number
          lng: number
          speed_kmh: number | null
          user_id: string
        }
        Insert: {
          battery?: number | null
          created_at?: string
          group_ride_id: string
          heading?: number | null
          id?: number
          lat: number
          lng: number
          speed_kmh?: number | null
          user_id: string
        }
        Update: {
          battery?: number | null
          created_at?: string
          group_ride_id?: string
          heading?: number | null
          id?: number
          lat?: number
          lng?: number
          speed_kmh?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_ride_pings_group_ride_id_fkey"
            columns: ["group_ride_id"]
            isOneToOne: false
            referencedRelation: "group_rides"
            referencedColumns: ["id"]
          },
        ]
      }
      group_rides: {
        Row: {
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          join_code: string
          meet_label: string | null
          meet_lat: number | null
          meet_lng: number | null
          started_at: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          join_code: string
          meet_label?: string | null
          meet_lat?: number | null
          meet_lng?: number | null
          started_at?: string
          status?: string
          title?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          join_code?: string
          meet_label?: string | null
          meet_lat?: number | null
          meet_lng?: number | null
          started_at?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      hashtags: {
        Row: {
          created_at: string
          id: string
          tag: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          tag: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          tag?: string
          usage_count?: number
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          qty: number
          sort: number
          total_cents: number
          unit_cents: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          qty?: number
          sort?: number
          total_cents?: number
          unit_cents?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          qty?: number
          sort?: number
          total_cents?: number
          unit_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          discount_cents: number
          due_at: string | null
          fee_cents: number
          id: string
          issued_at: string
          kind: string
          meta: Json
          number: string
          order_id: string | null
          paid_at: string | null
          status: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_cents?: number
          due_at?: string | null
          fee_cents?: number
          id?: string
          issued_at?: string
          kind?: string
          meta?: Json
          number: string
          order_id?: string | null
          paid_at?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_cents?: number
          due_at?: string | null
          fee_cents?: number
          id?: string
          issued_at?: string
          kind?: string
          meta?: Json
          number?: string
          order_id?: string | null
          paid_at?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_entries: {
        Row: {
          ai_comments: string | null
          awards: string[]
          category_scores: Json
          city: string | null
          country: string | null
          created_at: string
          defects: Json
          display_name: string
          engine_cc: number | null
          engine_score: number | null
          event_id: string
          exhaust_score: number | null
          fraud_score: number | null
          highlights: Json
          id: string
          make: string | null
          model: string | null
          overall_score: number | null
          processing_error: string | null
          scored_at: string | null
          status: string
          submitted_at: string | null
          suggestions: Json
          updated_at: string
          user_id: string
          vehicle_id: string | null
          vehicle_type: string
          year: number | null
        }
        Insert: {
          ai_comments?: string | null
          awards?: string[]
          category_scores?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          defects?: Json
          display_name: string
          engine_cc?: number | null
          engine_score?: number | null
          event_id: string
          exhaust_score?: number | null
          fraud_score?: number | null
          highlights?: Json
          id?: string
          make?: string | null
          model?: string | null
          overall_score?: number | null
          processing_error?: string | null
          scored_at?: string | null
          status?: string
          submitted_at?: string | null
          suggestions?: Json
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
          vehicle_type?: string
          year?: number | null
        }
        Update: {
          ai_comments?: string | null
          awards?: string[]
          category_scores?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          defects?: Json
          display_name?: string
          engine_cc?: number | null
          engine_score?: number | null
          event_id?: string
          exhaust_score?: number | null
          fraud_score?: number | null
          highlights?: Json
          id?: string
          make?: string | null
          model?: string | null
          overall_score?: number | null
          processing_error?: string | null
          scored_at?: string | null
          status?: string
          submitted_at?: string | null
          suggestions?: Json
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
          vehicle_type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "judge_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "judge_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_entries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_entry_media: {
        Row: {
          created_at: string
          duration_ms: number | null
          entry_id: string
          height: number | null
          id: string
          kind: string
          mime: string | null
          order_index: number
          sha256: string | null
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          entry_id: string
          height?: number | null
          id?: string
          kind: string
          mime?: string | null
          order_index?: number
          sha256?: string | null
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          entry_id?: string
          height?: number | null
          id?: string
          kind?: string
          mime?: string | null
          order_index?: number
          sha256?: string | null
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "judge_entry_media_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "judge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_events: {
        Row: {
          award_categories: Json
          category_weights: Json
          cover_url: string | null
          created_at: string
          description: string | null
          host_id: string | null
          id: string
          is_public: boolean
          judged_at: string | null
          registration_closes_at: string | null
          registration_opens_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          vehicle_types: string[]
        }
        Insert: {
          award_categories?: Json
          category_weights?: Json
          cover_url?: string | null
          created_at?: string
          description?: string | null
          host_id?: string | null
          id?: string
          is_public?: boolean
          judged_at?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          vehicle_types?: string[]
        }
        Update: {
          award_categories?: Json
          category_weights?: Json
          cover_url?: string | null
          created_at?: string
          description?: string | null
          host_id?: string | null
          id?: string
          is_public?: boolean
          judged_at?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          vehicle_types?: string[]
        }
        Relationships: []
      }
      judge_flags: {
        Row: {
          created_at: string
          created_by: string | null
          detail: string | null
          entry_id: string
          id: string
          reason: string
          resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          detail?: string | null
          entry_id: string
          id?: string
          reason: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          detail?: string | null
          entry_id?: string
          id?: string
          reason?: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judge_flags_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "judge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_leaderboard_cache: {
        Row: {
          entry_id: string
          event_id: string | null
          id: string
          rank: number
          refreshed_at: string
          scope: string
          scope_key: string | null
          score: number
        }
        Insert: {
          entry_id: string
          event_id?: string | null
          id?: string
          rank: number
          refreshed_at?: string
          scope: string
          scope_key?: string | null
          score: number
        }
        Update: {
          entry_id?: string
          event_id?: string | null
          id?: string
          rank?: number
          refreshed_at?: string
          scope?: string
          scope_key?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "judge_leaderboard_cache_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "judge_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_leaderboard_cache_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "judge_events"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_filters: {
        Row: {
          created_at: string
          id: string
          keyword: string
          match_type: string
          scope: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          match_type?: string
          scope?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          match_type?: string
          scope?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          account: Database["public"]["Enums"]["ledger_account"]
          amount_cents: number
          created_at: string
          currency: string
          direction: string
          id: string
          memo: string | null
          party_id: string | null
          transaction_id: string
        }
        Insert: {
          account: Database["public"]["Enums"]["ledger_account"]
          amount_cents: number
          created_at?: string
          currency?: string
          direction: string
          id?: string
          memo?: string | null
          party_id?: string | null
          transaction_id: string
        }
        Update: {
          account?: Database["public"]["Enums"]["ledger_account"]
          amount_cents?: number
          created_at?: string
          currency?: string
          direction?: string
          id?: string
          memo?: string | null
          party_id?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photos: {
        Row: {
          created_at: string
          height: number | null
          id: string
          is_video: boolean
          listing_id: string
          sort_order: number
          thumbnail_url: string | null
          url: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          is_video?: boolean
          listing_id: string
          sort_order?: number
          thumbnail_url?: string | null
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          is_video?: boolean
          listing_id?: string
          sort_order?: number
          thumbnail_url?: string | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reports: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          note: string | null
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["listing_report_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          note?: string | null
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["listing_report_status"]
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          note?: string | null
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["listing_report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "listing_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_saves: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_saves_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          brand: string | null
          category: Database["public"]["Enums"]["listing_category"]
          city: string | null
          color: string | null
          condition: Database["public"]["Enums"]["listing_condition"]
          country: string | null
          created_at: string
          currency: string
          description: string | null
          engine_cc: number | null
          expires_at: string | null
          fuel_type: Database["public"]["Enums"]["listing_fuel"]
          hero_image_url: string | null
          id: string
          is_featured: boolean
          is_negotiable: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          mileage_km: number | null
          model: string | null
          photos_count: number
          price_cents: number
          published_at: string | null
          region: string | null
          saves_count: number
          seller_id: string
          shares_count: number
          sold_at: string | null
          status: Database["public"]["Enums"]["listing_status"]
          subcategory: string | null
          tags: string[]
          title: string
          transmission: Database["public"]["Enums"]["listing_transmission"]
          updated_at: string
          vehicle_id: string | null
          views_count: number
          vin: string | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          category?: Database["public"]["Enums"]["listing_category"]
          city?: string | null
          color?: string | null
          condition?: Database["public"]["Enums"]["listing_condition"]
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          engine_cc?: number | null
          expires_at?: string | null
          fuel_type?: Database["public"]["Enums"]["listing_fuel"]
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean
          is_negotiable?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          mileage_km?: number | null
          model?: string | null
          photos_count?: number
          price_cents: number
          published_at?: string | null
          region?: string | null
          saves_count?: number
          seller_id: string
          shares_count?: number
          sold_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          subcategory?: string | null
          tags?: string[]
          title: string
          transmission?: Database["public"]["Enums"]["listing_transmission"]
          updated_at?: string
          vehicle_id?: string | null
          views_count?: number
          vin?: string | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          category?: Database["public"]["Enums"]["listing_category"]
          city?: string | null
          color?: string | null
          condition?: Database["public"]["Enums"]["listing_condition"]
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          engine_cc?: number | null
          expires_at?: string | null
          fuel_type?: Database["public"]["Enums"]["listing_fuel"]
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean
          is_negotiable?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          mileage_km?: number | null
          model?: string | null
          photos_count?: number
          price_cents?: number
          published_at?: string | null
          region?: string | null
          saves_count?: number
          seller_id?: string
          shares_count?: number
          sold_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          subcategory?: string | null
          tags?: string[]
          title?: string
          transmission?: Database["public"]["Enums"]["listing_transmission"]
          updated_at?: string
          vehicle_id?: string | null
          views_count?: number
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_state: {
        Row: {
          global_enabled: boolean
          id: number
          message: string | null
          scheduled_until: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          global_enabled?: boolean
          id?: number
          message?: string | null
          scheduled_until?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          global_enabled?: boolean
          id?: number
          message?: string | null
          scheduled_until?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          media_url: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          media_url?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          media_url?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          created_at: string
          duration_hours: number | null
          expires_at: string | null
          id: string
          issued_by: string | null
          meta: Json
          reason: string | null
          status: string
          target_id: string | null
          target_kind: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          duration_hours?: number | null
          expires_at?: string | null
          id?: string
          issued_by?: string | null
          meta?: Json
          reason?: string | null
          status?: string
          target_id?: string | null
          target_kind?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          duration_hours?: number | null
          expires_at?: string | null
          id?: string
          issued_by?: string | null
          meta?: Json
          reason?: string | null
          status?: string
          target_id?: string | null
          target_kind?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      module_maintenance: {
        Row: {
          enabled: boolean
          message: string | null
          module_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          message?: string | null
          module_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          message?: string | null
          module_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_maintenance_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: true
            referencedRelation: "feature_flags_v2"
            referencedColumns: ["key"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          bookings: boolean
          comments: boolean
          email_enabled: boolean
          events: boolean
          follows: boolean
          likes: boolean
          marketplace: boolean
          mentions: boolean
          messages: boolean
          orders: boolean
          push_enabled: boolean
          subscriptions: boolean
          updated_at: string
          user_id: string
          vendor_updates: boolean
        }
        Insert: {
          bookings?: boolean
          comments?: boolean
          email_enabled?: boolean
          events?: boolean
          follows?: boolean
          likes?: boolean
          marketplace?: boolean
          mentions?: boolean
          messages?: boolean
          orders?: boolean
          push_enabled?: boolean
          subscriptions?: boolean
          updated_at?: string
          user_id: string
          vendor_updates?: boolean
        }
        Update: {
          bookings?: boolean
          comments?: boolean
          email_enabled?: boolean
          events?: boolean
          follows?: boolean
          likes?: boolean
          marketplace?: boolean
          mentions?: boolean
          messages?: boolean
          orders?: boolean
          push_enabled?: boolean
          subscriptions?: boolean
          updated_at?: string
          user_id?: string
          vendor_updates?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload: Json
          pushed_at: string | null
          read_at: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload?: Json
          pushed_at?: string | null
          read_at?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          payload?: Json
          pushed_at?: string | null
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          quantity: number
          unit_price_cents: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          currency: string
          id: string
          net_cents: number
          platform_fee_cents: number
          status: Database["public"]["Enums"]["order_status"]
          total_cents: number
          transaction_id: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency?: string
          id?: string
          net_cents?: number
          platform_fee_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_cents: number
          transaction_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          net_cents?: number
          platform_fee_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_cents?: number
          transaction_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string
          id: string
          ip: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: string
          ip?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: string
          ip?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      owner_broadcasts: {
        Row: {
          active: boolean
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          severity: string
          title: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          severity?: string
          title: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          severity?: string
          title?: string
        }
        Relationships: []
      }
      payment_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "payment_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          fee_bps: number
          id: string
          net_cents: number
          order_id: string | null
          platform_fee_cents: number
          provider: string
          provider_ref: string | null
          status: string
          subscription_id: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          fee_bps?: number
          id?: string
          net_cents?: number
          order_id?: string | null
          platform_fee_cents?: number
          provider?: string
          provider_ref?: string | null
          status?: string
          subscription_id?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          fee_bps?: number
          id?: string
          net_cents?: number
          order_id?: string | null
          platform_fee_cents?: number
          provider?: string
          provider_ref?: string | null
          status?: string
          subscription_id?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_batches: {
        Row: {
          created_at: string
          currency: string
          id: string
          payouts_count: number
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["payout_status"]
          total_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          payouts_count?: number
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["payout_status"]
          total_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          payouts_count?: number
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["payout_status"]
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount_cents: number
          batch_id: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          method: string | null
          paid_at: string | null
          provider_ref: string | null
          scheduled_for: string | null
          seller_id: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          batch_id?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          provider_ref?: string | null
          scheduled_for?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          batch_id?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          provider_ref?: string | null
          scheduled_for?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payout_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      post_drafts: {
        Row: {
          author_id: string
          caption: string | null
          club_id: string | null
          created_at: string
          hashtags: string[]
          id: string
          is_subscribers_only: boolean
          kind: string
          media_urls: string[]
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          caption?: string | null
          club_id?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          is_subscribers_only?: boolean
          kind?: string
          media_urls?: string[]
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          caption?: string | null
          club_id?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          is_subscribers_only?: boolean
          kind?: string
          media_urls?: string[]
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_drafts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hashtags: {
        Row: {
          hashtag_id: string
          post_id: string
        }
        Insert: {
          hashtag_id: string
          post_id: string
        }
        Update: {
          hashtag_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          caption: string | null
          club_id: string | null
          comments_count: number
          created_at: string
          deleted_at: string | null
          id: string
          is_announcement: boolean
          is_hidden: boolean
          is_pinned: boolean
          is_reel: boolean
          is_story: boolean
          kind: Database["public"]["Enums"]["post_kind"]
          likes_count: number
          media_url: string | null
          poll: Json | null
          shares_count: number
          story_expires_at: string | null
          telemetry: Json | null
          thumbnail_url: string | null
          updated_at: string
          vehicle_id: string | null
          views_count: number
        }
        Insert: {
          author_id: string
          caption?: string | null
          club_id?: string | null
          comments_count?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_announcement?: boolean
          is_hidden?: boolean
          is_pinned?: boolean
          is_reel?: boolean
          is_story?: boolean
          kind?: Database["public"]["Enums"]["post_kind"]
          likes_count?: number
          media_url?: string | null
          poll?: Json | null
          shares_count?: number
          story_expires_at?: string | null
          telemetry?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
          vehicle_id?: string | null
          views_count?: number
        }
        Update: {
          author_id?: string
          caption?: string | null
          club_id?: string | null
          comments_count?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_announcement?: boolean
          is_hidden?: boolean
          is_pinned?: boolean
          is_reel?: boolean
          is_story?: boolean
          kind?: Database["public"]["Enums"]["post_kind"]
          likes_count?: number
          media_url?: string | null
          poll?: Json | null
          shares_count?: number
          story_expires_at?: string | null
          telemetry?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
          vehicle_id?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_memberships: {
        Row: {
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          price_cents: number
          renews_at: string | null
          started_at: string
          status: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          price_cents?: number
          renews_at?: string | null
          started_at?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          price_cents?: number
          renews_at?: string | null
          started_at?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_cents: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_cents: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_cents?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_contacts: {
        Row: {
          business_address: string | null
          contact_email: string | null
          contact_phone: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          business_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          business_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allow_messages: string
          avatar_url: string | null
          bio: string | null
          contact_dm_enabled: boolean
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          featured_badge_slug: string | null
          followers_count: number
          following_count: number
          handle: string | null
          id: string
          is_business: boolean
          is_premium: boolean
          is_private: boolean
          is_suspended: boolean
          is_verified: boolean
          last_checkin_at: string | null
          level: number
          listings_count: number
          location: string | null
          posts_count: number
          profile_theme: string
          referral_code: string | null
          seller_rating_avg: number
          seller_reviews_count: number
          streak_days: number
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          tier: Database["public"]["Enums"]["rider_tier"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          website: string | null
          xp_total: number
        }
        Insert: {
          allow_messages?: string
          avatar_url?: string | null
          bio?: string | null
          contact_dm_enabled?: boolean
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          featured_badge_slug?: string | null
          followers_count?: number
          following_count?: number
          handle?: string | null
          id: string
          is_business?: boolean
          is_premium?: boolean
          is_private?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          last_checkin_at?: string | null
          level?: number
          listings_count?: number
          location?: string | null
          posts_count?: number
          profile_theme?: string
          referral_code?: string | null
          seller_rating_avg?: number
          seller_reviews_count?: number
          streak_days?: number
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          tier?: Database["public"]["Enums"]["rider_tier"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          xp_total?: number
        }
        Update: {
          allow_messages?: string
          avatar_url?: string | null
          bio?: string | null
          contact_dm_enabled?: boolean
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          featured_badge_slug?: string | null
          followers_count?: number
          following_count?: number
          handle?: string | null
          id?: string
          is_business?: boolean
          is_premium?: boolean
          is_private?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          last_checkin_at?: string | null
          level?: number
          listings_count?: number
          location?: string | null
          posts_count?: number
          profile_theme?: string
          referral_code?: string | null
          seller_rating_avg?: number
          seller_reviews_count?: number
          streak_days?: number
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          tier?: Database["public"]["Enums"]["rider_tier"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          xp_total?: number
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          description: string
          id: string
          purchase_order_id: string
          qty: number
          stock_item_id: string | null
          total_cents: number
          unit_cents: number
        }
        Insert: {
          description: string
          id?: string
          purchase_order_id: string
          qty?: number
          stock_item_id?: string | null
          total_cents?: number
          unit_cents?: number
        }
        Update: {
          description?: string
          id?: string
          purchase_order_id?: string
          qty?: number
          stock_item_id?: string | null
          total_cents?: number
          unit_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          expected_at: string | null
          id: string
          notes: string | null
          number: string
          received_at: string | null
          status: string
          supplier_id: string | null
          total_cents: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_at?: string | null
          id?: string
          notes?: string | null
          number: string
          received_at?: string | null
          status?: string
          supplier_id?: string | null
          total_cents?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_at?: string | null
          id?: string
          notes?: string | null
          number?: string
          received_at?: string | null
          status?: string
          supplier_id?: string | null
          total_cents?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          bucket: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["reaction_kind"]
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
          rewarded_at: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          actor_id: string | null
          amount_cents: number
          commission_returned_cents: number
          created_at: string
          currency: string
          id: string
          provider_ref: string | null
          reason: string | null
          reclaim_commission: boolean
          status: string
          transaction_id: string
        }
        Insert: {
          actor_id?: string | null
          amount_cents: number
          commission_returned_cents?: number
          created_at?: string
          currency?: string
          id?: string
          provider_ref?: string | null
          reason?: string | null
          reclaim_commission?: boolean
          status?: string
          transaction_id: string
        }
        Update: {
          actor_id?: string | null
          amount_cents?: number
          commission_returned_cents?: number
          created_at?: string
          currency?: string
          id?: string
          provider_ref?: string | null
          reason?: string | null
          reclaim_commission?: boolean
          status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_kind: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_kind: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          id: string
          product_id: string | null
          rating: number
          vendor_id: string | null
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          rating: number
          vendor_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          rating?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          avg_speed_kmh: number
          created_at: string
          distance_m: number
          duration_s: number
          elev_gain_m: number
          ended_at: string | null
          id: string
          max_speed_kmh: number
          moving_s: number
          notes: string | null
          path: Json
          photos: Json
          started_at: string
          title: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          avg_speed_kmh?: number
          created_at?: string
          distance_m?: number
          duration_s?: number
          elev_gain_m?: number
          ended_at?: string | null
          id?: string
          max_speed_kmh?: number
          moving_s?: number
          notes?: string | null
          path?: Json
          photos?: Json
          started_at?: string
          title?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          avg_speed_kmh?: number
          created_at?: string
          distance_m?: number
          duration_s?: number
          elev_gain_m?: number
          ended_at?: string | null
          id?: string
          max_speed_kmh?: number
          moving_s?: number
          notes?: string | null
          path?: Json
          photos?: Json
          started_at?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      route_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          route_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          route_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          route_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_comments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_pois: {
        Row: {
          address: string | null
          created_at: string
          google_place_id: string | null
          id: string
          kind: Database["public"]["Enums"]["route_poi_kind"]
          lat: number
          lng: number
          name: string
          note: string | null
          order_index: number
          route_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          google_place_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["route_poi_kind"]
          lat: number
          lng: number
          name: string
          note?: string | null
          order_index?: number
          route_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          google_place_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["route_poi_kind"]
          lat?: number
          lng?: number
          name?: string
          note?: string | null
          order_index?: number
          route_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_pois_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_rides: {
        Row: {
          id: string
          route_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          id?: string
          route_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          id?: string
          route_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_rides_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_saves: {
        Row: {
          created_at: string
          route_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          route_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          route_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_saves_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["route_difficulty"]
          distance_m: number
          duration_s: number
          end_lat: number | null
          end_lng: number | null
          id: string
          likes_count: number
          owner_id: string
          path: Json
          region: string | null
          rides_count: number
          saves_count: number
          source: string
          start_lat: number | null
          start_lng: number | null
          surface: Database["public"]["Enums"]["route_surface"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["route_visibility"]
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["route_difficulty"]
          distance_m?: number
          duration_s?: number
          end_lat?: number | null
          end_lng?: number | null
          id?: string
          likes_count?: number
          owner_id: string
          path?: Json
          region?: string | null
          rides_count?: number
          saves_count?: number
          source?: string
          start_lat?: number | null
          start_lng?: number | null
          surface?: Database["public"]["Enums"]["route_surface"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["route_visibility"]
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["route_difficulty"]
          distance_m?: number
          duration_s?: number
          end_lat?: number | null
          end_lng?: number | null
          id?: string
          likes_count?: number
          owner_id?: string
          path?: Json
          region?: string | null
          rides_count?: number
          saves_count?: number
          source?: string
          start_lat?: number | null
          start_lng?: number | null
          surface?: Database["public"]["Enums"]["route_surface"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["route_visibility"]
        }
        Relationships: []
      }
      saved_collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "saved_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_collection_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_collection_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_collection_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_collections: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          author_id: string
          caption: string | null
          club_id: string | null
          created_at: string
          error: string | null
          hashtags: string[]
          id: string
          is_subscribers_only: boolean
          kind: string
          media_urls: string[]
          publish_at: string
          published_post_id: string | null
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          caption?: string | null
          club_id?: string | null
          created_at?: string
          error?: string | null
          hashtags?: string[]
          id?: string
          is_subscribers_only?: boolean
          kind?: string
          media_urls?: string[]
          publish_at: string
          published_post_id?: string | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          caption?: string | null
          club_id?: string | null
          created_at?: string
          error?: string | null
          hashtags?: string[]
          id?: string
          is_subscribers_only?: boolean
          kind?: string
          media_urls?: string[]
          publish_at?: string
          published_post_id?: string | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_published_post_id_fkey"
            columns: ["published_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_finance_settings: {
        Row: {
          approved: boolean
          created_at: string
          max_withdrawal_cents: number | null
          min_withdrawal_cents: number
          notes: string | null
          payout_details: Json
          payout_method: string | null
          payout_schedule: string
          seller_id: string
          seller_type: string
          suspended: boolean
          updated_at: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          max_withdrawal_cents?: number | null
          min_withdrawal_cents?: number
          notes?: string | null
          payout_details?: Json
          payout_method?: string | null
          payout_schedule?: string
          seller_id: string
          seller_type?: string
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          max_withdrawal_cents?: number | null
          min_withdrawal_cents?: number
          notes?: string | null
          payout_details?: Json
          payout_method?: string | null
          payout_schedule?: string
          seller_id?: string
          seller_type?: string
          suspended?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_finance_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_finance_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          listing_id: string | null
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating?: number
          reviewer_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          name: string
          price_cents: number | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name: string
          price_cents?: number | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_alerts: {
        Row: {
          accuracy_m: number | null
          contacts_snapshot: Json
          created_at: string
          heading: number | null
          id: string
          kind: string
          latitude: number | null
          longitude: number | null
          message: string | null
          resolved_at: string | null
          ride_id: string | null
          share_token: string
          speed_kmh: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy_m?: number | null
          contacts_snapshot?: Json
          created_at?: string
          heading?: number | null
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          resolved_at?: string | null
          ride_id?: string | null
          share_token?: string
          speed_kmh?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy_m?: number | null
          contacts_snapshot?: Json
          created_at?: string
          heading?: number | null
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          resolved_at?: string | null
          ride_id?: string | null
          share_token?: string
          speed_kmh?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_pings: {
        Row: {
          accuracy_m: number | null
          alert_id: string
          created_at: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          speed_kmh: number | null
        }
        Insert: {
          accuracy_m?: number | null
          alert_id: string
          created_at?: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          speed_kmh?: number | null
        }
        Update: {
          accuracy_m?: number | null
          alert_id?: string
          created_at?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_pings_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "sos_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          cost_cents: number
          created_at: string
          currency: string
          id: string
          name: string
          price_cents: number
          product_id: string | null
          qty_on_hand: number
          reorder_level: number
          sku: string | null
          updated_at: string
          vendor_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          cost_cents?: number
          created_at?: string
          currency?: string
          id?: string
          name: string
          price_cents?: number
          product_id?: string | null
          qty_on_hand?: number
          reorder_level?: number
          sku?: string | null
          updated_at?: string
          vendor_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          cost_cents?: number
          created_at?: string
          currency?: string
          id?: string
          name?: string
          price_cents?: number
          product_id?: string | null
          qty_on_hand?: number
          reorder_level?: number
          sku?: string | null
          updated_at?: string
          vendor_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          kind: string
          qty: number
          reason: string | null
          stock_item_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          qty: number
          reason?: string | null
          stock_item_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          qty?: number
          reason?: string | null
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          author_id: string
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          kind: string
          label: string | null
          media_url: string
          thumbnail_url: string | null
        }
        Insert: {
          author_id: string
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          label?: string | null
          media_url: string
          thumbnail_url?: string | null
        }
        Update: {
          author_id?: string
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          label?: string | null
          media_url?: string
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          code: string
          currency: string
          features: Json
          id: string
          interval: string
          is_active: boolean
          name: string
          price_cents: number
        }
        Insert: {
          code: string
          currency?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          name: string
          price_cents: number
        }
        Update: {
          code?: string
          currency?: string
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          external_ref: string | null
          id: string
          plan_id: string
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          external_ref?: string | null
          id?: string
          plan_id: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          external_ref?: string | null
          id?: string
          plan_id?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      support_cases: {
        Row: {
          assigned_admin_id: string | null
          body: string
          created_at: string
          id: string
          priority: string
          resolution: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          body?: string
          created_at?: string
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          body?: string
          created_at?: string
          id?: string
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_cases_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_cases_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          buyer_id: string | null
          category: string | null
          country: string | null
          created_at: string
          currency: string
          fee_bps: number
          fee_rule_id: string | null
          gross_cents: number
          id: string
          kind: Database["public"]["Enums"]["txn_kind"]
          metadata: Json
          net_cents: number
          order_id: string | null
          payment_id: string | null
          payment_method: string | null
          platform_fee_cents: number
          processor_fee_cents: number
          provider: string
          provider_ref: string | null
          refunded_cents: number
          seller_id: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["txn_status"]
          subscription_id: string | null
          tax_cents: number
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          fee_bps?: number
          fee_rule_id?: string | null
          gross_cents: number
          id?: string
          kind: Database["public"]["Enums"]["txn_kind"]
          metadata?: Json
          net_cents?: number
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          platform_fee_cents?: number
          processor_fee_cents?: number
          provider?: string
          provider_ref?: string | null
          refunded_cents?: number
          seller_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          subscription_id?: string | null
          tax_cents?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          fee_bps?: number
          fee_rule_id?: string | null
          gross_cents?: number
          id?: string
          kind?: Database["public"]["Enums"]["txn_kind"]
          metadata?: Json
          net_cents?: number
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          platform_fee_cents?: number
          processor_fee_cents?: number
          provider?: string
          provider_ref?: string | null
          refunded_cents?: number
          seller_id?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          subscription_id?: string | null
          tax_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_fee_rule_id_fkey"
            columns: ["fee_rule_id"]
            isOneToOne: false
            referencedRelation: "fee_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_slug: string
          created_at: string
          id: string
          progress: number
          target: number
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_slug: string
          created_at?: string
          id?: string
          progress?: number
          target?: number
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_slug?: string
          created_at?: string
          id?: string
          progress?: number
          target?: number
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_slug_fkey"
            columns: ["achievement_slug"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["slug"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          id: string
          progress: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "gamification_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mutes: {
        Row: {
          created_at: string
          id: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          deleted_at: string | null
          hero_image_url: string | null
          id: string
          is_primary: boolean
          kind: string
          make: string
          model: string
          nickname: string | null
          owner_id: string
          spec: Json
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_primary?: boolean
          kind?: string
          make: string
          model: string
          nickname?: string | null
          owner_id: string
          spec?: Json
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          hero_image_url?: string | null
          id?: string
          is_primary?: boolean
          kind?: string
          make?: string
          model?: string
          nickname?: string | null
          owner_id?: string
          spec?: Json
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_staff: {
        Row: {
          role: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          role?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          role?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_staff_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_staff_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          business_name: string
          business_type: string
          city: string | null
          contact_channels: Json
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          email: string | null
          followers_count: number
          gallery: Json
          id: string
          is_premium: boolean
          is_verified: boolean
          lat: number | null
          legal_name: string | null
          lng: number | null
          logo_url: string | null
          operating_hours: Json
          owner_id: string
          owner_name: string | null
          phone: string | null
          portfolio: Json
          postal_code: string | null
          premium_until: string | null
          products_showcase: Json
          profile_views_count: number
          region: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_areas: string[]
          services_showcase: Json
          slug: string
          socials: Json
          submitted_at: string | null
          tax_number: string | null
          trade_license_no: string | null
          updated_at: string
          verification_docs: Json
          verification_notes: string | null
          verification_status: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          business_name: string
          business_type?: string
          city?: string | null
          contact_channels?: Json
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          followers_count?: number
          gallery?: Json
          id?: string
          is_premium?: boolean
          is_verified?: boolean
          lat?: number | null
          legal_name?: string | null
          lng?: number | null
          logo_url?: string | null
          operating_hours?: Json
          owner_id: string
          owner_name?: string | null
          phone?: string | null
          portfolio?: Json
          postal_code?: string | null
          premium_until?: string | null
          products_showcase?: Json
          profile_views_count?: number
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_areas?: string[]
          services_showcase?: Json
          slug: string
          socials?: Json
          submitted_at?: string | null
          tax_number?: string | null
          trade_license_no?: string | null
          updated_at?: string
          verification_docs?: Json
          verification_notes?: string | null
          verification_status?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          business_name?: string
          business_type?: string
          city?: string | null
          contact_channels?: Json
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          followers_count?: number
          gallery?: Json
          id?: string
          is_premium?: boolean
          is_verified?: boolean
          lat?: number | null
          legal_name?: string | null
          lng?: number | null
          logo_url?: string | null
          operating_hours?: Json
          owner_id?: string
          owner_name?: string | null
          phone?: string | null
          portfolio?: Json
          postal_code?: string | null
          premium_until?: string | null
          products_showcase?: Json
          profile_views_count?: number
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_areas?: string[]
          services_showcase?: Json
          slug?: string
          socials?: Json
          submitted_at?: string | null
          tax_number?: string | null
          trade_license_no?: string | null
          updated_at?: string
          verification_docs?: Json
          verification_notes?: string | null
          verification_status?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      video_assets: {
        Row: {
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          height: number | null
          id: string
          owner_id: string
          playback_dash: string | null
          playback_hls: string | null
          post_id: string | null
          provider: string
          provider_uid: string
          status: string
          thumbnail_url: string | null
          updated_at: string
          width: number | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          height?: number | null
          id?: string
          owner_id: string
          playback_dash?: string | null
          playback_hls?: string | null
          post_id?: string | null
          provider?: string
          provider_uid: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          height?: number | null
          id?: string
          owner_id?: string
          playback_dash?: string | null
          playback_hls?: string | null
          post_id?: string | null
          provider?: string
          provider_uid?: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_assets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          vendor_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          vendor_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean
          created_at: string
          events: string[]
          failure_count: number
          id: string
          last_delivered_at: string | null
          secret: string
          target_url: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          last_delivered_at?: string | null
          secret: string
          target_url: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          last_delivered_at?: string | null
          secret?: string
          target_url?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_challenges: {
        Row: {
          club_id: string
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          entries_count: number
          hashtag: string | null
          id: string
          is_active: boolean
          prize: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at: string
          entries_count?: number
          hashtag?: string | null
          id?: string
          is_active?: boolean
          prize?: string | null
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string
          entries_count?: number
          hashtag?: string | null
          id?: string
          is_active?: boolean
          prize?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_challenges_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          metadata: Json
          ref_id: string | null
          ref_kind: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          ref_id?: string | null
          ref_kind?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          ref_id?: string | null
          ref_kind?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ad_campaigns_public: {
        Row: {
          currency: string | null
          id: string | null
          name: string | null
          objective: Database["public"]["Enums"]["ad_objective"] | null
          owner_id: string | null
          placements: Database["public"]["Enums"]["ad_placement"][] | null
          status: Database["public"]["Enums"]["ad_status"] | null
          vendor_id: string | null
        }
        Insert: {
          currency?: string | null
          id?: string | null
          name?: string | null
          objective?: Database["public"]["Enums"]["ad_objective"] | null
          owner_id?: string | null
          placements?: Database["public"]["Enums"]["ad_placement"][] | null
          status?: Database["public"]["Enums"]["ad_status"] | null
          vendor_id?: string | null
        }
        Update: {
          currency?: string | null
          id?: string | null
          name?: string | null
          objective?: Database["public"]["Enums"]["ad_objective"] | null
          owner_id?: string | null
          placements?: Database["public"]["Enums"]["ad_placement"][] | null
          status?: Database["public"]["Enums"]["ad_status"] | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisements_public: {
        Row: {
          ends_at: string | null
          id: string | null
          is_active: boolean | null
          media_url: string | null
          starts_at: string | null
          target_url: string | null
          title: string | null
          vendor_id: string | null
        }
        Insert: {
          ends_at?: string | null
          id?: string | null
          is_active?: boolean | null
          media_url?: string | null
          starts_at?: string | null
          target_url?: string | null
          title?: string | null
          vendor_id?: string | null
        }
        Update: {
          ends_at?: string | null
          id?: string | null
          is_active?: boolean | null
          media_url?: string | null
          starts_at?: string | null
          target_url?: string | null
          title?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertisements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          followers_count: number | null
          following_count: number | null
          handle: string | null
          id: string | null
          is_verified: boolean | null
          level: number | null
          posts_count: number | null
          tier: Database["public"]["Enums"]["rider_tier"] | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          handle?: string | null
          id?: string | null
          is_verified?: boolean | null
          level?: number | null
          posts_count?: number | null
          tier?: Database["public"]["Enums"]["rider_tier"] | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          handle?: string | null
          id?: string | null
          is_verified?: boolean | null
          level?: number | null
          posts_count?: number | null
          tier?: Database["public"]["Enums"]["rider_tier"] | null
        }
        Relationships: []
      }
      vendors_public: {
        Row: {
          business_name: string | null
          business_type: string | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          followers_count: number | null
          gallery: Json | null
          id: string | null
          is_premium: boolean | null
          is_verified: boolean | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          operating_hours: Json | null
          premium_until: string | null
          products_showcase: Json | null
          profile_views_count: number | null
          region: string | null
          service_areas: string[] | null
          services_showcase: Json | null
          slug: string | null
          socials: Json | null
          website: string | null
        }
        Insert: {
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          followers_count?: number | null
          gallery?: Json | null
          id?: string | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          operating_hours?: Json | null
          premium_until?: string | null
          products_showcase?: Json | null
          profile_views_count?: number | null
          region?: string | null
          service_areas?: string[] | null
          services_showcase?: Json | null
          slug?: string | null
          socials?: Json | null
          website?: string | null
        }
        Update: {
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          followers_count?: number | null
          gallery?: Json | null
          id?: string | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          operating_hours?: Json | null
          premium_until?: string | null
          products_showcase?: Json | null
          profile_views_count?: number | null
          region?: string | null
          service_areas?: string[] | null
          services_showcase?: Json | null
          slug?: string | null
          socials?: Json | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calc_level: { Args: { _xp: number }; Returns: number }
      can_view_event: {
        Args: { _event_id: string; _user: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { _bucket: string; _max_hits: number; _window_seconds: number }
        Returns: undefined
      }
      find_group_ride_by_code: {
        Args: { _code: string }
        Returns: {
          host_id: string
          id: string
          status: string
          title: string
        }[]
      }
      get_creator_collab_email: {
        Args: { _creator_user_id: string }
        Returns: string
      }
      get_event_contact: {
        Args: { _event_id: string }
        Returns: {
          contact_email: string
          contact_phone: string
        }[]
      }
      get_my_creator_profile: {
        Args: never
        Returns: {
          accepts_collabs: boolean
          approved_at: string | null
          category: string
          collab_email: string | null
          created_at: string
          featured_post_ids: string[] | null
          id: string
          is_featured: boolean
          is_verified: boolean
          portfolio_url: string | null
          social_links: Json | null
          status: string
          subscribers_count: number
          tagline: string | null
          tips_total_cents: number
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "creator_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_sos_by_token: {
        Args: { _token: string }
        Returns: {
          accuracy_m: number
          contacts_snapshot: Json
          created_at: string
          heading: number
          id: string
          kind: string
          latitude: number
          longitude: number
          message: string
          resolved_at: string
          speed_kmh: number
          status: string
        }[]
      }
      get_sos_pings_by_token: {
        Args: { _limit?: number; _token: string }
        Returns: {
          accuracy_m: number
          heading: number
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          speed_kmh: number
        }[]
      }
      has_admin_scope: {
        Args: { _scope: string; _user: string }
        Returns: boolean
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_club_member: {
        Args: { _club: string; _user: string }
        Returns: boolean
      }
      is_club_staff: {
        Args: { _club: string; _user: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      is_drag_match_participant: {
        Args: { _match: string; _user: string }
        Returns: boolean
      }
      is_group_ride_member: {
        Args: { _ride: string; _user: string }
        Returns: boolean
      }
      is_owner: { Args: { _user: string }; Returns: boolean }
      marketplace_object_is_public: {
        Args: { _object_name: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_has_event_invite: {
        Args: { _event_id: string; _user: string }
        Returns: boolean
      }
      user_has_event_rsvp: {
        Args: { _event_id: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      ad_creative_kind:
        | "post"
        | "reel"
        | "story"
        | "event"
        | "listing"
        | "community"
        | "business_profile"
        | "creator_profile"
      ad_event_kind: "impression" | "click" | "engagement" | "conversion"
      ad_objective:
        | "followers"
        | "profile_visits"
        | "post_engagement"
        | "event_attendance"
        | "listing_views"
        | "website_visits"
        | "direct_messages"
      ad_placement:
        | "feed"
        | "reels"
        | "stories"
        | "explore"
        | "marketplace"
        | "communities"
        | "search"
      ad_status:
        | "draft"
        | "pending"
        | "active"
        | "paused"
        | "completed"
        | "rejected"
      app_role:
        | "super_admin"
        | "admin"
        | "moderator"
        | "vendor"
        | "vendor_staff"
        | "creator"
        | "premium"
        | "standard"
        | "owner"
      booking_status: "requested" | "confirmed" | "completed" | "cancelled"
      conversation_kind: "dm" | "club" | "group"
      fee_scope:
        | "default"
        | "category"
        | "seller"
        | "seller_type"
        | "country"
        | "promo"
      ledger_account:
        | "platform_revenue"
        | "seller_payable"
        | "processor_fees"
        | "refunds"
        | "tax_payable"
      listing_category:
        | "motorcycle"
        | "car"
        | "truck"
        | "scooter"
        | "atv"
        | "boat"
        | "other_vehicle"
        | "parts"
        | "accessories"
        | "riding_gear"
        | "apparel"
        | "collectibles"
        | "tools"
        | "garage_equipment"
        | "electronics"
        | "services"
      listing_condition:
        | "new"
        | "like_new"
        | "used"
        | "for_parts"
        | "refurbished"
      listing_fuel:
        | "gasoline"
        | "diesel"
        | "electric"
        | "hybrid"
        | "other"
        | "na"
      listing_report_status: "open" | "reviewing" | "resolved" | "dismissed"
      listing_status: "draft" | "active" | "sold" | "archived"
      listing_transmission:
        | "manual"
        | "automatic"
        | "semi_auto"
        | "cvt"
        | "dct"
        | "na"
      notification_kind:
        | "like"
        | "comment"
        | "follow"
        | "mention"
        | "message"
        | "marketplace"
        | "booking"
        | "order"
        | "vendor_update"
        | "subscription"
        | "event"
        | "system"
      order_status:
        | "pending"
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payout_status:
        | "scheduled"
        | "processing"
        | "paid"
        | "failed"
        | "cancelled"
      post_kind: "video" | "photo" | "telemetry" | "event"
      reaction_kind: "like" | "save" | "share"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      rider_tier: "rookie" | "turbo" | "nitro" | "elite" | "apex_rex" | "legend"
      route_difficulty: "easy" | "moderate" | "hard" | "expert"
      route_poi_kind:
        | "hotel"
        | "food"
        | "fuel"
        | "scenic"
        | "repair"
        | "viewpoint"
        | "custom"
      route_surface: "paved" | "mixed" | "offroad"
      route_visibility: "public" | "private"
      txn_kind:
        | "order"
        | "tip"
        | "creator_subscription"
        | "plan"
        | "ad"
        | "other"
      txn_status:
        | "pending"
        | "succeeded"
        | "failed"
        | "refunded"
        | "partially_refunded"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ad_creative_kind: [
        "post",
        "reel",
        "story",
        "event",
        "listing",
        "community",
        "business_profile",
        "creator_profile",
      ],
      ad_event_kind: ["impression", "click", "engagement", "conversion"],
      ad_objective: [
        "followers",
        "profile_visits",
        "post_engagement",
        "event_attendance",
        "listing_views",
        "website_visits",
        "direct_messages",
      ],
      ad_placement: [
        "feed",
        "reels",
        "stories",
        "explore",
        "marketplace",
        "communities",
        "search",
      ],
      ad_status: [
        "draft",
        "pending",
        "active",
        "paused",
        "completed",
        "rejected",
      ],
      app_role: [
        "super_admin",
        "admin",
        "moderator",
        "vendor",
        "vendor_staff",
        "creator",
        "premium",
        "standard",
        "owner",
      ],
      booking_status: ["requested", "confirmed", "completed", "cancelled"],
      conversation_kind: ["dm", "club", "group"],
      fee_scope: [
        "default",
        "category",
        "seller",
        "seller_type",
        "country",
        "promo",
      ],
      ledger_account: [
        "platform_revenue",
        "seller_payable",
        "processor_fees",
        "refunds",
        "tax_payable",
      ],
      listing_category: [
        "motorcycle",
        "car",
        "truck",
        "scooter",
        "atv",
        "boat",
        "other_vehicle",
        "parts",
        "accessories",
        "riding_gear",
        "apparel",
        "collectibles",
        "tools",
        "garage_equipment",
        "electronics",
        "services",
      ],
      listing_condition: [
        "new",
        "like_new",
        "used",
        "for_parts",
        "refurbished",
      ],
      listing_fuel: ["gasoline", "diesel", "electric", "hybrid", "other", "na"],
      listing_report_status: ["open", "reviewing", "resolved", "dismissed"],
      listing_status: ["draft", "active", "sold", "archived"],
      listing_transmission: [
        "manual",
        "automatic",
        "semi_auto",
        "cvt",
        "dct",
        "na",
      ],
      notification_kind: [
        "like",
        "comment",
        "follow",
        "mention",
        "message",
        "marketplace",
        "booking",
        "order",
        "vendor_update",
        "subscription",
        "event",
        "system",
      ],
      order_status: [
        "pending",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payout_status: ["scheduled", "processing", "paid", "failed", "cancelled"],
      post_kind: ["video", "photo", "telemetry", "event"],
      reaction_kind: ["like", "save", "share"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      rider_tier: ["rookie", "turbo", "nitro", "elite", "apex_rex", "legend"],
      route_difficulty: ["easy", "moderate", "hard", "expert"],
      route_poi_kind: [
        "hotel",
        "food",
        "fuel",
        "scenic",
        "repair",
        "viewpoint",
        "custom",
      ],
      route_surface: ["paved", "mixed", "offroad"],
      route_visibility: ["public", "private"],
      txn_kind: ["order", "tip", "creator_subscription", "plan", "ad", "other"],
      txn_status: [
        "pending",
        "succeeded",
        "failed",
        "refunded",
        "partially_refunded",
        "cancelled",
      ],
    },
  },
} as const
