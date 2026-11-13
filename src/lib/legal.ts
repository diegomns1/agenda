/** Dados usados nos Termos de Uso, na Política de Privacidade e nos e-mails. */

/** Versão vigente dos termos. Mude a data quando o texto mudar de forma relevante. */
export const VERSAO_TERMOS = "2026-11-11"; // 11/11: teste grátis liberado sozinho (sem aprovação manual)
/** Data da última mudança na Política de Privacidade (não pede novo aceite; 11/11: WhatsApp oficial, IA, Meta). */
export const ATUALIZACAO_PRIVACIDADE = "2026-11-13"; // 12/11: tag do Google Ads

/** E-mail de contato/suporte que aparece nos textos legais e nos e-mails. */
export const EMAIL_CONTATO = process.env.NEXT_PUBLIC_EMAIL_CONTATO ?? "contato@vaguinha.app";

/** Empresa responsável (dados públicos do CNPJ; exigidos para venda pela internet e pela LGPD). */
export const EMPRESA = {
  razaoSocial: "DIG STUDIO CRIATIVO LTDA",
  nomeFantasia: "DIGSTUDIO",
  cnpj: "64.540.250/0001-05",
  endereco: "Rua Adalberto Dias Bogado, 641, Recanto dos Pássaros, Ourinhos/SP, CEP 19915-706",
  cidade: "Ourinhos/SP",
};

/** Quem opera o serviço (aparece nos termos e na política de privacidade). */
export const OPERADOR = `${EMPRESA.razaoSocial} (${EMPRESA.nomeFantasia}), CNPJ ${EMPRESA.cnpj}`;
