import "server-only";
import { situacaoDaConta } from "@/lib/auth";
import { URL_APP } from "@/lib/constantes";
import { temRecurso } from "@/lib/planos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { clienteDaProfissional } from "@/lib/supabase/escopado";
import { primeiroNome } from "@/lib/texto";
import { interpretar } from "@/features/assistente/interpretar";
import { aplicarProposta, processarMensagem } from "@/features/assistente/nucleo";
import { esquemaProposta, type MensagemChat, type Proposta } from "@/features/assistente/tipos";
import { hojeISO } from "@/lib/datas";
import type { Json, Profile } from "@/types/database";
import { enviarBotoes, enviarTexto, mostrarDigitando } from "./meta";

/*
 * O que acontece com cada mensagem que chega no WhatsApp da Vaguinha.
 * A rota do webhook (app/api/webhooks/whatsapp) confere a assinatura da Meta e chama `tratarMensagem`.
 * - Dados do WhatsApp (vínculo, conversa, propostas): cliente admin, sempre filtrando pela profissional.
 * - Agenda, clientes e serviços: `clienteDaProfissional` (escopado: só enxerga os dados dela).
 */

export type Recebida = {
  wamid: string;
  /** número de quem mandou, como a Meta informa (wa_id: só dígitos) */
  de: string;
  tipo: "texto" | "botao" | "audio" | "outro";
  texto?: string;
  botaoId?: string;
};

const HORAS_24 = 24 * 3_600_000;
const LINK_PERFIL = `${URL_APP.replace(/^https?:\/\//, "")}/perfil`;

/** Lê o corpo do webhook da Meta e devolve só as mensagens recebidas (ignora avisos de entrega/leitura). */
export function lerWebhook(corpo: unknown): Recebida[] {
  const saida: Recebida[] = [];
  const entradas = (corpo as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entradas)) return saida;
  for (const entrada of entradas) {
    for (const mudanca of (entrada as { changes?: unknown[] })?.changes ?? []) {
      const valor = (mudanca as { value?: { messages?: unknown[] } })?.value;
      for (const bruta of valor?.messages ?? []) {
        const m = bruta as {
          id?: string;
          from?: string;
          type?: string;
          text?: { body?: string };
          interactive?: { button_reply?: { id?: string; title?: string } };
          button?: { payload?: string; text?: string };
        };
        if (!m.id || !m.from) continue;
        const base = { wamid: m.id, de: m.from.replace(/\D/g, "") };
        if (m.type === "text" && m.text?.body) saida.push({ ...base, tipo: "texto", texto: m.text.body });
        else if (m.type === "interactive" && m.interactive?.button_reply?.id)
          saida.push({ ...base, tipo: "botao", botaoId: m.interactive.button_reply.id, texto: m.interactive.button_reply.title });
        else if (m.type === "button" && m.button?.payload) saida.push({ ...base, tipo: "botao", botaoId: m.button.payload, texto: m.button.text });
        else if (m.type === "audio") saida.push({ ...base, tipo: "audio" });
        else saida.push({ ...base, tipo: "outro" });
      }
    }
  }
  return saida;
}

/** "Conectar Vaguinha código K7PX-29QD" → "K7PX29QD" */
export function codigoDeConexao(texto: string): string | null {
  if (!/conectar/i.test(texto)) return null;
  const m = texto.toUpperCase().match(/\b([A-HJ-NP-Z2-9]{4})-([A-HJ-NP-Z2-9]{4})\b/);
  return m ? `${m[1]}${m[2]}` : null;
}

type Admin = ReturnType<typeof criarClienteAdmin>;

async function guardarFala(admin: Admin, profissionalId: string, papel: "voce" | "assistente", texto: string) {
  await admin.from("whatsapp_conversa").insert({ profissional_id: profissionalId, papel, texto: texto.slice(0, 4000) });
}

async function responder(admin: Admin, para: string, profissionalId: string | null, texto: string) {
  await enviarTexto(para, texto);
  if (profissionalId) await guardarFala(admin, profissionalId, "assistente", texto);
}

/** Conecta o número a quem gerou o código no painel. */
async function conectar(admin: Admin, m: Recebida, codigo: string) {
  const { data: pedido } = await admin
    .from("whatsapp_codigos")
    .select("profissional_id")
    .eq("codigo", codigo)
    .gt("expira_em", new Date().toISOString())
    .maybeSingle();
  if (!pedido) {
    await enviarTexto(m.de, `Esse código não vale mais (ele dura 15 minutos). Gere outro no painel, em ${LINK_PERFIL}, no quadro "Assistente no WhatsApp".`);
    return;
  }
  // um número fica em uma conta só: se estava em outra, sai de lá
  await admin.from("whatsapp_vinculos").delete().eq("telefone", m.de);
  const { error } = await admin
    .from("whatsapp_vinculos")
    .upsert({ profissional_id: pedido.profissional_id, telefone: m.de, conectado_em: new Date().toISOString() }, { onConflict: "profissional_id" });
  await admin.from("whatsapp_codigos").delete().eq("profissional_id", pedido.profissional_id);
  if (error) {
    console.error("[whatsapp] vínculo", error);
    await enviarTexto(m.de, "Não consegui conectar agora. Tente de novo em instantes.");
    return;
  }
  const { data: perfil } = await admin.from("profiles").select("nome").eq("id", pedido.profissional_id).maybeSingle();
  await responder(
    admin,
    m.de,
    pedido.profissional_id,
    `Pronto, ${primeiroNome(perfil?.nome ?? "")}! Seu WhatsApp está conectado à sua agenda. ✨\n\n` +
      `É só me mandar o que precisa, do seu jeito. Por exemplo:\n` +
      `• quem eu atendo amanhã?\n• horários livres na sexta\n• marca a Duda sexta às 11h alongamento\n• cadastra a Bia 14 99999-8888\n\n` +
      `Antes de mudar qualquer coisa eu te mostro e você toca em Confirmar.`,
  );
}

