import { Link, Outlet, useNavigate } from 'react-router';
import { getRoleLabel, roleHomePath } from '@pages/auth/business/role';
import { Button } from '@components/Button';
import { useAuth } from '@pages/auth/use-auth';

export function AppLayout(): React.ReactNode {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  // There is no nav menu: the waiter and the cook each have a single screen,
  // and the manager's wayfinding lives on the hub (07_manager_profile.feature).
  // The brand mark is the way home from anywhere else — not a menu, the
  // ordinary web convention for "this app's front door".
  return (
    <div className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5 md:py-3">
          <Link
            to={user ? roleHomePath(user.role) : '/login'}
            aria-label="Ir para o painel"
            className="shrink-0 rounded focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:outline-none"
          >
            <img
              src="/logo-wordmark.png"
              alt="Pizzaria Cumaru"
              width={104}
              height={36}
              className="h-8 w-auto md:h-9"
            />
          </Link>
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            {user && (
              <>
                <span className="hidden truncate text-sm text-stone-600 sm:inline">
                  {user.login}
                </span>
                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-stone-700">
                  {getRoleLabel(user.role)}
                </span>
                <Button
                  variant="secondary"
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm"
                >
                  Sair
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
