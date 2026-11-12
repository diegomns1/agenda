import "server-only";
import { after } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { DIAS_TESTE } from "@/lib/planos";
import { hojeISO, somarDias } from "@/lib/datas";
import { enviarEmail } from "@/lib/email";
import { emailContaAprovada } from "@/features/emails/modelos";
import { registrarAprovacao } from "@/features/rastreio/servidor";
import type { Profile } from "@/types/database";

/*
 * APROVAÇÃO AUTOMÁTICA DO TESTE GRÁTIS (11/11/2026)
 * A conta nova é liberada sozinha na primeira vez que a pessoa entra no painel. Hoje a confirmação de e-mail
 * está DESLIGADA no Supabase: o cadastro já entra direto. Ligando "Confirm email", só passa quem tem e-mail de verdade.
 * O admin continua podendo recusar ou suspender depois.
 * Para voltar à aprovação manual (ex.: onda de cadastros falsos): APROVACAO_MANUAL=1 no env da VPS + pm2 reload.
 */
export function aprovacaoAutomatica() {
  return process.env.APROVACAO_MANUAL !== "1";
}

/**
 * Libera o teste grátis de uma conta pendente. Só vale para conta nova: pendente, plano Teste e sem validade
 * (quem foi recusada ou suspensa não passa por aqui). Devolve true se liberou agora.
 */
export async function aprovarTesteAutomatico(perfil: Profile | null): Promise<boolean> {
  if (!aprovacaoAutomatica() || !perfil) return false;
  if (perfil.status !== "pendente" || perfil.plano !== "teste" || perfil.ativa_ate) return false;

  const fimDoTeste = somarDias(hojeISO(), DIAS_TESTE);
  const admin = criarClienteAdmin(); // o banco só deixa o admin (ou a service_role) mudar status e validade
  const { data, error } = await admin
    .from("profiles")
    .update({ status: "aprovada", status_motivo: null, ativa_ate: fimDoTeste })
    .eq("id", perfil.id)
    // condições repetidas no banco: se duas abas abrirem juntas, só uma libera (e manda e-mail/evento)
    .eq("status", "pendente")
    .eq("plano", "teste")
    .is("ativa_ate", null)
    .select("id");
  if (error) {
    console.error("[aprovação automática]", error.message);
    return false;
  }
  if (!data?.length) return false;

  after(async () => {
    // Anúncios: StartTrial na Meta (entrou no painel = lead que começou o teste)
    await registrarAprovacao(perfil.id).catch((e) => console.error("[meta] aprovação", e));
    // Boas-vindas com a data final do teste e o primeiro passo
    if (perfil.email) await enviarEmail(emailContaAprovada(perfil.email, perfil.nome, false, fimDoTeste)).catch(() => {});
  });
  return true;
}
