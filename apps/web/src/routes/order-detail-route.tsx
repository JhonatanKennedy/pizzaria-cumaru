import { useAuth } from '@pages/auth/use-auth';
import { OrderDetailPage } from '@pages/waiter/pages/order-detail';

// Waiter and manager share the order detail screen; only the manager may
// close the order. Contexts never import the auth context, so the decision
// is made here, in the assembly layer that already reads the session.
export function OrderDetailRoute(): React.ReactNode {
  const { user } = useAuth();
  return <OrderDetailPage canCloseOrder={user?.role === 'Manager'} />;
}
