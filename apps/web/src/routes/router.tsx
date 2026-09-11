import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import {
  KITCHEN_PANEL_ROLES,
  MANAGER_ROLES,
  WAITER_PANEL_ROLES,
} from '@pages/auth/business/role';
import { LoginPage } from '@pages/auth/pages/login/login-page';
import { GuestOnly, RequireRole } from '@pages/auth/require-role';
import { KitchenPage } from '@pages/kitchen/pages/kitchen-page';
import { DailyEarningsPage } from '@pages/manager/pages/daily-earnings/daily-earnings-page';
import { DeliveryDetailPage } from '@pages/manager/pages/delivery/delivery-detail-page';
import { DeliveryPage } from '@pages/manager/pages/delivery/delivery-page';
import { ManagerPage } from '@pages/manager/pages/manager-page';
import { MenuPage } from '@pages/manager/pages/menu/menu-page';
import { TablesPage as ManagerTablesPage } from '@pages/manager/pages/tables/tables-page';
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
      // One guard for the whole manager area, and no chrome of its own: the
      // rail lives in AppLayout, where it follows a manager onto the waiter's
      // and the cook's screens too. A guard still wants to be a route rather
      // than six copies of itself, and Outlet is all it has to render.
      {
        element: (
          <RequireRole roles={MANAGER_ROLES}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { path: '/manager', element: <ManagerPage /> },
          { path: '/manager/menu', element: <MenuPage /> },
          { path: '/manager/delivery', element: <DeliveryPage /> },
          {
            path: '/manager/delivery/:orderId',
            element: <DeliveryDetailPage />,
          },
          { path: '/manager/tables', element: <ManagerTablesPage /> },
          { path: '/reports/daily-earnings', element: <DailyEarningsPage /> },
        ],
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
