interface SkeletonProps {
  className?: string;
}

// A stand-in for content that is still loading. It is decorative on purpose —
// the shape says "something is coming here", so it is hidden from assistive
// tech and the caller's screen announces the wait once via LoadingRegion.
export function Skeleton({ className = '' }: SkeletonProps): React.ReactNode {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-stone-200 motion-reduce:animate-none ${className}`.trim()}
    />
  );
}
