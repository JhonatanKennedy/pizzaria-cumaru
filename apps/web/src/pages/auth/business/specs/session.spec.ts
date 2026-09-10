import { configureApiClient, apiRequest } from '@api/http-client';
import {
  clearAccessToken,
  readAccessToken,
  refreshAccessToken,
  writeAccessToken,
} from '../session';

const { refreshSessionMock } = vi.hoisted(() => ({
  refreshSessionMock: vi.fn(),
}));

// Mocked at the context's api boundary: what this spec is about is how many
// times the session module asks the backend to refresh, so that ask is what
// has to be observable.
vi.mock('../../api/auth.api', () => ({
  refreshSession: refreshSessionMock,
}));

const CURRENT_TOKEN = 'the-current-token';
const REFRESHED_TOKEN = 'the-refreshed-token';
const OK = 200;
const UNAUTHORIZED = 401;

function jsonResponse(status: number, body: unknown = null): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (body === null ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

beforeEach(() => {
  clearAccessToken();
  refreshSessionMock.mockReset();
  refreshSessionMock.mockResolvedValue({ accessToken: REFRESHED_TOKEN });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the in-memory access token', () => {
  it('should start with no token', () => {
    expect(readAccessToken()).toBeNull();
  });

  it('should read back the token that was written', () => {
    writeAccessToken(CURRENT_TOKEN);

    expect(readAccessToken()).toBe(CURRENT_TOKEN);
  });

  it('should forget the token once cleared', () => {
    writeAccessToken(CURRENT_TOKEN);
    clearAccessToken();

    expect(readAccessToken()).toBeNull();
  });
});

describe('refreshAccessToken', () => {
  it('should store and return the refreshed token', async () => {
    await expect(refreshAccessToken()).resolves.toBe(REFRESHED_TOKEN);

    expect(readAccessToken()).toBe(REFRESHED_TOKEN);
  });

  it('should report failure without storing a token', async () => {
    refreshSessionMock.mockRejectedValue(new Error('Session expired'));

    await expect(refreshAccessToken()).resolves.toBeNull();

    expect(readAccessToken()).toBeNull();
  });

  it('should run concurrent callers through one refresh', async () => {
    const tokens = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    // Rotation refuses the token a refresh replaced, so a second parallel
    // refresh would present an already-spent cookie, get a 401, and look
    // exactly like an ended session.
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(tokens).toEqual([REFRESHED_TOKEN, REFRESHED_TOKEN, REFRESHED_TOKEN]);
  });

  it('should refresh again once the previous one has settled', async () => {
    await refreshAccessToken();
    await refreshAccessToken();

    expect(refreshSessionMock).toHaveBeenCalledTimes(2);
  });

  it('should refresh again after a failure', async () => {
    refreshSessionMock.mockRejectedValueOnce(new Error('Session expired'));

    await expect(refreshAccessToken()).resolves.toBeNull();
    await expect(refreshAccessToken()).resolves.toBe(REFRESHED_TOKEN);
  });
});

describe('apiRequest with the session module wired in', () => {
  it('should refresh once for several concurrent 401s and keep the session', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const authorization = (init.headers as Headers).get('Authorization');
      return authorization === `Bearer ${REFRESHED_TOKEN}`
        ? jsonResponse(OK, { ok: true })
        : jsonResponse(UNAUTHORIZED, { message: 'Token expired' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const onSessionEnded = vi.fn();
    configureApiClient({
      getAccessToken: readAccessToken,
      refreshAccessToken,
      onSessionEnded,
    });
    writeAccessToken(CURRENT_TOKEN);

    const results = await Promise.all([
      apiRequest('/orders'),
      apiRequest('/items'),
      apiRequest('/tables'),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(onSessionEnded).not.toHaveBeenCalled();
  });
});
