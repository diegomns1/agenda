/** Ícone do WhatsApp (balão com telefone), desenhado no mesmo traço dos ícones lucide para não destoar. */
export function IconeWhatsApp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className ?? "size-4"}
    >
      <path d="M3.5 20.5 4.8 16A8.5 8.5 0 1 1 8 19.2Z" />
      <path d="M9 8.6c0-.5.4-.9.9-.9h.4c.3 0 .6.2.7.5l.6 1.4c.1.3 0 .6-.2.8l-.6.6a6 6 0 0 0 2.6 2.6l.6-.6c.2-.2.5-.3.8-.2l1.4.6c.3.1.5.4.5.7v.4c0 .5-.4.9-.9.9A6.4 6.4 0 0 1 9 8.6Z" />
    </svg>
  );
}
