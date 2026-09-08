export const USER_ROLES = ['Waiter', 'Cook', 'Manager'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const WAITER_PANEL_ROLES = [
  'Waiter',
  'Manager',
] as const satisfies readonly UserRole[];
export const KITCHEN_PANEL_ROLES = [
  'Cook',
  'Manager',
] as const satisfies readonly UserRole[];
export const MANAGER_ROLES = ['Manager'] as const satisfies readonly UserRole[];

const ROLE_HOME_PATHS: Record<UserRole, string> = {
  Waiter: '/waiter',
  Cook: '/kitchen',
  Manager: '/manager',
};

const ROLE_LABELS: Record<UserRole, string> = {
  Waiter: 'Garçom',
  Cook: 'Cozinheiro',
  Manager: 'Gerente',
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    (USER_ROLES as readonly string[]).includes(value)
  );
}

export function roleHomePath(role: UserRole): string {
  return ROLE_HOME_PATHS[role];
}
