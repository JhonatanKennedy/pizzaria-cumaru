import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ManagerNav } from './index';

function renderNav(path: string): HTMLElement {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ManagerNav />
    </MemoryRouter>,
  );
  return screen.getByRole('navigation', { name: 'Painel do Gerente' });
}

function currentLinkNames(nav: HTMLElement): string[] {
  return within(nav)
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent ?? '');
}

describe('ManagerNav', () => {
  it('should send every destination to its own screen', () => {
    renderNav('/manager');

    const destinations: readonly (readonly [string, string])[] = [
      ['Painel do Gerente', '/manager'],
      ['Painel do Garçom', '/waiter'],
      ['Painel da Cozinha', '/kitchen'],
      ['Cardápio e estoque', '/manager/menu'],
      ['Pedidos de entrega', '/manager/delivery'],
      ['Gerenciar mesas', '/manager/tables'],
      ['Relatório de Ganhos Diários', '/reports/daily-earnings'],
    ];

    expect(screen.getAllByRole('link')).toHaveLength(destinations.length);
    for (const [name, href] of destinations) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('should name the two groups the hub used to carry', () => {
    renderNav('/manager');

    expect(
      screen.getByRole('heading', { name: 'Painéis da equipe' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gestão' })).toBeInTheDocument();
  });

  it('should mark the screen the manager is on and no other', () => {
    const nav = renderNav('/manager/menu');

    expect(currentLinkNames(nav)).toEqual(['Cardápio e estoque']);
  });

  it('should keep the hub current only on the hub itself', () => {
    const nav = renderNav('/manager/menu');

    expect(
      within(nav).getByRole('link', { name: 'Painel do Gerente' }),
    ).not.toHaveAttribute('aria-current');
  });

  it('should keep the delivery list current while an order of it is open', () => {
    const nav = renderNav('/manager/delivery/order-1');

    expect(currentLinkNames(nav)).toEqual(['Pedidos de entrega']);
  });
});
