export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          role: 'contratante' | 'arbitro' | 'admin'
          city: string | null
          phone: string | null
          bio: string | null
          modalities: string[] | null
          equipment: string[] | null
          hourly_rate: number | null
          level: 'bronze' | 'prata' | 'ouro' | 'black' | null
          cpf_cnpj: string | null
          experience_level: string | null
          contractor_type: string | null
          main_sport: string | null
          document_url: string | null
          is_verified: boolean
          availability: string[] | null
          federations: string[] | null
          certifications: string[] | null
          specialties: string[] | null
          unavailable_dates: string[] | null
          games_count: number
          rating_avg: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'contratante' | 'arbitro' | 'admin'
          city?: string | null
          phone?: string | null
          bio?: string | null
          modalities?: string[] | null
          equipment?: string[] | null
          hourly_rate?: number | null
          level?: 'bronze' | 'prata' | 'ouro' | 'black' | null
          cpf_cnpj?: string | null
          experience_level?: string | null
          contractor_type?: string | null
          main_sport?: string | null
          document_url?: string | null
          is_verified?: boolean
          availability?: string[] | null
          federations?: string[] | null
          certifications?: string[] | null
          specialties?: string[] | null
          unavailable_dates?: string[] | null
          games_count?: number
          rating_avg?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'contratante' | 'arbitro' | 'admin'
          city?: string | null
          phone?: string | null
          bio?: string | null
          modalities?: string[] | null
          equipment?: string[] | null
          hourly_rate?: number | null
          level?: 'bronze' | 'prata' | 'ouro' | 'black' | null
          cpf_cnpj?: string | null
          experience_level?: string | null
          contractor_type?: string | null
          main_sport?: string | null
          document_url?: string | null
          is_verified?: boolean
          availability?: string[] | null
          federations?: string[] | null
          certifications?: string[] | null
          specialties?: string[] | null
          games_count?: number
          rating_avg?: number
          created_at?: string
          updated_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          contractor_id: string
          referee_id: string | null
          date: string
          time: string
          location: string
          modality: string
          price: number
          status: 'pendente' | 'aceita' | 'a_caminho' | 'em_andamento' | 'finalizada' | 'cancelada'
          payment_method: 'pix' | 'cartao' | 'saldo'
          contractor_checkin: boolean
          referee_checkin: boolean
          duration: number
          platform_fee: number
          is_surge: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contractor_id: string
          referee_id?: string | null
          date: string
          time: string
          location: string
          modality: string
          price: number
          status?: 'pendente' | 'aceita' | 'a_caminho' | 'em_andamento' | 'finalizada' | 'cancelada'
          payment_method?: 'pix' | 'cartao' | 'saldo'
          contractor_checkin?: boolean
          referee_checkin?: boolean
          duration?: number
          platform_fee?: number
          is_surge?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contractor_id?: string
          referee_id?: string | null
          date?: string
          time?: string
          location?: string
          modality?: string
          price?: number
          status?: 'pendente' | 'aceita' | 'a_caminho' | 'em_andamento' | 'finalizada' | 'cancelada'
          payment_method?: 'pix' | 'cartao' | 'saldo'
          contractor_checkin?: boolean
          referee_checkin?: boolean
          duration?: number
          created_at?: string
          updated_at?: string
        }
      }
      match_events: {
        Row: {
          id: string
          match_id: string
          type: 'gol' | 'cartao_amarelo' | 'cartao_vermelho' | 'falta'
          minute: number | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          type: 'gol' | 'cartao_amarelo' | 'cartao_vermelho' | 'falta'
          minute?: number | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          type?: 'gol' | 'cartao_amarelo' | 'cartao_vermelho' | 'falta'
          minute?: number | null
          description?: string | null
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          match_id: string
          reviewer_id: string
          target_id: string
          rating: number
          punctuality: number
          professionalism: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          reviewer_id: string
          target_id: string
          rating: number
          punctuality: number
          professionalism: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          reviewer_id?: string
          target_id?: string
          rating?: number
          punctuality?: number
          professionalism?: number
          comment?: string | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'entrada' | 'saida' | 'saque'
          amount: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'entrada' | 'saida' | 'saque'
          amount: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'entrada' | 'saida' | 'saque'
          amount?: number
          description?: string | null
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          reserva_id: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          amount: number
          external_reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reserva_id: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          amount: number
          external_reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reserva_id?: string
          user_id?: string
          status?: 'pending' | 'approved' | 'rejected'
          amount?: number
          external_reference?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_referee_availability: {
        Args: {
          p_referee_id: string
          p_date: string
          p_start_time: string
          p_duration: number
        }
        Returns: boolean
      }
      delete_user: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}
