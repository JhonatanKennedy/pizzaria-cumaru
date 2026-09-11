import { render, screen } from '@testing-library/react';
import { LoadingRegion } from './index';

describe('LoadingRegion', () => {
  it('should announce the wait exactly once, whatever it wraps', () => {
    render(
      <LoadingRegion>
        <div aria-hidden="true" />
        <div aria-hidden="true" />
        <div aria-hidden="true" />
      </LoadingRegion>,
    );

    expect(screen.getAllByText('Carregando…')).toHaveLength(1);
  });

  it('should expose the region as a status', () => {
    render(<LoadingRegion>{null}</LoadingRegion>);

    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
  });

  it('should take its layout from the caller', () => {
    render(
      <LoadingRegion className="grid gap-6 md:grid-cols-2">
        {null}
      </LoadingRegion>,
    );

    expect(screen.getByRole('status')).toHaveClass('grid', 'md:grid-cols-2');
  });
});
