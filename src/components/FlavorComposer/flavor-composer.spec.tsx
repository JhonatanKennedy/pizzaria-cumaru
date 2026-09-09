import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TMenuItem } from '@api/catalog.api';
import type { TFlavorPart } from '@api/orders.api';
import { FlavorComposer } from './index';

const MUSSARELA_G: TMenuItem = {
  id: 'catalog-pizza-base',
  name: 'Mussarela G',
  description: 'Mussarela',
  price: 40,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
  ingredientIds: [],
};

const CALABRESA_G: TMenuItem = {
  id: 'catalog-pizza-calabresa',
  name: 'Calabresa G',
  description: 'Mussarela e calabresa',
  price: 45,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
  ingredientIds: [],
};

const CHOCOLATE_G: TMenuItem = {
  id: 'catalog-pizza-chocolate',
  name: 'Chocolate G',
  description: 'Chocolate',
  price: 52,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
  ingredientIds: [],
};

const PORTUGUESA_G_UNAVAILABLE: TMenuItem = {
  id: 'catalog-pizza-portuguesa',
  name: 'Portuguesa G',
  description: 'Portuguesa',
  price: 46,
  category: 'PIZZA',
  requiresPreparation: true,
  available: false,
  ingredientIds: [],
};

const CHOCOLATE_M: TMenuItem = {
  ...CHOCOLATE_G,
  id: 'catalog-pizza-chocolate-m',
  name: 'Chocolate M',
  price: 38,
};

const LEGACY_CALABRESA: TMenuItem = {
  ...CALABRESA_G,
  id: 'catalog-pizza-legacy',
  name: 'Calabresa',
};

const AGUA: TMenuItem = {
  id: 'catalog-drink-1',
  name: 'Água',
  description: 'Água mineral',
  price: 8,
  category: 'DRINK',
  requiresPreparation: false,
  available: true,
  ingredientIds: [],
};

const ITEMS: TMenuItem[] = [
  MUSSARELA_G,
  CALABRESA_G,
  CHOCOLATE_G,
  PORTUGUESA_G_UNAVAILABLE,
  CHOCOLATE_M,
  LEGACY_CALABRESA,
  AGUA,
];

const { onChangeMock } = vi.hoisted(() => ({ onChangeMock: vi.fn() }));

function renderComposer(
  onChange: (parts: TFlavorPart[]) => void = onChangeMock,
): ReturnType<typeof userEvent.setup> {
  render(
    <FlavorComposer base={MUSSARELA_G} items={ITEMS} onChange={onChange} />,
  );
  return userEvent.setup();
}

describe('FlavorComposer', () => {
  beforeEach(() => {
    onChangeMock.mockClear();
  });

  it('should offer only available same-size pizzas, never the base', () => {
    renderComposer();

    expect(
      screen.getByRole('button', { name: 'Calabresa' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Chocolate' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Portuguesa' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Chocolate M' }),
    ).not.toBeInTheDocument();
    // Only the sized Calabresa G is offered — the token-less legacy entry
    // shares its rendered name and would appear as a second button.
    expect(screen.getAllByRole('button', { name: 'Calabresa' })).toHaveLength(
      1,
    );
    expect(
      screen.queryByRole('button', { name: 'Água' }),
    ).not.toBeInTheDocument();
  });

  it('should keep the whole canvas with the base while nothing is split', () => {
    renderComposer();

    expect(
      screen.getByText(/Mussarela \(base\) fica com 8 fatias/),
    ).toBeInTheDocument();
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('should give one fatia to a picked flavor and keep the rest with the base', async () => {
    const user = renderComposer();

    await user.click(screen.getByRole('button', { name: 'Chocolate' }));

    expect(screen.getByText(/Chocolate — 1 fatia/)).toBeInTheDocument();
    expect(
      screen.getByText(/Mussarela \(base\) fica com 7 fatias/),
    ).toBeInTheDocument();
    expect(onChangeMock).toHaveBeenLastCalledWith([
      { name: 'Mussarela G', pieces: 7 },
      { name: 'Chocolate G', pieces: 1 },
    ]);
  });

  it('should move fatias between flavors with the steppers', async () => {
    const user = renderComposer();

    await user.click(screen.getByRole('button', { name: 'Chocolate' }));
    await user.click(
      screen.getByRole('button', { name: 'Aumentar Chocolate G' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Aumentar Chocolate G' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Aumentar Chocolate G' }),
    );

    expect(screen.getByText(/Chocolate — 4 fatias/)).toBeInTheDocument();
    expect(
      screen.getByText(/Mussarela \(base\) fica com 4 fatias/),
    ).toBeInTheDocument();
    expect(onChangeMock).toHaveBeenLastCalledWith([
      { name: 'Mussarela G', pieces: 4 },
      { name: 'Chocolate G', pieces: 4 },
    ]);
  });

  it('should disable further flavor picks once the canvas is fully given', async () => {
    const user = renderComposer();

    await user.click(screen.getByRole('button', { name: 'Chocolate' }));
    for (let i = 0; i < 7; i += 1) {
      await user.click(
        screen.getByRole('button', { name: 'Aumentar Chocolate G' }),
      );
    }

    expect(screen.getByRole('button', { name: 'Calabresa' })).toBeDisabled();
    expect(onChangeMock).toHaveBeenLastCalledWith([
      { name: 'Chocolate G', pieces: 8 },
    ]);
  });

  it('should remove a flavor when its last fatia is taken back', async () => {
    const user = renderComposer();

    await user.click(screen.getByRole('button', { name: 'Chocolate' }));
    await user.click(
      screen.getByRole('button', { name: 'Diminuir Chocolate G' }),
    );

    expect(screen.queryByText(/Chocolate — 1 fatia/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Mussarela \(base\) fica com 8 fatias/),
    ).toBeInTheDocument();
    expect(onChangeMock).toHaveBeenLastCalledWith([]);
  });

  it('should emit parts that cover the canvas while the base keeps the remainder', async () => {
    // The canonical split (backend scenario): 2 of 8 fatias given to a
    // flavor still sum to the canvas — the base keeps the other 6, so no
    // composition is ever partial and nothing blocks the submit.
    const user = renderComposer();

    await user.click(screen.getByRole('button', { name: 'Chocolate' }));
    await user.click(
      screen.getByRole('button', { name: 'Aumentar Chocolate G' }),
    );

    expect(onChangeMock).toHaveBeenLastCalledWith([
      { name: 'Mussarela G', pieces: 6 },
      { name: 'Chocolate G', pieces: 2 },
    ]);
  });
});
