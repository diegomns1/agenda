import { DIAS_TESTE, PLANOS, formatarPreco } from "@/lib/planos";
import { URL_APP } from "@/lib/constantes";

/*
 * BASE DE CONHECIMENTO do WhatsApp oficial da Vaguinha (vendas e suporte).
 * A IA só pode afirmar o que está aqui. O que não estiver, ela diz que vai chamar a equipe.
 * Os preços vêm de planos.ts (sempre certos). O resto é texto: o Diego revisa e pede para ajustar.
 * Rascunho de 11/11/2026, montado a partir do site e do painel.
 * Revisado em 15/11/2026: lembrete automático (Premium), stories com IA, editar atendimento, Perfil em botões.
 */

const preco = (p: keyof typeof PLANOS) => formatarPreco(PLANOS[p].preco);
// com utm: o Painel do dono mostra quantos cadastros vieram da conversa com a IA no WhatsApp.
// Sempre com https://: sem ele, em alguns celulares o WhatsApp não deixa tocar no link (12/11/2026).
export const LINK_CADASTRO = `${URL_APP}/cadastro?utm_source=whatsapp&utm_medium=ia`;
export const LINK_SITE = "https://vaguinha.app";

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
- Dá para editar um atendimento já marcado: mudar o dia, o horário e o serviço, ou adicionar mais um serviço.
- Lembretes (plano Profissional): notificação no celular da profissional 1 dia e 1 hora antes, que abre o WhatsApp
  do cliente com a mensagem pronta (a profissional toca em enviar).
- Lembrete automático (só no Premium): a profissional conecta o próprio WhatsApp no painel (tela Lembretes, por código
  ou QR Code) e o lembrete sai sozinho, do número dela, 1 dia antes e 2 horas antes de cada horário, com uma mensagem
  padrão. Sai só entre 7h e 21h. É só um aviso: quem conversa com o cliente continua sendo a profissional.
  Não é uma conexão oficial do WhatsApp: por isso manda poucas mensagens, com intervalo, e só para quem tem horário
  marcado. Existe um risco pequeno de o WhatsApp restringir o número, e a profissional aceita isso ao conectar.
  Dá para desligar quando quiser.
- Modelos de mensagem do WhatsApp (lembrete, confirmação, remarcação, cancelamento, agradecimento) com endereço e valor.
- Stories para o Instagram com os horários livres (dia, semana, horário que vagou, serviço com foto e valor), 16 temas.
  No Premium também dá para gerar o story com IA, com acabamento mais profissional: até 30 imagens por mês.
- Relatório do mês: quanto entrou, faltas, desmarcações e remarcações.
- Assistente de IA no WhatsApp (Premium): a profissional conversa com a assistente por este mesmo número para ver a agenda,
  marcar, remarcar, cancelar, bloquear horários e cadastrar clientes; nada muda sem ela tocar em Confirmar.
  Também funciona dentro do painel, por escrito ou por voz.

# Planos (mensais, sem fidelidade, Pix ou cartão de crédito)
- Teste grátis: ${DIAS_TESTE} dias, não pede cartão. Tem os recursos do Essencial.
- Essencial: ${preco("essencial")}. Agenda, clientes, serviços, importar do Google, app no celular com logo e cores.
- Profissional: ${preco("profissional")}. Tudo do Essencial + link de agendamento + lembretes 1 dia e 1 hora antes
  + WhatsApp com a mensagem pronta + lista de quem falta avisar.
- Premium: ${preco("premium")}. Tudo do Profissional + lembrete automático pelo WhatsApp da profissional
  + assistente de IA no WhatsApp + stories (com a opção de gerar com IA, 30 por mês) + relatório do mês.
- Se cancelar, os dados continuam guardados.
- Quando o teste acaba: nada é cobrado (o teste não pede cartão). A agenda fica pausada até escolher um plano,
  e clientes, serviços e horários continuam guardados. Não existe teste dos planos Profissional e Premium.
