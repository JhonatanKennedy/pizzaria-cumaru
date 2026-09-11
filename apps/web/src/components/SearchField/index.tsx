interface SearchFieldProps {
  id: string;
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
  className?: string;
}

// The label is for the screen reader, not the page: a field whose placeholder
// already says "Buscar item" does not need the word written twice above it.
const CLEAR_LABEL = 'Limpar busca';

function MagnifierIcon(): React.ReactNode {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-500"
    >
      <circle cx="9" cy="9" r="5" />
      <path d="M13 13l4 4" />
    </svg>
  );
}

function CrossIcon(): React.ReactNode {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M6 6l8 8M14 6l-8 8" />
    </svg>
  );
}

export function SearchField({
  id,
  label,
  value,
  onChange,
  placeholder,
  className = '',
}: SearchFieldProps): React.ReactNode {
  const hasQuery = value !== '';

  return (
    <div className={`relative ${className}`.trim()}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <MagnifierIcon />
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="field-input pr-10 pl-9"
      />
      {/* The field carries its own clear control rather than the one the
          browser draws for `type="search"`, which has no accessible name and no
          palette of its own. */}
      {hasQuery && (
        <button
          type="button"
          aria-label={CLEAR_LABEL}
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-stone-500 hover:text-red-700"
        >
          <CrossIcon />
        </button>
      )}
    </div>
  );
}
