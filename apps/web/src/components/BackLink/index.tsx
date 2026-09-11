import { Link } from 'react-router';

interface BackLinkProps {
  to: string;
  label: string;
}

export function BackLink({ to, label }: BackLinkProps): React.ReactNode {
  // The way out of every drill-in screen, so it is sized to a thumb on touch
  // devices and given a real hover ground — a bare arrow glyph reads as stray
  // text rather than as the control it is. The -ml-2 cancels the px-2 so the
  // label hangs on the same left edge as the heading below it while the hover
  // ground still extends past the text.
  //
  // The destination alone does not say the link goes backwards, so the
  // accessible name carries the "Voltar para" the sighted reading gets from the
  // arrow. It is an aria-label rather than a hidden span because the accessible
  // name algorithm trims each text node before joining them, which would fuse
  // the prefix onto the label as "Voltar paraPainel do gerente".
  return (
    <Link
      to={to}
      aria-label={`Voltar para ${label}`}
      className="group -ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200/70 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:outline-none md:min-h-9"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
      >
        <path d="M10 3.5 5.5 8l4.5 4.5" />
      </svg>
      {label}
    </Link>
  );
}
