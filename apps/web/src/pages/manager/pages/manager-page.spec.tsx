import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ManagerPage } from './manager-page';

describe('ManagerPage', () => {
  it('should link to the tables screen from the hub', () => {
    render(
      <MemoryRouter>
        <ManagerPage />
      </MemoryRouter>,
    );

    const card = screen.getByRole('link', { name: /Gerenciar mesas/ });
    expect(card).toHaveAttribute('href', '/manager/tables');
  });
});
