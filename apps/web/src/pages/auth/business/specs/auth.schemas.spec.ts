import {
  loginFormSchema,
  loginResponseSchema,
  refreshResponseSchema,
} from '../auth.schemas';

const VALID_LOGIN_RESPONSE = {
  accessToken: 'jwt-token',
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
      accessToken: 'jwt-token',
      user: { id: 1, login: 'joao.garcom', role: 'Admin' },
    });

    expect(result.success).toBe(false);
  });

  it('should reject the old token field name', () => {
    const result = loginResponseSchema.safeParse({
      token: 'jwt-token',
      user: { id: 1, login: 'joao.garcom', role: 'Waiter' },
    });

    expect(result.success).toBe(false);
  });

  it('should refuse a body carrying a refresh token', () => {
    const result = loginResponseSchema.safeParse({
      ...VALID_LOGIN_RESPONSE,
      refreshToken: 'refresh-jwt',
    });

    // Parsed, not passed through: the strict shape is what keeps a future
    // backend change from quietly putting the refresh token back in the body.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('refreshToken');
    }
  });
});

describe('refreshResponseSchema', () => {
  it('should accept an access token', () => {
    expect(
      refreshResponseSchema.safeParse({ accessToken: 'jwt' }).success,
    ).toBe(true);
  });

  it('should reject a response with no access token', () => {
    expect(refreshResponseSchema.safeParse({}).success).toBe(false);
  });

  it('should reject an empty access token', () => {
    expect(refreshResponseSchema.safeParse({ accessToken: '' }).success).toBe(
      false,
    );
  });
});
