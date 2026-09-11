import { Card } from '@components/Card';
import { DevLogin } from './parts/DevLogin';
import { LoginForm } from './parts/LoginForm';
import { SeededProfiles } from './parts/SeededProfiles';

export function LoginPage(): React.ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 flex justify-center">
          <img
            src="/logo.png"
            alt="Pizzaria Cumaru"
            width={211}
            height={96}
            className="h-24 w-auto"
          />
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
