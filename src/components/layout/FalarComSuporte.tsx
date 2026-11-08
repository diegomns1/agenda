import { LightbulbIcon, MessageCircleIcon, MessageSquareWarningIcon } from "lucide-react";
import { NOME_APP, SUPORTE_WHATSAPP } from "@/lib/constantes";
import { linkWhatsApp } from "@/lib/telefone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { nome: string; email: string | null };

/** Atalhos para o WhatsApp do suporte: dúvida, sugestão e reclamação, com a mensagem já começada. */
export function FalarComSuporte({ nome, email }: Props) {
  const quem = `${nome}${email ? ` (${email})` : ""}`;
  const opcoes = [
    { Icone: MessageCircleIcon, titulo: "Tirar uma dúvida", texto: `Olá! Sou ${quem}, uso o ${NOME_APP} e tenho uma dúvida: ` },
    { Icone: LightbulbIcon, titulo: "Sugerir uma melhoria", texto: `Olá! Sou ${quem} e tenho uma sugestão para o ${NOME_APP}: ` },
    { Icone: MessageSquareWarningIcon, titulo: "Fazer uma reclamação", texto: `Olá! Sou ${quem} e quero relatar um problema no ${NOME_APP}: ` },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Falar com o suporte</CardTitle>
        <CardDescription>Dúvidas, ideias ou algo que não funcionou: fale direto com a gente pelo WhatsApp.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        {opcoes.map(({ Icone, titulo, texto }) => (
          <a
            key={titulo}
            href={linkWhatsApp(SUPORTE_WHATSAPP, texto)}
            target="_blank"
            rel="noopener noreferrer"
            className="cartao-vivo flex items-center gap-2 rounded-xl border bg-background px-3 py-3 text-sm font-medium hover:bg-muted/50"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icone className="size-4" />
            </span>
            {titulo}
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
