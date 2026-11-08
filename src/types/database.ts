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
  slug: string | null;
  agendamento_online: boolean;
  confirmacao_online: "automatica" | "manual";
  antecedencia_min_horas: number;
  termos_aceitos_em: string | null;
  termos_versao: string | null;
  aviso_vencimento_para: string | null; // "AAAA-MM-DD"
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  plano_assinado: "essencial" | "profissional" | "premium" | null;
  cpf_cnpj: string | null;
  ramo: string | null;
  ramo_outro: string | null;
  tratamento: "ela" | "ele" | "neutro" | null;
  tema: "rosa" | "grafite" | "azul" | "verde" | "lavanda";
  created_at: string;
  updated_at: string;
};

export type Cobranca = {
  id: string;
  profissional_id: string;
  asaas_id: string;
  assinatura_id: string | null;
  plano: "essencial" | "profissional" | "premium" | null;
  valor: number;
  vencimento: string; // "AAAA-MM-DD"
  status: string;
  forma: string | null;
  link: string | null;
  pago_em: string | null;
  liberou_acesso: boolean;
  created_at: string;
  updated_at: string;
};

export type CobrancaInsert = Pick<Cobranca, "profissional_id" | "asaas_id" | "valor" | "vencimento" | "status"> &
  Partial<Omit<Cobranca, "profissional_id" | "asaas_id" | "valor" | "vencimento" | "status">>;

export type CobrancaUpdate = Partial<Omit<Cobranca, "id" | "profissional_id" | "created_at">>;

export type TipoEvento = "marcado" | "confirmado" | "recusado" | "remarcado" | "cancelado" | "excluido" | "faltou" | "concluido";

/** Histórico gravado pelo trigger `registrar_evento_agendamento` (migração 0015). */
export type AgendamentoEvento = {
  id: string;
  profissional_id: string;
  agendamento_id: string | null;
  tipo: TipoEvento;
  origem: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  servico_nome: string | null;
  valor: number | null;
  inicio_anterior: string | null;
  fim_anterior: string | null;
  inicio: string | null;
  fim: string | null;
  vaga_dispensada_em: string | null;
  created_at: string;
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
export type StatusAgendamento = "pendente" | "agendado" | "concluido" | "cancelado" | "faltou";
export type OrigemAgendamento = "painel" | "online";

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
  origem: OrigemAgendamento;
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

export type PushSubscriptionRow = {
  id: string;
  profissional_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  ultimo_uso_em: string | null;
};

export type PushSubscriptionInsert = Pick<PushSubscriptionRow, "profissional_id" | "endpoint" | "p256dh" | "auth"> &
  Partial<Pick<PushSubscriptionRow, "id" | "user_agent" | "ultimo_uso_em">>;

export type PushSubscriptionUpdate = Partial<Omit<PushSubscriptionRow, "id" | "profissional_id" | "created_at">>;

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
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: PushSubscriptionInsert;
        Update: PushSubscriptionUpdate;
        Relationships: [];
      };
      cobrancas: {
        Row: Cobranca;
        Insert: CobrancaInsert;
        Update: CobrancaUpdate;
        Relationships: [];
      };
      assistente_uso: {
        Row: {
          profissional_id: string;
          dia: string;
          mensagens: number;
          tokens_entrada: number;
          tokens_saida: number;
          custo_usd: number;
          updated_at: string;
        };
        Insert: {
          profissional_id: string;
          dia: string;
          mensagens?: number;
          tokens_entrada?: number;
          tokens_saida?: number;
          custo_usd?: number;
          updated_at?: string;
        };
        Update: Partial<{ mensagens: number; tokens_entrada: number; tokens_saida: number; custo_usd: number; updated_at: string }>;
        Relationships: [];
      };
      agendamento_eventos: {
        Row: AgendamentoEvento;
        Insert: Pick<AgendamentoEvento, "profissional_id" | "tipo"> & Partial<AgendamentoEvento>;
        Update: Partial<Pick<AgendamentoEvento, "vaga_dispensada_em">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      perfil_publico: {
        Args: { p_slug: string };
        Returns: Json;
      };
      horarios_ocupados: {
        Args: { p_slug: string; p_inicio: string; p_fim: string };
        Returns: { inicio: string; fim: string }[];
      };
      criar_agendamento_online: {
        Args: {
          p_slug: string;
          p_servico_id: string;
          p_inicio: string;
          p_nome: string;
          p_telefone: string;
          p_observacoes?: string | null;
        };
        Returns: Json;
      };
      gerar_slug: {
        Args: { texto: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
