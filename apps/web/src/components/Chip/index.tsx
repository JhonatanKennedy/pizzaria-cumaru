interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  selected?: boolean;
}

// A chip is a toggle — it narrows what a list shows — and it is a different
// control from `Button`, which is a command. They share no ARIA state, so they
// share no component: this one carries `aria-pressed` and the pill styling, and
// nothing else in the app hand-rolls that pair any more.
function chipClass(selected: boolean): string {
  return selected
    ? 'rounded-full bg-red-700 px-3 py-1 text-sm font-medium text-white'
    : 'rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-700 hover:bg-stone-300';
}

export function Chip({
  children,
  className = '',
  selected = false,
  type = 'button',
  ...rest
}: ChipProps): React.ReactNode {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`${chipClass(selected)} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
