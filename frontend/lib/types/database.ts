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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          section: Database["public"]["Enums"]["section_type"]
          updated_at: string | null
          weight_in_section: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          section: Database["public"]["Enums"]["section_type"]
          updated_at?: string | null
          weight_in_section: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          section?: Database["public"]["Enums"]["section_type"]
          updated_at?: string | null
          weight_in_section?: number
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          scheduled_date: string
          session_number: number
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"] | null
          study_plan_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          scheduled_date: string
          session_number: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          study_plan_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          scheduled_date?: string
          session_number?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          study_plan_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_study_plan_id_fkey"
            columns: ["study_plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          acceptable_answers: Json | null
          answer_options: Json | null
          correct_answer: Json
          created_at: string | null
          difficulty: string
          difficulty_score: number | null
          external_id: string | null
          id: string
          is_active: boolean | null
          module: string
          question_type: string
          rationale: string | null
          source_uid: string | null
          stem: string
          topic_id: string
          updated_at: string | null
        }
        Insert: {
          acceptable_answers?: Json | null
          answer_options?: Json | null
          correct_answer: Json
          created_at?: string | null
          difficulty: string
          difficulty_score?: number | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          module: string
          question_type: string
          rationale?: string | null
          source_uid?: string | null
          stem: string
          topic_id: string
          updated_at?: string | null
        }
        Update: {
          acceptable_answers?: Json | null
          answer_options?: Json | null
          correct_answer?: Json
          created_at?: string | null
          difficulty?: string
          difficulty_score?: number | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          module?: string
          question_type?: string
          rationale?: string | null
          source_uid?: string | null
          stem?: string
          topic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      session_questions: {
        Row: {
          answered_at: string | null
          created_at: string | null
          display_order: number
          id: string
          question_id: string
          session_id: string
          started_at: string | null
          status: string | null
          topic_id: string
          user_answer: Json | null
        }
        Insert: {
          answered_at?: string | null
          created_at?: string | null
          display_order: number
          id?: string
          question_id: string
          session_id: string
          started_at?: string | null
          status?: string | null
          topic_id: string
          user_answer?: Json | null
        }
        Update: {
          answered_at?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          question_id?: string
          session_id?: string
          started_at?: string | null
          status?: string | null
          topic_id?: string
          user_answer?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "session_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string | null
          current_math_score: number | null
          current_rw_score: number | null
          id: string
          is_active: boolean | null
          start_date: string
          target_math_score: number | null
          target_rw_score: number | null
          test_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_math_score?: number | null
          current_rw_score?: number | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          target_math_score?: number | null
          target_rw_score?: number | null
          test_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_math_score?: number | null
          current_rw_score?: number | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          target_math_score?: number | null
          target_rw_score?: number | null
          test_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          weight_in_category: number
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          weight_in_category?: number
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          weight_in_category?: number
        }
        Relationships: [
          {
            foreignKeyName: "topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_session_topic_distribution: {
        Args: { p_session_id: string }
        Returns: {
          num_questions: number
          topic_id: string
          topic_name: string
        }[]
      }
    }
    Enums: {
      section_type: "math" | "reading_writing"
      session_status: "pending" | "in_progress" | "completed" | "skipped"
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
      section_type: ["math", "reading_writing"],
      session_status: ["pending", "in_progress", "completed", "skipped"],
    },
  },
} as const
