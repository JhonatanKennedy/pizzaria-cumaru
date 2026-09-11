import {
  clearSession,
  readStoredUser,
  writeStoredUser,
  type StoredUser,
} from '../auth-storage';

const USER_KEY = 'pizzaria-cumaru.user';
const VALID_USER: StoredUser = { id: 1, login: 'joao.garcom', role: 'Waiter' };

function storedKeys(): string[] {
  return Array.from({ length: window.localStorage.length }, (_, index) =>
    window.localStorage.key(index),
  ).filter((key): key is string => key !== null);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('readStoredUser', () => {
  it('should return nothing when nothing was stored', () => {
    expect(readStoredUser()).toBeNull();
  });

  it('should read back the stored user', () => {
    writeStoredUser(VALID_USER);

    expect(readStoredUser()).toEqual(VALID_USER);
  });

  it('should return nothing for a blob that is not JSON', () => {
    window.localStorage.setItem(USER_KEY, 'not json');

    expect(readStoredUser()).toBeNull();
  });

  it('should return nothing for a blob with an unknown role', () => {
    window.localStorage.setItem(
      USER_KEY,
      JSON.stringify({ ...VALID_USER, role: 'Admin' }),
    );

    expect(readStoredUser()).toBeNull();
  });

  it('should return nothing for a blob missing an id', () => {
    window.localStorage.setItem(
      USER_KEY,
      JSON.stringify({ login: 'joao.garcom', role: 'Waiter' }),
    );

    expect(readStoredUser()).toBeNull();
  });
});

describe('the stored session', () => {
  it('should store the user and nothing else', () => {
    writeStoredUser(VALID_USER);

    // The blob alone is not a session: with no credential beside it, a reload
    // has to ask the refresh cookie for a token before it can do anything.
    expect(storedKeys()).toEqual([USER_KEY]);
  });

  it('should not carry a token in the blob', () => {
    writeStoredUser(VALID_USER);

    expect(window.localStorage.getItem(USER_KEY)).not.toContain('token');
  });
});

describe('clearSession', () => {
  it('should leave nothing stored', () => {
    writeStoredUser(VALID_USER);

    clearSession();

    expect(readStoredUser()).toBeNull();
    expect(storedKeys()).toEqual([]);
  });
});
