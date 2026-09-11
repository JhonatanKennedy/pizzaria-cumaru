import { render, screen } from '@testing-library/react';
import { SeededProfiles } from './index';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('SeededProfiles', () => {
  it('should list the seeded logins with their roles in development', () => {
    render(<SeededProfiles />);

    expect(
      screen.getByRole('heading', { name: 'Perfis de teste' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ana.gerente')).toBeInTheDocument();
    expect(screen.getByText('joao.garcom')).toBeInTheDocument();
    expect(screen.getByText('carlos.cozinha')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('should render nothing in a production build', () => {
    vi.stubEnv('DEV', false);

    render(<SeededProfiles />);

    // These logins exist in a local database and nowhere else, so naming them
    // in production would be a list of accounts the deployment does not have.
    expect(
      screen.queryByRole('heading', { name: 'Perfis de teste' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('ana.gerente')).not.toBeInTheDocument();
  });
});
