import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changePassword, ChangePasswordError } from './me.ts';
import { getAccessToken, setAccessToken } from './token.ts';

const fetchMock = vi.fn();

function reply(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status });
}

async function changeError(): Promise<ChangePasswordError> {
  const error = await changePassword('Temp1234', 'NewPass99').catch((e) => e);
  expect(error).toBeInstanceOf(ChangePasswordError);
  return error as ChangePasswordError;
}

beforeEach(() => {
  setAccessToken('old-token');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('changePassword (AGL-08.4)', () => {
  it('sends both passwords and saves the new access token', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { accessToken: 'new-token' }));

    await changePassword('Temp1234', 'NewPass99');

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/me/password');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      currentPassword: 'Temp1234',
      newPassword: 'NewPass99',
    });
    expect(getAccessToken()).toBe('new-token');
  });

  it('400 CURRENT_PASSWORD_WRONG says the temporary password is wrong', async () => {
    fetchMock.mockResolvedValueOnce(
      reply(400, { code: 'CURRENT_PASSWORD_WRONG' }),
    );

    const error = await changeError();

    expect(error.kind).toBe('current-wrong');
    expect(error.message).toBe('The temporary password is wrong.');
    expect(getAccessToken()).toBe('old-token');
  });

  it('400 VALIDATION_FAILED gives plain text, not the server field names', async () => {
    fetchMock.mockResolvedValueOnce(
      reply(400, {
        code: 'VALIDATION_FAILED',
        message: ['newPassword must be different from the current password'],
      }),
    );
    const same = await changeError();
    expect(same.kind).toBe('invalid');
    expect(same.message).toBe(
      'Choose a password different from the temporary one.',
    );

    fetchMock.mockResolvedValueOnce(
      reply(400, {
        code: 'VALIDATION_FAILED',
        message: ['newPassword must be longer than or equal to 8 characters'],
      }),
    );
    const rule = await changeError();
    expect(rule.message).toBe(
      'Use 8 to 64 characters, with a letter (A-Z or a-z) and a digit.',
    );
    expect(rule.message).not.toContain('newPassword');
  });

  it('500 or no network gives the general message', async () => {
    fetchMock.mockResolvedValueOnce(reply(500));
    expect((await changeError()).kind).toBe('server');

    fetchMock.mockRejectedValueOnce(new TypeError('network down'));
    expect((await changeError()).kind).toBe('server');
  });
});
