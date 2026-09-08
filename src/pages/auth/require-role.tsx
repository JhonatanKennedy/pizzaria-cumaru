import { Navigate } from 'react-router';
import { AccessDenied } from './components/AccessDenied';
import { roleHomePath, type UserRole } from './business/role';
import { useAuth } from './use-auth';

interface RequireRoleProps {
  roles: readonly UserRole[];
  children: React.ReactNode;
}

export function RequireRole({
  roles,
  children,
}: RequireRoleProps): React.ReactNode {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(user.role)) {
    return <AccessDenied homePath={roleHomePath(user.role)} />;
  }
  return children;
}

export function GuestOnly({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }
  return children;
}
