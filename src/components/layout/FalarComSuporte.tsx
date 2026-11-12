import { LightbulbIcon, MessageCircleIcon, MessageSquareWarningIcon } from "lucide-react";
import { NOME_APP, SUPORTE_WHATSAPP } from "@/lib/constantes";
import { linkWhatsApp } from "@/lib/telefone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BotaoSugestao } from "@/features/sugestoes/components/BotaoSugestao";

type Props = { nome: string; email: string | null };

const OPCAO =
  "cartao-vivo flex items-center gap-2 rounded-xl border bg-background px-3 py-3 text-left text-sm font-medium hover:bg-muted/50";
const ICONE = "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary";

/**
 * Dúvida e reclamação abrem o WhatsApp oficial da Vaguinha (a IA atende e chama o Diego se precisar).
 * Sugestão é escrita ali mesmo e cai em Admin > Sugestões, com o nome de quem mandou.
 */
export function FalarComSuporte({ nome, email }: Props) {
  const quem = `${nome}${email ? ` (${email})` : ""}`;
  const opcoes = [
    { Icone: MessageCircleIcon, titulo: "Tirar uma dúvida", texto: `Olá! Sou ${quem}, uso o ${NOME_APP} e tenho uma dúvida: ` },
    { Icone: MessageSquareWarningIcon, titulo: "Fazer uma reclamação", texto: `Olá! Sou ${quem} e quero relatar um problema no ${NOME_APP}: ` },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Falar com o suporte</CardTitle>
        <CardDescription>Dúvidas ou algo que não funcionou: fale com a gente pelo WhatsApp. Ideias: mande por aqui mesmo.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        {opcoes.map(({ Icone, titulo, texto }) => (
          <a key={titulo} href={linkWhatsApp(SUPORTE_WHATSAPP, texto)} target="_blank" rel="noopener noreferrer" className={OPCAO}>
            <span className={ICONE}>
              <Icone className="size-4" />
            </span>
            {titulo}
          </a>
        ))}
        <BotaoSugestao className={OPCAO}>
          <span className={ICONE}>
            <LightbulbIcon className="size-4" />
          </span>
          Sugestões de melhorias
        </BotaoSugestao>
      </CardContent>
    </Card>
  );
}
