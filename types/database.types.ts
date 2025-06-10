export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          id: number
          user_id: string | null
          event_type: string
          event_data: Json | null
          session_id: string | null
          ip_address: string | null
          user_agent: string | null
          referrer: string | null
          page_url: string | null
          created_at: string
        }
        Insert: {
          id?: never
          user_id?: string | null
          event_type: string
          event_data?: Json | null
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          referrer?: string | null
          page_url?: string | null
          created_at?: string
        }
        Update: {
          id?: never
          user_id?: string | null
          event_type?: string
          event_data?: Json | null
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          referrer?: string | null
          page_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          id: number
          user_id: string | null
          prompt_id: number | null
          provider: string
          model: string
          tokens_input: number
          tokens_output: number
          cost_usd: number | null
          request_duration_ms: number | null
          status: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: never
          user_id?: string | null
          prompt_id?: number | null
          provider: string
          model: string
          tokens_input: number
          tokens_output: number
          cost_usd?: number | null
          request_duration_ms?: number | null
          status?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: never
          user_id?: string | null
          prompt_id?: number | null
          provider?: string
          model?: string
          tokens_input?: number
          tokens_output?: number
          cost_usd?: number | null
          request_duration_ms?: number | null
          status?: string | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: never
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: never
          name?: string
        }
        Relationships: []
      }
      playground_sessions: {
        Row: {
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: number
          input_text: string
          model_name: string
          model_parameters: Json
          output_text: string | null
          prompt_id: number | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: never
          input_text: string
          model_name: string
          model_parameters?: Json
          output_text?: string | null
          prompt_id?: number | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: never
          input_text?: string
          model_name?: string
          model_parameters?: Json
          output_text?: string | null
          prompt_id?: number | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playground_sessions_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          role: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          role?: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          role?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      prompt: {
        Row: {
          category_id: number | null
          content: string
          created_at: string
          description: string
          examples: Json
          featured: boolean
          id: number
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          uses: number
          votes: number
        }
        Insert: {
          category_id?: number | null
          content: string
          created_at?: string
          description: string
          examples?: Json
          featured?: boolean
          id?: never
          tags?: string[]
          title: string
          updated_at?: string
          user_id?: string
          uses?: number
          votes?: number
        }
        Update: {
          category_id?: number | null
          content?: string
          created_at?: string
          description?: string
          examples?: Json
          featured?: boolean
          id?: never
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          uses?: number
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_comments: {
        Row: {
          content: string
          created_at: string
          id: number
          parent_comment_id: number | null
          prompt_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          parent_comment_id?: number | null
          prompt_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          parent_comment_id?: number | null
          prompt_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "prompt_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_comments_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_forks: {
        Row: {
          created_at: string
          forked_prompt_id: number
          id: number
          original_prompt_id: number
        }
        Insert: {
          created_at?: string
          forked_prompt_id: number
          id?: never
          original_prompt_id: number
        }
        Update: {
          created_at?: string
          forked_prompt_id?: number
          id?: never
          original_prompt_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_forks_forked_prompt_id_fkey"
            columns: ["forked_prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_forks_original_prompt_id_fkey"
            columns: ["original_prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_improvements: {
        Row: {
          created_at: string
          created_by: string
          id: number
          prompt_id: number
          rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggestion: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: never
          prompt_id: number
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggestion: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: never
          prompt_id?: number
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggestion?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_improvements_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_tags: {
        Row: {
          created_at: string
          prompt_id: number
          tag_id: number
        }
        Insert: {
          created_at?: string
          prompt_id: number
          tag_id: number
        }
        Update: {
          created_at?: string
          prompt_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_tags_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_versions: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          created_by: string
          description: string
          id: number
          prompt_id: number
          title: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string
          created_by: string
          description: string
          id?: never
          prompt_id: number
          title: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: never
          prompt_id?: number
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_versions_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_votes: {
        Row: {
          created_at: string
          id: number
          prompt_id: number
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: never
          prompt_id: number
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: never
          prompt_id?: number
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_votes_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          id: number
          prompt_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          prompt_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          prompt_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          created_at: string
          id: number
          interaction_type: string
          prompt_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          interaction_type: string
          prompt_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          interaction_type?: string
          prompt_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
        ]
      }
      langfuse_traces: {
        Row: {
          id: string
          trace_id: string
          session_id: string | null
          user_id: string | null
          prompt_id: number | null
          name: string
          input: Json | null
          output: Json | null
          metadata: Json | null
          model: string | null
          start_time: string
          end_time: string | null
          duration_ms: number | null
          prompt_tokens: number | null
          completion_tokens: number | null
          total_tokens: number | null
          cost_usd: number | null
          status: string
          error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trace_id: string
          session_id?: string | null
          user_id?: string | null
          prompt_id?: number | null
          name: string
          input?: Json | null
          output?: Json | null
          metadata?: Json | null
          model?: string | null
          start_time: string
          end_time?: string | null
          duration_ms?: number | null
          prompt_tokens?: number | null
          completion_tokens?: number | null
          total_tokens?: number | null
          cost_usd?: number | null
          status?: string
          error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trace_id?: string
          session_id?: string | null
          user_id?: string | null
          prompt_id?: number | null
          name?: string
          input?: Json | null
          output?: Json | null
          metadata?: Json | null
          model?: string | null
          start_time?: string
          end_time?: string | null
          duration_ms?: number | null
          prompt_tokens?: number | null
          completion_tokens?: number | null
          total_tokens?: number | null
          cost_usd?: number | null
          status?: string
          error?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "langfuse_traces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "langfuse_traces_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          id: number
          user_id: string | null
          email: string | null
          feedback_type: string
          title: string
          content: string
          page_url: string | null
          user_agent: string | null
          status: string
          priority: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          user_id?: string | null
          email?: string | null
          feedback_type?: string
          title: string
          content: string
          page_url?: string | null
          user_agent?: string | null
          status?: string
          priority?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          user_id?: string | null
          email?: string | null
          feedback_type?: string
          title?: string
          content?: string
          page_url?: string | null
          user_agent?: string | null
          status?: string
          priority?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
