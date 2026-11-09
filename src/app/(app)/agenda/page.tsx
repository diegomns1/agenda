import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterPerfil } from "@/lib/auth";
import { ehDataISO, hojeISO, inicioDaSemana, intervaloDoMes, somarDias } from "@/lib/datas";
import { listarAgendamentosDias } from "@/features/agenda/queries";
import { listarClientes } from "@/features/clientes/queries";
import { listarServicos } from "@/features/servicos/queries";
import { AgendaCliente } from "@/features/agenda/components/AgendaCliente";
import { mensagensDoPerfil } from "@/features/mensagens/modelos";
import { URL_APP } from "@/lib/constantes";
import type { Visao } from "@/features/agenda/components/BarraAgenda";
import type { InicialForm } from "@/features/agenda/components/FormAgendamento";

export const metadata: Metadata = { title: "Agenda" };

function ehVisao(v: unknown): v is Visao {
  return v === "dia" || v === "semana" || v === "mes";
}

export default async function PaginaAgenda({ searchParams }: PageProps<"/agenda">) {
  const sp = await searchParams;
  // Abre no mês (visão geral, como no Google Agenda); dia e semana pelos botões ou tocando num dia
  const visao: Visao = ehVisao(sp.visao) ? sp.visao : "mes";
  const data = ehDataISO(sp.data) ? sp.data : hojeISO();

  const perfil = await obterPerfil();
  if (!perfil) redirect("/aguardando-aprovacao");

  // Período carregado conforme a visão
  let primeiro = data;
  let ultimo = data;
  if (visao === "semana") {
    primeiro = inicioDaSemana(data);
    ultimo = somarDias(primeiro, 6);
  } else if (visao === "mes") {
    const r = intervaloDoMes(data);
    primeiro = r.inicio;
    ultimo = r.fim;
  }

  const [agendamentos, clientes, servicos] = await Promise.all([
    listarAgendamentosDias(primeiro, ultimo),
    listarClientes(),
    listarServicos({ somenteAtivos: true }),
  ]);

  // Abrir o formulário direto (ex.: "Agendar de novo" na ficha da cliente)
  let abrirInicial: InicialForm | null = null;
  if (sp.novo === "atendimento" || sp.novo === "bloqueio") {
    abrirInicial = {
      tipo: sp.novo,
      dia: data,
      clienteId: typeof sp.cliente === "string" ? sp.cliente : null,
      servicoId: typeof sp.servico === "string" ? sp.servico : null,
    };
  }

  return (
    <div className="grid gap-4">
      <h1 className="sr-only">Agenda</h1>
      <AgendaCliente
        visao={visao}
        data={data}
        agendamentos={agendamentos}
        clientes={clientes.map((c) => ({ id: c.id, nome: c.nome, telefone: c.telefone }))}
        servicos={servicos}
        expediente={perfil.expediente}
        intervaloMin={perfil.intervalo_grade_min}
        mensagens={mensagensDoPerfil(perfil, URL_APP)}
        abrirInicial={abrirInicial}
      />
    </div>
  );
}
