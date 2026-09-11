import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chip } from './index';

describe('Chip', () => {
  it('should render its label as a button', () => {
    render(<Chip>Pizzas</Chip>);

    expect(screen.getByRole('button', { name: 'Pizzas' })).toBeInTheDocument();
  });

  it('should say whether it is the selected one', () => {
    render(
      <>
        <Chip selected>Pizzas</Chip>
        <Chip>Pratos</Chip>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Pizzas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Pratos' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('should call back with the click', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Chip onClick={onClick}>Bebidas</Chip>);

    await user.click(screen.getByRole('button', { name: 'Bebidas' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  // A chip is never inside a form's submit path — a filter that submitted the
  // form around it would reload the screen instead of narrowing the list.
  it('should not submit the form around it', () => {
    render(
      <form>
        <Chip>Todas</Chip>
      </form>,
    );

    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('should keep a caller class alongside its own', () => {
    render(<Chip className="px-4">Todas</Chip>);

    expect(screen.getByRole('button', { name: 'Todas' })).toHaveClass('px-4');
  });
});