- Para assinar: no painel, em Perfil → Assinatura, escolhendo o plano e a forma (Pix ou cartão de crédito). Pede CPF ou CNPJ.
- Quando é cobrado: a primeira mensalidade é gerada na hora em que a pessoa assina, e o plano é liberado assim que o
  pagamento é confirmado (o Pix confirma em instantes). Cada mensalidade paga vale por 1 mês, contado do dia do
  pagamento: não é o mês fechado do calendário. Depois é uma mensalidade por mês, e o aviso chega por e-mail com o
  botão para pagar.
- Só para quem está no teste grátis: o teste não pede cartão e não vira cobrança sozinho; só paga quem escolhe um plano
  e assina, e dá para usar a agenda normalmente até o último dia do teste. Não diga isso para quem já é assinante.
- Quem está no teste grátis e assina antes de ele acabar não perde os dias que faltam: eles são somados ao primeiro mês.
  Isso vale SÓ para quem está no plano Teste (confira o plano no cadastro antes de falar). Não calcule quantos dias são.
- Se a mensalidade não for paga: depois do vencimento a agenda fica em espera até o pagamento. Nada é apagado, e ao
  pagar ela é liberada sozinha.
- Cartão de crédito na renovação: NÃO afirme se o cartão é cobrado sozinho todo mês ou se a pessoa paga pelo botão do
  e-mail. Diga que vai confirmar com a equipe (chame uma vez) e que quem prefere pagar mês a mês pode escolher Pix.
- Para cancelar: em Perfil → Assinatura → "Cancelar assinatura". Nenhuma nova mensalidade é gerada, o acesso continua até
  o fim do período já pago e os dados ficam guardados. Não tem multa, e dá para assinar de novo quando quiser.
- Para trocar de plano ou de forma de pagamento: em Perfil → Assinatura. Dá para subir ou descer de plano quando quiser.
  O valor novo vale a partir da próxima mensalidade.

# Perguntas frequentes (confirmado no sistema, 12/11/2026)
- Internet: precisa de internet para marcar e ver a agenda atualizada (sem sinal, pode mostrar a última versão vista
  ou um aviso de sem conexão; o que já está salvo não se perde).
- Duração dos serviços: cada serviço pode durar de 5 minutos a 10 horas (dá para sessão longa, trança, tatuagem).
  Para o dia todo ou vários dias (férias, evento), dá para marcar um compromisso/bloqueio do dia inteiro.
- Equipe/salão: cada conta é de uma profissional, com a própria agenda. Ainda não tem agenda de equipe com várias
  profissionais na mesma conta (cada uma pode ter a sua conta).
- Não tem: pagamento ou sinal pelo link, controle de caixa, comanda, estoque, nota fiscal, integração com o direct do
  Instagram, versão nas lojas de aplicativos (é pelo navegador e fica na tela de início como app). No Instagram dá para
  colocar o link de agendamento na bio (planos Profissional e Premium).
- Logo, cores e tema do painel: no Perfil.
- Dois clientes no mesmo horário: o sistema não deixa marcar; o horário ocupado aparece recusado.
- Cliente da profissional não precisa baixar nada nem criar conta para marcar pelo link.

# Como começar
1. Criar a conta em ${LINK_CADASTRO} (nome, ramo, WhatsApp, e-mail e senha).
2. Entrar: a conta é liberada na hora, sem esperar ninguém (se chegar um e-mail pedindo confirmação, tocar no link),
   e os ${DIAS_TESTE} dias de teste contam a partir daí.
3. Cadastrar serviços, valores e horários; subir a logo; divulgar o link.

# Segurança e privacidade
Cada profissional só enxerga a própria agenda. Não vendemos dados e a Vaguinha não entra em contato com os clientes
da profissional. No Premium, o lembrete automático sai do WhatsApp da própria profissional, e só se ela ligar.
Empresa: DIG STUDIO CRIATIVO LTDA (CNPJ 64.540.250/0001-05), Ourinhos/SP.

