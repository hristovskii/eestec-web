export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      account_deletion_files: {
        Row: {
          bucket: string;
          completed_at: string | null;
          path: string;
          preserve: boolean;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          bucket: string;
          completed_at?: string | null;
          path: string;
          preserve?: boolean;
          user_id: string;
        };
        Update: {
          bucket?: string;
          completed_at?: string | null;
          path?: string;
          preserve?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_deletion_files_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'account_deletion_jobs';
            referencedColumns: ['user_id'];
          },
        ];
      };
      account_deletion_jobs: {
        Row: {
          completed_at: string | null;
          data_cleaned_at: string | null;
          delete_published_memories: boolean;
          requested_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          data_cleaned_at?: string | null;
          delete_published_memories: boolean;
          requested_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          data_cleaned_at?: string | null;
          delete_published_memories?: boolean;
          requested_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          action: string;
          actor: string | null;
          actor_initials: string | null;
          actor_name: string | null;
          area: string;
          created_at: string;
          href: string | null;
          id: string;
          is_sample: boolean;
          target: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor?: string | null;
          actor_initials?: string | null;
          actor_name?: string | null;
          area: string;
          created_at?: string;
          href?: string | null;
          id?: string;
          is_sample?: boolean;
          target: string;
        };
        Update: {
          action?: string;
          actor?: string | null;
          actor_initials?: string | null;
          actor_name?: string | null;
          area?: string;
          created_at?: string;
          href?: string | null;
          id?: string;
          is_sample?: boolean;
          target?: string;
        };
        Relationships: [];
      };
      admin_roles: {
        Row: {
          created_at: string;
          display_name: string | null;
          invited_at: string | null;
          invited_by: string | null;
          is_sample: boolean;
          role: Database['public']['Enums']['admin_role'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string | null;
          invited_at?: string | null;
          invited_by?: string | null;
          is_sample?: boolean;
          role: Database['public']['Enums']['admin_role'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          invited_at?: string | null;
          invited_by?: string | null;
          is_sample?: boolean;
          role?: Database['public']['Enums']['admin_role'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      application_files: {
        Row: {
          application_id: string;
          created_at: string;
          field_key: string;
          file_name: string;
          id: string;
          is_sample: boolean;
          mime_type: string;
          path: string;
          size_bytes: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          application_id: string;
          created_at?: string;
          field_key: string;
          file_name: string;
          id?: string;
          is_sample?: boolean;
          mime_type: string;
          path: string;
          size_bytes: number;
          updated_at?: string;
        };
        Update: {
          application_id?: string;
          created_at?: string;
          field_key?: string;
          file_name?: string;
          id?: string;
          is_sample?: boolean;
          mime_type?: string;
          path?: string;
          size_bytes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'application_files_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
        ];
      };
      application_forms: {
        Row: {
          created_at: string;
          event_id: string;
          fields: NonNullable<Json>;
          intro: NonNullable<Json>;
          is_sample: boolean;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id: string;
          fields?: NonNullable<Json>;
          intro: NonNullable<Json>;
          is_sample?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          fields?: NonNullable<Json>;
          intro?: NonNullable<Json>;
          is_sample?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'application_forms_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: true;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      applications: {
        Row: {
          answers: NonNullable<Json>;
          consent_at: string;
          created_at: string;
          email: string;
          event_id: string;
          id: string;
          is_sample: boolean;
          locale: string;
          name: string;
          profile_id: string | null;
          read_at: string | null;
          reference: string;
          status: Database['public']['Enums']['application_status'];
          updated_at: string;
          waitlist_position: number | null;
        };
        ComputedFields: never;
        Insert: {
          answers?: NonNullable<Json>;
          consent_at?: string;
          created_at?: string;
          email: string;
          event_id: string;
          id?: string;
          is_sample?: boolean;
          locale: string;
          name: string;
          profile_id?: string | null;
          read_at?: string | null;
          reference: string;
          status: Database['public']['Enums']['application_status'];
          updated_at?: string;
          waitlist_position?: number | null;
        };
        Update: {
          answers?: NonNullable<Json>;
          consent_at?: string;
          created_at?: string;
          email?: string;
          event_id?: string;
          id?: string;
          is_sample?: boolean;
          locale?: string;
          name?: string;
          profile_id?: string | null;
          read_at?: string | null;
          reference?: string;
          status?: Database['public']['Enums']['application_status'];
          updated_at?: string;
          waitlist_position?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'applications_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'applications_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      auth_links: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          kind: Database['public']['Enums']['auth_link_kind'];
          new_email: string | null;
          token_hash: string;
          used_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          kind: Database['public']['Enums']['auth_link_kind'];
          new_email?: string | null;
          token_hash: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['auth_link_kind'];
          new_email?: string | null;
          token_hash?: string;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          created_at: string;
          description: Json | null;
          icon: Database['public']['Enums']['badge_icon'];
          id: string;
          is_sample: boolean;
          name: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: Json | null;
          icon: Database['public']['Enums']['badge_icon'];
          id?: string;
          is_sample?: boolean;
          name: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: Json | null;
          icon?: Database['public']['Enums']['badge_icon'];
          id?: string;
          is_sample?: boolean;
          name?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [];
      };
      board_mandates: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          is_current: boolean;
          is_sample: boolean;
          label: string;
          starts_on: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          is_current?: boolean;
          is_sample?: boolean;
          label: string;
          starts_on: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          is_current?: boolean;
          is_sample?: boolean;
          label?: string;
          starts_on?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      board_members: {
        Row: {
          board_role_id: string;
          created_at: string;
          id: string;
          is_sample: boolean;
          mandate_id: string;
          profile_id: string;
          role_title_snapshot: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          board_role_id: string;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          mandate_id: string;
          profile_id: string;
          role_title_snapshot: string;
          sort_order?: number;
        };
        Update: {
          board_role_id?: string;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          mandate_id?: string;
          profile_id?: string;
          role_title_snapshot?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'board_members_board_role_id_fkey';
            columns: ['board_role_id'];
            isOneToOne: false;
            referencedRelation: 'board_roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'board_members_mandate_id_fkey';
            columns: ['mandate_id'];
            isOneToOne: false;
            referencedRelation: 'board_mandates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'board_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      board_roles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          is_sample: boolean;
          key: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          is_sample?: boolean;
          key: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          is_sample?: boolean;
          key?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      committees: {
        Row: {
          city: NonNullable<Json>;
          country: string;
          created_at: string;
          id: string;
          is_home: boolean;
          is_sample: boolean;
          lat: number;
          lng: number;
          name: string;
          status: Database['public']['Enums']['committee_status'];
          updated_at: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          city: NonNullable<Json>;
          country: string;
          created_at?: string;
          id?: string;
          is_home?: boolean;
          is_sample?: boolean;
          lat: number;
          lng: number;
          name: string;
          status: Database['public']['Enums']['committee_status'];
          updated_at?: string;
          url?: string;
        };
        Update: {
          city?: NonNullable<Json>;
          country?: string;
          created_at?: string;
          id?: string;
          is_home?: boolean;
          is_sample?: boolean;
          lat?: number;
          lng?: number;
          name?: string;
          status?: Database['public']['Enums']['committee_status'];
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          consent_at: string;
          created_at: string;
          email: string | null;
          id: string;
          is_sample: boolean;
          locale: string;
          message: string;
          name: string;
          read_at: string | null;
          reference: string;
          routed_to: string;
          status: Database['public']['Enums']['contact_status'];
          subject: string;
          subject_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          consent_at?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_sample?: boolean;
          locale: string;
          message: string;
          name: string;
          read_at?: string | null;
          reference: string;
          routed_to: string;
          status?: Database['public']['Enums']['contact_status'];
          subject: string;
          subject_id?: string | null;
          updated_at?: string;
        };
        Update: {
          consent_at?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_sample?: boolean;
          locale?: string;
          message?: string;
          name?: string;
          read_at?: string | null;
          reference?: string;
          routed_to?: string;
          status?: Database['public']['Enums']['contact_status'];
          subject?: string;
          subject_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contact_messages_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'contact_subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      contact_subject_routes: {
        Row: {
          created_at: string;
          is_sample: boolean;
          route_email: string;
          subject_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          is_sample?: boolean;
          route_email: string;
          subject_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          is_sample?: boolean;
          route_email?: string;
          subject_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contact_subject_routes_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: true;
            referencedRelation: 'contact_subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      contact_subjects: {
        Row: {
          created_at: string;
          id: string;
          is_sample: boolean;
          name: NonNullable<Json>;
          route_note: NonNullable<Json>;
          shortcut_label: NonNullable<Json>;
          shortcut_url: string;
          sort_order: number;
          team_label: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name: NonNullable<Json>;
          route_note: NonNullable<Json>;
          shortcut_label: NonNullable<Json>;
          shortcut_url?: string;
          sort_order?: number;
          team_label: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name?: NonNullable<Json>;
          route_note?: NonNullable<Json>;
          shortcut_label?: NonNullable<Json>;
          shortcut_url?: string;
          sort_order?: number;
          team_label?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [];
      };
      cv_export_log: {
        Row: {
          exported_at: string;
          exported_by: string | null;
          id: string;
          profile_id: string | null;
          sponsor_id: string | null;
          sponsor_name: string;
        };
        ComputedFields: never;
        Insert: {
          exported_at?: string;
          exported_by?: string | null;
          id?: string;
          profile_id?: string | null;
          sponsor_id?: string | null;
          sponsor_name: string;
        };
        Update: {
          exported_at?: string;
          exported_by?: string | null;
          id?: string;
          profile_id?: string | null;
          sponsor_id?: string | null;
          sponsor_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cv_export_log_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cv_export_log_sponsor_id_fkey';
            columns: ['sponsor_id'];
            isOneToOne: false;
            referencedRelation: 'sponsors';
            referencedColumns: ['id'];
          },
        ];
      };
      event_gallery: {
        Row: {
          alt: string | null;
          created_at: string;
          credit: string | null;
          event_id: string;
          id: string;
          is_sample: boolean;
          media_id: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          alt?: string | null;
          created_at?: string;
          credit?: string | null;
          event_id: string;
          id?: string;
          is_sample?: boolean;
          media_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          alt?: string | null;
          created_at?: string;
          credit?: string | null;
          event_id?: string;
          id?: string;
          is_sample?: boolean;
          media_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_gallery_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_gallery_media_id_fkey';
            columns: ['media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
        ];
      };
      event_managers: {
        Row: {
          event_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          user_id: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_managers_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      event_partners: {
        Row: {
          event_id: string;
          sort_order: number;
          sponsor_id: string;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          sort_order?: number;
          sponsor_id: string;
        };
        Update: {
          event_id?: string;
          sort_order?: number;
          sponsor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_partners_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_partners_sponsor_id_fkey';
            columns: ['sponsor_id'];
            isOneToOne: false;
            referencedRelation: 'sponsors';
            referencedColumns: ['id'];
          },
        ];
      };
      event_topic_links: {
        Row: {
          event_id: string;
          topic_id: string;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          topic_id: string;
        };
        Update: {
          event_id?: string;
          topic_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_topic_links_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_topic_links_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'event_topics';
            referencedColumns: ['id'];
          },
        ];
      };
      event_topics: {
        Row: {
          created_at: string;
          id: string;
          is_sample: boolean;
          name: NonNullable<Json>;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name: NonNullable<Json>;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name?: NonNullable<Json>;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_types: {
        Row: {
          created_at: string;
          id: string;
          is_sample: boolean;
          name: NonNullable<Json>;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name: NonNullable<Json>;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name?: NonNullable<Json>;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          admission: Database['public']['Enums']['event_admission'];
          agenda: NonNullable<Json>;
          all_day: boolean;
          applications_enabled: boolean;
          apply_via: Database['public']['Enums']['event_apply_via'];
          city: NonNullable<Json>;
          contact_email: string;
          country: NonNullable<Json>;
          country_count: number | null;
          cover_alt: string | null;
          cover_credit: string | null;
          cover_media_id: string | null;
          created_at: string;
          deadline: string | null;
          description: NonNullable<Json>;
          ends_at: string;
          external_url: string;
          fee: NonNullable<Json>;
          id: string;
          info_pack_id: string | null;
          is_sample: boolean;
          location: NonNullable<Json>;
          max_participants: number | null;
          next_up: boolean;
          opens_at: string | null;
          organizer: string | null;
          participant_count: number | null;
          publish_at: string | null;
          requirements: NonNullable<Json>;
          results_on: string | null;
          scope: Database['public']['Enums']['event_scope'];
          seo_description: NonNullable<Json>;
          seo_share_media_id: string | null;
          seo_title: NonNullable<Json>;
          short_description: NonNullable<Json>;
          slug: string;
          starts_at: string;
          status: Database['public']['Enums']['event_status'];
          title: NonNullable<Json>;
          type_id: string;
          updated_at: string;
          updated_by: string | null;
          video_url: string;
          waitlist: boolean;
        };
        ComputedFields: never;
        Insert: {
          admission?: Database['public']['Enums']['event_admission'];
          agenda?: NonNullable<Json>;
          all_day?: boolean;
          applications_enabled?: boolean;
          apply_via?: Database['public']['Enums']['event_apply_via'];
          city: NonNullable<Json>;
          contact_email?: string;
          country: NonNullable<Json>;
          country_count?: number | null;
          cover_alt?: string | null;
          cover_credit?: string | null;
          cover_media_id?: string | null;
          created_at?: string;
          deadline?: string | null;
          description: NonNullable<Json>;
          ends_at: string;
          external_url?: string;
          fee?: NonNullable<Json>;
          id?: string;
          info_pack_id?: string | null;
          is_sample?: boolean;
          location: NonNullable<Json>;
          max_participants?: number | null;
          next_up?: boolean;
          opens_at?: string | null;
          organizer?: string | null;
          participant_count?: number | null;
          publish_at?: string | null;
          requirements: NonNullable<Json>;
          results_on?: string | null;
          scope: Database['public']['Enums']['event_scope'];
          seo_description: NonNullable<Json>;
          seo_share_media_id?: string | null;
          seo_title: NonNullable<Json>;
          short_description: NonNullable<Json>;
          slug: string;
          starts_at: string;
          status?: Database['public']['Enums']['event_status'];
          title: NonNullable<Json>;
          type_id: string;
          updated_at?: string;
          updated_by?: string | null;
          video_url?: string;
          waitlist?: boolean;
        };
        Update: {
          admission?: Database['public']['Enums']['event_admission'];
          agenda?: NonNullable<Json>;
          all_day?: boolean;
          applications_enabled?: boolean;
          apply_via?: Database['public']['Enums']['event_apply_via'];
          city?: NonNullable<Json>;
          contact_email?: string;
          country?: NonNullable<Json>;
          country_count?: number | null;
          cover_alt?: string | null;
          cover_credit?: string | null;
          cover_media_id?: string | null;
          created_at?: string;
          deadline?: string | null;
          description?: NonNullable<Json>;
          ends_at?: string;
          external_url?: string;
          fee?: NonNullable<Json>;
          id?: string;
          info_pack_id?: string | null;
          is_sample?: boolean;
          location?: NonNullable<Json>;
          max_participants?: number | null;
          next_up?: boolean;
          opens_at?: string | null;
          organizer?: string | null;
          participant_count?: number | null;
          publish_at?: string | null;
          requirements?: NonNullable<Json>;
          results_on?: string | null;
          scope?: Database['public']['Enums']['event_scope'];
          seo_description?: NonNullable<Json>;
          seo_share_media_id?: string | null;
          seo_title?: NonNullable<Json>;
          short_description?: NonNullable<Json>;
          slug?: string;
          starts_at?: string;
          status?: Database['public']['Enums']['event_status'];
          title?: NonNullable<Json>;
          type_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          video_url?: string;
          waitlist?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'events_cover_media_id_fkey';
            columns: ['cover_media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_info_pack_id_fkey';
            columns: ['info_pack_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_seo_share_media_id_fkey';
            columns: ['seo_share_media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_type_id_fkey';
            columns: ['type_id'];
            isOneToOne: false;
            referencedRelation: 'event_types';
            referencedColumns: ['id'];
          },
        ];
      };
      feedback: {
        Row: {
          consent_at: string | null;
          created_at: string;
          email: string | null;
          event_id: string | null;
          event_title: string;
          id: string;
          impression: string;
          is_anonymous: boolean;
          is_sample: boolean;
          locale: string;
          memory_id: string | null;
          name: string | null;
          other_event_name: string;
          owner_id: string | null;
          owner_name: string | null;
          rating: number | null;
          reference: string;
          status: Database['public']['Enums']['submission_status'];
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          consent_at?: string | null;
          created_at?: string;
          email?: string | null;
          event_id?: string | null;
          event_title: string;
          id?: string;
          impression?: string;
          is_anonymous?: boolean;
          is_sample?: boolean;
          locale: string;
          memory_id?: string | null;
          name?: string | null;
          other_event_name?: string;
          owner_id?: string | null;
          owner_name?: string | null;
          rating?: number | null;
          reference: string;
          status?: Database['public']['Enums']['submission_status'];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          consent_at?: string | null;
          created_at?: string;
          email?: string | null;
          event_id?: string | null;
          event_title?: string;
          id?: string;
          impression?: string;
          is_anonymous?: boolean;
          is_sample?: boolean;
          locale?: string;
          memory_id?: string | null;
          name?: string | null;
          other_event_name?: string;
          owner_id?: string | null;
          owner_name?: string | null;
          rating?: number | null;
          reference?: string;
          status?: Database['public']['Enums']['submission_status'];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'feedback_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_memory_id_fkey';
            columns: ['memory_id'];
            isOneToOne: false;
            referencedRelation: 'memories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      idea_types: {
        Row: {
          created_at: string;
          id: string;
          is_sample: boolean;
          name: NonNullable<Json>;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name: NonNullable<Json>;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name?: NonNullable<Json>;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      ideas: {
        Row: {
          consent_at: string | null;
          created_at: string;
          description: string;
          email: string | null;
          event_draft_id: string | null;
          id: string;
          is_anonymous: boolean;
          is_sample: boolean;
          locale: string;
          name: string | null;
          owner_id: string | null;
          owner_name: string | null;
          reference: string;
          status: Database['public']['Enums']['submission_status'];
          title: string;
          type_id: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          consent_at?: string | null;
          created_at?: string;
          description: string;
          email?: string | null;
          event_draft_id?: string | null;
          id?: string;
          is_anonymous?: boolean;
          is_sample?: boolean;
          locale: string;
          name?: string | null;
          owner_id?: string | null;
          owner_name?: string | null;
          reference: string;
          status?: Database['public']['Enums']['submission_status'];
          title: string;
          type_id: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          consent_at?: string | null;
          created_at?: string;
          description?: string;
          email?: string | null;
          event_draft_id?: string | null;
          id?: string;
          is_anonymous?: boolean;
          is_sample?: boolean;
          locale?: string;
          name?: string | null;
          owner_id?: string | null;
          owner_name?: string | null;
          reference?: string;
          status?: Database['public']['Enums']['submission_status'];
          title?: string;
          type_id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ideas_event_draft_id_fkey';
            columns: ['event_draft_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ideas_type_id_fkey';
            columns: ['type_id'];
            isOneToOne: false;
            referencedRelation: 'idea_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ideas_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      internal_notes: {
        Row: {
          author: string | null;
          author_initials: string;
          author_name: string;
          body: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          is_sample: boolean;
        };
        ComputedFields: never;
        Insert: {
          author?: string | null;
          author_initials: string;
          author_name: string;
          body: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          is_sample?: boolean;
        };
        Update: {
          author?: string | null;
          author_initials?: string;
          author_name?: string;
          body?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          is_sample?: boolean;
        };
        Relationships: [];
      };
      login_lockouts: {
        Row: {
          email_key: string;
          failures: string[];
          locked_until: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          email_key: string;
          failures?: string[];
          locked_until?: string | null;
          updated_at?: string;
        };
        Update: {
          email_key?: string;
          failures?: string[];
          locked_until?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      media: {
        Row: {
          alt_text: string | null;
          bucket: string | null;
          created_at: string;
          credit: string | null;
          file_name: string;
          height: number | null;
          id: string;
          is_sample: boolean;
          kind: Database['public']['Enums']['media_kind'];
          mime_type: string | null;
          path: string | null;
          public_path: string | null;
          sample_caption: string | null;
          size_bytes: number | null;
          status: Database['public']['Enums']['media_status'];
          updated_at: string;
          uploaded_by: string | null;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          alt_text?: string | null;
          bucket?: string | null;
          created_at?: string;
          credit?: string | null;
          file_name: string;
          height?: number | null;
          id?: string;
          is_sample?: boolean;
          kind: Database['public']['Enums']['media_kind'];
          mime_type?: string | null;
          path?: string | null;
          public_path?: string | null;
          sample_caption?: string | null;
          size_bytes?: number | null;
          status?: Database['public']['Enums']['media_status'];
          updated_at?: string;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Update: {
          alt_text?: string | null;
          bucket?: string | null;
          created_at?: string;
          credit?: string | null;
          file_name?: string;
          height?: number | null;
          id?: string;
          is_sample?: boolean;
          kind?: Database['public']['Enums']['media_kind'];
          mime_type?: string | null;
          path?: string | null;
          public_path?: string | null;
          sample_caption?: string | null;
          size_bytes?: number | null;
          status?: Database['public']['Enums']['media_status'];
          updated_at?: string;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Relationships: [];
      };
      member_accounts: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          cv_consent_at: string | null;
          cv_file_name: string | null;
          cv_opt_in: boolean;
          cv_path: string | null;
          cv_size: number | null;
          cv_uploaded_at: string | null;
          data_consent_at: string;
          decided_at: string | null;
          faculty: string;
          gallery_name_opt_in: boolean;
          is_sample: boolean;
          newsletter_opt_in: boolean;
          password_changed_at: string | null;
          phone: string;
          profile_id: string;
          registration_locale: string;
          rejection_reason: string | null;
          updated_at: string;
          year_of_study: string | null;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          cv_consent_at?: string | null;
          cv_file_name?: string | null;
          cv_opt_in?: boolean;
          cv_path?: string | null;
          cv_size?: number | null;
          cv_uploaded_at?: string | null;
          data_consent_at: string;
          decided_at?: string | null;
          faculty?: string;
          gallery_name_opt_in?: boolean;
          is_sample?: boolean;
          newsletter_opt_in?: boolean;
          password_changed_at?: string | null;
          phone?: string;
          profile_id: string;
          registration_locale?: string;
          rejection_reason?: string | null;
          updated_at?: string;
          year_of_study?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          cv_consent_at?: string | null;
          cv_file_name?: string | null;
          cv_opt_in?: boolean;
          cv_path?: string | null;
          cv_size?: number | null;
          cv_uploaded_at?: string | null;
          data_consent_at?: string;
          decided_at?: string | null;
          faculty?: string;
          gallery_name_opt_in?: boolean;
          is_sample?: boolean;
          newsletter_opt_in?: boolean;
          password_changed_at?: string | null;
          phone?: string;
          profile_id?: string;
          registration_locale?: string;
          rejection_reason?: string | null;
          updated_at?: string;
          year_of_study?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'member_accounts_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      member_badges: {
        Row: {
          awarded_at: string;
          badge_id: string;
          note: string;
          profile_id: string;
        };
        ComputedFields: never;
        Insert: {
          awarded_at?: string;
          badge_id: string;
          note?: string;
          profile_id: string;
        };
        Update: {
          awarded_at?: string;
          badge_id?: string;
          note?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'member_badges_badge_id_fkey';
            columns: ['badge_id'];
            isOneToOne: false;
            referencedRelation: 'badges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_badges_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      member_teams: {
        Row: {
          profile_id: string;
          role: Database['public']['Enums']['team_role'];
          team_id: string;
        };
        ComputedFields: never;
        Insert: {
          profile_id: string;
          role?: Database['public']['Enums']['team_role'];
          team_id: string;
        };
        Update: {
          profile_id?: string;
          role?: Database['public']['Enums']['team_role'];
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'member_teams_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_teams_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      membership_applications: {
        Row: {
          consent_at: string;
          created_at: string;
          email: string | null;
          faculty: string;
          heard_from: string;
          id: string;
          interests: string[];
          is_sample: boolean;
          locale: string;
          name: string;
          phone: string;
          read_at: string | null;
          reference: string;
          status: Database['public']['Enums']['membership_status'];
          study_program: string;
          updated_at: string;
          year_of_study: string;
        };
        ComputedFields: never;
        Insert: {
          consent_at?: string;
          created_at?: string;
          email?: string | null;
          faculty?: string;
          heard_from?: string;
          id?: string;
          interests?: string[];
          is_sample?: boolean;
          locale: string;
          name: string;
          phone?: string;
          read_at?: string | null;
          reference: string;
          status?: Database['public']['Enums']['membership_status'];
          study_program?: string;
          updated_at?: string;
          year_of_study?: string;
        };
        Update: {
          consent_at?: string;
          created_at?: string;
          email?: string | null;
          faculty?: string;
          heard_from?: string;
          id?: string;
          interests?: string[];
          is_sample?: boolean;
          locale?: string;
          name?: string;
          phone?: string;
          read_at?: string | null;
          reference?: string;
          status?: Database['public']['Enums']['membership_status'];
          study_program?: string;
          updated_at?: string;
          year_of_study?: string;
        };
        Relationships: [];
      };
      memories: {
        Row: {
          author_deleted: boolean;
          author_id: string | null;
          body: string;
          city: string;
          country: string;
          cover_alt: string | null;
          cover_credit: string | null;
          cover_media_id: string | null;
          cover_sample: string | null;
          created_at: string;
          event_id: string | null;
          featured_on_home: boolean;
          happened_on: string | null;
          id: string;
          is_sample: boolean;
          other_event_name: string;
          published_at: string | null;
          reads_count: number;
          rejection_reason: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reviewed_by_name: string;
          slug: string | null;
          source: Database['public']['Enums']['memory_source'];
          status: Database['public']['Enums']['memory_status'];
          submitted_at: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_deleted?: boolean;
          author_id?: string | null;
          body?: string;
          city?: string;
          country?: string;
          cover_alt?: string | null;
          cover_credit?: string | null;
          cover_media_id?: string | null;
          cover_sample?: string | null;
          created_at?: string;
          event_id?: string | null;
          featured_on_home?: boolean;
          happened_on?: string | null;
          id?: string;
          is_sample?: boolean;
          other_event_name?: string;
          published_at?: string | null;
          reads_count?: number;
          rejection_reason?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewed_by_name?: string;
          slug?: string | null;
          source?: Database['public']['Enums']['memory_source'];
          status?: Database['public']['Enums']['memory_status'];
          submitted_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Update: {
          author_deleted?: boolean;
          author_id?: string | null;
          body?: string;
          city?: string;
          country?: string;
          cover_alt?: string | null;
          cover_credit?: string | null;
          cover_media_id?: string | null;
          cover_sample?: string | null;
          created_at?: string;
          event_id?: string | null;
          featured_on_home?: boolean;
          happened_on?: string | null;
          id?: string;
          is_sample?: boolean;
          other_event_name?: string;
          published_at?: string | null;
          reads_count?: number;
          rejection_reason?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewed_by_name?: string;
          slug?: string | null;
          source?: Database['public']['Enums']['memory_source'];
          status?: Database['public']['Enums']['memory_status'];
          submitted_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memories_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memories_cover_media_id_fkey';
            columns: ['cover_media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memories_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      memory_photos: {
        Row: {
          alt: string;
          caption: string;
          created_at: string;
          id: string;
          is_sample: boolean;
          media_id: string | null;
          memory_id: string;
          sample_caption: string | null;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          alt?: string;
          caption?: string;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          media_id?: string | null;
          memory_id: string;
          sample_caption?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          alt?: string;
          caption?: string;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          media_id?: string | null;
          memory_id?: string;
          sample_caption?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memory_photos_media_id_fkey';
            columns: ['media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memory_photos_memory_id_fkey';
            columns: ['memory_id'];
            isOneToOne: false;
            referencedRelation: 'memories';
            referencedColumns: ['id'];
          },
        ];
      };
      memory_revision_photos: {
        Row: {
          alt: string;
          caption: string;
          created_at: string;
          id: string;
          is_sample: boolean;
          media_id: string | null;
          revision_id: string;
          sample_caption: string | null;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          alt?: string;
          caption?: string;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          media_id?: string | null;
          revision_id: string;
          sample_caption?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          alt?: string;
          caption?: string;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          media_id?: string | null;
          revision_id?: string;
          sample_caption?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memory_revision_photos_media_id_fkey';
            columns: ['media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memory_revision_photos_revision_id_fkey';
            columns: ['revision_id'];
            isOneToOne: false;
            referencedRelation: 'memory_revisions';
            referencedColumns: ['id'];
          },
        ];
      };
      memory_revisions: {
        Row: {
          content: NonNullable<Json>;
          created_at: string;
          id: string;
          is_sample: boolean;
          memory_id: string;
          reason: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reviewed_by_name: string;
          status: Database['public']['Enums']['memory_revision_status'];
          submitted_at: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          content: NonNullable<Json>;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          memory_id: string;
          reason?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewed_by_name?: string;
          status?: Database['public']['Enums']['memory_revision_status'];
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          memory_id?: string;
          reason?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewed_by_name?: string;
          status?: Database['public']['Enums']['memory_revision_status'];
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memory_revisions_memory_id_fkey';
            columns: ['memory_id'];
            isOneToOne: true;
            referencedRelation: 'memories';
            referencedColumns: ['id'];
          },
        ];
      };
      mfa_backup_codes: {
        Row: {
          code_hash: string;
          created_at: string;
          id: string;
          used_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          code_hash: string;
          created_at?: string;
          id?: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          code_hash?: string;
          created_at?: string;
          id?: string;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      page_content: {
        Row: {
          content: NonNullable<Json>;
          created_at: string;
          is_sample: boolean;
          page: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          content: NonNullable<Json>;
          created_at?: string;
          is_sample?: boolean;
          page: string;
          updated_at?: string;
        };
        Update: {
          content?: NonNullable<Json>;
          created_at?: string;
          is_sample?: boolean;
          page?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      partner_inquiries: {
        Row: {
          company: string;
          consent_at: string;
          contact_person: string;
          created_at: string;
          email: string | null;
          id: string;
          interests: string[];
          is_sample: boolean;
          locale: string;
          message: string;
          phone: string;
          read_at: string | null;
          reference: string;
          status: Database['public']['Enums']['inquiry_status'];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company: string;
          consent_at?: string;
          contact_person: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          interests: string[];
          is_sample?: boolean;
          locale: string;
          message: string;
          phone?: string;
          read_at?: string | null;
          reference: string;
          status?: Database['public']['Enums']['inquiry_status'];
          updated_at?: string;
        };
        Update: {
          company?: string;
          consent_at?: string;
          contact_person?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          interests?: string[];
          is_sample?: boolean;
          locale?: string;
          message?: string;
          phone?: string;
          read_at?: string | null;
          reference?: string;
          status?: Database['public']['Enums']['inquiry_status'];
          updated_at?: string;
        };
        Relationships: [];
      };
      partner_packages: {
        Row: {
          created_at: string;
          cta: NonNullable<Json>;
          highlighted: boolean;
          id: string;
          is_sample: boolean;
          items: NonNullable<Json>;
          name: NonNullable<Json>;
          price_text: NonNullable<Json>;
          sort_order: number;
          text: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          cta: NonNullable<Json>;
          highlighted?: boolean;
          id?: string;
          is_sample?: boolean;
          items?: NonNullable<Json>;
          name: NonNullable<Json>;
          price_text: NonNullable<Json>;
          sort_order?: number;
          text: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          cta?: NonNullable<Json>;
          highlighted?: boolean;
          id?: string;
          is_sample?: boolean;
          items?: NonNullable<Json>;
          name?: NonNullable<Json>;
          price_text?: NonNullable<Json>;
          sort_order?: number;
          text?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          active_to: string | null;
          alumni_highlight: Json | null;
          alumni_now: Json | null;
          bio: string;
          created_at: string;
          full_name: string;
          github_url: string;
          hide_bio: boolean;
          hide_photo: boolean;
          id: string;
          is_sample: boolean;
          linkedin_url: string;
          member_since: string | null;
          photo_media_id: string | null;
          status: Database['public']['Enums']['profile_status'];
          updated_at: string;
          username: string;
          visibility: Database['public']['Enums']['profile_visibility'];
        };
        ComputedFields: never;
        Insert: {
          active_to?: string | null;
          alumni_highlight?: Json | null;
          alumni_now?: Json | null;
          bio?: string;
          created_at?: string;
          full_name: string;
          github_url?: string;
          hide_bio?: boolean;
          hide_photo?: boolean;
          id: string;
          is_sample?: boolean;
          linkedin_url?: string;
          member_since?: string | null;
          photo_media_id?: string | null;
          status?: Database['public']['Enums']['profile_status'];
          updated_at?: string;
          username: string;
          visibility?: Database['public']['Enums']['profile_visibility'];
        };
        Update: {
          active_to?: string | null;
          alumni_highlight?: Json | null;
          alumni_now?: Json | null;
          bio?: string;
          created_at?: string;
          full_name?: string;
          github_url?: string;
          hide_bio?: boolean;
          hide_photo?: boolean;
          id?: string;
          is_sample?: boolean;
          linkedin_url?: string;
          member_since?: string | null;
          photo_media_id?: string | null;
          status?: Database['public']['Enums']['profile_status'];
          updated_at?: string;
          username?: string;
          visibility?: Database['public']['Enums']['profile_visibility'];
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_photo_media_id_fkey';
            columns: ['photo_media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
        ];
      };
      reference_counters: {
        Row: {
          kind: string;
          last: number;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          kind: string;
          last?: number;
          year: number;
        };
        Update: {
          kind?: string;
          last?: number;
          year?: number;
        };
        Relationships: [];
      };
      seo_pages: {
        Row: {
          created_at: string;
          description: NonNullable<Json>;
          is_sample: boolean;
          page: string;
          share_alt: string | null;
          share_media_id: string | null;
          title: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description: NonNullable<Json>;
          is_sample?: boolean;
          page: string;
          share_alt?: string | null;
          share_media_id?: string | null;
          title: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: NonNullable<Json>;
          is_sample?: boolean;
          page?: string;
          share_alt?: string | null;
          share_media_id?: string | null;
          title?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'seo_pages_share_media_id_fkey';
            columns: ['share_media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
        ];
      };
      site_settings: {
        Row: {
          created_at: string;
          is_sample: boolean;
          key: string;
          updated_at: string;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          is_sample?: boolean;
          key: string;
          updated_at?: string;
          value: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          is_sample?: boolean;
          key?: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      slug_redirects: {
        Row: {
          event_id: string;
          old_slug: string;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          old_slug: string;
        };
        Update: {
          event_id?: string;
          old_slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'slug_redirects_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
        ];
      };
      social_links: {
        Row: {
          created_at: string;
          handle: string;
          id: string;
          is_sample: boolean;
          platform: string;
          sort_order: number;
          updated_at: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          handle?: string;
          id?: string;
          is_sample?: boolean;
          platform: string;
          sort_order?: number;
          updated_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          handle?: string;
          id?: string;
          is_sample?: boolean;
          platform?: string;
          sort_order?: number;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      sponsor_tiers: {
        Row: {
          created_at: string;
          id: string;
          is_sample: boolean;
          name: NonNullable<Json>;
          size: Database['public']['Enums']['sponsor_tier_size'];
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name: NonNullable<Json>;
          size: Database['public']['Enums']['sponsor_tier_size'];
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name?: NonNullable<Json>;
          size?: Database['public']['Enums']['sponsor_tier_size'];
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      sponsors: {
        Row: {
          active_from: string | null;
          active_to: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          is_sample: boolean;
          logo_alt: Json | null;
          logo_credit: string | null;
          logo_media_id: string | null;
          name: string;
          sort_order: number;
          tier_id: string;
          updated_at: string;
          website_url: string;
        };
        ComputedFields: never;
        Insert: {
          active_from?: string | null;
          active_to?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_sample?: boolean;
          logo_alt?: Json | null;
          logo_credit?: string | null;
          logo_media_id?: string | null;
          name: string;
          sort_order?: number;
          tier_id: string;
          updated_at?: string;
          website_url?: string;
        };
        Update: {
          active_from?: string | null;
          active_to?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_sample?: boolean;
          logo_alt?: Json | null;
          logo_credit?: string | null;
          logo_media_id?: string | null;
          name?: string;
          sort_order?: number;
          tier_id?: string;
          updated_at?: string;
          website_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sponsors_logo_media_id_fkey';
            columns: ['logo_media_id'];
            isOneToOne: false;
            referencedRelation: 'media';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sponsors_tier_id_fkey';
            columns: ['tier_id'];
            isOneToOne: false;
            referencedRelation: 'sponsor_tiers';
            referencedColumns: ['id'];
          },
        ];
      };
      storage_cleanup_queue: {
        Row: {
          bucket: string;
          created_at: string;
          id: number;
          path: string;
          reason: string;
        };
        ComputedFields: never;
        Insert: {
          bucket: string;
          created_at?: string;
          id?: never;
          path: string;
          reason: string;
        };
        Update: {
          bucket?: string;
          created_at?: string;
          id?: never;
          path?: string;
          reason?: string;
        };
        Relationships: [];
      };
      submission_files: {
        Row: {
          created_at: string;
          feedback_id: string | null;
          file_name: string;
          id: string;
          idea_id: string | null;
          is_sample: boolean;
          mime_type: string;
          path: string;
          size_bytes: number;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          feedback_id?: string | null;
          file_name: string;
          id?: string;
          idea_id?: string | null;
          is_sample?: boolean;
          mime_type: string;
          path: string;
          size_bytes: number;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          feedback_id?: string | null;
          file_name?: string;
          id?: string;
          idea_id?: string | null;
          is_sample?: boolean;
          mime_type?: string;
          path?: string;
          size_bytes?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'submission_files_feedback_id_fkey';
            columns: ['feedback_id'];
            isOneToOne: false;
            referencedRelation: 'feedback';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submission_files_idea_id_fkey';
            columns: ['idea_id'];
            isOneToOne: false;
            referencedRelation: 'ideas';
            referencedColumns: ['id'];
          },
        ];
      };
      submission_log: {
        Row: {
          created_at: string;
          device_hash: string;
          id: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          device_hash: string;
          id?: never;
        };
        Update: {
          created_at?: string;
          device_hash?: string;
          id?: never;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          created_at: string;
          id: string;
          is_sample: boolean;
          name: NonNullable<Json>;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name: NonNullable<Json>;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_sample?: boolean;
          name?: NonNullable<Json>;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      memory_queue: {
        Row: {
          author_id: string | null;
          event_id: string | null;
          id: string | null;
          kind: string | null;
          other_event_name: string | null;
          photo_count: number | null;
          submitted_at: string | null;
          title: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      accept_idea: { Args: { p_event_data: Json; p_id: string }; Returns: string };
      account_deletion_pending: { Args: { p_user: string }; Returns: boolean };
      activity_actors: {
        Args: Record<PropertyKey, never>;
        Returns: {
          initials: string;
          name: string;
          user_id: string;
        }[];
      };
      activity_initials: { Args: { p_name: string }; Returns: string };
      add_internal_note: {
        Args: { p_body: string; p_entity_id: string; p_entity_type: string };
        Returns: string;
      };
      admin_save_member: { Args: { p_edit: Json; p_now?: string; p_user: string }; Returns: boolean };
      application_answer_counts: { Args: { p_event: string }; Returns: Json };
      application_availability: {
        Args: { p_event_ids: string[] };
        Returns: {
          event_id: string;
          taken: number;
          waiting: number;
        }[];
      };
      application_form_by_slug: { Args: { p_slug: string }; Returns: Json };
      application_form_for_event: { Args: { p_event: string }; Returns: Json };
      application_reference_prefix: { Args: { p_slug: string }; Returns: string };
      application_summaries: {
        Args: { p_event_ids: string[] };
        Returns: {
          accepted: number;
          event_id: string;
          new_count: number;
          pending: number;
          rejected: number;
          total: number;
          waitlist: number;
        }[];
      };
      author_cards: {
        Args: { p_ids: string[] };
        Returns: {
          bio: string;
          full_name: string;
          page: string;
          photo_bucket: string;
          photo_path: string;
          photo_public_path: string;
          since: number;
          team_names: Json;
          user_id: string;
          username: string;
        }[];
      };
      begin_member_deletion: { Args: { p_delete_published: boolean; p_user: string }; Returns: Json };
      board_view: { Args: { p_label?: string }; Returns: Json };
      can_read_avatar: { Args: { p_path: string }; Returns: boolean };
      can_read_memory_photo: { Args: { p_path: string }; Returns: boolean };
      current_admin_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['admin_role'];
      };
      dashboard_counts: { Args: Record<PropertyKey, never>; Returns: Json };
      dashboard_counts_m19b: { Args: Record<PropertyKey, never>; Returns: Json };
      dashboard_pending: { Args: Record<PropertyKey, never>; Returns: Json };
      decide_member_registrations: {
        Args: { p_decision: string; p_ids: string[]; p_reason?: string };
        Returns: Json;
      };
      delete_applications_by_email: { Args: { p_email: string }; Returns: number };
      event_agenda_valid: { Args: { p_agenda: Json }; Returns: boolean };
      event_by_slug: { Args: { p_slug: string }; Returns: Json };
      event_feedback_for_manager: {
        Args: { p_event: string };
        Returns: {
          created_at: string;
          event_id: string;
          event_title: string;
          id: string;
          impression: string;
          locale: string;
          rating: number;
          reference: string;
          status: Database['public']['Enums']['submission_status'];
        }[];
      };
      event_ratings: {
        Args: { p_event_ids?: string[]; p_from: string; p_until: string };
        Returns: {
          average: number;
          distribution: number[];
          event_id: string;
          event_title: string;
          latest_at: string;
          latest_comment: string;
          latest_comment_at: string;
          other_key: string;
          rating_count: number;
        }[];
      };
      event_save: { Args: { p_data: Json; p_id: string }; Returns: string };
      event_updated_by: { Args: { p_id: string }; Returns: Json };
      events_updated_by: {
        Args: { p_ids: string[] };
        Returns: {
          event_id: string;
          name: string;
          user_id: string;
        }[];
      };
      feedback_for_manager: {
        Args: { p_id: string };
        Returns: {
          created_at: string;
          event_id: string;
          event_title: string;
          id: string;
          impression: string;
          locale: string;
          rating: number;
          reference: string;
          status: Database['public']['Enums']['submission_status'];
        }[];
      };
      feedback_json: { Args: { p_id: string }; Returns: Json };
      finish_member_deletion: { Args: { p_user: string }; Returns: boolean };
      idea_json: { Args: { p_id: string }; Returns: Json };
      import_committees: { Args: { p_items: Json }; Returns: Json };
      internal_note_counts: { Args: { p_entity_type: string }; Returns: Json };
      is_active_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_event_manager_of: { Args: { p_event: string }; Returns: boolean };
      is_localized: { Args: { value: Json }; Returns: boolean };
      is_member_audience: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      link_idea_event_draft: { Args: { p_event: string; p_id: string }; Returns: boolean };
      login_gate: { Args: { p_email: string }; Returns: Json };
      login_record: { Args: { p_email: string; p_ok: boolean }; Returns: Json };
      mark_all_inbox_read: { Args: { p_kind: string; p_read_at: string }; Returns: number };
      mark_application_read: { Args: { p_id: string; p_read_at: string }; Returns: boolean };
      mark_deletion_file_done: {
        Args: { p_bucket: string; p_path: string; p_user: string };
        Returns: boolean;
      };
      media_uploaders: {
        Args: { p_ids: string[] };
        Returns: {
          id: string;
          name: string;
        }[];
      };
      media_usage: { Args: { p_id: string }; Returns: Json };
      members_directory: { Args: Record<PropertyKey, never>; Returns: Json };
      members_hidden_count: { Args: Record<PropertyKey, never>; Returns: number };
      memory_admin_counts: { Args: Record<PropertyKey, never>; Returns: Json };
      memory_admin_remove: { Args: { p_id: string }; Returns: boolean };
      memory_admin_save: {
        Args: { p_content: Json; p_featured: boolean; p_id: string; p_revision: boolean };
        Returns: boolean;
      };
      memory_apply_content: { Args: { p_content: Json; p_id: string }; Returns: undefined };
      memory_count_read: { Args: { p_slug: string }; Returns: undefined };
      memory_decide: {
        Args: { p_approve: boolean; p_featured?: boolean; p_id: string; p_reason?: string };
        Returns: Json;
      };
      memory_discard: { Args: { p_id: string }; Returns: boolean };
      memory_facets: { Args: Record<PropertyKey, never>; Returns: Json };
      memory_media_ids: { Args: { p_id: string }; Returns: string[] };
      memory_media_sizes: { Args: { p_ids: string[] }; Returns: Json };
      memory_new_slug: { Args: { p_title: string }; Returns: string };
      memory_page: {
        Args: {
          p_author?: string;
          p_event?: string;
          p_exclude?: string;
          p_featured_first?: boolean;
          p_limit?: number;
          p_offset?: number;
          p_place?: string;
          p_q?: string;
          p_sort?: string;
          p_year?: number;
        };
        Returns: Json;
      };
      memory_photo_path: { Args: { p_media: string }; Returns: string };
      memory_queue_unused_media: { Args: { p_ids: string[] }; Returns: undefined };
      memory_save_draft: { Args: { p_content: Json; p_id: string }; Returns: Json };
      memory_set_featured: { Args: { p_featured: boolean; p_id: string }; Returns: boolean };
      memory_submit: { Args: { p_content: Json; p_id: string }; Returns: Json };
      memory_unpublish: { Args: { p_id: string }; Returns: boolean };
      memory_validate_content: {
        Args: { p_actor: string; p_content: Json; p_memory?: string; p_staff: boolean };
        Returns: undefined;
      };
      my_cv_export_count: { Args: { p_year: number }; Returns: number };
      my_profile: { Args: { p_year: number }; Returns: Json };
      next_reference_number: { Args: { p_kind: string; p_year: number }; Returns: number };
      profile_events: {
        Args: { p_profile: string };
        Returns: {
          attended: boolean;
          event_id: string;
          event_role: string;
        }[];
      };
      profile_json: { Args: { p_id: string }; Returns: Json };
      profile_restricted: {
        Args: { p_username: string };
        Returns: {
          full_name: string;
          member_since: string;
          teams: Json;
          user_id: string;
          username: string;
        }[];
      };
      purge_sample_data: { Args: Record<PropertyKey, never>; Returns: Json };
      rate_limit_hit: { Args: { p_device_hash: string }; Returns: Json };
      record_activity: {
        Args: { p_action: string; p_area: string; p_href?: string; p_target: string };
        Returns: undefined;
      };
      reference_suffix: { Args: { p_number: number }; Returns: string };
      register_memory_photo: {
        Args: { p_height: number; p_mime: string; p_path: string; p_size: number; p_width: number };
        Returns: string;
      };
      remove_event_topic: { Args: { p_id: string }; Returns: boolean };
      remove_event_type: { Args: { p_id: string; p_replacement?: string }; Returns: boolean };
      remove_events: { Args: { p_ids: string[] }; Returns: string[] };
      remove_my_cv: { Args: Record<PropertyKey, never>; Returns: string };
      remove_my_photo: { Args: Record<PropertyKey, never>; Returns: string };
      renumber_event_waitlist: { Args: { p_event: string }; Returns: undefined };
      reorder_event_taxonomy: { Args: { p_ids: string[]; p_kind: string }; Returns: boolean };
      reorder_seats: { Args: { p_ids: string[]; p_mandate: string }; Returns: undefined };
      reorder_sponsors: { Args: { p_ids: string[]; p_tier: string }; Returns: boolean };
      reorder_teams: { Args: { p_ids: string[] }; Returns: undefined };
      require_memory_author: { Args: Record<PropertyKey, never>; Returns: string };
      require_staff: { Args: Record<PropertyKey, never>; Returns: undefined };
      resolve_event_address: { Args: { p_slug: string }; Returns: Json };
      save_application_form: { Args: { p_event: string; p_fields: Json; p_intro: Json }; Returns: undefined };
      save_contact_page: { Args: { p_content: Json; p_subjects: Json }; Returns: undefined };
      save_idea_form: { Args: { p_intro: Json; p_types: Json }; Returns: undefined };
      save_partners_page: { Args: { p_content: Json; p_packages: Json }; Returns: undefined };
      save_site_settings: { Args: { p_data: Json }; Returns: undefined };
      save_sponsor_tiers: { Args: { p_tiers: Json }; Returns: Json };
      set_application_status: {
        Args: {
          p_event: string;
          p_ids: string[];
          p_status: Database['public']['Enums']['application_status'];
        };
        Returns: string[];
      };
      set_current_mandate: { Args: { p_id: string }; Returns: boolean };
      set_event_status: {
        Args: { p_ids: string[]; p_status: Database['public']['Enums']['event_status'] };
        Returns: string[];
      };
      set_home_committee: { Args: { p_id: string }; Returns: boolean };
      set_inbox_read: { Args: { p_id: string; p_kind: string; p_read_at: string }; Returns: boolean };
      set_inbox_status: { Args: { p_id: string; p_kind: string; p_status: string }; Returns: boolean };
      set_my_cv: {
        Args: { p_file_name: string; p_now?: string; p_path: string; p_size: number };
        Returns: Json;
      };
      set_my_photo: {
        Args: { p_file_name?: string; p_mime: string; p_path: string; p_size: number };
        Returns: Json;
      };
      slug_taken: { Args: { p_except?: string; p_slug: string }; Returns: boolean };
      submission_counts: { Args: { p_kind: string }; Returns: Json };
      submit_application: {
        Args: {
          p_answers: Json;
          p_consent: boolean;
          p_email: string;
          p_event: string;
          p_files?: Json;
          p_locale: string;
          p_name: string;
          p_profile?: string;
        };
        Returns: Json;
      };
      submit_contact_message: {
        Args: {
          p_consent: boolean;
          p_email: string;
          p_locale: string;
          p_message: string;
          p_name: string;
          p_now?: string;
          p_subject: string;
        };
        Returns: Json;
      };
      submit_idea: {
        Args: {
          p_anonymous: boolean;
          p_attachment?: Json;
          p_consent: boolean;
          p_description: string;
          p_email: string;
          p_locale: string;
          p_name: string;
          p_now?: string;
          p_profile: string;
          p_title: string;
          p_type: string;
        };
        Returns: Json;
      };
      submit_impression: {
        Args: {
          p_anonymous: boolean;
          p_consent: boolean;
          p_email: string;
          p_event: string;
          p_event_title: string;
          p_files?: Json;
          p_locale: string;
          p_memory_content?: Json;
          p_name: string;
          p_now?: string;
          p_other_event: string;
          p_profile: string;
          p_rating: number;
          p_text: string;
        };
        Returns: Json;
      };
      submit_membership: {
        Args: {
          p_consent: boolean;
          p_email: string;
          p_faculty: string;
          p_heard_from: string;
          p_interests: string[];
          p_locale: string;
          p_name: string;
          p_now?: string;
          p_phone: string;
          p_study_program: string;
          p_year: string;
        };
        Returns: Json;
      };
      submit_partner_inquiry: {
        Args: {
          p_company: string;
          p_consent: boolean;
          p_email: string;
          p_interests: string[];
          p_locale: string;
          p_message: string;
          p_name: string;
          p_now?: string;
          p_phone: string;
        };
        Returns: Json;
      };
      update_my_profile: { Args: { p_edit: Json }; Returns: Json };
      update_submission: {
        Args: {
          p_id: string;
          p_kind: string;
          p_owner: string;
          p_owner_name: string;
          p_status: Database['public']['Enums']['submission_status'];
        };
        Returns: boolean;
      };
      username_taken: { Args: { p_except?: string; p_username: string }; Returns: boolean };
      uuid_or_null: { Args: { p_text: string }; Returns: string };
      verified_email_matches: { Args: { p_email: string }; Returns: boolean };
      withdraw_application: { Args: { p_id: string }; Returns: boolean };
    };
    Enums: {
      admin_role: 'super_admin' | 'editor' | 'event_manager';
      application_status: 'pending' | 'accepted' | 'rejected' | 'waitlist';
      auth_link_kind: 'confirm' | 'reset' | 'email_change';
      badge_icon:
        'calendar-check' | 'globe' | 'users' | 'landmark' | 'presentation' | 'award' | 'star' | 'heart';
      committee_status: 'lc' | 'observer' | 'jlc';
      contact_status: 'new' | 'answered' | 'archived';
      event_admission: 'selection' | 'first_come';
      event_apply_via: 'form' | 'external';
      event_scope: 'local' | 'international';
      event_status: 'draft' | 'published' | 'hidden';
      inquiry_status: 'new' | 'in_progress' | 'done';
      media_kind: 'image' | 'document';
      media_status: 'pending' | 'ready';
      membership_status: 'new' | 'contacted' | 'accepted' | 'rejected';
      memory_revision_status: 'pending' | 'rejected';
      memory_source: 'editor' | 'impression';
      memory_status: 'draft' | 'pending' | 'published' | 'rejected';
      profile_status: 'pending' | 'active' | 'alumni' | 'inactive' | 'rejected' | 'hidden';
      profile_visibility: 'public' | 'members_only';
      sponsor_tier_size: 'large' | 'medium' | 'small';
      submission_status: 'new' | 'under_review' | 'accepted' | 'archived';
      team_role: 'member' | 'lead' | 'trainer';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      admin_role: ['super_admin', 'editor', 'event_manager'],
      application_status: ['pending', 'accepted', 'rejected', 'waitlist'],
      auth_link_kind: ['confirm', 'reset', 'email_change'],
      badge_icon: ['calendar-check', 'globe', 'users', 'landmark', 'presentation', 'award', 'star', 'heart'],
      committee_status: ['lc', 'observer', 'jlc'],
      contact_status: ['new', 'answered', 'archived'],
      event_admission: ['selection', 'first_come'],
      event_apply_via: ['form', 'external'],
      event_scope: ['local', 'international'],
      event_status: ['draft', 'published', 'hidden'],
      inquiry_status: ['new', 'in_progress', 'done'],
      media_kind: ['image', 'document'],
      media_status: ['pending', 'ready'],
      membership_status: ['new', 'contacted', 'accepted', 'rejected'],
      memory_revision_status: ['pending', 'rejected'],
      memory_source: ['editor', 'impression'],
      memory_status: ['draft', 'pending', 'published', 'rejected'],
      profile_status: ['pending', 'active', 'alumni', 'inactive', 'rejected', 'hidden'],
      profile_visibility: ['public', 'members_only'],
      sponsor_tier_size: ['large', 'medium', 'small'],
      submission_status: ['new', 'under_review', 'accepted', 'archived'],
      team_role: ['member', 'lead', 'trainer'],
    },
  },
} as const;
