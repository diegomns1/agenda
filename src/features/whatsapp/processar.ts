import "server-only";
import { situacaoDaConta } from "@/lib/auth";
import { URL_APP } from "@/lib/constantes";
import { hojeISO } from "@/lib/datas";
import { emailDoAdmin, enviarEmail } from "@/lib/email";
import { temRecurso } from "@/lib/planos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { clienteDaProfissional } from "@/lib/supabase/escopado";
import { formatarTelefone, variacoesCelular } from "@/lib/telefone";
import { primeiroNome } from "@/lib/texto";
import { interpretar } from "@/features/assistente/interpretar";
import { aplicarProposta, processarMensagem } from "@/features/assistente/nucleo";
import { esquemaProposta, type MensagemChat, type Proposta } from "@/features/assistente/tipos";
import type { Json, Profile, TipoMensagemWhatsapp, WhatsappContato } from "@/types/database";
import { responderAtendimento, type AnexoIA, type ModoAtendimento } from "./atendimento";
import { normalizar, pareceRespostaAutomatica } from "./robo";
import { apagarMidiaVelha, BUCKET_WHATSAPP, guardarMidiaRecebida, rotuloMidia } from "./midia";
import { transcreverAudio } from "./transcrever";
import { enviarBotoes, enviarTexto, mostrarDigitando } from "./meta";

/*
 * O que acontece com cada mensagem que chega no WhatsApp oficial da Vaguinha (Central do WhatsApp, 11/11/2026).
 * A rota do webhook (app/api/webhooks/whatsapp) confere a assinatura da Meta e chama `tratarMensagem`.
 * Toda pessoa vira um contato (card) e toda mensagem fica guardada (whatsapp_contatos / whatsapp_mensagens).
 * Quem responde:
 *   - profissional com a assistente conectada (Premium) → assistente da agenda (features/assistente/nucleo)
 *   - profissional cadastrada (o número bate com o do cadastro) → atendimento, modo suporte
 *   - qualquer outra pessoa → atendimento, modo vendas (lead)
 *   - card em "humano" (o Diego assumiu) → o robô fica quieto
 * Dados do WhatsApp: cliente admin. Agenda, clientes e serviços: `clienteDaProfissional` (só enxerga os dados dela).
 */

export type Recebida = {
  wamid: string;
  /** número de quem mandou, como a Meta informa (wa_id: só dígitos) */
  de: string;
  tipo: "texto" | "botao" | Exclude<TipoMensagemWhatsapp, "texto">;
  texto?: string;
  /** foto, áudio, vídeo, documento, figurinha: o id do arquivo na Meta (baixado em registrarEntrada) */
  midia?: { id: string; nome?: string };
  /** legenda da foto/vídeo/documento */
  legenda?: string;
  botaoId?: string;
  /** nome do perfil do WhatsApp da pessoa */
  nome?: string;
  /** anúncio "clique para o WhatsApp" de onde a pessoa veio */
  origem?: Record<string, unknown>;
};

const HORAS_24 = 24 * 3_600_000;
const LINK_PERFIL = `${URL_APP}/perfil`; // com https://, para o WhatsApp deixar tocar
/** Mensagens com IA por dia para quem não é cliente (protege o crédito da API). */
const LIMITE_IA_CONTATO_DIA = 40;
/** Espera antes de responder um lead: se a pessoa mandar outra mensagem nesse tempo ("Sin" + "Sim"), responde uma vez só. */
const ESPERA_JUNTAR_MS = 5000;
/** Respostas do robô para o mesmo contato em 1 hora (rede de segurança; a conversa de uma pessoa animada fica bem abaixo). */
const LIMITE_ROBO_HORA = 30;
/**
 * Resposta "instantânea": mensagem comprida que chega poucos segundos depois da resposta do robô. Uma pessoa precisa
 * ler e digitar; outro robô responde na hora. Contar só a quantidade de mensagens pegava gente que digita rápido
 * (12/11/2026, teste do Diego).
 */
const SEGUNDOS_INSTANTANEA = 6;
const MIN_CARACTERES_INSTANTANEA = 25;
const LIMITE_INSTANTANEAS = 3;

