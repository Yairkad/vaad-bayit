export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'committee' | 'tenant';
export type PaymentMethod = 'standing_order' | 'cash';
export type MemberRole = 'committee' | 'tenant';
export type IssueStatus = 'open' | 'in_progress' | 'closed';
export type IssuePriority = 'low' | 'normal' | 'high';
export type DocumentCategory = 'regulation' | 'insurance' | 'protocol' | 'standing_order' | 'other';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          role: UserRole
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          role?: UserRole
          created_at?: string
        }
      }
      buildings: {
        Row: {
          id: string
          name: string
          address: string
          city: string | null
          monthly_fee: number
          is_approved: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city?: string | null
          monthly_fee?: number
          is_approved?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string | null
          monthly_fee?: number
          is_approved?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      building_members: {
        Row: {
          id: string
          building_id: string
          user_id: string | null
          full_name: string
          apartment_number: string
          role: MemberRole
          payment_method: PaymentMethod
          standing_order_active: boolean
          standing_order_file: string | null
          phone: string | null
          email: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          building_id: string
          user_id?: string | null
          full_name: string
          apartment_number: string
          role?: MemberRole
          payment_method?: PaymentMethod
          standing_order_active?: boolean
          standing_order_file?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          user_id?: string | null
          full_name?: string
          apartment_number?: string
          role?: MemberRole
          payment_method?: PaymentMethod
          standing_order_active?: boolean
          standing_order_file?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          building_id: string
          member_id: string
          month: string
          amount: number
          is_paid: boolean
          paid_at: string | null
          payment_method: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          building_id: string
          member_id: string
          month: string
          amount: number
          is_paid?: boolean
          paid_at?: string | null
          payment_method?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          member_id?: string
          month?: string
          amount?: number
          is_paid?: boolean
          paid_at?: string | null
          payment_method?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          building_id: string
          amount: number
          category: string
          description: string | null
          expense_date: string
          receipt_file: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          building_id: string
          amount: number
          category: string
          description?: string | null
          expense_date: string
          receipt_file?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          amount?: number
          category?: string
          description?: string | null
          expense_date?: string
          receipt_file?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          building_id: string
          title: string
          content: string
          expires_at: string | null
          send_email: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          building_id: string
          title: string
          content: string
          expires_at?: string | null
          send_email?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          title?: string
          content?: string
          expires_at?: string | null
          send_email?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      issues: {
        Row: {
          id: string
          building_id: string
          reported_by: string | null
          title: string
          description: string | null
          status: IssueStatus
          priority: IssuePriority
          closed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          building_id: string
          reported_by?: string | null
          title: string
          description?: string | null
          status?: IssueStatus
          priority?: IssuePriority
          closed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          reported_by?: string | null
          title?: string
          description?: string | null
          status?: IssueStatus
          priority?: IssuePriority
          closed_at?: string | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          building_id: string
          member_id: string | null
          title: string
          category: DocumentCategory
          file_path: string
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          building_id: string
          member_id?: string | null
          title: string
          category: DocumentCategory
          file_path: string
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          building_id?: string
          member_id?: string | null
          title?: string
          category?: DocumentCategory
          file_path?: string
          uploaded_by?: string | null
          created_at?: string
        }
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
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Convenience types
export type Profile = Tables<'profiles'>;
export type Building = Tables<'buildings'>;
export type BuildingMember = Tables<'building_members'>;
export type Payment = Tables<'payments'>;
export type Expense = Tables<'expenses'>;
export type Message = Tables<'messages'>;
export type Issue = Tables<'issues'>;
export type Document = Tables<'documents'>;
