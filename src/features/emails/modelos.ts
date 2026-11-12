import { NOME_APP, URL_APP } from "@/lib/constantes";
import { formatarDataISO } from "@/lib/datas";
import { EMAIL_CONTATO } from "@/lib/legal";
import { formatarPreco, PLANOS, type Plano } from "@/lib/planos";
import type { Email } from "@/lib/email";

/* Modelos de e-mail do app, em português. HTML simples (tabelas + estilos inline) para
   abrir bem no Gmail, Outlook e no celular. Textos de pessoas (nome, motivo) são escapados. */

const VINHO = "#702D50";
const CREME = "#FCF6F1";

function esc(texto: string) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Partes = {
  para: string;
  assunto: string;
  /** Linha que aparece ao lado do assunto na caixa de entrada (não aparece no corpo). */
  previa?: string;
  titulo: string;
  saudacao?: string;
  paragrafos: string[];
  botao?: { texto: string; url: string };
  observacao?: string;
};

function montar(p: Partes): Email {
  const logo = `${URL_APP}/icons/icon-192.png`;
  const paragrafosHtml = p.paragrafos.map((t) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#1F1F23">${esc(t)}</p>`).join("");
  const botaoHtml = p.botao
    ? `<p style="margin:24px 0"><a href="${p.botao.url}" style="display:inline-block;background:${VINHO};color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:999px">${esc(p.botao.texto)}</a></p>`
    : "";
  const obsHtml = p.observacao ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#6b6b73">${esc(p.observacao)}</p>` : "";

  const previaHtml = p.previa
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(p.previa)}${"&#8204;&nbsp;".repeat(40)}</div>`
    : "";

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:${CREME};font-family:Nunito,Segoe UI,Arial,sans-serif">
${previaHtml}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${CREME};padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="padding:22px 28px 0;text-align:left">
  <img src="${logo}" width="40" height="40" alt="" style="vertical-align:middle;border-radius:10px"> <span style="font-size:20px;font-weight:800;color:${VINHO};vertical-align:middle;margin-left:6px">${NOME_APP}</span>
</td></tr>
<tr><td style="padding:22px 28px 8px">
  <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:${VINHO}">${esc(p.titulo)}</h1>
  ${p.saudacao ? `<p style="margin:0 0 14px;font-size:16px;color:#1F1F23">${esc(p.saudacao)}</p>` : ""}
  ${paragrafosHtml}
  ${botaoHtml}
  ${obsHtml}
</td></tr>
<tr><td style="padding:18px 28px 26px;font-size:12px;line-height:1.5;color:#8a8a92;border-top:1px solid #f0e6ea">
  Você recebeu este e-mail porque tem uma conta no ${NOME_APP}. Dúvidas: <a href="mailto:${EMAIL_CONTATO}" style="color:${VINHO}">${EMAIL_CONTATO}</a><br>
  <a href="${URL_APP}/privacidade" style="color:#8a8a92">Política de Privacidade</a> · <a href="${URL_APP}/termos" style="color:#8a8a92">Termos de Uso</a>
</td></tr>
</table>
</td></tr></table></body></html>`;

  const texto = [
    p.titulo,
    "",
    p.saudacao ?? "",
    ...p.paragrafos,
    p.botao ? `${p.botao.texto}: ${p.botao.url}` : "",
    p.observacao ?? "",
    "",
    `${NOME_APP} · ${URL_APP} · Dúvidas: ${EMAIL_CONTATO}`,
  ]
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n");

  return { para: p.para, assunto: p.assunto, html, texto };
}

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || "";
}

// ---------------------------------------------------------------------------

/** Para a profissional, logo após o cadastro. */
export function emailCadastroRecebido(para: string, nome: string): Email {
  return montar({
    para,
    assunto: `Recebemos seu cadastro no ${NOME_APP}`,
    previa: "Falta só a liberação da conta. Enquanto isso, separe seus serviços e valores.",
    titulo: "Cadastro recebido",
    saudacao: `Oi, ${primeiroNome(nome)}!`,
    paragrafos: [
      "Uma pessoa confere cada conta antes de liberar o acesso, para o Vaguinha ter só profissionais de verdade. Quando a sua estiver pronta, chega outro e-mail com o link para entrar, e os 5 dias grátis começam nesse dia.",
      "Para ganhar tempo, separe a lista dos seus serviços com valor e duração, e a sua logo. É a primeira coisa que o painel vai pedir.",
    ],
    botao: { texto: "Ver a situação da conta", url: `${URL_APP}/login` },
  });
}

/** Para o administrador: alguém novo se cadastrou. */
export function emailNovoCadastroAdmin(
  para: string,
  dados: { nome: string; email: string; telefone: string | null },
  automatica = false,
): Email {
  return montar({
    para,
    assunto: automatica ? `Novo cadastro: ${dados.nome}` : `Novo cadastro aguardando aprovação: ${dados.nome}`,
    titulo: "Novo cadastro no Vaguinha",
    paragrafos: [
      `Nome: ${dados.nome}`,
      `E-mail: ${dados.email}`,
      `WhatsApp: ${dados.telefone ?? "não informado"}`,
      ...(automatica
        ? ["O teste grátis libera sozinho quando a pessoa confirmar o e-mail e entrar. Se for cadastro falso, recuse ou suspenda no Admin."]
        : []),
    ],
    botao: { texto: "Abrir o Admin", url: `${URL_APP}/admin` },
  });
}

