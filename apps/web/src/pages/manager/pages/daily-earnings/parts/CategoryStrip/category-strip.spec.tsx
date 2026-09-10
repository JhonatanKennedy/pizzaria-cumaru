import { render, screen } from '@testing-library/react';
import type { TCategoryQuantity } from '@pages/manager/business/filter-sales';
import { CategoryStrip } from './index';

const QUANTITIES: TCategoryQuantity[] = [
  { category: 'PIZZA', quantity: 3 },
  { category: 'DISH', quantity: 0 },
  { category: 'DRINK', quantity: 2 },
  { category: 'DESSERT', quantity: 0 },
  { category: 'SIDE', quantity: 0 },
];

describe('CategoryStrip', () => {
  it('should show the sold quantities of the non-empty categories', () => {
    render(<CategoryStrip quantities={QUANTITIES} />);

    expect(
      screen.getByRole('heading', {
        name: 'Quantidades vendidas por categoria',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pizzas · 3')).toBeInTheDocument();
    expect(screen.getByText('Bebidas · 2')).toBeInTheDocument();
    expect(screen.queryByText('Pratos · 0')).not.toBeInTheDocument();
    expect(screen.queryByText('Sobremesas · 0')).not.toBeInTheDocument();
  });

  it('should render nothing when nothing was sold', () => {
    const { container } = render(
      <CategoryStrip
        quantities={[
          { category: 'PIZZA', quantity: 0 },
          { category: 'DISH', quantity: 0 },
          { category: 'DRINK', quantity: 0 },
          { category: 'DESSERT', quantity: 0 },
          { category: 'SIDE', quantity: 0 },
        ]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
