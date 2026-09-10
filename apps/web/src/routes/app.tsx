import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { configureApiClient } from '../api/http-client';
import { readToken } from '@pages/auth/business/auth-storage';
import { handleUnauthorized } from '@pages/auth/business/handle-unauthorized';
import { AuthProvider } from '@pages/auth/auth.context';
import { queryClient } from './query-client';
import { router } from './router';

configureApiClient({ getToken: readToken, onUnauthorized: handleUnauthorized });

export function App(): React.ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