/** Conta aprovada (ou reativada depois de suspensa). `fimDoTeste`: data final do teste grátis, se começou agora. */
export function emailContaAprovada(para: string, nome: string, reativacao = false, fimDoTeste: string | null = null): Email {
  return montar({
    para,
    assunto: reativacao ? `Sua conta no ${NOME_APP} foi reativada` : `Sua conta no ${NOME_APP} está liberada`,
    previa: reativacao
      ? "Sua agenda, clientes e serviços continuam onde estavam."
      : fimDoTeste
        ? `Teste grátis até ${formatarDataISO(fimDoTeste)}. Primeiro passo: cadastrar seus serviços.`
        : "Primeiro passo: cadastrar seus serviços.",
    titulo: reativacao ? "Conta reativada" : "Sua conta está liberada",
    saudacao: `Oi, ${primeiroNome(nome)}!`,
    paragrafos: reativacao
      ? ["Seu acesso ao Vaguinha está liberado de novo. Sua agenda, clientes e serviços continuam onde estavam."]
      : [
          ...(fimDoTeste ? [`Seu teste grátis vai até ${formatarDataISO(fimDoTeste)}, com a agenda, os clientes e os serviços.`] : []),
          "O primeiro passo é cadastrar seus serviços com valor e duração. Com isso, a agenda já sabe quanto tempo reservar em cada horário e o seu link mostra os preços certos.",
          "No celular, abra o painel, toque em Compartilhar (iPhone) ou no menu ⋮ (Android) e escolha Adicionar à tela de início. O Vaguinha vira um app e passa a avisar dos horários.",
        ],
    botao: reativacao ? { texto: "Abrir o painel", url: `${URL_APP}/login` } : { texto: "Cadastrar meus serviços", url: `${URL_APP}/servicos` },
  });
}

/** Cadastro recusado. */
export function emailContaRecusada(para: string, nome: string, motivo: string | null): Email {
  return montar({
    para,
    assunto: `Sobre seu cadastro no ${NOME_APP}`,
    titulo: "Não foi possível aprovar seu cadastro",
    saudacao: `Oi, ${primeiroNome(nome)}.`,
    paragrafos: [
      "Analisamos seu cadastro e, neste momento, não conseguimos aprovar a conta.",
      ...(motivo ? [`Motivo: ${motivo}`] : []),
      "Se acha que houve um engano ou quer mais informações, responda este e-mail que a gente conversa.",
    ],
  });
}

/** Conta suspensa. */
export function emailContaSuspensa(para: string, nome: string, motivo: string | null): Email {
  return montar({
    para,
    assunto: `Sua conta no ${NOME_APP} foi suspensa`,
    titulo: "Conta suspensa temporariamente",
    saudacao: `Oi, ${primeiroNome(nome)}.`,
    paragrafos: [
      "O acesso à sua agenda foi suspenso. Seus dados continuam guardados e nada foi apagado.",
      ...(motivo ? [`Motivo: ${motivo}`] : []),
      "Para regularizar ou tirar dúvidas, responda este e-mail.",
    ],
  });
}

/** Assinatura perto de vencer (enviado pelo cron, uma vez por data de validade). */
export function emailVencimentoProximo(para: string, nome: string, plano: Plano, ativaAte: string, diasRestantes: number): Email {
  const quando = diasRestantes <= 0 ? "hoje" : diasRestantes === 1 ? "amanhã" : `em ${diasRestantes} dias`;
  if (plano === "teste") {
    return montar({
      para,
      assunto: `Seu teste grátis do ${NOME_APP} termina ${quando}`,
      previa: `Para continuar, planos a partir de ${formatarPreco(PLANOS.essencial.preco).replace("/mês", "")} por mês. Nada é apagado.`,
      titulo: `Seu teste grátis termina ${quando}`,
      saudacao: `Oi, ${primeiroNome(nome)}!`,
      paragrafos: [
        `O teste vale até ${formatarDataISO(ativaAte)}. Depois disso a agenda fica em espera até você escolher um plano. Clientes, serviços e horários continuam guardados.`,
        `Os planos começam em ${formatarPreco(PLANOS.essencial.preco).replace("/mês", "")} por mês, por Pix ou cartão de crédito, sem fidelidade.`,
        `Essencial (${formatarPreco(PLANOS.essencial.preco)}): agenda, clientes e serviços. Profissional (${formatarPreco(PLANOS.profissional.preco)}): mais o link de agendamento e os lembretes. Premium (${formatarPreco(PLANOS.premium.preco)}): mais o assistente de IA, os stories e o relatório do mês.`,
      ],
      botao: { texto: "Escolher meu plano", url: `${URL_APP}/assinatura` },
    });
  }
  return montar({
    para,
    assunto: `Sua assinatura do ${NOME_APP} vence ${quando}`,
    titulo: `Sua assinatura vence ${quando}`,
    saudacao: `Oi, ${primeiroNome(nome)}!`,
    paragrafos: [
      `Seu plano ${PLANOS[plano].nome} vale até ${formatarDataISO(ativaAte)}. Depois dessa data a agenda fica em espera até a renovação (nada é apagado).`,
      "Para renovar, abra a página Assinatura no painel e pague a mensalidade por Pix ou cartão de crédito. Se preferir, responda este e-mail.",
    ],
    botao: { texto: "Renovar agora", url: `${URL_APP}/assinatura` },
    observacao: "Se você já renovou, pode ignorar este aviso.",
  });
}
