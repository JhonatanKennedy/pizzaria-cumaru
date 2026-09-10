import { getRoleLabel, isUserRole, roleHomePath } from '../role';

describe('role helpers', () => {
  it('should accept the three known roles', () => {
    expect(isUserRole('Waiter')).toBe(true);
    expect(isUserRole('Cook')).toBe(true);
    expect(isUserRole('Manager')).toBe(true);
  });

  it('should reject unknown role values', () => {
    expect(isUserRole('Admin')).toBe(false);
    expect(isUserRole(42)).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });

  it('should map each role to its home screen', () => {
    expect(roleHomePath('Manager')).toBe('/manager');
    expect(roleHomePath('Waiter')).toBe('/waiter');
    expect(roleHomePath('Cook')).toBe('/kitchen');
  });

  it('should map each role to its Portuguese display label', () => {
    expect(getRoleLabel('Manager')).toBe('Gerente');
    expect(getRoleLabel('Waiter')).toBe('Garçom');
    expect(getRoleLabel('Cook')).toBe('Cozinheiro');
  });
});
