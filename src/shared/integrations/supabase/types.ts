export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          experience_level: string | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
          onboarding_completed: boolean;
          phone_number: string | null;
          primary_challenge: string | null;
          primary_goal: string | null;
          role: Database['public']['Enums']['user_role'];
          subscription_status: string | null;
          updated_at: string;
          user_type: Database['public']['Enums']['user_type'];
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          experience_level?: string | null;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          onboarding_completed?: boolean;
          phone_number?: string | null;
          primary_challenge?: string | null;
          primary_goal?: string | null;
          role?: Database['public']['Enums']['user_role'];
          subscription_status?: string | null;
          updated_at?: string;
          user_type?: Database['public']['Enums']['user_type'];
        };
        Update: {
          created_at?: string;
          email?: string | null;
          experience_level?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          onboarding_completed?: boolean;
          phone_number?: string | null;
          primary_challenge?: string | null;
          primary_goal?: string | null;
          role?: Database['public']['Enums']['user_role'];
          subscription_status?: string | null;
          updated_at?: string;
          user_type?: Database['public']['Enums']['user_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
            isOneToOne: true;
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          date: string;
          description: string | null;
          event_description: string | null;
          event_type: Database['public']['Enums']['event_type'];
          guest_experts: Json | null;
          id: string;
          image_url: string | null;
          location: string | null;
          max_attendees: number | null;
          meeting_link: string | null;
          tags: string[] | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          description?: string | null;
          event_description?: string | null;
          event_type?: Database['public']['Enums']['event_type'];
          guest_experts?: Json | null;
          id?: string;
          image_url?: string | null;
          location?: string | null;
          max_attendees?: number | null;
          meeting_link?: string | null;
          tags?: string[] | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          description?: string | null;
          event_description?: string | null;
          event_type?: Database['public']['Enums']['event_type'];
          guest_experts?: Json | null;
          id?: string;
          image_url?: string | null;
          location?: string | null;
          max_attendees?: number | null;
          meeting_link?: string | null;
          tags?: string[] | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_attendees: {
        Row: {
          event_id: string;
          id: string;
          registered_at: string;
          user_id: string;
        };
        Insert: {
          event_id: string;
          id?: string;
          registered_at?: string;
          user_id: string;
        };
        Update: {
          event_id?: string;
          id?: string;
          registered_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_attendees_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
            isOneToOne: false;
          },
          {
            foreignKeyName: 'event_attendees_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
            isOneToOne: false;
          },
        ];
      };
      library_assets: {
        Row: {
          created_at: string;
          description: string | null;
          document_url: string | null;
          embed_type: string | null;
          embed_url: string | null;
          event_id: string | null;
          file_type: string;
          file_url: string | null;
          id: string;
          title: string;
          updated_at: string;
          video_url: string | null;
          view_count: number;
          download_count: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          document_url?: string | null;
          embed_type?: string | null;
          embed_url?: string | null;
          event_id?: string | null;
          file_type: string;
          file_url?: string | null;
          id?: string;
          title: string;
          updated_at?: string;
          video_url?: string | null;
          view_count?: number;
          download_count?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          document_url?: string | null;
          embed_type?: string | null;
          embed_url?: string | null;
          event_id?: string | null;
          file_type?: string;
          file_url?: string | null;
          id?: string;
          title?: string;
          updated_at?: string;
          video_url?: string | null;
          view_count?: number;
          download_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'library_assets_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
            isOneToOne: false;
          },
        ];
      };
      skills: {
        Row: {
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_skills: {
        Row: {
          created_at: string;
          proficiency_level: string | null;
          skill_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          proficiency_level?: string | null;
          skill_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          proficiency_level?: string | null;
          skill_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_skills_skill_id_fkey';
            columns: ['skill_id'];
            referencedRelation: 'skills';
            referencedColumns: ['id'];
            isOneToOne: false;
          },
          {
            foreignKeyName: 'user_skills_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
            isOneToOne: false;
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          created_by: string | null;
          custom_message: string | null;
          email: string;
          expires_at: string | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
          sent_at: string | null;
          source: Database['public']['Enums']['invitation_source'];
          status: Database['public']['Enums']['invitation_status'];
          token: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          custom_message?: string | null;
          email: string;
          expires_at?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          sent_at?: string | null;
          source?: Database['public']['Enums']['invitation_source'];
          status?: Database['public']['Enums']['invitation_status'];
          token: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          custom_message?: string | null;
          email?: string;
          expires_at?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          sent_at?: string | null;
          source?: Database['public']['Enums']['invitation_source'];
          status?: Database['public']['Enums']['invitation_status'];
          token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
            isOneToOne: false;
          },
        ];
      };
    };
    Views: {};
    Functions: {
      accept_invitation: {
        Args: { invitation_token: string };
        Returns: Json;
      };
      change_user_role: {
        Args: { target_user_id: string; new_role: string };
        Returns: boolean;
      };
      change_user_type: {
        Args: { target_user_id: string; new_type: string };
        Returns: boolean;
      };
      delete_user_completely: {
        Args: { target_user_id: string };
        Returns: Json;
      };
      get_safe_profile_data: {
        Args: { target_user_id?: string };
        Returns: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone_number: string | null;
          role: string | null;
          user_type: string | null;
          experience_level: string | null;
          primary_goal: string | null;
          primary_challenge: string | null;
          subscription_status: string | null;
          created_at: string;
          updated_at: string;
        }[];
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_manager: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_expert: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      update_profile_safe: {
        Args: {
          user_uuid: string;
          new_first_name?: string;
          new_last_name?: string;
          new_email?: string;
          new_phone_number?: string;
          new_primary_goal?: string;
          new_primary_challenge?: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      event_type: 'Event' | 'Meetup' | 'Mastermind' | 'Retreat';
      invitation_status: 'pending' | 'sent' | 'accepted' | 'expired' | 'failed';
      invitation_source: 'single' | 'csv';
      user_role: 'admin' | 'manager' | 'user';
      user_type: 'learner' | 'expert';
    };
    CompositeTypes: {};
  };
};
