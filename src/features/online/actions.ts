"use server";

import { z } from "zod";
import { horariosDisponiveis, janelaDoDia } from "@/features/agenda/disponibilidade";
import { criarClientePublico, listarOcupacoesPublicas, obterPerfilPublico } from "@/features/online/publico";
import { enviarPush, pushConfigurado } from "@/lib/push";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { fimDoDia, formatarData, hojeISO, inicioDoDia, instanteEmSP, somarDias, type DataISO } from "@/lib/datas";
import { primeiroNome } from "@/lib/texto";
import { valoresDoForm, type EstadoForm } from "@/components/formulario/tipos";

/** Horários livres para a cliente escolher, já respeitando a antecedência mínima. */
export async function consultarHorariosOnline(
  slug: string,
  dia: DataISO,
  servicoId: string,
): Promise<{ horarios: string[]; atende: boolean }> {
  const perfil = await obterPerfilPublico(slug);
  if (!perfil) return { horarios: [], atende: false };
  const servico = perfil.servicos.find((s) => s.id === servicoId);
  if (!servico) return { horarios: [], atende: false };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia < hojeISO() || dia > somarDias(hojeISO(), 60)) return { horarios: [], atende: false };

  const atende = janelaDoDia(dia, perfil.expediente) !== null;
  if (!atende) return { horarios: [], atende: false };

  const ocupacoes = await listarOcupacoesPublicas(slug, inicioDoDia(dia), fimDoDia(dia));
  const limite = Date.now() + perfil.antecedencia_min_horas * 3_600_000;

  const horarios = horariosDisponiveis({
    dia,
    expediente: perfil.expediente,
    intervaloMin: perfil.intervalo_grade_min,
    duracaoMin: servico.duracao_min,
    ocupacoes,
  }).filter((h) => instanteEmSP(dia, h).getTime() >= limite);

  return { horarios, atende: true };
}

const esquemaPedido = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/),
  servico_id: z.uuid("Escolha o serviço"),
  dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha o dia"),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Escolha o horário"),
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  telefone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe seu WhatsApp com DDD"),
  observacoes: z.string().trim().max(300, "Máximo de 300 caracteres").optional(),
});

export type ResultadoPedido = {
  id: string;
  status: "pendente" | "agendado";
  inicio: string;
  fim: string;
  servico: string;
  telefone_profissional: string | null;
};

/** Envia o pedido de agendamento da cliente (página pública). */
export async function enviarPedidoOnline(_: EstadoForm, formData: FormData): Promise<EstadoForm & { pedido?: ResultadoPedido }> {
  const valores = valoresDoForm(formData, ["nome", "telefone", "observacoes", "servico_id", "dia", "hora"]);
  const r = esquemaPedido.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erros: z.flattenError(r.error).fieldErrors, valores };
  const d = r.data;

  const supabase = criarClientePublico();
  const { data, error } = await supabase.rpc("criar_agendamento_online", {
    p_slug: d.slug,
    p_servico_id: d.servico_id,
    p_inicio: instanteEmSP(d.dia, d.hora).toISOString(),
    p_nome: d.nome,
    p_telefone: d.telefone,
    p_observacoes: d.observacoes || null,
  });

  if (error) {
    // P0001 = mensagens amigáveis levantadas pela própria função
    const amigavel = error.code === "P0001" ? error.message : "Não foi possível enviar o pedido. Tente de novo.";
    return { erro: amigavel, valores };
  }

  const pedido = data as unknown as ResultadoPedido & { profissional_id: string };

  // Avisa a profissional no celular (se houver chave de serviço e aparelhos cadastrados)
  await notificarProfissional(pedido.profissional_id, {
    nome: d.nome,
    servico: pedido.servico,
    inicio: pedido.inicio,
    status: pedido.status,
    dia: d.dia,
  }).catch(() => undefined);

  return {
    ok: true,
    mensagem: pedido.status === "agendado" ? "Horário confirmado!" : "Pedido enviado!",
    pedido: {
      id: pedido.id,
      status: pedido.status,
      inicio: pedido.inicio,
      fim: pedido.fim,
      servico: pedido.servico,
      telefone_profissional: pedido.telefone_profissional,
    },
  };
}

async function notificarProfissional(
  profissionalId: string,
  info: { nome: string; servico: string; inicio: string; status: "pendente" | "agendado"; dia: DataISO },
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !pushConfigurado()) return;
  const admin = criarClienteAdmin();
  const { data: inscricoes } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("profissional_id", profissionalId);
  if (!inscricoes?.length) return;

  const quando = formatarData(info.inicio, "EEE dd/MM 'às' HH:mm");
  const r = await enviarPush(inscricoes, {
    title: info.status === "pendente" ? "Novo pedido de horário" : "Novo agendamento pelo link",
    body: `${primeiroNome(info.nome)} · ${info.servico} · ${quando}${info.status === "pendente" ? ". Toque para confirmar." : ""}`,
    url: `/agenda?visao=dia&data=${info.dia}`,
    tag: `online-${Date.now()}`,
  });
  if (r.endpointsMortos.length) await admin.from("push_subscriptions").delete().in("endpoint", r.endpointsMortos);
}
