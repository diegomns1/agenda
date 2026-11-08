import { createCn } from "cn/config";

/**
 * Junta classes do Tailwind resolvendo conflitos (a última vence).
 * Ensinado a reconhecer os tokens do DESIGN.md, senão "h-toque" não substituiria "h-8",
 * "text-mini" não substituiria "text-sm" etc. Ao criar um token novo no @theme, acrescente aqui.
 */
export const cn = createCn({
  extend: {
    theme: {
      spacing: ["toque"],
      text: ["mini", "destaque"],
      shadow: ["suave", "media", "alta"],
      radius: ["chip", "gaveta"],
    },
  },
});
