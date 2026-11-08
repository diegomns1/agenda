import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_CONTATO, OPERADOR, VERSAO_TERMOS } from "@/lib/legal";
import { formatarDataISO } from "@/lib/datas";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PaginaPrivacidade() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p className="lead">
        Versão de {formatarDataISO(VERSAO_TERMOS)}. Aqui explicamos, em linguagem simples, quais dados o Vaguinha guarda, para
        quê, e quais são os seus direitos. Esta política faz parte dos <Link href="/termos">Termos de Uso</Link>.
      </p>

      <h2>1. Quem cuida dos dados</h2>
      <p>
        O Vaguinha é operado por {OPERADOR}, no Brasil. Para assuntos de privacidade, fale com a gente em{" "}
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

      <h2>4. O que não fazemos</h2>
      <ul>
        <li>Não vendemos nem alugamos dados a ninguém.</li>
        <li>Não enviamos mensagens às clientes: o WhatsApp abre no seu aparelho e quem envia é você.</li>
        <li>Não usamos os dados dos seus clientes para contatá-los nem para treinar sistemas.</li>
        <li>Não usamos cookies de publicidade. Os cookies do Vaguinha servem só para manter você conectada.</li>
      </ul>

      <h2>5. Onde os dados ficam e quem nos ajuda</h2>
      <p>Usamos provedores de tecnologia que guardam ou processam dados em nosso nome, com contratos de confidencialidade:</p>
      <ul>
        <li>
          <strong>Supabase</strong> (banco de dados, login e arquivos), com servidores na região de São Paulo, Brasil.
        </li>
        <li>
          <strong>Vercel</strong> (hospedagem do painel), com processamento na região de São Paulo e rede de entrega global.
        </li>
        <li>
          <strong>Serviço de e-mail</strong> para avisos da conta (confirmação de cadastro, aprovação, vencimento).
        </li>
        <li>
          Os serviços de notificação do seu navegador (Google, Apple ou Mozilla) recebem apenas o texto curto do aviso.
        </li>
      </ul>
      <p>Alguns desses provedores podem transferir dados para fora do Brasil, sempre com as garantias previstas na LGPD.</p>

      <h2>6. Por quanto tempo guardamos</h2>
      <ul>
        <li>Enquanto a conta existir. Ao pedir a exclusão, apagamos tudo em até 30 dias.</li>
        <li>Registros de pagamento e de aceite podem ser mantidos pelo prazo exigido por lei.</li>
        <li>Fotos usadas nos stories não são salvas: valem só para gerar a imagem.</li>
      </ul>

      <h2>7. Segurança</h2>
      <p>
        Todo o tráfego é criptografado (HTTPS). Cada profissional só enxerga os próprios dados, com regras aplicadas direto no
        banco de dados. Senhas são guardadas de forma criptografada e nunca ficam visíveis para nós. Mesmo assim, nenhum sistema
        é 100% seguro: se houver um incidente que afete seus dados, avisaremos você e a autoridade competente conforme a lei.
      </p>

      <h2>8. Seus direitos</h2>
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

      <h2>9. Mudanças nesta política</h2>
      <p>
        Se mudarmos algo relevante, avisaremos por e-mail ou dentro do painel. A data no topo indica a versão em vigor.
      </p>
    </>
  );
}
