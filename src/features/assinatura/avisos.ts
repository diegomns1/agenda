import "server-only";
import { asaasConfigurado, desligarAvisos } from "@/lib/asaas";
import type { criarClienteAdmin } from "@/lib/supabase/admin";

/**
 * Desliga os avisos de cobrança do Asaas em todas as clientes que já têm cadastro lá (15/11/2026).
 * Chamado a cada 6 horas pela tarefa automática: cobre quem assinou antes da mudança.
 * Quem já está desligado só é consultado, não alterado.
 */
export async function desligarAvisosDoAsaas(admin: ReturnType<typeof criarClienteAdmin>) {
  if (!asaasConfigurado()) return { clientes: 0, alterados: 0 };
  const { data } = await admin.from("profiles").select("asaas_customer_id").not("asaas_customer_id", "is", null).limit(1000);
  let alterados = 0;
  let falhas = 0;
  for (const p of data ?? []) {
    try {
      if (await desligarAvisos(p.asaas_customer_id!)) alterados++;
    } catch {
      falhas++; // cliente de outro ambiente (Sandbox) ou apagada no Asaas: segue
    }
  }
  return { clientes: data?.length ?? 0, alterados, falhas };
}
