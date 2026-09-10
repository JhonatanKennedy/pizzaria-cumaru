import { useNavigate } from 'react-router';
import {
  getRoleLabel,
  roleHomePath,
  type UserRole,
} from '@pages/auth/business/role';
import { useAuth } from '@pages/auth/use-auth';
import { Button } from '@components/Button';
import { Card } from '@components/Card';

const DEV_ROLES = [
  'Manager',
  'Waiter',
  'Cook',
] as const satisfies readonly UserRole[];

export function DevLogin(): React.ReactNode | null {
  const { loginAsDev } = useAuth();
  const navigate = useNavigate();

  if (!import.meta.env.DEV) {
    return null;
  }

  const handleDevLogin = (role: UserRole): void => {
    loginAsDev(role);
    navigate(roleHomePath(role));
  };

  return (
    <Card className="mt-4 border-dashed text-sm text-stone-600">
      <h2 className="font-semibold text-stone-800">
        Acesso de desenvolvimento
      </h2>
      <p className="mt-1">Entra sem chamar o backend.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {DEV_ROLES.map((role) => (
          <Button
            key={role}
            onClick={() => handleDevLogin(role)}
            className="px-3 py-1 text-sm"
          >
            Entrar como {getRoleLabel(role)}
          </Button>
        ))}
      </div>
    </Card>
  );
}
