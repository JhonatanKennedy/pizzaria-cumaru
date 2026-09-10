import { ApiError, apiRequest, configureApiClient } from './http-client';

const ACCESS_TOKEN = 'the-access-token';
const REFRESHED_TOKEN = 'a-freshly-refreshed-token';
const OK = 200;
const UNAUTHORIZED = 401;

// A stand-in for what `fetch` resolves to: only the four members `apiRequest`
// reads, so a spec never has to build a real `Response`.
function jsonResponse(status: number, body: unknown = null): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (body === null ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

function makeClient(
  overrides: { refreshed?: string | null; token?: string | null } = {},
): {
  fetchMock: ReturnType<typeof vi.fn>;
  refreshAccessToken: ReturnType<typeof vi.fn>;
  onSessionEnded: ReturnType<typeof vi.fn>;
} {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  const refreshAccessToken = vi.fn(async () =>
    overrides.refreshed === undefined ? REFRESHED_TOKEN : overrides.refreshed,
  );
  const onSessionEnded = vi.fn();

  configureApiClient({
    // `'token' in overrides` rather than `??`: an explicit `null` has to mean
    // "no token", not fall back to the default.
    getAccessToken: () =>
      'token' in overrides ? (overrides.token ?? null) : ACCESS_TOKEN,
    refreshAccessToken,
    onSessionEnded,
  });

  return { fetchMock, refreshAccessToken, onSessionEnded };
}

function requestInitOf(
  fetchMock: ReturnType<typeof vi.fn>,
  call = 0,
): RequestInit {
  return fetchMock.mock.calls[call][1] as RequestInit;
}

function headersOf(fetchMock: ReturnType<typeof vi.fn>, call = 0): Headers {
  return requestInitOf(fetchMock, call).headers as Headers;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('should send the access token as a bearer header', async () => {
    const { fetchMock } = makeClient();
    fetchMock.mockResolvedValue(jsonResponse(OK, { orders: [] }));

    await apiRequest('/orders');

    expect(headersOf(fetchMock).get('Authorization')).toBe(
      `Bearer ${ACCESS_TOKEN}`,
    );
  });

  it('should send no bearer header without a token', async () => {
    const { fetchMock } = makeClient({ token: null });
    fetchMock.mockResolvedValue(jsonResponse(OK));

    await apiRequest('/orders');

    expect(headersOf(fetchMock).has('Authorization')).toBe(false);
  });

  it('should refresh once and retry successfully on a 401', async () => {
    const { fetchMock, refreshAccessToken, onSessionEnded } = makeClient();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(UNAUTHORIZED, { message: 'nope' }))
      .mockResolvedValueOnce(jsonResponse(OK, { orders: ['one'] }));

    await expect(apiRequest('/orders')).resolves.toEqual({ orders: ['one'] });

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(headersOf(fetchMock, 1).get('Authorization')).toBe(
      `Bearer ${REFRESHED_TOKEN}`,
    );
    expect(onSessionEnded).not.toHaveBeenCalled();
  });

  it('should end the session when the refresh fails', async () => {
    const { fetchMock, onSessionEnded } = makeClient({ refreshed: null });
    fetchMock.mockResolvedValue(
      jsonResponse(UNAUTHORIZED, { message: 'Unauthorized' }),
    );

    await expect(apiRequest('/orders')).rejects.toBeInstanceOf(ApiError);

    expect(onSessionEnded).toHaveBeenCalledTimes(1);
    // No retry: there was no token to retry with.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should end the session when the retry is refused too', async () => {
    const { fetchMock, onSessionEnded } = makeClient();
    fetchMock.mockResolvedValue(jsonResponse(UNAUTHORIZED, { message: 'no' }));

    await expect(apiRequest('/orders')).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
  });

  it('should not ask for credentials on an ordinary request', async () => {
    const { fetchMock } = makeClient();
    fetchMock.mockResolvedValue(jsonResponse(OK));

    await apiRequest('/orders');

    // The browser attaches no cookie without this, which is the point: the
    // refresh cookie stays off the routes that do not need it.
    expect(requestInitOf(fetchMock).credentials).toBeUndefined();
  });

  it('should ask for credentials on a session call', async () => {
    const { fetchMock } = makeClient();
    fetchMock.mockResolvedValue(jsonResponse(OK));

    await apiRequest('/auth/refresh', { method: 'POST' });

    expect(requestInitOf(fetchMock).credentials).toBe('include');
  });

  it('should not refresh when a session call is refused', async () => {
    const { fetchMock, refreshAccessToken, onSessionEnded } = makeClient();
    fetchMock.mockResolvedValue(
      jsonResponse(UNAUTHORIZED, { message: 'Session expired' }),
    );

    await expect(
      apiRequest('/auth/refresh', { method: 'POST' }),
    ).rejects.toBeInstanceOf(ApiError);

    // `/auth/refresh` answering 401 *is* the refresh failing; reacting by
    // refreshing again would not terminate.
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should retry every concurrent 401 with the token the refresh produced', async () => {
    const { fetchMock, refreshAccessToken, onSessionEnded } = makeClient();
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const authorization = (init.headers as Headers).get('Authorization');
      return authorization === `Bearer ${REFRESHED_TOKEN}`
        ? jsonResponse(OK, { ok: true })
        : jsonResponse(UNAUTHORIZED, { message: 'no' });
    });

    const results = await Promise.all([
      apiRequest('/orders'),
      apiRequest('/items'),
      apiRequest('/tables'),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshAccessToken).toHaveBeenCalledTimes(3);
    // Each request asks; the single-flight in the session module is what turns
    // those three asks into one network call. What matters here is that no
    // request wrongly concluded the session was over.
    expect(onSessionEnded).not.toHaveBeenCalled();
  });

  it('should surface the backend message on a non-401 failure', async () => {
    const { fetchMock, refreshAccessToken } = makeClient();
    fetchMock.mockResolvedValue(
      jsonResponse(400, { message: 'Cannot change a closed order' }),
    );

    await expect(apiRequest('/orders')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Cannot change a closed order',
    });
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});
