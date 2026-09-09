import { createBrowserRouter, Navigate } from 'react-router';
import {
  KITCHEN_PANEL_ROLES,
  MANAGER_ROLES,
  WAITER_PANEL_ROLES,
} from '@pages/auth/business/role';
import { LoginPage } from '@pages/auth/pages/login/login-page';
import { GuestOnly, RequireRole } from '@pages/auth/require-role';
import { KitchenPage } from '@pages/kitchen/pages/kitchen-page';
import { DailyEarningsPage } from '@pages/manager/pages/daily-earnings/daily-earnings-page';
import { DeliveryPage } from '@pages/manager/pages/delivery-page';
import { ManagerPage } from '@pages/manager/pages/manager-page';
import { MenuPage } from '@pages/manager/pages/menu/menu-page';
import { TablesPage } from '@pages/waiter/pages/tables';
import { HomeRedirect } from './home-redirect';
import { OrderDetailRoute } from './order-detail-route';
import { AppLayout } from './layout/AppLayout';
import { NotFoundPage } from './not-found-page';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: '/waiter', element: <Navigate to="/waiter/tables" replace /> },
      {
        path: '/waiter/tables',
        element: (
          <RequireRole roles={WAITER_PANEL_ROLES}>
            <TablesPage />
          </RequireRole>
        ),
      },
      {
        path: '/waiter/orders/:orderId',
        element: (
          <RequireRole roles={WAITER_PANEL_ROLES}>
            <OrderDetailRoute />
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
        path: '/manager/delivery',
        element: (
          <RequireRole roles={MANAGER_ROLES}>
            <DeliveryPage />
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