/** Lê o corpo do webhook da Meta e devolve só as mensagens recebidas (ignora avisos de entrega/leitura). */
export function lerWebhook(corpo: unknown): Recebida[] {
  const saida: Recebida[] = [];
  const entradas = (corpo as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entradas)) return saida;
  for (const entrada of entradas) {
    for (const mudanca of (entrada as { changes?: unknown[] })?.changes ?? []) {
      const valor = (mudanca as { value?: { messages?: unknown[]; contacts?: { wa_id?: string; profile?: { name?: string } }[] } })?.value;
      const nomes = new Map((valor?.contacts ?? []).map((c) => [String(c.wa_id ?? ""), c.profile?.name]));
      for (const bruta of valor?.messages ?? []) {
        const m = bruta as {
          id?: string;
          from?: string;
          type?: string;
          text?: { body?: string };
          interactive?: { button_reply?: { id?: string; title?: string } };
          button?: { payload?: string; text?: string };
          referral?: Record<string, unknown>;
          image?: { id?: string; caption?: string };
          audio?: { id?: string };
          video?: { id?: string; caption?: string };
          document?: { id?: string; caption?: string; filename?: string };
          sticker?: { id?: string };
          location?: { latitude?: number; longitude?: number; name?: string; address?: string };
          contacts?: { name?: { formatted_name?: string }; phones?: { phone?: string }[] }[];
        };
        if (!m.id || !m.from) continue;
        // reação (👍 numa mensagem): não é conversa, não precisa de resposta
        if (m.type === "reaction") continue;
        const de = m.from.replace(/\D/g, "");
        const base: Recebida = { wamid: m.id, de, tipo: "outro", nome: nomes.get(m.from) ?? undefined };
        if (m.referral && typeof m.referral === "object") {
          const r = m.referral;
          base.origem = { tipo: r.source_type, id: r.source_id, url: r.source_url, titulo: r.headline, texto: r.body };
        }
        if (m.type === "text" && m.text?.body) saida.push({ ...base, tipo: "texto", texto: m.text.body });
        else if (m.type === "interactive" && m.interactive?.button_reply?.id)
          saida.push({ ...base, tipo: "botao", botaoId: m.interactive.button_reply.id, texto: m.interactive.button_reply.title });
        else if (m.type === "button" && m.button?.payload) saida.push({ ...base, tipo: "botao", botaoId: m.button.payload, texto: m.button.text });
        else if (m.type === "image" && m.image?.id) saida.push({ ...base, tipo: "imagem", midia: { id: m.image.id }, legenda: m.image.caption });
        else if (m.type === "audio" && m.audio?.id) saida.push({ ...base, tipo: "audio", midia: { id: m.audio.id } });
        else if (m.type === "video" && m.video?.id) saida.push({ ...base, tipo: "video", midia: { id: m.video.id }, legenda: m.video.caption });
        else if (m.type === "document" && m.document?.id)
          saida.push({ ...base, tipo: "documento", midia: { id: m.document.id, nome: m.document.filename }, legenda: m.document.caption });
        else if (m.type === "sticker" && m.sticker?.id) saida.push({ ...base, tipo: "figurinha", midia: { id: m.sticker.id } });
        else if (m.type === "location" && m.location) {
          const l = m.location;
          const onde = [l.name, l.address].filter(Boolean).join(", ");
          saida.push({ ...base, tipo: "localizacao", texto: `${onde ? `${onde} ` : ""}(https://maps.google.com/?q=${l.latitude},${l.longitude})` });
        } else if (m.type === "contacts" && m.contacts?.length) {
          const c = m.contacts[0];
          saida.push({ ...base, tipo: "contato", texto: [c.name?.formatted_name, c.phones?.[0]?.phone].filter(Boolean).join(" · ") });
        } else saida.push(base);
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

/** Guarda uma mensagem no histórico do contato. */
async function registrar(admin: Admin, telefone: string, de: "contato" | "robo" | "equipe" | "sistema", texto: string, wamid?: string) {
  await admin.from("whatsapp_mensagens").insert({ telefone, de, texto: texto.slice(0, 4000), wamid: wamid ?? null });
  await admin.from("whatsapp_contatos").update({ ultima_msg_em: new Date().toISOString() }).eq("telefone", telefone);
}

/** Manda texto e guarda como resposta do robô. */
async function responder(admin: Admin, para: string, texto: string) {
  const entregue = await enviarTexto(para, texto);
  await registrar(admin, para, "robo", texto);
  if (!entregue) await avisarNaoEntregue(admin, para);
}

/** A Meta recusou a mensagem: aparece na conversa da Central para ninguém achar que a pessoa foi respondida. */
async function avisarNaoEntregue(admin: Admin, para: string) {
  await registrar(admin, para, "sistema", "⚠️ A Meta não entregou a última resposta (veja o log do servidor)");
}

/** O que chegou junto com a mensagem: o arquivo (para a IA ver) e a transcrição do áudio. */
type Entrada = { contato: WhatsappContato; arquivo: { dados: Buffer; mime: string } | null; transcricao: string | null };

/** Cria/atualiza o card de quem escreveu e guarda a mensagem recebida (áudio já sai transcrito). */
async function registrarEntrada(admin: Admin, m: Recebida): Promise<Entrada> {
  const agora = new Date().toISOString();
  const { data: atual } = await admin.from("whatsapp_contatos").select("*").eq("telefone", m.de).maybeSingle();
  const mudar: Partial<Omit<WhatsappContato, "telefone">> = {
    ultima_msg_em: agora,
    ultima_do_contato_em: agora,
    nao_lidas: (atual?.nao_lidas ?? 0) + 1,
  };
  if (m.nome) mudar.nome_whatsapp = m.nome.slice(0, 80);
  if (m.origem && !atual?.origem) mudar.origem = m.origem as Json;
  // quem esfriou e voltou a falar volta para o robô
  if (atual?.etapa === "sem_resposta") mudar.etapa = "robo";
  const { data } = atual
    ? await admin.from("whatsapp_contatos").update(mudar).eq("telefone", m.de).select("*").single()
    : await admin.from("whatsapp_contatos").insert({ telefone: m.de, ...mudar }).select("*").single();

  const tipo: TipoMensagemWhatsapp = m.tipo === "botao" ? "texto" : m.tipo;
  const texto =
    m.tipo === "texto"
      ? m.texto ?? ""
      : m.tipo === "botao"
        ? `[botão] ${m.texto ?? ""}`
        : m.tipo === "localizacao" || m.tipo === "contato"
          ? rotuloMidia(m.tipo, m.texto)
          : rotuloMidia(m.tipo, m.legenda);
  // foto, áudio, documento...: guarda o arquivo no bucket privado (se não der, a mensagem fica registrada sem ele)
  const arquivo = m.midia ? await guardarMidiaRecebida(admin, m.de, m.wamid, m.midia.id, m.midia.nome) : null;
  // áudio vira texto (OpenAI) para a IA entender e para a Central mostrar embaixo do player
  const transcricao = m.tipo === "audio" && arquivo ? await transcreverAudio(arquivo.dados, arquivo.mime) : null;
  await admin.from("whatsapp_mensagens").insert({
    telefone: m.de,
    de: "contato",
    texto: texto.slice(0, 4000),
    wamid: m.wamid,
    tipo,
    midia_path: arquivo?.path || null,
    midia_mime: arquivo?.mime ?? null,
    midia_bytes: arquivo?.bytes ?? null,
    midia_nome: m.midia?.nome?.slice(0, 200) ?? null,
    transcricao: transcricao?.slice(0, 4000) ?? null,
  });
  return { contato: data as WhatsappContato, arquivo: arquivo ? { dados: arquivo.dados, mime: arquivo.mime } : null, transcricao };
}

/** Últimas falas das 24 h, da mais antiga para a mais nova (memória da conversa). Não inclui a mensagem atual. */
async function historicoRecente(admin: Admin, telefone: string): Promise<MensagemChat[]> {
  const { data } = await admin
    .from("whatsapp_mensagens")
    .select("de, texto, tipo, transcricao")
    .eq("telefone", telefone)
    .neq("de", "sistema")
    .gt("criado_em", new Date(Date.now() - HORAS_24).toISOString())
    .order("criado_em", { ascending: false })
    .limit(15);
  const falas = (data ?? []).reverse().map((f) => ({
    papel: f.de === "contato" ? ("voce" as const) : ("assistente" as const),
    // áudio entra como o que foi dito
    texto: f.tipo === "audio" && f.transcricao ? `(áudio) ${f.transcricao}` : f.texto,
  }));
  falas.pop(); // a última é a mensagem que está sendo respondida agora
  return falas;
}

/**
 * Do outro lado parece ser outro robô (resposta automática de outra empresa)? Se a IA continuar respondendo,
 * os dois ficam conversando o dia inteiro. Olha as últimas 6 h desta conversa (a mensagem atual já está gravada).
 */
export async function motivoRobo(admin: Admin, telefone: string, texto: string): Promise<string | null> {
  if (pareceRespostaAutomatica(texto)) return "a mensagem parece resposta automática";
  const { data } = await admin
    .from("whatsapp_mensagens")
    .select("de, texto, criado_em")
    .eq("telefone", telefone)
    .gt("criado_em", new Date(Date.now() - 6 * 3_600_000).toISOString())
    .order("criado_em", { ascending: false })
    .limit(80);
  const msgs = data ?? [];
  const agora = Date.now();
  const doRobo = msgs.filter((x) => x.de === "robo");
  if (doRobo.filter((x) => agora - new Date(x.criado_em).getTime() < 3_600_000).length >= LIMITE_ROBO_HORA)
    return `mais de ${LIMITE_ROBO_HORA} respostas em 1 hora`;
  // respostas compridas chegando segundos depois do robô, várias vezes na última hora
  const ordem = [...msgs].reverse();
  let instantaneas = 0;
  for (let i = 1; i < ordem.length; i++) {
    const msg = ordem[i];
    const antes = ordem[i - 1];
    if (msg.de !== "contato" || antes.de !== "robo" || agora - new Date(msg.criado_em).getTime() > 3_600_000) continue;
    const segundos = (new Date(msg.criado_em).getTime() - new Date(antes.criado_em).getTime()) / 1000;
    if (segundos <= SEGUNDOS_INSTANTANEA && msg.texto.trim().length >= MIN_CARACTERES_INSTANTANEA) instantaneas++;
  }
  if (instantaneas >= LIMITE_INSTANTANEAS) return "respostas compridas chegando na hora, rápido demais para uma pessoa";
  // a mesma mensagem comprida chegando de novo: resposta pronta de robô
  const atual = normalizar(texto);
  if (atual.length >= 20 && msgs.filter((x) => x.de === "contato" && normalizar(x.texto) === atual).length >= 2)
    return "a mesma mensagem chegou repetida";
  return null;
}

/**
 * A IA pediu ajuda: card vai para "Precisa de você" e o Diego recebe um e-mail com a conversa.
 * `silenciar`: parece robô do outro lado. O card vai para "Com você" e a IA para de responder de vez
 * (não manda nem "vou chamar a equipe", que só alimentaria o outro robô). O Diego devolve ao robô na Central.
 */
async function chamarDiego(admin: Admin, contato: WhatsappContato, motivo: string, silenciar = false) {
  // já chamada e surgiu outro assunto: o recado novo aparece na conversa e no card (sem outro e-mail)
  if (!silenciar && contato.atendimento === "precisa" && motivo !== contato.motivo_ajuda) {
    const motivos = [contato.motivo_ajuda, motivo].filter(Boolean).join(" · ").slice(0, 300);
    await admin.from("whatsapp_contatos").update({ motivo_ajuda: motivos }).eq("telefone", contato.telefone);
    contato.motivo_ajuda = motivos;
    await registrar(admin, contato.telefone, "sistema", `🙋 Mais um pedido para a equipe: ${motivo}`);
    return;
  }
  if (silenciar ? contato.atendimento === "humano" : contato.atendimento !== "robo") return; // já foi chamado (ou já está com ele)
  await admin
    .from("whatsapp_contatos")
    .update({ atendimento: silenciar ? "humano" : "precisa", motivo_ajuda: silenciar ? `🤖 IA pausada, parece robô: ${motivo}` : motivo })
    .eq("telefone", contato.telefone);
  contato.atendimento = silenciar ? "humano" : "precisa";
  await registrar(
    admin,
    contato.telefone,
    "sistema",
    silenciar ? `🤖 IA pausada: parece outro robô do outro lado (${motivo}). Para voltar, devolva ao robô.` : `🙋 A IA chamou a equipe: ${motivo}`,
  );

  const para = emailDoAdmin();
  if (!para) return;
  const { data: msgs } = await admin
    .from("whatsapp_mensagens")
    .select("de, texto, criado_em")
    .eq("telefone", contato.telefone)
    .order("criado_em", { ascending: false })
    .limit(12);
  const quem = contato.nome || contato.nome_whatsapp || formatarTelefone(contato.telefone);
  const conversa = (msgs ?? [])
    .reverse()
    .map((x) => `${x.de === "contato" ? quem : x.de === "robo" ? "Vaguinha" : x.de === "equipe" ? "Você" : "•"}: ${x.texto}`)
    .join("\n");
  const central = `${URL_APP}/admin/whatsapp?c=${contato.telefone}`;
  await enviarEmail({
    para,
    assunto: silenciar ? `WhatsApp: IA pausada com ${quem} (parece robô)` : `WhatsApp: ${quem} precisa de você`,
    texto: `Motivo: ${motivo}\nContato: ${quem} · ${formatarTelefone(contato.telefone)}\n\n${conversa}\n\nAbrir na Central: ${central}`,
    html: `<p><b>Motivo:</b> ${esc(motivo)}<br><b>Contato:</b> ${esc(quem)} · ${esc(formatarTelefone(contato.telefone))}</p><pre style="font-family:inherit;white-space:pre-wrap;background:#f6f1ee;padding:12px;border-radius:8px">${esc(conversa)}</pre><p><a href="${central}">Abrir na Central do WhatsApp</a></p>`,
  });
}

function esc(t: string) {
  return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
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
    await responder(admin, m.de, `Esse código não vale mais (ele dura 15 minutos). Gere outro no painel, em ${LINK_PERFIL}, no quadro "Assistente no WhatsApp".`);
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
    await responder(admin, m.de, "Não consegui conectar agora. Tente de novo em instantes.");
    return;
  }
  const { data: perfil } = await admin.from("profiles").select("nome, plano").eq("id", pedido.profissional_id).maybeSingle();
  await admin
    .from("whatsapp_contatos")
    .update({ profissional_id: pedido.profissional_id, etapa: perfil?.plano && perfil.plano !== "teste" ? "assinou" : "cadastrou" })
    .eq("telefone", m.de);
  await responder(
    admin,
    m.de,
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
    .select("id")
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
  if (!linha) return responder(admin, para, "Não achei essa mudança. Me peça de novo, por favor.");
  if (linha.situacao !== "pendente") {
    const ja = linha.situacao === "confirmada" ? "já foi feita" : "já foi resolvida";
    return responder(admin, para, `Essa mudança ${ja}. Se precisar de outra coisa, é só pedir.`);
  }
  if (Date.now() - new Date(linha.criada_em).getTime() > HORAS_24) {
    await admin.from("whatsapp_propostas").update({ situacao: "vencida" }).eq("id", linha.id);
    return responder(admin, para, "Essa proposta ficou velha (mais de 24 h) e eu não mexi em nada. Me peça de novo, por favor.");
  }
  const p = esquemaProposta.safeParse(linha.dados);
  if (!p.success) {
    await admin.from("whatsapp_propostas").update({ situacao: "erro" }).eq("id", linha.id);
    return responder(admin, para, "Essa proposta veio com defeito e eu não mexi em nada. Me peça de novo, por favor.");
  }
  if (!confirmar) {
    await admin.from("whatsapp_propostas").update({ situacao: "recusada" }).eq("id", linha.id);
    return responder(admin, para, `Ok, deixei como estava. Não fiz: ${p.data.resumo}.`);
  }
  const r = await aplicarProposta(clienteDaProfissional(perfil.id), perfil, p.data);
  await admin.from("whatsapp_propostas").update({ situacao: r.ok ? "confirmada" : "erro" }).eq("id", linha.id);
  return responder(admin, para, r.ok ? `✅ ${r.mensagem}` : `⚠️ ${r.mensagem}`);
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
    await responder(admin, para, "Não consegui preparar a mudança agora. Tente de novo em instantes.");
    return;
  }
  const botoes = (id: string) => [
    { id: `sim:${id}`, titulo: "✅ Confirmar" },
    { id: `nao:${id}`, titulo: "Não" },
  ];
  let entregue = true;
  if (propostas.length === 1) {
    // uma só: a resposta da IA vai junto, já com os botões embaixo
    entregue = await enviarBotoes(para, `${textoDaIA}\n\n👉 ${propostas[0].resumo}`, botoes(ids[0]));
  } else {
    entregue = await enviarTexto(para, textoDaIA);
    for (let i = 0; i < propostas.length; i++) entregue = (await enviarBotoes(para, `👉 ${propostas[i].resumo}`, botoes(ids[i]))) && entregue;
  }
  await registrar(admin, para, "robo", `${textoDaIA}\n${propostas.map((p) => `(proposta: ${p.resumo})`).join("\n")}`);
  if (!entregue) await avisarNaoEntregue(admin, para);
}

/** Cadastro com este WhatsApp (o número do cadastro bate com quem escreveu)? */
async function perfilPeloNumero(admin: Admin, telefone: string): Promise<Profile | null> {
  const { data } = await admin.from("profiles").select("*").in("telefone", variacoesCelular(telefone)).limit(1);
  return (data?.[0] as Profile | undefined) ?? null;
}

/** Leva o card do funil adiante quando a pessoa já tem cadastro (lead → cadastrou → assinou). */
async function atualizarFunil(admin: Admin, contato: WhatsappContato, perfil: Profile) {
  const etapa = perfil.plano !== "teste" && situacaoDaConta(perfil) === "aprovada" ? "assinou" : "cadastrou";
  if (contato.profissional_id !== perfil.id || contato.etapa !== etapa) {
    await admin.from("whatsapp_contatos").update({ profissional_id: perfil.id, etapa }).eq("telefone", contato.telefone);
    contato.profissional_id = perfil.id;
    contato.etapa = etapa;
  }
}

/** Depois da espera, chegou outra mensagem da pessoa? Então quem responde é a mais nova (com esta junto no histórico). */
async function chegouOutraDepois(admin: Admin, telefone: string, wamid: string, esperarMs = ESPERA_JUNTAR_MS) {
  if (esperarMs > 0) await new Promise((r) => setTimeout(r, esperarMs));
  const { data } = await admin
    .from("whatsapp_mensagens")
    .select("wamid")
    .eq("telefone", telefone)
    .eq("de", "contato")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return Boolean(data?.wamid && data.wamid !== wamid);
}

/** Foto (até 5 MB) ou PDF (até 10 MB) no formato que o Claude aceita; null se não dá para mandar para a IA. */
function anexoParaIA(arquivo: { dados: Buffer; mime: string } | null): AnexoIA | null {
  if (!arquivo) return null;
  if (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(arquivo.mime) && arquivo.dados.length <= 5 * 1024 * 1024) {
    return { tipo: "imagem", mime: arquivo.mime, base64: arquivo.dados.toString("base64") };
  }
  if (arquivo.mime === "application/pdf" && arquivo.dados.length <= 10 * 1024 * 1024) {
    return { tipo: "pdf", mime: arquivo.mime, base64: arquivo.dados.toString("base64") };
  }
  return null;
}

/** Foto ou PDF que a pessoa mandou nos últimos 2 minutos e que ainda não teve resposta (vem junto da mensagem seguinte). */
async function fotoRecenteSemResposta(admin: Admin, telefone: string): Promise<AnexoIA | null> {
  const { data } = await admin
    .from("whatsapp_mensagens")
    .select("de, tipo, midia_path, midia_mime")
    .eq("telefone", telefone)
    .gt("criado_em", new Date(Date.now() - 120_000).toISOString())
    .order("criado_em", { ascending: false })
    .limit(6);
  for (const msg of data ?? []) {
    if (msg.de !== "contato") return null; // já houve resposta depois dela
    if ((msg.tipo === "imagem" || msg.tipo === "documento") && msg.midia_path && msg.midia_mime) {
      const { data: blob } = await admin.storage.from(BUCKET_WHATSAPP).download(msg.midia_path);
      return blob ? anexoParaIA({ dados: Buffer.from(await blob.arrayBuffer()), mime: msg.midia_mime }) : null;
    }
  }
  return null;
}

/**
 * Quanto tempo, desde que a mensagem chegou, uma pessoa levaria para ler e digitar esta resposta no celular.
 * Com uma variação, para não ficar mecânico. Entre 8 e 20 segundos.
 */
export function tempoDeResposta(resposta: string, sorteio = Math.random()) {
  const base = 6000 + resposta.length * 45;
  return Math.round(Math.min(20_000, Math.max(8000, base * (0.85 + sorteio * 0.3))));
}

/** Atendimento de quem não usa a assistente da agenda: vendas (lead) ou suporte (cadastrada). */
async function atender(
  admin: Admin,
  contato: WhatsappContato,
  texto: string,
  modo: ModoAtendimento,
  perfil: Profile | null,
  wamid: string,
  chegouEm: number,
  extra: { anexo: AnexoIA | null; veioDeAudio: boolean } = { anexo: null, veioDeAudio: false },
) {
  if (await chegouOutraDepois(admin, contato.telefone, wamid)) return;
  // mandou foto e logo depois escreveu ("quanto fica isso?"): a resposta sai nesta mensagem, então a foto vem junto
  const anexo = extra.anexo ?? (await fotoRecenteSemResposta(admin, contato.telefone));
  // limite diário de IA por contato
  const hoje = hojeISO();
  const usadasHoje = contato.ia_dia === hoje ? contato.ia_mensagens_dia : 0;
  if (usadasHoje >= LIMITE_IA_CONTATO_DIA) {
    await chamarDiego(admin, contato, "muitas mensagens hoje (limite da IA)");
    if (usadasHoje === LIMITE_IA_CONTATO_DIA) await responder(admin, contato.telefone, "Recebi! Vou deixar a equipe continuar daqui, tá? Respondem por aqui mesmo. 😊");
    await admin.from("whatsapp_contatos").update({ ia_dia: hoje, ia_mensagens_dia: usadasHoje + 1 }).eq("telefone", contato.telefone);
    return;
  }

  const historico = await historicoRecente(admin, contato.telefone);
  const r = await responderAtendimento({
    modo,
    historico,
    texto,
    perfil,
    anexo,
    veioDeAudio: extra.veioDeAudio,
    jaSabe: {
      nome: contato.nome,
      nomeWhatsapp: contato.nome_whatsapp,
      ramo: contato.ramo,
      equipeChamada: contato.atendimento === "precisa",
      linkEnviado: contato.etapa !== "robo" || historico.some((f) => f.papel === "assistente" && f.texto.includes("/cadastro")),
    },
  });

  const mudar: Partial<Omit<WhatsappContato, "telefone">> = {
    ia_usada: true,
    ia_dia: hoje,
    ia_mensagens_dia: usadasHoje + 1,
    ia_custo_usd: Number(contato.ia_custo_usd) + r.custoUsd,
  };
  if (r.anotado.nome) mudar.nome = r.anotado.nome;
  if (r.anotado.ramo) mudar.ramo = r.anotado.ramo;
  if (r.mandouLink && contato.etapa === "robo") mudar.etapa = "link";
  await admin.from("whatsapp_contatos").update(mudar).eq("telefone", contato.telefone);

  // nada a dizer (a pessoa só agradeceu depois da despedida): fica quieta, como gente
  if (r.silencio) {
    if (r.chamarEquipe) await chamarDiego(admin, contato, r.chamarEquipe);
    return;
  }

  // a Serena "digita" no ritmo de uma pessoa (com o "digitando..." aparecendo) em vez de responder na hora
  const falta = tempoDeResposta(r.texto) - (Date.now() - chegouEm);
  if (falta > 0) {
    void mostrarDigitando(wamid);
    await new Promise((ok) => setTimeout(ok, falta));
  }
  // a pessoa mandou outra mensagem enquanto isso: quem responde é a mais nova, que já vê esta junto
  if (await chegouOutraDepois(admin, contato.telefone, wamid, 0)) return;

  await responder(admin, contato.telefone, r.texto);
  if (r.chamarEquipe) await chamarDiego(admin, contato, r.chamarEquipe);
}

/** Limpeza leve de tempos em tempos (ids de mensagens já tratadas, códigos vencidos, propostas velhas). */
async function faxina(admin: Admin) {
  if (Math.random() > 0.05) return;
  const doisDias = new Date(Date.now() - 2 * HORAS_24).toISOString();
  await Promise.all([
    admin.from("whatsapp_recebidas").delete().lt("recebida_em", new Date(Date.now() - 7 * HORAS_24).toISOString()),
    admin.from("whatsapp_codigos").delete().lt("expira_em", new Date().toISOString()),
    admin.from("whatsapp_propostas").update({ situacao: "vencida" }).eq("situacao", "pendente").lt("criada_em", doisDias),
    // conversa de leads guardada por 1 ano
    admin.from("whatsapp_mensagens").delete().lt("criado_em", new Date(Date.now() - 365 * HORAS_24).toISOString()),
    // fotos e áudios: 90 dias (fica o texto e a transcrição)
    apagarMidiaVelha(admin),
  ]);
}

export async function tratarMensagem(m: Recebida): Promise<void> {
  const chegouEm = Date.now();
  const admin = criarClienteAdmin();

  // a Meta pode reenviar a mesma mensagem: só trata a primeira vez
  const { error: repetida } = await admin.from("whatsapp_recebidas").insert({ wamid: m.wamid });
  if (repetida) return;

  let contato: WhatsappContato | null = null;
  try {
    const entrada = await registrarEntrada(admin, m);
    contato = entrada.contato;

    // 1) Conectar a assistente (código gerado no Perfil)
    const codigo = m.tipo === "texto" && m.texto ? codigoDeConexao(m.texto) : null;
    if (codigo) return await conectar(admin, m, codigo);

    // 2) O Diego assumiu esta conversa: o robô fica quieto
    if (contato.atendimento === "humano") return;

    void mostrarDigitando(m.wamid);

    // 3) Quem é?
    const { data: vinculo } = await admin.from("whatsapp_vinculos").select("profissional_id").eq("telefone", m.de).maybeSingle();
    const perfil = vinculo
      ? ((await admin.from("profiles").select("*").eq("id", vinculo.profissional_id).maybeSingle()).data as Profile | null)
      : await perfilPeloNumero(admin, m.de);
    if (perfil) await atualizarFunil(admin, contato, perfil);
    const comAssistente = Boolean(vinculo && perfil && situacaoDaConta(perfil) === "aprovada" && temRecurso(perfil.plano, "assistente"));

    // 3b) Robô conversando com robô: para antes de gastar IA (a profissional conectada fica de fora: é ela mesma)
    if (!comAssistente) {
      const robo = await motivoRobo(admin, m.de, m.texto ?? entrada.transcricao ?? m.legenda ?? "");
      if (robo) return await chamarDiego(admin, contato, robo, true);
    }

    // 4) Áudio vira texto (transcrição); foto e PDF vão junto para a IA ver; o resto, pede por escrito
    let textoRecebido = m.texto ?? "";
    let anexo: AnexoIA | null = null;
    if (m.tipo === "audio") {
      if (!entrada.transcricao) return await responder(admin, m.de, "Não consegui ouvir esse áudio direito. 🙏 Pode mandar de novo ou escrever?");
      textoRecebido = entrada.transcricao;
    } else if (m.tipo === "imagem" || m.tipo === "documento") {
      anexo = anexoParaIA(entrada.arquivo);
      if (!anexo) {
        const oQue = m.tipo === "imagem" ? "essa foto" : "esse arquivo";
        return await responder(admin, m.de, `Não consegui abrir ${oQue} aqui. 🙏 Me conta por escrito o que você precisa?`);
      }
      textoRecebido = m.legenda ?? "";
    } else if (m.tipo === "localizacao" || m.tipo === "contato") {
      textoRecebido = rotuloMidia(m.tipo, m.texto);
    } else if (m.tipo === "figurinha") {
      textoRecebido = "(mandou uma figurinha)";
    } else if (m.tipo !== "texto" && m.tipo !== "botao") {
      return await responder(admin, m.de, "Vídeo eu ainda não consigo ver. 🙏 Me conta por escrito ou manda um áudio?");
    }

    const umaVez = contato;
    const chamarEquipe = (motivo: string) => void chamarDiego(admin, umaVez, motivo);

    if (comAssistente && perfil) {
      // 5) Botões Confirmar / Não
      if (m.tipo === "botao" && m.botaoId) {
        const [acao, id] = m.botaoId.split(":");
        if ((acao === "sim" || acao === "nao") && id) return await decidir(admin, perfil, m.de, id, acao === "sim");
      }
      if (anexo) return await responder(admin, m.de, "Por aqui eu ainda não consigo ver fotos e arquivos. 🙏 Me conta por escrito ou por áudio?");
      const texto = textoRecebido.trim().slice(0, 1500);
      if (!texto) return;

      // 6) "sim" / "não" respondendo a uma mudança que está esperando
      const comando = interpretar(texto, hojeISO());
      if (comando?.tipo === "confirmar" || comando?.tipo === "recusar") {
        const pendente = await ultimaPendente(admin, perfil.id);
        if (pendente) return await decidir(admin, perfil, m.de, pendente.id, comando.tipo === "confirmar");
      }

      // 7) Assistente da agenda (o mesmo cérebro da tela Assistente), que também chama a equipe
      const historico = await historicoRecente(admin, m.de);
      const r = await processarMensagem({ supabase: clienteDaProfissional(perfil.id), perfil, historico, texto, canal: "whatsapp", chamarEquipe });
      if (!r.ok) return await responder(admin, m.de, r.erro ?? "Não consegui agora. Tente de novo em instantes.");
      const resposta = r.texto?.trim() || "Pronto.";
      if (r.propostas?.length) await enviarPropostas(admin, m.de, perfil, resposta, r.propostas);
      else await responder(admin, m.de, resposta);
    } else {
      // 8) Vendas (lead) ou suporte (já tem cadastro)
      const texto = textoRecebido.trim().slice(0, 1500);
      if (!texto && !anexo) return;
      await atender(admin, contato, texto, perfil ? "suporte" : "lead", perfil, m.wamid, chegouEm, { anexo, veioDeAudio: m.tipo === "audio" });
    }

    await faxina(admin);
  } catch (e) {
    console.error("[whatsapp] erro ao tratar mensagem", e);
    await enviarTexto(m.de, "Tive um problema para responder agora. 😕 A equipe já foi avisada e responde por aqui.").catch(() => {});
    if (contato) await chamarDiego(admin, contato, "erro ao responder (ver log)").catch(() => {});
  }
}
