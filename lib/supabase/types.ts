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
      asset_values: {
        Row: {
          amount: number
          as_of: string
          asset_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          household_id: string
          id: string
        }
        Insert: {
          amount: number
          as_of: string
          asset_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          household_id: string
          id?: string
        }
        Update: {
          amount?: number
          as_of?: string
          asset_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_values_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_values_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_values_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          is_liability: boolean
          kind: string
          memo: string | null
          name: string
          owner: string
          updated_at: string
          value_as_of: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          is_liability?: boolean
          kind: string
          memo?: string | null
          name: string
          owner: string
          updated_at?: string
          value_as_of?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          is_liability?: boolean
          kind?: string
          memo?: string | null
          name?: string
          owner?: string
          updated_at?: string
          value_as_of?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_months: {
        Row: {
          created_at: string
          household_id: string
          month: string
        }
        Insert: {
          created_at?: string
          household_id: string
          month: string
        }
        Update: {
          created_at?: string
          household_id?: string
          month?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_months_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          household_id: string
          id: string
          month: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          household_id: string
          id?: string
          month: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          household_id?: string
          id?: string
          month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          household_id: string
          icon: string
          id: string
          is_hidden: boolean
          name: string
          sort_order: number
          type: string
        }
        Insert: {
          created_at?: string
          household_id: string
          icon: string
          id?: string
          is_hidden?: boolean
          name: string
          sort_order?: number
          type: string
        }
        Update: {
          created_at?: string
          household_id?: string
          icon?: string
          id?: string
          is_hidden?: boolean
          name?: string
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          contributed_on: string
          created_at: string
          created_by: string
          deleted_at: string | null
          goal_id: string
          household_id: string
          id: string
          member_slot: string
          memo: string | null
        }
        Insert: {
          amount: number
          contributed_on: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          goal_id: string
          household_id: string
          id?: string
          member_slot: string
          memo?: string | null
        }
        Update: {
          amount?: number
          contributed_on?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          goal_id?: string
          household_id?: string
          id?: string
          member_slot?: string
          memo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          deleted_at: string | null
          done_at: string | null
          due_date: string | null
          household_id: string
          id: string
          is_done: boolean
          name: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          done_at?: string | null
          due_date?: string | null
          household_id: string
          id?: string
          is_done?: boolean
          name: string
          target_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          done_at?: string | null
          due_date?: string | null
          household_id?: string
          id?: string
          is_done?: boolean
          name?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          household_id: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string
          household_id: string
          id: string
          slot: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name: string
          household_id: string
          id?: string
          slot: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          household_id?: string
          id?: string
          slot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_rules: {
        Row: {
          category_id: string
          created_at: string
          household_id: string
          id: string
          merchant_key: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          household_id: string
          id?: string
          merchant_key: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          household_id?: string
          id?: string
          merchant_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_hidden: boolean
          kind: string
          name: string
          owner: string
          sms_aliases: string[]
          sort_order: number
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_hidden?: boolean
          kind: string
          name: string
          owner: string
          sms_aliases?: string[]
          sort_order?: number
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_hidden?: boolean
          kind?: string
          name?: string
          owner?: string
          sms_aliases?: string[]
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_items: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          day_of_month: number
          end_month: string | null
          has_variable_date: boolean
          household_id: string
          id: string
          is_variable: boolean
          member_slot: string
          name: string
          payment_method_id: string | null
          scope: string
          start_month: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          day_of_month: number
          end_month?: string | null
          has_variable_date?: boolean
          household_id: string
          id?: string
          is_variable?: boolean
          member_slot: string
          name: string
          payment_method_id?: string | null
          scope: string
          start_month: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          day_of_month?: number
          end_month?: string | null
          has_variable_date?: boolean
          household_id?: string
          id?: string
          is_variable?: boolean
          member_slot?: string
          name?: string
          payment_method_id?: string | null
          scope?: string
          start_month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_items_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          household_id: string
          id: string
          member_slot: string
          memo: string | null
          merchant: string | null
          occurred_on: string
          occurred_time: string | null
          payment_method_id: string | null
          recurring_item_id: string | null
          recurring_month: string | null
          scope: string
          source: string
          type: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          household_id: string
          id?: string
          member_slot: string
          memo?: string | null
          merchant?: string | null
          occurred_on: string
          occurred_time?: string | null
          payment_method_id?: string | null
          recurring_item_id?: string | null
          recurring_month?: string | null
          scope: string
          source?: string
          type: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          member_slot?: string
          memo?: string | null
          merchant?: string | null
          occurred_on?: string
          occurred_time?: string | null
          payment_method_id?: string | null
          recurring_item_id?: string | null
          recurring_month?: string | null
          scope?: string
          source?: string
          type?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_item_id_fkey"
            columns: ["recurring_item_id"]
            isOneToOne: false
            referencedRelation: "recurring_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: {
        Args: { p_display_name: string; p_token: string }
        Returns: string
      }
      check_recurring: {
        Args: {
          p_amount?: number
          p_item_id: string
          p_month: string
          p_occurred_on?: string
        }
        Returns: string
      }
      create_household: { Args: { p_display_name: string }; Returns: string }
      create_invite: { Args: never; Returns: string }
      delete_asset_value: { Args: { p_value_id: string }; Returns: undefined }
      ensure_month_budgets: { Args: { p_month: string }; Returns: undefined }
      get_invite: {
        Args: { p_token: string }
        Returns: {
          inviter_name: string
          status: string
        }[]
      }
      get_usage: {
        Args: never
        Returns: {
          db_size_bytes: number
          last_activity: string
          recurring_count: number
          transaction_count: number
        }[]
      }
      my_household_id: { Args: never; Returns: string }
      normalize_merchant: { Args: { p: string }; Returns: string }
      set_asset_value: {
        Args: { p_amount: number; p_as_of: string; p_asset_id: string }
        Returns: undefined
      }
      uncheck_recurring: {
        Args: { p_item_id: string; p_month: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
