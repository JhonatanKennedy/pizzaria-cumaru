import { createBrowserRouter } from 'react-router';
import {
  KITCHEN_PANEL_ROLES,
  MANAGER_ROLES,
  WAITER_PANEL_ROLES,
} from '../pages/auth/business/role';
import { LoginPage } from '../pages/auth/pages/login/login-page';
import { WaiterPage } from '../pages/waiter/pages/waiter-page';
import { TablesPage } from '../pages/waiter/pages/tables-page';
import { DeliveryPage } from '../pages/waiter/pages/delivery-page';
import { KitchenPage } from '../pages/kitchen/pages/kitchen-page';
import { ManagerPage } from '../pages/manager/pages/manager-page';
import { DailyEarningsPage } from '../pages/manager/pages/daily-earnings-page';
import { MenuPage } from '../pages/manager/pages/menu-page';
import { NotFoundPage } from './not-found-page';
import { HomeRedirect } from './home-redirect';
import { AppLayout } from './layout/AppLayout';
import { GuestOnly, RequireRole } from '../pages/auth/require-role';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        path: '/waiter',
        element: (
          <RequireRole roles={WAITER_PANEL_ROLES}>
            <WaiterPage />
          </RequireRole>
        ),
      },
      {
        path: '/waiter/tables',
        element: (
          <RequireRole roles={WAITER_PANEL_ROLES}>
            <TablesPage />
          </RequireRole>
        ),
      },
      {
        path: '/waiter/delivery',
        element: (
          <RequireRole roles={WAITER_PANEL_ROLES}>
            <DeliveryPage />
          </RequireRole>
        ),
      },
      {
        path: '/kitchen',
        element: (
          <RequireRole roles={KITCHEN_PANEL_ROLES}>
            <KitchenPage />
          </RequireRole>
        ),
      },
      {
        path: '/manager',
        element: (
          <RequireRole roles={MANAGER_ROLES}>
            <ManagerPage />
          </RequireRole>
        ),
      },
      {
        path: '/manager/menu',
        element: (
          <RequireRole roles={MANAGER_ROLES}>
            <MenuPage />
          </RequireRole>
        ),
      },
      {
        path: '/reports/daily-earnings',
        element: (
          <RequireRole roles={MANAGER_ROLES}>
            <DailyEarningsPage />
          </RequireRole>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/login',
    element: (
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    ),
  },
]);
