import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_CONTATO } from "@/lib/legal";

export const metadata: Metadata = { title: "Exclusão de dados" };

/** Instruções de exclusão de dados (pedida pela Meta para o app do WhatsApp oficial). */
export default function PaginaExclusaoDeDados() {
  return (
    <>
      <h1>Como pedir a exclusão dos seus dados</h1>
      <p className="lead">
        Você pode pedir, a qualquer momento, que o Vaguinha apague os seus dados. Veja abaixo como fazer em cada caso. Mais detalhes
        na <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>Conversas no WhatsApp oficial do Vaguinha</h2>
      <p>
        Se você conversou com o WhatsApp oficial do Vaguinha, (14) 99802-3550, e quer que a conversa e o seu número sejam apagados,
        mande nesse mesmo WhatsApp a mensagem <strong>“quero apagar meus dados”</strong>, ou escreva para{" "}
        <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a> informando o número. Apagamos em até 15 dias e confirmamos por onde você
        pediu.
      </p>

      <h2>Conta de profissional no Vaguinha</h2>
      <p>
        Escreva para <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a> a partir do e-mail da conta, pedindo a exclusão. Apagamos a
        conta, a agenda, os clientes cadastrados e as conversas em até 30 dias. Registros de pagamento podem ser mantidos pelo prazo
        exigido por lei.
      </p>

      <h2>Cliente de uma profissional</h2>
      <p>
        Os seus dados (nome, WhatsApp e atendimentos) pertencem à profissional que te atende: peça a ela para apagar. Se preferir,
        escreva para <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a> que encaminhamos o pedido.
      </p>
    </>
  );
}
