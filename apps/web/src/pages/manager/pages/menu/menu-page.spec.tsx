import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { TIngredientListing, TMenuListing } from '@api/catalog.api';
import { MenuPage } from './menu-page';

const { catalogMock } = vi.hoisted(() => ({ catalogMock: vi.fn() }));

vi.mock('../../hooks/use-catalog', () => ({
  useCatalog: catalogMock,
}));

const ITEMS: TMenuListing = [
  {
    id: 'item-calabresa',
    name: 'Calabresa',
    description: 'Mussarela e calabresa',
    price: 45,
    category: 'PIZZA',
    requiresPreparation: true,
    available: true,
    ingredientIds: [],
  },
];

const INGREDIENTS: TIngredientListing = [
  { id: 'ingredient-1', name: 'Mussarela', available: true },
];

function loadedCatalog(): void {
  catalogMock.mockReturnValue({
    menuQuery: { data: ITEMS, isPending: false, error: null },
    ingredientsQuery: { data: INGREDIENTS, isPending: false, error: null },
  });
}

function pendingCatalog(): void {
  catalogMock.mockReturnValue({
    menuQuery: { data: undefined, isPending: true, error: null },
    ingredientsQuery: { data: undefined, isPending: true, error: null },
  });
}

function renderPage(): ReturnType<typeof userEvent.setup> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MenuPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe('MenuPage', () => {
  it('should open the item tab first, with the create action for items', () => {
    loadedCatalog();
    renderPage();

    expect(screen.getByRole('tab', { name: 'Itens' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Novo item' }),
    ).toBeInTheDocument();
  });

  it('should retarget the create action to the tab in front of the manager', async () => {
    loadedCatalog();
    const user = renderPage();

    await user.click(screen.getByRole('tab', { name: 'Ingredientes' }));

    expect(
      screen.getByRole('button', { name: 'Novo ingrediente' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Novo item' }),
    ).not.toBeInTheDocument();
  });

  it('should open the item form from the Itens tab', async () => {
    loadedCatalog();
    const user = renderPage();

    await user.click(screen.getByRole('button', { name: 'Novo item' }));

    expect(
      screen.getByRole('dialog', { name: 'Novo item' }),
    ).toBeInTheDocument();
  });

  it('should open the ingredient form from the Ingredientes tab', async () => {
    loadedCatalog();
    const user = renderPage();

    await user.click(screen.getByRole('tab', { name: 'Ingredientes' }));
    await user.click(screen.getByRole('button', { name: 'Novo ingrediente' }));

    expect(
      screen.getByRole('dialog', { name: 'Novo ingrediente' }),
    ).toBeInTheDocument();
  });

  it('should not carry a dialog over to the tab it was not opened from', async () => {
    loadedCatalog();
    const user = renderPage();

    await user.click(screen.getByRole('button', { name: 'Novo item' }));
    await user.click(screen.getByRole('tab', { name: 'Ingredientes' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should hold the create action until the catalog has landed', () => {
    pendingCatalog();
    renderPage();

    // The item form pre-checks ingredients, so a dialog opened over a catalog
    // it never saw would offer an empty list.
    expect(screen.getByRole('button', { name: 'Novo item' })).toBeDisabled();
  });
});
