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
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
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
      Category: {
        Row: {
          coupleId: string
          icon: string | null
          id: string
          name: string
          order: number
          type: string
        }
        Insert: {
          coupleId: string
          icon?: string | null
          id: string
          name: string
          order?: number
          type: string
        }
        Update: {
          coupleId?: string
          icon?: string | null
          id?: string
          name?: string
          order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "Category_coupleId_fkey"
            columns: ["coupleId"]
            isOneToOne: false
            referencedRelation: "Couple"
            referencedColumns: ["id"]
          },
        ]
      }
      Couple: {
        Row: {
          createdAt: string
          id: string
          name: string
        }
        Insert: {
          createdAt?: string
          id: string
          name: string
        }
        Update: {
          createdAt?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      Event: {
        Row: {
          category: string | null
          coupleId: string
          createdAt: string
          createdById: string
          description: string | null
          endAt: string | null
          id: string
          isAllDay: boolean
          startAt: string
          title: string
        }
        Insert: {
          category?: string | null
          coupleId: string
          createdAt?: string
          createdById: string
          description?: string | null
          endAt?: string | null
          id: string
          isAllDay?: boolean
          startAt: string
          title: string
        }
        Update: {
          category?: string | null
          coupleId?: string
          createdAt?: string
          createdById?: string
          description?: string | null
          endAt?: string | null
          id?: string
          isAllDay?: boolean
          startAt?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "Event_coupleId_fkey"
            columns: ["coupleId"]
            isOneToOne: false
            referencedRelation: "Couple"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          settlement_share_a: number
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          settlement_share_a?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settlement_share_a?: number
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
          created_at: string
          display_name: string
          household_id: string
          id: string
          slot: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          household_id: string
          id?: string
          slot: string
          user_id: string
        }
        Update: {
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
      Profile: {
        Row: {
          colorRole: string
          coupleId: string | null
          createdAt: string
          id: string
          name: string
        }
        Insert: {
          colorRole: string
          coupleId?: string | null
          createdAt?: string
          id: string
          name: string
        }
        Update: {
          colorRole?: string
          coupleId?: string | null
          createdAt?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "Profile_coupleId_fkey"
            columns: ["coupleId"]
            isOneToOne: false
            referencedRelation: "Couple"
            referencedColumns: ["id"]
          },
        ]
      }
      Transaction: {
        Row: {
          amount: number
          categoryId: string
          coupleId: string
          createdAt: string
          createdById: string
          date: string
          id: string
          memo: string | null
          type: string
        }
        Insert: {
          amount: number
          categoryId: string
          coupleId: string
          createdAt?: string
          createdById: string
          date: string
          id: string
          memo?: string | null
          type: string
        }
        Update: {
          amount?: number
          categoryId?: string
          coupleId?: string
          createdAt?: string
          createdById?: string
          date?: string
          id?: string
          memo?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "Transaction_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Transaction_coupleId_fkey"
            columns: ["coupleId"]
            isOneToOne: false
            referencedRelation: "Couple"
            referencedColumns: ["id"]
          },
        ]
      }
      Trip: {
        Row: {
          budget: number | null
          coupleId: string
          createdAt: string
          destination: string | null
          endDate: string
          id: string
          startDate: string
          status: string
          title: string
        }
        Insert: {
          budget?: number | null
          coupleId: string
          createdAt?: string
          destination?: string | null
          endDate: string
          id: string
          startDate: string
          status?: string
          title: string
        }
        Update: {
          budget?: number | null
          coupleId?: string
          createdAt?: string
          destination?: string | null
          endDate?: string
          id?: string
          startDate?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "Trip_coupleId_fkey"
            columns: ["coupleId"]
            isOneToOne: false
            referencedRelation: "Couple"
            referencedColumns: ["id"]
          },
        ]
      }
      TripItem: {
        Row: {
          day: number
          id: string
          isChecked: boolean
          memo: string | null
          order: number
          time: string | null
          title: string
          tripId: string
          type: string
        }
        Insert: {
          day: number
          id: string
          isChecked?: boolean
          memo?: string | null
          order?: number
          time?: string | null
          title: string
          tripId: string
          type: string
        }
        Update: {
          day?: number
          id?: string
          isChecked?: boolean
          memo?: string | null
          order?: number
          time?: string | null
          title?: string
          tripId?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "TripItem_tripId_fkey"
            columns: ["tripId"]
            isOneToOne: false
            referencedRelation: "Trip"
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
      create_household: { Args: { p_display_name: string }; Returns: string }
      create_invite: { Args: never; Returns: string }
      get_invite: {
        Args: { p_token: string }
        Returns: {
          inviter_name: string
          status: string
        }[]
      }
      my_household_id: { Args: never; Returns: string }
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
