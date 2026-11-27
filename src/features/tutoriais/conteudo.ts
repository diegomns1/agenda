import type { Plano } from "@/lib/planos";

/*
 * Tutoriais do painel (13/11/2026). Passo a passo curto de cada função, com espaço para vídeo.
 * Para pôr um vídeo: cole o link do YouTube (ou do Instagram/Drive com permissão pública) em `video`.
 * Os passos usam os nomes que aparecem na tela (botões, abas, títulos). Mudou a tela, mude aqui também.
 * Revisado em 15/11/2026: Perfil em botões, Relatório na barra, editar atendimento, lembrete automático e stories com IA.
 */

export type Tutorial = {
  id: string;
  titulo: string;
  resumo: string;
  /** a partir de qual plano a função existe (sem = todos, inclusive o teste) */
  plano?: Exclude<Plano, "teste" | "essencial">;
  passos: string[];
  /** link do vídeo (YouTube); null = "vídeo em breve" */
  video: string | null;
  acao?: { href: string; rotulo: string };
};

export const TUTORIAIS: Tutorial[] = [
  {
    id: "comecar",
    titulo: "Primeiros passos",
    resumo: "Deixe a agenda pronta em 5 minutos.",
    passos: [
      "Abra Perfil → Meus dados e preencha o nome do negócio e o seu WhatsApp.",
      "Em Perfil → Horários, marque os dias e as horas em que você atende.",
      "Em Perfil → Serviços, toque em Novo serviço e cadastre cada serviço com o tempo que leva e o valor.",
      "Pronto: na aba Agenda, toque em Marcar para colocar o primeiro horário.",
    ],
    video: null,
    acao: { href: "/servicos", rotulo: "Cadastrar meus serviços" },
  },
  {
    id: "importar",
    titulo: "Trazer a agenda do Google",
    resumo: "Usa o Google Agenda? Traga todos os horários de uma vez.",
    passos: [
      "No computador, abra calendar.google.com (no celular, use o Chrome com \"Site para computador\" ligado).",
      "Engrenagem → Configurações → Importar e exportar → Exportar. Vai baixar um arquivo .zip.",
      "No Vaguinha, abra Agenda e, lá embaixo, toque em Importar agenda. Escolha o arquivo .zip.",
      "Confira a lista: o que é cliente fica como Atendimento; academia, médico e coisas suas, marque Compromisso meu.",
      "Toque em Trazer para a agenda. Os clientes são cadastrados sozinhos.",
      "Errou alguma coisa? No fim da Agenda tem Limpar agenda, para apagar o que veio do Google e importar de novo.",
    ],
    video: null,
    acao: { href: "/agenda/importar", rotulo: "Importar minha agenda" },
  },
  {
    id: "marcar",
    titulo: "Marcar, editar e cancelar",
    resumo: "O dia a dia da agenda.",
    passos: [
      "Na aba Agenda, toque em Marcar (ou num horário vazio e depois no +).",
      "Escolha o cliente (ou cadastre na hora), o serviço e o horário. O sistema não deixa marcar dois no mesmo horário.",
      "Para mudar o dia, o horário ou o serviço de quem já está marcado, toque no atendimento e depois em Editar.",
      "A cliente vai fazer mais uma coisa no mesmo horário? Toque no atendimento e em + Adicionar serviço.",
      "Para desmarcar, toque no atendimento e em Cancelar atendimento.",
      "Depois do atendimento, marque Concluído ou Faltou: isso aparece no histórico e no relatório do mês.",
      "Academia, médico, almoço ou folga? Use o botão Compromisso: o horário fica ocupado e ninguém marca em cima.",
    ],
    video: null,
    acao: { href: "/agenda", rotulo: "Abrir a agenda" },
  },
  {
    id: "clientes",
    titulo: "Clientes e histórico",
    resumo: "Tudo de cada cliente num lugar só.",
    passos: [
      "Na aba Clientes, toque em Novo cadastro: nome, WhatsApp e observações (alergias, preferências).",
      "Abra um cliente para ver o histórico: o que já fez, quando, quanto pagou e as faltas.",
      "De lá dá para chamar no WhatsApp ou marcar de novo com um toque.",
    ],
    video: null,
    acao: { href: "/clientes", rotulo: "Ver meus clientes" },
  },
  {
    id: "app",
    titulo: "Colocar o Vaguinha na tela do celular",
    resumo: "Abre como aplicativo e recebe os avisos.",
    passos: [
      "iPhone: abra o painel no Safari, toque em Compartilhar (quadrado com seta) → Adicionar à Tela de Início.",
      "Android: abra no Chrome e toque em Instalar quando aparecer o aviso (ou menu ⋮ → Instalar app).",
      "Abra pelo ícone novo e, quando o celular perguntar, permita as notificações.",
    ],
    // o mesmo vídeo que a Serena manda no WhatsApp (features/whatsapp/videos.ts), 21/11/2026
    video: "https://www.vaguinha.app/site/videos/instalar-app.mp4",
  },
  {
    id: "lembretes",
    titulo: "Lembretes para os clientes",
    resumo: "Menos faltas, sem digitar mensagem.",
    plano: "profissional",
    passos: [
      "Com o app na tela do celular e as notificações permitidas, você recebe um aviso 1 dia e 1 hora antes de cada atendimento.",
      "Toque no aviso: o WhatsApp do cliente abre com a mensagem pronta. É só tocar em enviar.",
      "No sininho (em cima), aparece quem ainda falta avisar.",
      "Os textos das mensagens você muda em Perfil → Mensagens do WhatsApp.",
    ],
    video: null,
    acao: { href: "/lembretes", rotulo: "Ver lembretes" },
  },
  {
    id: "lembrete-automatico",
    titulo: "Lembrete automático pelo seu WhatsApp",
    resumo: "O lembrete sai sozinho, do seu número, sem você tocar em nada.",
    plano: "premium",
    passos: [
      "Toque no sininho (em cima) para abrir Lembretes e ache o cartão Lembrete pelo seu WhatsApp.",
      "No celular, escolha Com código. No computador, escolha Com QR Code. Toque em Conectar.",
      "No seu WhatsApp, abra Dispositivos conectados → Conectar dispositivo e digite o código (ou aponte a câmera para o QR Code).",
      "Ligue Mandar lembretes sozinha. Cada cliente recebe uma mensagem 1 dia antes e outra 2 horas antes do horário.",
      "As mensagens saem entre 7h e 21h, com um intervalo entre uma e outra. Você continua usando o WhatsApp normalmente.",
      "Essa conexão não é oficial do WhatsApp. Por isso a Vaguinha manda poucas mensagens e só para quem tem horário marcado. Dá para desligar quando quiser.",
    ],
    // vídeo "Conecte seu WhatsApp" (27/11/2026): vai junto quando o Diego manda este tutorial pela Central
    video: "https://www.vaguinha.app/site/videos/lembrete-automatico.mp4",
    acao: { href: "/lembretes", rotulo: "Conectar meu WhatsApp" },
  },
  {
    id: "link",
    titulo: "Link para o cliente marcar sozinho",
    resumo: "Coloque na bio do Instagram e no WhatsApp.",
    plano: "profissional",
    passos: [
      "Abra Perfil → Link de agendamento e ligue o agendamento online.",
      "Toque em Copiar link e cole na bio do Instagram, no status ou nas mensagens.",
      "O cliente escolhe o serviço e um horário livre, sem baixar nada nem criar conta.",
      "Os pedidos aparecem na tela Hoje para você confirmar (ou entram direto, se você escolher assim no Perfil).",
    ],
    video: null,
    acao: { href: "/perfil/link", rotulo: "Abrir meu link" },
  },
  {
    id: "assistente",
    titulo: "Assistente no WhatsApp",
    resumo: "Marque e consulte a agenda conversando, por texto ou áudio.",
    plano: "premium",
    passos: [
      "Abra Perfil → Assistente no WhatsApp → Conectar meu WhatsApp e mande a mensagem com o código.",
      "Depois é só conversar: \"quem eu atendo amanhã?\", \"marca a Duda sexta às 10h\", \"bloqueia sábado de manhã\".",
      "Pode mandar áudio também. Antes de mudar qualquer coisa, ela mostra e você toca em Confirmar.",
    ],
    video: null,
    acao: { href: "/perfil/assistente", rotulo: "Conectar a assistente" },
  },
  {
    id: "stories",
    titulo: "Stories com seus horários livres",
    resumo: "Divulgue as vagas no Instagram em segundos.",
    plano: "premium",
    passos: [
      "Na aba Stories, em Montar story, escolha o tipo: horários do dia, da semana, um horário que vagou ou um serviço com foto e valor.",
      "Escolha o tema e toque em Baixar imagem para usar o modelo pronto.",
      "Quer um acabamento mais profissional? Toque em Gerar com IA: ela usa tudo o que você escolheu. Cada imagem gasta 1 crédito, e são 30 por mês.",
      "Em Criar do zero com IA, você descreve a imagem que quer, como numa conversa.",
      "Poste no Instagram. Os nomes dos clientes nunca aparecem.",
    ],
    video: null,
    acao: { href: "/stories", rotulo: "Criar um story" },
  },
  {
    id: "relatorios",
    titulo: "Relatório do mês",
    resumo: "Quanto entrou, faltas e horários que vagaram.",
    plano: "premium",
    passos: [
      "Toque em Relatório, na barra de baixo (no computador, na coluna da esquerda).",
      "Veja o total do mês, os serviços que mais saem, as faltas e as desmarcações.",
      "Os horários que vagaram aparecem também na tela Hoje, com atalho para divulgar.",
    ],
    video: null,
    acao: { href: "/relatorios", rotulo: "Ver relatório" },
  },
  {
    id: "assinatura",
    titulo: "Planos e assinatura",
    resumo: "Continuar depois do teste grátis.",
    passos: [
      "Abra Perfil → Assinatura.",
      "Escolha o plano e pague por Pix ou cartão. Sem fidelidade: dá para cancelar quando quiser.",
      "Se o teste acabar antes, nada se perde: clientes, serviços e horários ficam guardados.",
      "Os avisos de vencimento chegam por e-mail, com o botão para pagar.",
    ],
    video: null,
    acao: { href: "/assinatura", rotulo: "Ver planos" },
  },
];

/** Link do YouTube → endereço para embutir na página (null se não for YouTube). */
export function videoEmbutido(url: string): string | null {
  const id = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/)?.[1];
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
