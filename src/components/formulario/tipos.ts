/** Estado devolvido por Server Actions usadas com useActionState. */
export type EstadoForm = {
  ok?: boolean;
  mensagem?: string;
  erro?: string;
  erros?: Record<string, string[] | undefined>;
  /** Valores digitados, devolvidos em caso de erro para o formulário não "esvaziar". */
  valores?: Record<string, string>;
  /** Para onde o navegador vai depois do sucesso (quando a tela precisa rodar algo antes, ex.: avisar os anúncios). */
  destino?: string;
};

/** Extrai do FormData os campos de texto pedidos (nunca senhas). */
export function valoresDoForm(formData: FormData, campos: string[]): Record<string, string> {
  const r: Record<string, string> = {};
  for (const c of campos) {
    const v = formData.get(c);
    if (typeof v === "string") r[c] = v;
  }
  return r;
}

export const ESTADO_INICIAL: EstadoForm = {};
