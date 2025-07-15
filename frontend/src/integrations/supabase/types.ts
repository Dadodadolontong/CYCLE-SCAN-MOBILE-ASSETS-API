export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          barcode: string | null
          build: string | null
          category: string | null
          created_at: string
          erp_asset_id: string
          id: string
          last_seen: string | null
          location: string | null
          model: string | null
          name: string
          status: string | null
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          build?: string | null
          category?: string | null
          created_at?: string
          erp_asset_id: string
          id?: string
          last_seen?: string | null
          location?: string | null
          model?: string | null
          name: string
          status?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          build?: string | null
          category?: string | null
          created_at?: string
          erp_asset_id?: string
          id?: string
          last_seen?: string | null
          location?: string | null
          model?: string | null
          name?: string
          status?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          created_at: string
          id: string
          manager_id: string | null
          name: string
          region_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
          region_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
          region_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: true
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "branches_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          accounting_manager_id: string | null
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          accounting_manager_id?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          accounting_manager_id?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "countries_accounting_manager_id_fkey"
            columns: ["accounting_manager_id"]
            isOneToOne: true
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cycle_count_items: {
        Row: {
          actual_location: string | null
          asset_id: string
          counted_at: string | null
          counted_by: string | null
          created_at: string
          expected_location: string | null
          id: string
          notes: string | null
          status: string
          task_id: string
        }
        Insert: {
          actual_location?: string | null
          asset_id: string
          counted_at?: string | null
          counted_by?: string | null
          created_at?: string
          expected_location?: string | null
          id?: string
          notes?: string | null
          status?: string
          task_id: string
        }
        Update: {
          actual_location?: string | null
          asset_id?: string
          counted_at?: string | null
          counted_by?: string | null
          created_at?: string
          expected_location?: string | null
          id?: string
          notes?: string | null
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_count_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "cycle_count_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_count_tasks: {
        Row: {
          assigned_to: string | null
          category_filter: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          location_filter: string | null
          name: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category_filter?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          location_filter?: string | null
          name: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category_filter?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          location_filter?: string | null
          name?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_count_tasks_location_filter_id_fkey"
            columns: ["location_filter"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          branch_id: string | null
          created_at: string
          description: string | null
          erp_location_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          description?: string | null
          erp_location_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          description?: string | null
          erp_location_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_providers: {
        Row: {
          auth_url: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          scopes: string[]
          token_url: string
          updated_at: string
          user_info_url: string
        }
        Insert: {
          auth_url: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          scopes?: string[]
          token_url: string
          updated_at?: string
          user_info_url: string
        }
        Update: {
          auth_url?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scopes?: string[]
          token_url?: string
          updated_at?: string
          user_info_url?: string
        }
        Relationships: []
      }
      oauth_sessions: {
        Row: {
          config: Json
          created_at: string | null
          expires_at: string | null
          id: string
        }
        Insert: {
          config: Json
          created_at?: string | null
          expires_at?: string | null
          id?: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          expires_at?: string | null
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          attempts: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action: string
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action?: string
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      regions: {
        Row: {
          controller_id: string | null
          country_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          controller_id?: string | null
          country_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          controller_id?: string | null
          country_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_controller_id_fkey"
            columns: ["controller_id"]
            isOneToOne: true
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "regions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          assets_synced: number | null
          completed_at: string | null
          error_details: Json | null
          errors_count: number | null
          file_name: string | null
          id: string
          initiated_by: string | null
          next_run_at: string | null
          records_processed: number | null
          schedule_type: string | null
          scheduled_at: string | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          assets_synced?: number | null
          completed_at?: string | null
          error_details?: Json | null
          errors_count?: number | null
          file_name?: string | null
          id?: string
          initiated_by?: string | null
          next_run_at?: string | null
          records_processed?: number | null
          schedule_type?: string | null
          scheduled_at?: string | null
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          assets_synced?: number | null
          completed_at?: string | null
          error_details?: Json | null
          errors_count?: number | null
          file_name?: string | null
          id?: string
          initiated_by?: string | null
          next_run_at?: string | null
          records_processed?: number | null
          schedule_type?: string | null
          scheduled_at?: string | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      temp_assets: {
        Row: {
          barcode: string
          build: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          location: string | null
          model: string | null
          updated_at: string
        }
        Insert: {
          barcode: string
          build?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          location?: string | null
          model?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string
          build?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          location?: string | null
          model?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "temp_assets_location_fkey"
            columns: ["location"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branch_assignments: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_country_assignments: {
        Row: {
          country_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_country_assignments_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_country_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_region_assignments: {
        Row: {
          created_at: string
          id: string
          region_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          region_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          region_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_region_assignments_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_region_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          reports_to: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reports_to?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reports_to?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          session_end: string | null
          session_start: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          session_end?: string | null
          session_start?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          session_end?: string | null
          session_start?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _identifier: string
          _action: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_oauth_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_stuck_imports: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_user_accessible_branches: {
        Args: { user_id?: string }
        Returns: {
          branch_id: string
        }[]
      }
      get_user_accessible_countries: {
        Args: { user_id?: string }
        Returns: {
          country_id: string
        }[]
      }
      get_user_accessible_locations: {
        Args: { user_id?: string }
        Returns: {
          location_id: string
        }[]
      }
      get_user_accessible_regions: {
        Args: { user_id?: string }
        Returns: {
          region_id: string
        }[]
      }
      get_user_reports: {
        Args: { manager_id?: string }
        Returns: {
          user_id: string
        }[]
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          _action: string
          _resource_type: string
          _resource_id?: string
          _details?: Json
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          _action: string
          _resource_type: string
          _resource_id?: string
          _details?: Json
          _ip_address?: unknown
          _user_agent?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "user"
        | "accounting_manager"
        | "controller"
        | "guest"
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
      app_role: [
        "admin",
        "manager",
        "user",
        "accounting_manager",
        "controller",
        "guest",
      ],
    },
  },
} as const
