import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './client.ts';
import { getAccessToken, setAccessToken } from './token.ts';

const assign = vi.fn();
const fetchMock = vi.fn();

function reply(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status });
}

// Which Authorization header the n-th fetch call sent
function authHeader(call: number): string | null {
  const init = fetchMock.mock.calls[call][1] as RequestInit;
  return new Headers(init.headers).get('Authorization');
}

beforeEach(() => {
  setAccessToken(null);
  assign.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('window', { location: { pathname: '/', assign } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('sends the access token as a Bearer header', async () => {
    setAccessToken('token-1');
    fetchMock.mockResolvedValueOnce(reply(200));

    const res = await apiFetch('/projects');

    expect(res.status).toBe(200);
    expect(authHeader(0)).toBe('Bearer token-1');
  });

  it('on 401, refreshes the token and retries once', async () => {
    setAccessToken('old-token');
    fetchMock
      .mockResolvedValueOnce(reply(401)) // expired token
      .mockResolvedValueOnce(reply(200, { accessToken: 'new-token' })) // refresh
      .mockResolvedValueOnce(reply(200)); // retry

    const res = await apiFetch('/projects');

    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[1][0]).toBe('/auth/refresh');
    expect(authHeader(2)).toBe('Bearer new-token');
    expect(assign).not.toHaveBeenCalled();
  });

  it('a 401 sends the user to login when the refresh also fails', async () => {
    setAccessToken('old-token');
    fetchMock
      .mockResolvedValueOnce(reply(401)) // expired token
      .mockResolvedValueOnce(reply(401)); // refresh cookie missing or expired

    const res = await apiFetch('/projects');

    expect(res.status).toBe(401);
    expect(getAccessToken()).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('runs only one refresh when two calls get 401 at the same time', async () => {
    setAccessToken('old-token');
    fetchMock.mockImplementation((path: string, init: RequestInit) => {
      if (path === '/auth/refresh') {
        return Promise.resolve(reply(200, { accessToken: 'new-token' }));
      }
      const auth = new Headers(init.headers).get('Authorization');
      return Promise.resolve(reply(auth === 'Bearer new-token' ? 200 : 401));
    });

    const [a, b] = await Promise.all([apiFetch('/a'), apiFetch('/b')]);

    expect([a.status, b.status]).toEqual([200, 200]);
    const refreshCalls = fetchMock.mock.calls.filter(
      ([path]) => path === '/auth/refresh',
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('does not redirect again when already on the login page', async () => {
    vi.stubGlobal('window', { location: { pathname: '/login', assign } });
    fetchMock.mockResolvedValue(reply(401));

    await apiFetch('/projects');

    expect(assign).not.toHaveBeenCalled();
  });
});
