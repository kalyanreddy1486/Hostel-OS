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
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          advance_paid: number
          bed_id: string
          billing_mode: string
          created_at: string
          daily_rate: number | null
          expected_checkout_date: string | null
          id: string
          is_active: boolean
          member_id: string
          move_in_date: string
          move_out_date: string | null
          security_deposit: number
          tenant_id: string
        }
        Insert: {
          advance_paid?: number
          bed_id: string
          billing_mode?: string
          created_at?: string
          daily_rate?: number | null
          expected_checkout_date?: string | null
          id?: string
          is_active?: boolean
          member_id: string
          move_in_date: string
          move_out_date?: string | null
          security_deposit?: number
          tenant_id?: string
        }
        Update: {
          advance_paid?: number
          bed_id?: string
          billing_mode?: string
          created_at?: string
          daily_rate?: number | null
          expected_checkout_date?: string | null
          id?: string
          is_active?: boolean
          member_id?: string
          move_in_date?: string
          move_out_date?: string | null
          security_deposit?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
          record_id: string | null
          table_name: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string | null
          tenant_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          bed_number: string
          created_at: string
          id: string
          room_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          bed_number: string
          created_at?: string
          id?: string
          room_id: string
          status?: string
          tenant_id?: string
        }
        Update: {
          bed_number?: string
          created_at?: string
          id?: string
          room_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      electricity_readings: {
        Row: {
          billing_month: string | null
          created_at: string
          current_reading: number | null
          id: string
          previous_reading: number | null
          rate_per_unit: number
          reading_date: string
          room_id: string
          tenant_id: string
          total_amount: number | null
          units_consumed: number | null
        }
        Insert: {
          billing_month?: string | null
          created_at?: string
          current_reading?: number | null
          id?: string
          previous_reading?: number | null
          rate_per_unit?: number
          reading_date: string
          room_id: string
          tenant_id?: string
          total_amount?: number | null
          units_consumed?: number | null
        }
        Update: {
          billing_month?: string | null
          created_at?: string
          current_reading?: number | null
          id?: string
          previous_reading?: number | null
          rate_per_unit?: number
          reading_date?: string
          room_id?: string
          tenant_id?: string
          total_amount?: number | null
          units_consumed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "electricity_readings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_readings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_readings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          notes: string | null
          spent_on: string
          tenant_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          notes?: string | null
          spent_on?: string
          tenant_id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          spent_on?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_charges: {
        Row: {
          amount: number
          billing_month: string | null
          charge_date: string
          charge_type: string | null
          created_at: string
          description: string | null
          id: string
          member_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          billing_month?: string | null
          charge_date?: string
          charge_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_id: string
          tenant_id?: string
        }
        Update: {
          amount?: number
          billing_month?: string | null
          charge_date?: string
          charge_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_charges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_charges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          assignment_id: string | null
          billing_month: string | null
          created_at: string
          due_date: string | null
          electricity_amount: number
          extra_charges: number
          food_amount: number
          id: string
          invoice_number: string | null
          late_fee: number
          member_id: string
          notes: string | null
          pdf_url: string | null
          rent_amount: number
          status: string
          tenant_id: string
          total_amount: number
        }
        Insert: {
          assignment_id?: string | null
          billing_month?: string | null
          created_at?: string
          due_date?: string | null
          electricity_amount?: number
          extra_charges?: number
          food_amount?: number
          id?: string
          invoice_number?: string | null
          late_fee?: number
          member_id: string
          notes?: string | null
          pdf_url?: string | null
          rent_amount: number
          status?: string
          tenant_id?: string
          total_amount: number
        }
        Update: {
          assignment_id?: string | null
          billing_month?: string | null
          created_at?: string
          due_date?: string | null
          electricity_amount?: number
          extra_charges?: number
          food_amount?: number
          id?: string
          invoice_number?: string | null
          late_fee?: number
          member_id?: string
          notes?: string | null
          pdf_url?: string | null
          rent_amount?: number
          status?: string
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          issue_type: string | null
          priority: string
          raised_by: string | null
          raised_by_name: string | null
          raised_by_phone: string | null
          raised_by_room_label: string | null
          resolved_at: string | null
          room_id: string | null
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_type?: string | null
          priority?: string
          raised_by?: string | null
          raised_by_name?: string | null
          raised_by_phone?: string | null
          raised_by_room_label?: string | null
          resolved_at?: string | null
          room_id?: string | null
          status?: string
          tenant_id?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issue_type?: string | null
          priority?: string
          raised_by?: string | null
          raised_by_name?: string | null
          raised_by_phone?: string | null
          raised_by_room_label?: string | null
          resolved_at?: string | null
          room_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          check_in_date: string | null
          check_out_date: string | null
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          id_proof_url: string | null
          name: string
          phone: string | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          id_proof_url?: string | null
          name: string
          phone?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          id_proof_url?: string | null
          name?: string
          phone?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_inbox_events: {
        Row: {
          amount: number
          claimed_by_member_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          error_message: string | null
          from_address: string | null
          id: string
          invoice_reference: string | null
          match_reason: string | null
          matched_invoice_id: string | null
          matched_payment_id: string | null
          payer_name: string | null
          payer_vpa: string | null
          payment_mode: string | null
          raw_body: string | null
          received_at: string
          rejected_reason: string | null
          source: string
          status: string
          subject: string | null
          tenant_id: string
          upi_reference: string | null
        }
        Insert: {
          amount: number
          claimed_by_member_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          error_message?: string | null
          from_address?: string | null
          id?: string
          invoice_reference?: string | null
          match_reason?: string | null
          matched_invoice_id?: string | null
          matched_payment_id?: string | null
          payer_name?: string | null
          payer_vpa?: string | null
          payment_mode?: string | null
          raw_body?: string | null
          received_at?: string
          rejected_reason?: string | null
          source?: string
          status?: string
          subject?: string | null
          tenant_id?: string
          upi_reference?: string | null
        }
        Update: {
          amount?: number
          claimed_by_member_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          error_message?: string | null
          from_address?: string | null
          id?: string
          invoice_reference?: string | null
          match_reason?: string | null
          matched_invoice_id?: string | null
          matched_payment_id?: string | null
          payer_name?: string | null
          payer_vpa?: string | null
          payment_mode?: string | null
          raw_body?: string | null
          received_at?: string
          rejected_reason?: string | null
          source?: string
          status?: string
          subject?: string | null
          tenant_id?: string
          upi_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_inbox_events_claimed_by_member_id_fkey"
            columns: ["claimed_by_member_id"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_inbox_events_claimed_by_member_id_fkey"
            columns: ["claimed_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_inbox_events_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_inbox_events_matched_payment_id_fkey"
            columns: ["matched_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_inbox_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          id: string
          invoice_id: string | null
          member_id: string
          notes: string | null
          payment_date: string
          payment_mode: string
          recorded_by: string | null
          tenant_id: string
          transaction_reference: string | null
        }
        Insert: {
          amount: number
          id?: string
          invoice_id?: string | null
          member_id: string
          notes?: string | null
          payment_date?: string
          payment_mode: string
          recorded_by?: string | null
          tenant_id?: string
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          id?: string
          invoice_id?: string | null
          member_id?: string
          notes?: string | null
          payment_date?: string
          payment_mode?: string
          recorded_by?: string | null
          tenant_id?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          amenities: string[] | null
          capacity: number
          created_at: string
          floor: number | null
          id: string
          monthly_rent: number
          room_number: string
          room_type: string | null
          tenant_id: string
        }
        Insert: {
          amenities?: string[] | null
          capacity: number
          created_at?: string
          floor?: number | null
          id?: string
          monthly_rent: number
          room_number: string
          room_type?: string | null
          tenant_id?: string
        }
        Update: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string
          floor?: number | null
          id?: string
          monthly_rent?: number
          room_number?: string
          room_type?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          admin_user_id: string | null
          contact_email: string | null
          created_at: string
          hostel_name: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          admin_user_id?: string | null
          contact_email?: string | null
          created_at?: string
          hostel_name: string
          id?: string
          notes?: string | null
          status?: string
        }
        Update: {
          admin_user_id?: string | null
          contact_email?: string | null
          created_at?: string
          hostel_name?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      member_summary: {
        Row: {
          check_in_date: string | null
          check_out_date: string | null
          created_at: string | null
          current_bed_number: string | null
          current_room_number: string | null
          email: string | null
          id: string | null
          name: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      room_occupancy: {
        Row: {
          amenities: string[] | null
          capacity: number | null
          created_at: string | null
          floor: number | null
          id: string | null
          monthly_rent: number | null
          occupied_beds: number | null
          room_number: string | null
          room_type: string | null
          total_beds: number | null
        }
        Insert: {
          amenities?: string[] | null
          capacity?: number | null
          created_at?: string | null
          floor?: number | null
          id?: string | null
          monthly_rent?: number | null
          occupied_beds?: never
          room_number?: string | null
          room_type?: string | null
          total_beds?: never
        }
        Update: {
          amenities?: string[] | null
          capacity?: number | null
          created_at?: string | null
          floor?: number | null
          id?: string | null
          monthly_rent?: number | null
          occupied_beds?: never
          room_number?: string | null
          room_type?: string | null
          total_beds?: never
        }
        Relationships: []
      }
    }
    Functions: {
      assign_bed: {
        Args: {
          p_advance_paid: number
          p_bed_id: string
          p_billing_mode?: string
          p_daily_rate?: number
          p_expected_checkout_date?: string
          p_member_id: string
          p_move_in_date: string
          p_security_deposit: number
        }
        Returns: string
      }
      checkout_member: { Args: { p_member_id: string }; Returns: undefined }
      current_member_id: { Args: never; Returns: string }
      delete_member: { Args: { p_member_id: string }; Returns: undefined }
      get_dashboard_kpis: { Args: never; Returns: Json }
      get_email_config: { Args: never; Returns: Json }
      get_hostelos_cron_status: { Args: never; Returns: Json }
      get_my_tenant_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_controller: { Args: never; Returns: boolean }
      is_staff_or_admin: { Args: never; Returns: boolean }
      transfer_bed: {
        Args: {
          p_billing_mode?: string
          p_daily_rate?: number
          p_effective_date: string
          p_expected_checkout_date?: string
          p_member_id: string
          p_new_bed_id: string
        }
        Returns: string
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
