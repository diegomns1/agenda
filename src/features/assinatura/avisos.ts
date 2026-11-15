import "server-only";
import { asaasConfigurado, avisosSoPorEmail } from "@/lib/asaas";
import type { criarClienteAdmin } from "@/lib/supabase/admin";

/**
 * Passa os avisos de cobrança do Asaas para "só e-mail" em todas as clientes que já têm cadastro lá (16/11/2026).
 * Chamado uma vez por dia pela tarefa automática: cobre quem assinou antes da mudança e qualquer aviso novo
 * que o Asaas venha a criar com SMS ligado. Quem já está só por e-mail não é alterado.
 */
export async function avisosDoAsaasSoPorEmail(admin: ReturnType<typeof criarClienteAdmin>) {
  if (!asaasConfigurado()) return { clientes: 0, alterados: 0 };
  const { data } = await admin.from("profiles").select("asaas_customer_id").not("asaas_customer_id", "is", null).limit(1000);
  let alterados = 0;
  let falhas = 0;
  for (const p of data ?? []) {
    try {
      if ((await avisosSoPorEmail(p.asaas_customer_id!)) > 0) alterados++;
    } catch {
      falhas++; // cliente de outro ambiente (Sandbox) ou apagada no Asaas: segue
    }
  }
  return { clientes: data?.length ?? 0, alterados, falhas };
}
