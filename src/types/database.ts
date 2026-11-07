// Tipos do banco. Escritos à mão a partir de supabase/migrations.
// Quando a CLI do Supabase estiver instalada, pode ser regenerado com:
//   supabase gen types typescript --project-id <id> > src/types/database.ts

import type { Plano, StatusConta } from "@/lib/constantes";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ExpedienteDia = {
  ativo: boolean;
  inicio: string; // "08:00"
  fim: string; // "18:00"
};

/** Chave = dia da semana (0 = domingo ... 6 = sábado) */
export type Expediente = Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", ExpedienteDia>;

export type Profile = {
  id: string;
  email: string | null;
  nome: string;
  nome_negocio: string | null;
  telefone: string | null;
  instagram: string | null;
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  status: StatusConta;
  status_motivo: string | null;
  status_alterado_em: string | null;
  plano: Plano;
  ativa_ate: string | null; // "AAAA-MM-DD"
  expediente: Expediente;
  intervalo_grade_min: number;
  modelo_lembrete: string;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;

export type Servico = {
  id: string;
  profissional_id: string;
  nome: string;
  duracao_min: number;
  valor: number;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type ServicoInsert = Pick<Servico, "profissional_id" | "nome" | "duracao_min"> &
  Partial<Pick<Servico, "id" | "valor" | "ativo" | "ordem">>;

export type ServicoUpdate = Partial<Omit<Servico, "id" | "profissional_id" | "created_at" | "updated_at">>;

export type Cliente = {
  id: string;
  profissional_id: string;
  nome: string;
  telefone: string | null; // só dígitos com DDI: 5511999999999
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClienteInsert = Pick<Cliente, "profissional_id" | "nome"> &
  Partial<Pick<Cliente, "id" | "telefone" | "observacoes">>;

export type ClienteUpdate = Partial<Omit<Cliente, "id" | "profissional_id" | "created_at" | "updated_at">>;

export type TipoAgendamento = "atendimento" | "bloqueio";
export type StatusAgendamento = "agendado" | "concluido" | "cancelado" | "faltou";

export type Agendamento = {
  id: string;
  profissional_id: string;
  tipo: TipoAgendamento;
  cliente_id: string | null;
  cliente_nome: string | null;
  servico_id: string | null;
  servico_nome: string | null;
  valor: number | null;
  titulo: string | null;
  inicio: string; // ISO (timestamptz)
  fim: string;
  status: StatusAgendamento;
  observacoes: string | null;
  lembrete_1d_enviado_em: string | null;
  lembrete_1h_enviado_em: string | null;
  cliente_avisada_em: string | null;
  created_at: string;
  updated_at: string;
};

export type AgendamentoInsert = Pick<Agendamento, "profissional_id" | "tipo" | "inicio" | "fim"> &
  Partial<Omit<Agendamento, "profissional_id" | "tipo" | "inicio" | "fim" | "created_at" | "updated_at">>;

export type AgendamentoUpdate = Partial<Omit<Agendamento, "id" | "profissional_id" | "created_at" | "updated_at">>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, "id" | "nome"> & Partial<Profile>;
        Update: ProfileUpdate;
        Relationships: [];
      };
      servicos: {
        Row: Servico;
        Insert: ServicoInsert;
        Update: ServicoUpdate;
        Relationships: [];
      };
      clientes: {
        Row: Cliente;
        Insert: ClienteInsert;
        Update: ClienteUpdate;
        Relationships: [];
      };
      agendamentos: {
        Row: Agendamento;
        Insert: AgendamentoInsert;
        Update: AgendamentoUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
