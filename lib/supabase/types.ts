// 임시 수기 타입. `pnpm db:types`로 자동 생성한 파일로 덮어쓴다.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { id: string; created_at: string };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13.0.5" };
  public: {
    Tables: {
      households: {
        Row: Timestamps & { name: string; settlement_share_a: number };
        Insert: { id?: string; created_at?: string; name?: string; settlement_share_a?: number };
        Update: { id?: string; created_at?: string; name?: string; settlement_share_a?: number };
        Relationships: [];
      };
      members: {
        Row: Timestamps & { household_id: string; user_id: string; slot: string; display_name: string };
        Insert: {
          id?: string;
          created_at?: string;
          household_id: string;
          user_id: string;
          slot: string;
          display_name: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          household_id?: string;
          user_id?: string;
          slot?: string;
          display_name?: string;
        };
        Relationships: [];
      };
      invites: {
        Row: Timestamps & {
          household_id: string;
          token: string;
          created_by: string;
          expires_at: string;
          used_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          household_id: string;
          token: string;
          created_by: string;
          expires_at?: string;
          used_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          household_id?: string;
          token?: string;
          created_by?: string;
          expires_at?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: Timestamps & {
          household_id: string;
          type: string;
          name: string;
          icon: string;
          sort_order: number;
          is_hidden: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          household_id: string;
          type: string;
          name: string;
          icon: string;
          sort_order?: number;
          is_hidden?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          household_id?: string;
          type?: string;
          name?: string;
          icon?: string;
          sort_order?: number;
          is_hidden?: boolean;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: Timestamps & {
          household_id: string;
          name: string;
          kind: string;
          owner: string;
          sms_aliases: string[];
          sort_order: number;
          is_hidden: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          household_id: string;
          name: string;
          kind: string;
          owner: string;
          sms_aliases?: string[];
          sort_order?: number;
          is_hidden?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          household_id?: string;
          name?: string;
          kind?: string;
          owner?: string;
          sms_aliases?: string[];
          sort_order?: number;
          is_hidden?: boolean;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_invite: { Args: { p_display_name: string; p_token: string }; Returns: string };
      create_household: { Args: { p_display_name: string }; Returns: string };
      create_invite: { Args: never; Returns: string };
      get_invite: {
        Args: { p_token: string };
        Returns: { inviter_name: string; status: string }[];
      };
      my_household_id: { Args: never; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
