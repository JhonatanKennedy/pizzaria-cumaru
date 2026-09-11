interface LoadingRegionProps {
  children: React.ReactNode;
  className?: string;
}

// The announcement half of a skeleton screen: a Skeleton says nothing to a
// screen reader, so a region carries one text node for the whole set of blocks.
// `role="status"` is already a polite live region, so no aria-live is needed.
export function LoadingRegion({
  children,
  className = '',
}: LoadingRegionProps): React.ReactNode {
  return (
    <div role="status" className={className || undefined}>
      <span className="sr-only">Carregando…</span>
      {children}
    </div>
  );
}