/** Proposta pendente mais recente (das últimas 24 h). */
async function ultimaPendente(admin: Admin, profissionalId: string) {
  const { data } = await admin
    .from("whatsapp_propostas")
    .select("id, dados, situacao, criada_em")
    .eq("profissional_id", profissionalId)
    .eq("situacao", "pendente")
    .gt("criada_em", new Date(Date.now() - HORAS_24).toISOString())
    .order("criada_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function decidir(admin: Admin, perfil: Profile, para: string, propostaId: string, confirmar: boolean) {
  const { data: linha } = await admin
    .from("whatsapp_propostas")
    .select("id, dados, situacao, criada_em")
    .eq("id", propostaId)
    .eq("profissional_id", perfil.id)
    .maybeSingle();
  if (!linha) return responder(admin, para, perfil.id, "Não achei essa mudança. Me peça de novo, por favor.");
  if (linha.situacao !== "pendente") {
    const ja = linha.situacao === "confirmada" ? "já foi feita" : "já foi resolvida";
    return responder(admin, para, perfil.id, `Essa mudança ${ja}. Se precisar de outra coisa, é só pedir.`);
  }
  if (Date.now() - new Date(linha.criada_em).getTime() > HORAS_24) {
    await admin.from("whatsapp_propostas").update({ situacao: "vencida" }).eq("id", linha.id);
    return responder(admin, para, perfil.id, "Essa proposta ficou velha (mais de 24 h) e eu não mexi em nada. Me peça de novo, por favor.");
  }
  const p = esquemaProposta.safeParse(linha.dados);
  if (!p.success) {
    await admin.from("whatsapp_propostas").update({ situacao: "erro" }).eq("id", linha.id);
    return responder(admin, para, perfil.id, "Essa proposta veio com defeito e eu não mexi em nada. Me peça de novo, por favor.");
  }
  if (!confirmar) {
    await admin.from("whatsapp_propostas").update({ situacao: "recusada" }).eq("id", linha.id);
    return responder(admin, para, perfil.id, `Ok, deixei como estava. Não fiz: ${p.data.resumo}.`);
  }
  const r = await aplicarProposta(clienteDaProfissional(perfil.id), perfil, p.data);
  await admin.from("whatsapp_propostas").update({ situacao: r.ok ? "confirmada" : "erro" }).eq("id", linha.id);
  return responder(admin, para, perfil.id, r.ok ? `✅ ${r.mensagem}` : `⚠️ ${r.mensagem}`);
}

/** Últimas falas das 24 h, da mais antiga para a mais nova (memória da conversa). */
async function historicoRecente(admin: Admin, profissionalId: string): Promise<MensagemChat[]> {
  const { data } = await admin
    .from("whatsapp_conversa")
    .select("papel, texto")
    .eq("profissional_id", profissionalId)
    .gt("criado_em", new Date(Date.now() - HORAS_24).toISOString())
    .order("criado_em", { ascending: false })
    .limit(12);
  return (data ?? []).reverse().map((f) => ({ papel: f.papel, texto: f.texto }));
}

/** Manda cada proposta com os botões Confirmar / Não. */
async function enviarPropostas(admin: Admin, para: string, perfil: Profile, textoDaIA: string, propostas: Proposta[]) {
  const ids: string[] = [];
  for (const p of propostas) {
    const { data } = await admin
      .from("whatsapp_propostas")
      .insert({ profissional_id: perfil.id, dados: p as unknown as Json })
      .select("id")
      .single();
    if (data) ids.push(data.id);
  }
  if (ids.length !== propostas.length) {
    await enviarTexto(para, "Não consegui preparar a mudança agora. Tente de novo em instantes.");
    return;
  }
  const botoes = (id: string) => [
    { id: `sim:${id}`, titulo: "✅ Confirmar" },
    { id: `nao:${id}`, titulo: "Não" },
  ];
  if (propostas.length === 1) {
    // uma só: a resposta da IA vai junto, já com os botões embaixo
    await enviarBotoes(para, `${textoDaIA}\n\n👉 ${propostas[0].resumo}`, botoes(ids[0]));
  } else {
    await enviarTexto(para, textoDaIA);
    for (let i = 0; i < propostas.length; i++) await enviarBotoes(para, `👉 ${propostas[i].resumo}`, botoes(ids[i]));
  }
  await guardarFala(admin, perfil.id, "assistente", `${textoDaIA}\n${propostas.map((p) => `(proposta: ${p.resumo})`).join("\n")}`);
}

/** Limpeza leve de tempos em tempos (conversa velha e ids de mensagens já tratadas). */
async function faxina(admin: Admin) {
  if (Math.random() > 0.05) return;
  const doisDias = new Date(Date.now() - 2 * HORAS_24).toISOString();
  await Promise.all([
    admin.from("whatsapp_conversa").delete().lt("criado_em", doisDias),
    admin.from("whatsapp_recebidas").delete().lt("recebida_em", new Date(Date.now() - 7 * HORAS_24).toISOString()),
    admin.from("whatsapp_codigos").delete().lt("expira_em", new Date().toISOString()),
    admin.from("whatsapp_propostas").update({ situacao: "vencida" }).eq("situacao", "pendente").lt("criada_em", doisDias),
  ]);
}

export async function tratarMensagem(m: Recebida): Promise<void> {
  const admin = criarClienteAdmin();

  // a Meta pode reenviar a mesma mensagem: só trata a primeira vez
  const { error: repetida } = await admin.from("whatsapp_recebidas").insert({ wamid: m.wamid });
  if (repetida) return;

  try {
    // 1) Conectar o número (vale para qualquer número, com um código gerado no painel)
    const codigo = m.tipo === "texto" && m.texto ? codigoDeConexao(m.texto) : null;
    if (codigo) return await conectar(admin, m, codigo);

    // 2) Quem é?
    const { data: vinculo } = await admin.from("whatsapp_vinculos").select("profissional_id").eq("telefone", m.de).maybeSingle();
    if (!vinculo) {
      await enviarTexto(
        m.de,
        `Oi! Aqui é a assistente do Vaguinha, a agenda para profissionais de beleza e saúde. 💜\n\n` +
          `Se você é profissional com conta Premium, conecte seu WhatsApp em ${LINK_PERFIL} (quadro "Assistente no WhatsApp").\n` +
          `Se quer marcar um horário com alguém, fale direto com a profissional.`,
      );
      return;
    }
    const { data: perfil } = await admin.from("profiles").select("*").eq("id", vinculo.profissional_id).maybeSingle();
    if (!perfil) return;
    if (situacaoDaConta(perfil) !== "aprovada") {
      await enviarTexto(m.de, `Sua conta do Vaguinha não está ativa no momento. Entre em ${LINK_PERFIL} para ver o que falta.`);
      return;
    }
    if (!temRecurso(perfil.plano, "assistente")) {
      await enviarTexto(m.de, `A assistente no WhatsApp faz parte do plano Premium. Veja os planos em ${URL_APP.replace(/^https?:\/\//, "")}/assinatura.`);
      return;
    }

    void mostrarDigitando(m.wamid);

    // 3) Botões Confirmar / Não
    if (m.tipo === "botao" && m.botaoId) {
      const [acao, id] = m.botaoId.split(":");
      if ((acao === "sim" || acao === "nao") && id) {
        await guardarFala(admin, perfil.id, "voce", acao === "sim" ? "Confirmar" : "Não");
        return await decidir(admin, perfil, m.de, id, acao === "sim");
      }
    }

    if (m.tipo === "audio") {
      await enviarTexto(m.de, "Por enquanto eu só leio mensagens escritas. 🙏 Me manda por texto? (Áudio está chegando em breve.)");
      return;
    }
    if (m.tipo !== "texto" || !m.texto?.trim()) {
      await enviarTexto(m.de, "Por enquanto eu só entendo mensagens de texto. Me conta por escrito o que você precisa?");
      return;
    }

    const texto = m.texto.trim().slice(0, 1500);

    // 4) "sim" / "não" respondendo a uma mudança que está esperando
    const comando = interpretar(texto, hojeISO());
    if (comando?.tipo === "confirmar" || comando?.tipo === "recusar") {
      const pendente = await ultimaPendente(admin, perfil.id);
      if (pendente) {
        await guardarFala(admin, perfil.id, "voce", texto);
        return await decidir(admin, perfil, m.de, pendente.id, comando.tipo === "confirmar");
      }
    }

    // 5) Conversa normal: o mesmo cérebro da tela Assistente
    const historico = await historicoRecente(admin, perfil.id);
    await guardarFala(admin, perfil.id, "voce", texto);
    const r = await processarMensagem({ supabase: clienteDaProfissional(perfil.id), perfil, historico, texto, canal: "whatsapp" });
    if (!r.ok) return await responder(admin, m.de, perfil.id, r.erro ?? "Não consegui agora. Tente de novo em instantes.");
    const resposta = r.texto?.trim() || "Pronto.";
    if (r.propostas?.length) await enviarPropostas(admin, m.de, perfil, resposta, r.propostas);
    else await responder(admin, m.de, perfil.id, resposta);

    await faxina(admin);
  } catch (e) {
    console.error("[whatsapp] erro ao tratar mensagem", e);
    await enviarTexto(m.de, "Tive um problema para responder agora. 😕 Tente de novo em instantes.").catch(() => {});
  }
}
