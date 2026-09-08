import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useAuth } from '@pages/auth/use-auth';
import {
  loginFormSchema,
  type TLoginFormValues,
} from '@pages/auth/business/auth.schemas';
import { roleHomePath } from '@pages/auth/business/role';
import { Button } from '@components/Button';
import { TextField } from '@components/TextField';
import { toErrorMessage } from '@lib/errors';

export function LoginForm(): React.ReactNode {
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TLoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { login: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const user = await login(values.login, values.password);
      navigate(roleHomePath(user.role), { replace: true });
    } catch (error) {
      setError('root', { message: toErrorMessage(error) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {errors.root && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {errors.root.message}
        </p>
      )}
      <TextField
        id="login"
        label="Usuário"
        autoComplete="username"
        error={errors.login?.message}
        {...register('login')}
      />
      <TextField
        id="password"
        label="Senha"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
