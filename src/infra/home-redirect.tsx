import { Navigate } from 'react-router';
import { roleHomePath } from '../pages/auth/business/role';
import { useAuth } from '../pages/auth/use-auth';

export function HomeRedirect(): React.ReactNode {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={roleHomePath(user.role)} replace />;
}