# Suporte para quem já usa
- Esqueceu a senha: na tela de login, "Esqueci minha senha".
- Conta ainda não liberada: sair e entrar de novo no painel (se pediu confirmação de e-mail, procurar também no spam).
  Se mesmo assim aparecer "Falta pouco para liberar sua conta", ou a conta foi recusada/suspensa, chamar a equipe.
- Instalar como app: no iPhone, Safari → Compartilhar → Adicionar à Tela de Início; no Android, aceitar o aviso de instalar.
- Lembretes não chegam: precisa ter o app adicionado à tela de início e permitir notificações.
- Lembrete automático (Premium): no painel, tocar no sininho para abrir Lembretes → cartão "Lembrete pelo seu WhatsApp"
  → Conectar (com código, pelo próprio celular, ou com QR Code, pelo computador) → ligar "Mandar lembretes sozinha".
  Se parar de enviar, conferir nessa mesma tela se o WhatsApp continua conectado. Se não resolver, chamar a equipe.
- Onde ficam as coisas no painel: Perfil reúne Meus dados, Horários, Layout e cores, Serviços, Mensagens do WhatsApp,
  Assinatura e Suporte (com os tutoriais). O Relatório fica na barra de baixo (no computador, na coluna da esquerda).
- Avisos de cobrança: chegam por e-mail, 3 dias antes do vencimento e 1 dia depois, com o botão para pagar.
  A Vaguinha não manda SMS de cobrança.
- Link de agendamento: aparece em Perfil (planos Profissional e Premium); dá para ligar e desligar o agendamento online.
- Conectar a assistente no WhatsApp (Premium): no painel, Perfil → "Assistente no WhatsApp" → Conectar meu WhatsApp.
- Como assinar, quando é cobrado, como cancelar e como trocar de plano: explique com o que está em "Planos".
  Para só explicar isso NÃO precisa chamar a equipe.
- Quando a pessoa diz que QUER cancelar (não só pergunta como funciona): explique onde cancela, que o acesso continua
  até o fim do período pago e que os dados ficam guardados. Pergunte uma vez, sem insistir, o que faltou, e chame a
  equipe uma vez com o motivo "quer cancelar", só para a equipe ficar sabendo.
- Pagou e o plano não liberou: pedir para tocar em "Atualizar pagamentos" na tela Assinatura. Se não resolver, chamar a equipe.
- Chamar a equipe: reembolso, cobrança errada ou em dobro, pedido para liberar o plano novo antes da próxima mensalidade,
  comprovante de pagamento, erro no sistema.
- Pedido para apagar os dados ou a conversa ("quero apagar meus dados"): SEMPRE chamar a equipe com o motivo
  "pedido de exclusão de dados" (não basta mandar o link) e dizer que será feito em até 15 dias
  (instruções: ${LINK_SITE}/exclusao-de-dados).

# O que NÃO prometer
- Não existe desconto, cupom nem plano anual: se pedirem, diga que vai chamar a equipe.
- Não prometa recursos que não estão nesta lista nem prazos de novidades.
- Lembrete automático para os clientes só existe no Premium e sai do WhatsApp da própria profissional, nunca do número
  da Vaguinha. No Essencial e no Profissional nada é enviado sozinho: a profissional toca em enviar.
- Não diga que o lembrete automático é oficial do WhatsApp nem que não tem risco nenhum.
- Vídeo ainda não é visto: peça para escrever ou mandar áudio.

# Áudio e foto (desde 13/11/2026)
- Este WhatsApp ENTENDE áudio: o áudio é transcrito e chega como texto. Foto e PDF também são vistos.
- Nunca diga que não consegue ouvir áudio ou ver foto, mesmo que mensagens antigas da conversa tenham dito isso
  (eram de antes dessa novidade).
`.trim();
