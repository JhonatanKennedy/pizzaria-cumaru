import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  KITCHEN_PANEL_ROLES,
  MANAGER_ROLES,
  WAITER_PANEL_ROLES,
  getRoleLabel,
  type UserRole,
} from '@pages/auth/business/role';
import { Button } from '@components/Button';
import { useAuth } from '@pages/auth/use-auth';

interface NavLinkItem {
  label: string;
  to: string;
  roles: readonly UserRole[];
}

const NAV_LINKS: readonly NavLinkItem[] = [
  { label: 'Painel do Garçom', to: '/waiter', roles: WAITER_PANEL_ROLES },
  { label: 'Painel da Cozinha', to: '/kitchen', roles: KITCHEN_PANEL_ROLES },
  { label: 'Painel do Gerente', to: '/manager', roles: MANAGER_ROLES },
  {
    label: 'Relatório de Ganhos Diários',
    to: '/reports/daily-earnings',
    roles: MANAGER_ROLES,
  },
];

export function AppLayout(): React.ReactNode {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  const visibleLinks = NAV_LINKS.filter((link) =>
    user ? link.roles.includes(user.role) : false,
  );

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <span className="text-lg font-bold text-red-700">
            🍕 Pizzaria Cumaru
          </span>
          {visibleLinks.length > 0 && (
            <nav className="flex gap-4" aria-label="Principal">
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    isActive
                      ? 'font-semibold text-red-700'
                      : 'text-stone-600 hover:text-stone-900'
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <>
                <span className="text-sm text-stone-600">{user.login}</span>
                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
                  {getRoleLabel(user.role)}
                </span>
                <Button onClick={handleLogout} className="px-3 py-1 text-sm">
                  Sair
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
