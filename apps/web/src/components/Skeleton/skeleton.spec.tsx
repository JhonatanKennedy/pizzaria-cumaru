import { render } from '@testing-library/react';
import { Skeleton } from './index';

describe('Skeleton', () => {
  it('should hide the block from assistive tech', () => {
    const { container } = render(<Skeleton className="h-32" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('should take its size from the caller', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);

    expect(container.firstElementChild).toHaveClass('h-4', 'w-32');
  });

  it('should hold still when the user asks for reduced motion', () => {
    const { container } = render(<Skeleton />);

    expect(container.firstElementChild).toHaveClass(
      'motion-reduce:animate-none',
    );
  });
});
