import { DIAS_TESTE, PLANOS, formatarPreco } from "@/lib/planos";
import { URL_APP } from "@/lib/constantes";

/*
 * BASE DE CONHECIMENTO do WhatsApp oficial da Vaguinha (vendas e suporte).
 * A IA só pode afirmar o que está aqui. O que não estiver, ela diz que vai chamar a equipe.
 * Os preços vêm de planos.ts (sempre certos). O resto é texto: o Diego revisa e pede para ajustar.
 * Rascunho de 11/11/2026, montado a partir do site e do painel.
 */

const preco = (p: keyof typeof PLANOS) => formatarPreco(PLANOS[p].preco);
// com utm: o Painel do dono mostra quantos cadastros vieram da conversa com a IA no WhatsApp
export const LINK_CADASTRO = `${URL_APP.replace(/^https?:\/\//, "")}/cadastro?utm_source=whatsapp&utm_medium=ia`;
export const LINK_SITE = "vaguinha.app";

export const CONHECIMENTO = `
# O que é o Vaguinha
Agenda no celular para profissionais autônomos de beleza e saúde (manicure, nail designer, cabeleireira, barbeiro,
lash, sobrancelha, estética, depilação, maquiagem, podologia, massoterapia, personal, nutrição, psicologia e outros).
Abre no navegador do celular e pode ser adicionado à tela de início como app (Android e iPhone), sem loja de aplicativos.
Site: ${LINK_SITE}

# O que faz
- Agenda por dia, semana e mês, com feriados; impede dois clientes no mesmo horário.
- Cadastro de clientes com WhatsApp, observações e histórico (o que já foi feito, alergias etc.).
- Serviços com duração e valor.
- Importa a agenda do Google Agenda (arquivo exportado).
- Link de agendamento (vaguinha.app/p/seu-nome): o cliente escolhe serviço e horário livre, sem baixar nada nem criar conta.
- Lembretes: notificação no celular 1 dia e 1 hora antes, que abre o WhatsApp do cliente com a mensagem pronta
  (a profissional toca em enviar; o Vaguinha não manda mensagem sozinho para os clientes dela).
- Modelos de mensagem do WhatsApp (lembrete, confirmação, remarcação, cancelamento, agradecimento) com endereço e valor.
- Stories para o Instagram com os horários livres (dia, semana, horário que vagou, serviço com foto e valor), 16 temas.
- Relatório do mês: quanto entrou, faltas, desmarcações e remarcações.
- Assistente de IA no WhatsApp (Premium): a profissional conversa com a Vaguinha por este mesmo número para ver a agenda,
  marcar, remarcar, cancelar, bloquear horários e cadastrar clientes; nada muda sem ela tocar em Confirmar.
  Também funciona dentro do painel, por escrito ou por voz.

# Planos (mensais, sem fidelidade, Pix ou cartão de crédito)
- Teste grátis: ${DIAS_TESTE} dias, não pede cartão. Tem os recursos do Essencial.
- Essencial: ${preco("essencial")}. Agenda, clientes, serviços, importar do Google, app no celular com logo e cores.
- Profissional: ${preco("profissional")}. Tudo do Essencial + link de agendamento + lembretes 1 dia e 1 hora antes
  + WhatsApp com a mensagem pronta + lista de quem falta avisar.
- Premium: ${preco("premium")}. Tudo do Profissional + assistente de IA no WhatsApp + stories + relatório do mês.
- Se cancelar, os dados continuam guardados.

# Como começar
1. Criar a conta em ${LINK_CADASTRO} (nome, ramo, WhatsApp, e-mail e senha).
2. Entrar: a conta é liberada na hora, sem esperar ninguém (se chegar um e-mail pedindo confirmação, tocar no link),
   e os ${DIAS_TESTE} dias de teste contam a partir daí.
3. Cadastrar serviços, valores e horários; subir a logo; divulgar o link.

# Segurança e privacidade
Cada profissional só enxerga a própria agenda. Não vendemos dados e não entramos em contato com os clientes da profissional.
Empresa: DIG STUDIO CRIATIVO LTDA (CNPJ 64.540.250/0001-05), Ourinhos/SP.

# Suporte para quem já usa
- Esqueceu a senha: na tela de login, "Esqueci minha senha".
- Conta ainda não liberada: sair e entrar de novo no painel (se pediu confirmação de e-mail, procurar também no spam).
  Se mesmo assim aparecer "Falta pouco para liberar sua conta", ou a conta foi recusada/suspensa, chamar a equipe.
- Instalar como app: no iPhone, Safari → Compartilhar → Adicionar à Tela de Início; no Android, aceitar o aviso de instalar.
- Lembretes não chegam: precisa ter o app adicionado à tela de início e permitir notificações.
- Link de agendamento: aparece em Perfil (planos Profissional e Premium); dá para ligar e desligar o agendamento online.
- Conectar a assistente no WhatsApp (Premium): no painel, Perfil → "Assistente no WhatsApp" → Conectar meu WhatsApp.
- Pagamento, troca de plano, cancelamento, reembolso, erro no sistema: chamar a equipe.
- Pedido para apagar os dados ou a conversa ("quero apagar meus dados"): chamar a equipe com o motivo
  "pedido de exclusão de dados" e dizer que será feito em até 15 dias (instruções: ${LINK_SITE}/exclusao-de-dados).

# O que NÃO prometer
- Não existe desconto, cupom nem plano anual: se pedirem, diga que vai chamar a equipe.
- Não prometa recursos que não estão nesta lista nem prazos de novidades.
- O Vaguinha não manda mensagens automáticas para os clientes da profissional.
- Áudio no WhatsApp ainda não é entendido: peça para escrever.
`.trim();
