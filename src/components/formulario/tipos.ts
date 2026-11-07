/** Estado devolvido por Server Actions usadas com useActionState. */
export type EstadoForm = {
  ok?: boolean;
  mensagem?: string;
  erro?: string;
  erros?: Record<string, string[] | undefined>;
};

export const ESTADO_INICIAL: EstadoForm = {};
