import type { Metadata } from "next";
import Link from "next/link";
import { ATUALIZACAO_PRIVACIDADE, EMAIL_CONTATO, EMPRESA, OPERADOR } from "@/lib/legal";
import { formatarDataISO } from "@/lib/datas";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PaginaPrivacidade() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p className="lead">
        Atualizada em {formatarDataISO(ATUALIZACAO_PRIVACIDADE)}. Aqui explicamos, em linguagem simples, quais dados o Vaguinha guarda, para
        quê, e quais são os seus direitos. Esta política faz parte dos <Link href="/termos">Termos de Uso</Link>.
      </p>

      <h2>1. Quem cuida dos dados</h2>
      <p>
        O Vaguinha é operado por {OPERADOR}, com sede em {EMPRESA.endereco}. Para assuntos de privacidade, fale com a gente em{" "}
        <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
      </p>

      <h2>2. Dados da profissional (quem tem a conta)</h2>
      <table>
        <thead>
          <tr>
            <th>O que guardamos</th>
            <th>Para quê</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nome, e-mail, senha (criptografada) e WhatsApp</td>
            <td>Criar e proteger sua conta, falar com você sobre o serviço</td>
          </tr>
          <tr>
            <td>Nome do negócio, logo, cores, Instagram, horários de atendimento, serviços e valores</td>
            <td>Montar sua agenda, seu link de agendamento e seus stories</td>
          </tr>
          <tr>
            <td>Plano, validade e situação da conta</td>
            <td>Controlar o acesso e a assinatura</td>
          </tr>
          <tr>
            <td>Inscrição de notificações do celular/navegador</td>
            <td>Enviar os lembretes de atendimento que você ativou</td>
          </tr>
          <tr>
            <td>De onde você veio (anúncio ou link, com os parâmetros utm), se aceitou os cookies de medição, IP e navegador do cadastro</td>
            <td>
              Saber quais anúncios trazem profissionais e, se você aceitou, avisar a Meta do cadastro, da liberação e da assinatura
              e o Google do cadastro
            </td>
          </tr>
          <tr>
            <td>Data e versão do aceite destes termos</td>
            <td>Cumprir a lei e comprovar o aceite</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Dados dos clientes da profissional</h2>
      <p>
        A profissional cadastra nome, WhatsApp, observações e histórico de atendimentos dos seus clientes. Esses dados
        pertencem à profissional, que é a controladora deles. O Vaguinha atua como operador: guarda e processa essas
        informações só para a agenda funcionar, e nunca as usa para publicidade, venda ou qualquer outra finalidade.
      </p>
      <p>
        Quando um cliente pede um horário pelo link público da profissional, informa nome, WhatsApp e, se quiser, uma
        observação. Esses dados vão direto para a agenda daquela profissional. O Vaguinha não cria conta nem perfil do cliente.
      </p>
      <p>
        <strong>Se você é cliente de uma profissional</strong> e quer corrigir ou apagar seus dados, fale diretamente com ela. Se
        preferir, escreva para <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a> que encaminhamos o pedido.
      </p>

      <h2>4. Conversas no WhatsApp oficial do Vaguinha</h2>
      <p>
        Quando alguém escreve para o WhatsApp oficial do Vaguinha, (14) 99802-3550, guardamos o número, o nome do perfil do
        WhatsApp, as mensagens da conversa, o que a pessoa contar (por exemplo, nome e ramo de trabalho) e, se ela veio de um
        anúncio, qual foi o anúncio. Usamos isso para responder, tirar dúvidas, ajudar no uso do Vaguinha e acompanhar o
        atendimento.
      </p>
      <p>
        As respostas são escritas por uma <strong>assistente virtual (inteligência artificial)</strong>, e a nossa equipe pode ler
        a conversa para continuar o atendimento quando for preciso. Se você for profissional do plano Premium e conectar o seu
        WhatsApp, a assistente também lê e propõe mudanças na sua agenda, mas só altera algo depois do seu Confirmar.
      </p>

      <h2>5. O que não fazemos</h2>
      <ul>
        <li>Não vendemos nem alugamos dados a ninguém.</li>
        <li>Não enviamos mensagens às clientes: o WhatsApp abre no seu aparelho e quem envia é você.</li>
        <li>Não usamos os dados dos seus clientes para contatá-los nem para treinar sistemas.</li>
        <li>
          Não usamos cookies de publicidade sem a sua escolha. No site e nas telas de cadastro aparece um aviso: se você tocar em
          “Aceitar”, ligamos o Pixel da Meta e a tag do Google para medir de onde vêm as visitas e melhorar nossos anúncios; em
          “Só os necessários”, ficam só os cookies que mantêm você conectada e lembram a sua escolha. Dentro do painel não há
          pixel nem tag de anúncios.
        </li>
      </ul>

      <h2>6. Onde os dados ficam e quem nos ajuda</h2>
      <p>Usamos provedores de tecnologia que guardam ou processam dados em nosso nome, com contratos de confidencialidade:</p>
      <ul>
        <li>
          <strong>Supabase</strong> (banco de dados, login e arquivos), com servidores na região de São Paulo, Brasil.
        </li>
        <li>
          <strong>Hostinger</strong> (servidor onde o painel e o site funcionam).
        </li>
        <li>
          <strong>Meta (WhatsApp Business Platform)</strong>, para enviar e receber as mensagens do WhatsApp oficial do Vaguinha.
          E, só se você aceitou os cookies de medição, o <strong>Pixel da Meta e a API de Conversões</strong>: avisamos a Meta
          quando há cadastro, aprovação ou assinatura, mandando e-mail e telefone embaralhados (hash), para medir os anúncios.
        </li>
        <li>
          <strong>Google (Google Ads)</strong>, só se você aceitou os cookies de medição: a tag do Google mede as visitas ao site
          e avisa quando um cadastro é feito, para medir os anúncios no Google. Não mandamos seu e-mail nem seu telefone.
        </li>
        <li>
          <strong>Anthropic (Claude)</strong>, a inteligência artificial que escreve as respostas da assistente. Pelos termos
          comerciais da Anthropic, esses dados não são usados para treinar os modelos dela.
        </li>
        <li>
          <strong>Asaas</strong>, para as cobranças da assinatura por Pix e cartão.
        </li>
        <li>
          <strong>Serviço de e-mail</strong> para avisos da conta (confirmação de cadastro, aprovação, vencimento).
        </li>
        <li>
          Os serviços de notificação do seu navegador (Google, Apple ou Mozilla) recebem apenas o texto curto do aviso.
        </li>
      </ul>
      <p>Alguns desses provedores podem transferir dados para fora do Brasil, sempre com as garantias previstas na LGPD.</p>

      <h2>7. Por quanto tempo guardamos</h2>
      <ul>
        <li>Enquanto a conta existir. Ao pedir a exclusão, apagamos tudo em até 30 dias.</li>
        <li>Registros de pagamento e de aceite podem ser mantidos pelo prazo exigido por lei.</li>
        <li>Fotos usadas nos stories não são salvas: valem só para gerar a imagem.</li>
        <li>Conversas no WhatsApp oficial do Vaguinha: cada mensagem fica guardada por até 1 ano, ou menos, se você pedir para apagar.</li>
      </ul>

      <h2>8. Segurança</h2>
      <p>
        Todo o tráfego é criptografado (HTTPS). Cada profissional só enxerga os próprios dados, com regras aplicadas direto no
        banco de dados. Senhas são guardadas de forma criptografada e nunca ficam visíveis para nós. Mesmo assim, nenhum sistema
        é 100% seguro: se houver um incidente que afete seus dados, avisaremos você e a autoridade competente conforme a lei.
      </p>

      <h2>9. Seus direitos</h2>
      <p>Pela LGPD você pode, a qualquer momento:</p>
      <ul>
        <li>confirmar se tratamos seus dados e acessá-los;</li>
        <li>corrigir dados incompletos ou desatualizados (a maior parte você mesma edita no Perfil);</li>
        <li>pedir a exclusão da conta e dos dados;</li>
        <li>pedir uma cópia dos seus dados em formato legível;</li>
        <li>revogar consentimentos, como o das notificações (basta desativar em Lembretes).</li>
      </ul>
      <p>
        Para exercer esses direitos, escreva para <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>. Respondemos em até 15
        dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>10. Mudanças nesta política</h2>
      <p>
        Se mudarmos algo relevante, avisaremos por e-mail ou dentro do painel. A data no topo indica a versão em vigor.
      </p>
    </>
  );
}
