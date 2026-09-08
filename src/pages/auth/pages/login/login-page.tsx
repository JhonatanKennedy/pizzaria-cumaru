import { Card } from '@components/Card';
import { DevLogin } from './parts/DevLogin';
import { LoginForm } from './parts/LoginForm';
import { SeededProfiles } from './parts/SeededProfiles';

export function LoginPage(): React.ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-red-700">
          🍕 Pizzaria Cumaru
        </h1>
        <Card>
          <LoginForm />
        </Card>
        <SeededProfiles />
        <DevLogin />
      </div>
    </div>
  );
}
