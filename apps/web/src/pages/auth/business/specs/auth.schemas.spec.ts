import { loginFormSchema, loginResponseSchema } from '../auth.schemas';

const VALID_LOGIN_RESPONSE = {
  token: 'jwt-token',
  user: { id: 1, login: 'joao.garcom', role: 'Waiter' },
};

describe('loginFormSchema', () => {
  it('should accept a login and password', () => {
    const result = loginFormSchema.safeParse({
      login: 'joao.garcom',
      password: 'SenhaSegura123',
    });

    expect(result.success).toBe(true);
  });

  it('should trim the login', () => {
    const result = loginFormSchema.safeParse({
      login: '  joao.garcom  ',
      password: 'SenhaSegura123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.login).toBe('joao.garcom');
    }
  });

  it('should reject an empty login and password', () => {
    const result = loginFormSchema.safeParse({ login: ' ', password: '' });

    expect(result.success).toBe(false);
  });
});

describe('loginResponseSchema', () => {
  it('should accept the backend login response', () => {
    expect(loginResponseSchema.safeParse(VALID_LOGIN_RESPONSE).success).toBe(
      true,
    );
  });

  it('should reject a response with an unknown role', () => {
    const result = loginResponseSchema.safeParse({
      token: 'jwt-token',
      user: { id: 1, login: 'joao.garcom', role: 'Admin' },
    });

    expect(result.success).toBe(false);
  });
});
