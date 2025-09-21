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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      evaluations: {
        Row: {
          analysis: string | null
          created_at: string
          detailed_analysis: Json | null
          id: string
          improved_response: string | null
          improvements: string[] | null
          olq_scores: Json | null
          overall_score: number | null
          score: number | null
          session_id: string | null
          strengths: string[] | null
          test_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          detailed_analysis?: Json | null
          id?: string
          improved_response?: string | null
          improvements?: string[] | null
          olq_scores?: Json | null
          overall_score?: number | null
          score?: number | null
          session_id?: string | null
          strengths?: string[] | null
          test_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: string | null
          created_at?: string
          detailed_analysis?: Json | null
          id?: string
          improved_response?: string | null
          improvements?: string[] | null
          olq_scores?: Json | null
          overall_score?: number | null
          score?: number | null
          session_id?: string | null
          strengths?: string[] | null
          test_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_requests: {
        Row: {
          created_at: string
          google_meet_link: string | null
          id: string
          interviewer_id: string
          notes: string | null
          payment_status: string
          slot_id: string
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_meet_link?: string | null
          id?: string
          interviewer_id: string
          notes?: string | null
          payment_status?: string
          slot_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_meet_link?: string | null
          id?: string
          interviewer_id?: string
          notes?: string | null
          payment_status?: string
          slot_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_requests_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "interviewers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_requests_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "interview_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_slots: {
        Row: {
          created_at: string
          id: string
          interviewer_id: string
          is_available: boolean
          slot_date: string
          slot_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interviewer_id: string
          is_available?: boolean
          slot_date: string
          slot_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interviewer_id?: string
          is_available?: boolean
          slot_date?: string
          slot_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_slots_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "interviewers"
            referencedColumns: ["id"]
          },
        ]
      }
      interviewers: {
        Row: {
          age: number
          bio: string | null
          created_at: string
          experience_years: number | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          rating: number | null
          recommendation_places: string[]
          recommendations_count: number
          specialization: string | null
          updated_at: string
        }
        Insert: {
          age: number
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          rating?: number | null
          recommendation_places?: string[]
          recommendations_count?: number
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          age?: number
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          rating?: number | null
          recommendation_places?: string[]
          recommendations_count?: number
          specialization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      piq_forms: {
        Row: {
          achievements: Json
          age_months: string | null
          age_years: string | null
          batch_no: string | null
          career_motivation: Json
          chest_no: string | null
          commission_nature: string | null
          created_at: string
          educational_background: Json
          extra_curricular_activities: string | null
          father_death_age: string | null
          father_income: string | null
          father_name: string | null
          father_occupation: string | null
          full_name: string | null
          games_and_sports: string | null
          height: string | null
          hobbies: string | null
          id: string
          is_district_hq: string | null
          max_residence_district: string | null
          max_residence_place: string | null
          max_residence_population: string | null
          max_residence_state: string | null
          mother_death_age: string | null
          mother_income: string | null
          mother_occupation: string | null
          ncc_details: string | null
          ncc_training: string | null
          parents_alive: string | null
          permanent_residence_district: string | null
          permanent_residence_place: string | null
          permanent_residence_population: string | null
          permanent_residence_state: string | null
          personal_income: string | null
          personal_info: Json
          positions_of_responsibility: string | null
          present_occupation: string | null
          present_residence_district: string | null
          present_residence_place: string | null
          present_residence_population: string | null
          present_residence_state: string | null
          previous_attempts: string | null
          previous_ssb_details: string | null
          roll_no: string | null
          selection_board: string | null
          service_choice: string | null
          updated_at: string
          user_id: string
          weight: string | null
        }
        Insert: {
          achievements?: Json
          age_months?: string | null
          age_years?: string | null
          batch_no?: string | null
          career_motivation?: Json
          chest_no?: string | null
          commission_nature?: string | null
          created_at?: string
          educational_background?: Json
          extra_curricular_activities?: string | null
          father_death_age?: string | null
          father_income?: string | null
          father_name?: string | null
          father_occupation?: string | null
          full_name?: string | null
          games_and_sports?: string | null
          height?: string | null
          hobbies?: string | null
          id?: string
          is_district_hq?: string | null
          max_residence_district?: string | null
          max_residence_place?: string | null
          max_residence_population?: string | null
          max_residence_state?: string | null
          mother_death_age?: string | null
          mother_income?: string | null
          mother_occupation?: string | null
          ncc_details?: string | null
          ncc_training?: string | null
          parents_alive?: string | null
          permanent_residence_district?: string | null
          permanent_residence_place?: string | null
          permanent_residence_population?: string | null
          permanent_residence_state?: string | null
          personal_income?: string | null
          personal_info?: Json
          positions_of_responsibility?: string | null
          present_occupation?: string | null
          present_residence_district?: string | null
          present_residence_place?: string | null
          present_residence_population?: string | null
          present_residence_state?: string | null
          previous_attempts?: string | null
          previous_ssb_details?: string | null
          roll_no?: string | null
          selection_board?: string | null
          service_choice?: string | null
          updated_at?: string
          user_id: string
          weight?: string | null
        }
        Update: {
          achievements?: Json
          age_months?: string | null
          age_years?: string | null
          batch_no?: string | null
          career_motivation?: Json
          chest_no?: string | null
          commission_nature?: string | null
          created_at?: string
          educational_background?: Json
          extra_curricular_activities?: string | null
          father_death_age?: string | null
          father_income?: string | null
          father_name?: string | null
          father_occupation?: string | null
          full_name?: string | null
          games_and_sports?: string | null
          height?: string | null
          hobbies?: string | null
          id?: string
          is_district_hq?: string | null
          max_residence_district?: string | null
          max_residence_place?: string | null
          max_residence_population?: string | null
          max_residence_state?: string | null
          mother_death_age?: string | null
          mother_income?: string | null
          mother_occupation?: string | null
          ncc_details?: string | null
          ncc_training?: string | null
          parents_alive?: string | null
          permanent_residence_district?: string | null
          permanent_residence_place?: string | null
          permanent_residence_population?: string | null
          permanent_residence_state?: string | null
          personal_income?: string | null
          personal_info?: Json
          positions_of_responsibility?: string | null
          present_occupation?: string | null
          present_residence_district?: string | null
          present_residence_place?: string | null
          present_residence_population?: string | null
          present_residence_state?: string | null
          previous_attempts?: string | null
          previous_ssb_details?: string | null
          roll_no?: string | null
          selection_board?: string | null
          service_choice?: string | null
          updated_at?: string
          user_id?: string
          weight?: string | null
        }
        Relationships: []
      }
      ppdt_images: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string | null
          id: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          id?: string
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          openai_thread_id_ppdt: string | null
          openai_thread_id_srt: string | null
          openai_thread_id_wat: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          openai_thread_id_ppdt?: string | null
          openai_thread_id_srt?: string | null
          openai_thread_id_wat?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          openai_thread_id_ppdt?: string | null
          openai_thread_id_srt?: string | null
          openai_thread_id_wat?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_enrollments: {
        Row: {
          enrolled_at: string
          id: string
          room_id: string
          status: string
          user_id: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          room_id: string
          status?: string
          user_id: string
        }
        Update: {
          enrolled_at?: string
          id?: string
          room_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_enrollments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          google_meet_link: string | null
          id: string
          is_active: boolean
          max_participants: number
          mod_email: string | null
          mod_name: string
          room_file_url: string | null
          room_image_url: string | null
          room_type: string
          scheduled_datetime: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          google_meet_link?: string | null
          id?: string
          is_active?: boolean
          max_participants?: number
          mod_email?: string | null
          mod_name: string
          room_file_url?: string | null
          room_image_url?: string | null
          room_type: string
          scheduled_datetime: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          google_meet_link?: string | null
          id?: string
          is_active?: boolean
          max_participants?: number
          mod_email?: string | null
          mod_name?: string
          room_file_url?: string | null
          room_image_url?: string | null
          room_type?: string
          scheduled_datetime?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_uploads: {
        Row: {
          created_at: string
          file_path: string
          id: string
          public_url: string
          session_id: string
          test_type: string
          upload_session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          public_url: string
          session_id: string
          test_type: string
          upload_session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          public_url?: string
          session_id?: string
          test_type?: string
          upload_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_uploads_upload_session_id_fkey"
            columns: ["upload_session_id"]
            isOneToOne: false
            referencedRelation: "upload_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      srt_situations: {
        Row: {
          created_at: string
          difficulty_level: string | null
          id: string
          situation_text: string
        }
        Insert: {
          created_at?: string
          difficulty_level?: string | null
          id?: string
          situation_text: string
        }
        Update: {
          created_at?: string
          difficulty_level?: string | null
          id?: string
          situation_text?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          expires_at: string
          id: string
          plan_id: string
          plan_name: string
          razorpay_payment_id: string | null
          starts_at: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          expires_at: string
          id?: string
          plan_id: string
          plan_name: string
          razorpay_payment_id?: string | null
          starts_at?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          expires_at?: string
          id?: string
          plan_id?: string
          plan_name?: string
          razorpay_payment_id?: string | null
          starts_at?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_responses: {
        Row: {
          created_at: string
          id: string
          image_id: string | null
          ocr_extracted_text: string | null
          response_image_url: string | null
          response_text: string | null
          session_id: string | null
          test_type: string
          time_taken: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_id?: string | null
          ocr_extracted_text?: string | null
          response_image_url?: string | null
          response_text?: string | null
          session_id?: string | null
          test_type: string
          time_taken?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_id?: string | null
          ocr_extracted_text?: string | null
          response_image_url?: string | null
          response_text?: string | null
          session_id?: string | null
          test_type?: string
          time_taken?: number | null
          user_id?: string
        }
        Relationships: []
      }
      upload_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          session_id: string
          test_type: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          session_id: string
          test_type: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          session_id?: string
          test_type?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string
          has_unlimited: boolean
          id: string
          last_daily_reset: string | null
          ppdt_credits: number
          srt_credits: number
          updated_at: string
          user_id: string
          wat_credits: number
        }
        Insert: {
          created_at?: string
          has_unlimited?: boolean
          id?: string
          last_daily_reset?: string | null
          ppdt_credits?: number
          srt_credits?: number
          updated_at?: string
          user_id: string
          wat_credits?: number
        }
        Update: {
          created_at?: string
          has_unlimited?: boolean
          id?: string
          last_daily_reset?: string | null
          ppdt_credits?: number
          srt_credits?: number
          updated_at?: string
          user_id?: string
          wat_credits?: number
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wat_words: {
        Row: {
          created_at: string
          difficulty_level: string | null
          id: string
          word: string
        }
        Insert: {
          created_at?: string
          difficulty_level?: string | null
          id?: string
          word: string
        }
        Update: {
          created_at?: string
          difficulty_level?: string | null
          id?: string
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_room_participant_counts: {
        Args: { p_room_ids: string[] }
        Returns: {
          participant_count: number
          room_id: string
        }[]
      }
      reset_daily_credits: {
        Args: Record<PropertyKey, never>
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
    Enums: {},
  },
} as const
