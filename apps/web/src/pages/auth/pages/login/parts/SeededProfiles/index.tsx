import { getRoleLabel } from '@pages/auth/business/role';
import { Card } from '@components/Card';

const SEEDED_PROFILES = [
  { login: 'ana.gerente', role: 'Manager' },
  { login: 'joao.garcom', role: 'Waiter' },
  { login: 'carlos.cozinha', role: 'Cook' },
] as const;

export function SeededProfiles(): React.ReactNode {
  return (
    <Card className="mt-4 text-sm text-stone-600">
      <h2 className="font-semibold text-stone-800">Perfis de teste</h2>
      <ul className="mt-2 space-y-1">
        {SEEDED_PROFILES.map((profile) => (
          <li key={profile.login}>
            <span className="font-mono">{profile.login}</span> —{' '}
            {getRoleLabel(profile.role)}
          </li>
        ))}
      </ul>
    </Card>
  );
}
