import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_CONTATO, OPERADOR, VERSAO_TERMOS } from "@/lib/legal";
import { PLANOS } from "@/lib/planos";
import { formatarDataISO } from "@/lib/datas";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function PaginaTermos() {
  const planosPagos = Object.values(PLANOS).filter((p) => p.preco > 0);

  return (
    <>
      <h1>Termos de Uso</h1>
      <p className="lead">
        Versão de {formatarDataISO(VERSAO_TERMOS)}. Ao criar uma conta no Vaguinha você concorda com estes termos e com a{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>1. O que é o Vaguinha</h2>
      <p>
        O Vaguinha é uma agenda online para profissionais autônomas (manicures, designers de sobrancelha, cabeleireiras e
        outras), operada por {OPERADOR} (&quot;nós&quot;). Com ele, a profissional organiza seus horários, cadastra clientes e
        serviços, recebe lembretes, divulga horários livres e pode oferecer um link para a própria cliente pedir um horário.
      </p>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais e informar dados verdadeiros no cadastro.</li>
        <li>A conta é pessoal. Mantenha sua senha em sigilo: o que for feito com a sua conta é de sua responsabilidade.</li>
        <li>Contas novas passam por uma aprovação antes de liberar o acesso. Podemos recusar ou suspender contas que violem estes termos.</li>
      </ul>

      <h2>3. Planos, preços e pagamento</h2>
      <p>
        Ao ser aprovada, a conta ganha um teste gratuito de 3 dias com os recursos do plano Essencial. Depois, o Vaguinha é
        oferecido por assinatura mensal nos planos abaixo (valores podem mudar com aviso prévio de pelo menos 30 dias):
      </p>
      <ul>
        {planosPagos.map((p) => (
          <li key={p.nome}>
            <strong>{p.nome}</strong>: R$ {p.preco.toFixed(2).replace(".", ",")} por mês.
          </li>
        ))}
      </ul>
      <p>
        O acesso vale até a data de validade da assinatura. Sem renovação, a conta fica em espera (os dados ficam guardados) e
        volta a funcionar quando o pagamento é regularizado. Você pode cancelar a qualquer momento; não há fidelidade nem multa.
      </p>

      <h2>4. Uso correto</h2>
      <p>Você se compromete a não usar o Vaguinha para:</p>
      <ul>
        <li>enviar mensagens em massa ou não solicitadas (spam) às clientes;</li>
        <li>cadastrar dados de pessoas sem que elas saibam ou sem base legal para isso;</li>
        <li>tentar acessar dados de outras profissionais ou burlar a segurança do sistema;</li>
        <li>publicar conteúdo ofensivo, ilegal ou que viole direitos de terceiros (por exemplo, fotos sem autorização).</li>
      </ul>

      <h2>5. Dados das suas clientes</h2>
      <p>
        As informações de clientes (nome, WhatsApp, observações, histórico) são suas e você é a responsável por elas perante a
        Lei Geral de Proteção de Dados (LGPD). O Vaguinha apenas guarda e processa esses dados em seu nome, seguindo suas
        instruções, e não os usa para outras finalidades. Veja detalhes na <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>6. Lembretes, notificações e WhatsApp</h2>
      <p>
        Os lembretes para a profissional chegam por notificação no celular, e dependem de o aparelho e o navegador permitirem.
        As mensagens para as clientes são abertas no seu WhatsApp já prontas, mas quem envia é você. O Vaguinha não tem
        ligação com o WhatsApp nem envia mensagens automaticamente em seu nome.
      </p>

      <h2>7. Disponibilidade e responsabilidade</h2>
      <p>
        Trabalhamos para manter o serviço no ar o tempo todo, mas podem acontecer interrupções para manutenção ou por falhas
        fora do nosso controle (internet, provedores). Não nos responsabilizamos por atendimentos perdidos, horários marcados
        em duplicidade por erro de digitação ou por prejuízos indiretos. Recomendamos conferir a agenda com frequência.
      </p>

      <h2>8. Encerramento da conta</h2>
      <p>
        Você pode pedir a exclusão da sua conta a qualquer momento pelo e-mail <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
        Os dados são apagados em até 30 dias, exceto o que precisarmos manter por obrigação legal. Contas sem uso e sem
        assinatura por mais de 12 meses podem ser removidas após aviso por e-mail.
      </p>

      <h2>9. Mudanças nestes termos</h2>
      <p>
        Podemos atualizar estes termos. Mudanças relevantes serão avisadas por e-mail ou dentro do painel com pelo menos 15
        dias de antecedência. Continuar usando o Vaguinha após esse prazo significa que você concorda com a nova versão.
      </p>

      <h2>10. Contato</h2>
      <p>
        Dúvidas sobre estes termos: <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>. Estes termos seguem as leis do
        Brasil.
      </p>
    </>
  );
}
