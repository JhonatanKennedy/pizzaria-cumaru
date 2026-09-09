import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  NO_SALES_FILTERS,
  type TDaySalesFilters,
} from '@pages/manager/business/filter-sales';
import { SalesFilters } from './index';

function renderFilters(
  filters: TDaySalesFilters = NO_SALES_FILTERS,
  onChange: () => void = vi.fn(),
): ReturnType<typeof userEvent.setup> {
  render(
    <SalesFilters
      filters={filters}
      onTypeChange={onChange}
      onPaymentChange={onChange}
      onCategoryChange={onChange}
    />,
  );
  return userEvent.setup();
}

describe('SalesFilters', () => {
  it('should render the three filter groups with their options and the all option', () => {
    renderFilters();

    const typeGroup = screen.getByRole('group', { name: 'Tipo de venda' });
    expect(
      within(typeGroup).getByRole('button', { name: 'Todos' }),
    ).toBeInTheDocument();
    expect(
      within(typeGroup).getByRole('button', { name: 'Local' }),
    ).toBeInTheDocument();
    expect(
      within(typeGroup).getByRole('button', { name: 'Entrega' }),
    ).toBeInTheDocument();

    const paymentGroup = screen.getByRole('group', {
      name: 'Forma de pagamento',
    });
    expect(
      within(paymentGroup).getByRole('button', { name: 'Dinheiro' }),
    ).toBeInTheDocument();
    expect(
      within(paymentGroup).getByRole('button', { name: 'Cartão' }),
    ).toBeInTheDocument();
    expect(
      within(paymentGroup).getByRole('button', { name: 'Pix' }),
    ).toBeInTheDocument();

    const categoryGroup = screen.getByRole('group', { name: 'Categoria' });
    expect(
      within(categoryGroup).getByRole('button', { name: 'Pizzas' }),
    ).toBeInTheDocument();
    expect(
      within(categoryGroup).getByRole('button', { name: 'Bebidas' }),
    ).toBeInTheDocument();
  });

  it('should report the option chosen in each group', async () => {
    const onTypeChange = vi.fn();
    const onPaymentChange = vi.fn();
    const onCategoryChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SalesFilters
        filters={NO_SALES_FILTERS}
        onTypeChange={onTypeChange}
        onPaymentChange={onPaymentChange}
        onCategoryChange={onCategoryChange}
      />,
    );

    const typeGroup = screen.getByRole('group', { name: 'Tipo de venda' });
    await user.click(
      within(typeGroup).getByRole('button', { name: 'Entrega' }),
    );

    const paymentGroup = screen.getByRole('group', {
      name: 'Forma de pagamento',
    });
    await user.click(within(paymentGroup).getByRole('button', { name: 'Pix' }));

    const categoryGroup = screen.getByRole('group', { name: 'Categoria' });
    await user.click(
      within(categoryGroup).getByRole('button', { name: 'Bebidas' }),
    );

    expect(onTypeChange).toHaveBeenCalledWith('Delivery');
    expect(onPaymentChange).toHaveBeenCalledWith('Pix');
    expect(onCategoryChange).toHaveBeenCalledWith('DRINK');
  });

  it('should report the all option as a cleared filter', async () => {
    const onTypeChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SalesFilters
        filters={{ type: 'Delivery', payment: null, category: null }}
        onTypeChange={onTypeChange}
        onPaymentChange={vi.fn()}
        onCategoryChange={vi.fn()}
      />,
    );

    const typeGroup = screen.getByRole('group', { name: 'Tipo de venda' });
    await user.click(within(typeGroup).getByRole('button', { name: 'Todos' }));

    expect(onTypeChange).toHaveBeenCalledWith(null);
  });

  it('should mark the active options as pressed', () => {
    renderFilters({ type: 'Local', payment: 'Cash', category: 'PIZZA' });

    const typeGroup = screen.getByRole('group', { name: 'Tipo de venda' });
    expect(
      within(typeGroup).getByRole('button', { name: 'Local' }),
    ).toHaveAttribute('aria-pressed', 'true');

    const paymentGroup = screen.getByRole('group', {
      name: 'Forma de pagamento',
    });
    expect(
      within(paymentGroup).getByRole('button', { name: 'Dinheiro' }),
    ).toHaveAttribute('aria-pressed', 'true');

    const categoryGroup = screen.getByRole('group', { name: 'Categoria' });
    expect(
      within(categoryGroup).getByRole('button', { name: 'Pizzas' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
