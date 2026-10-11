import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, tokens } from './client';
import { fail, mockFetch, ok } from '../test/utils';

describe('api client', () => {
  beforeEach(() => tokens.clear());

  it('sends the bearer token and unwraps data', async () => {
    tokens.setSession({ accessToken: 'A1', refreshToken: 'R'.repeat(30) });
    const { calls } = mockFetch({ 'GET /bills': () => ok([{ _id: 'b1' }], { meta: { total: 1 } }) });
    const res = await api.list('/bills', { page: 1, status: undefined });
    expect(res).toEqual({ data: [{ _id: 'b1' }], meta: { total: 1 } });
    expect(calls[0].headers.Authorization).toBe('Bearer A1');
  });

  it('refreshes once on 401 and retries; parallel requests share the refresh', async () => {
    tokens.setSession({ accessToken: 'OLD', refreshToken: 'R'.repeat(30) });
    let refreshes = 0;
    mockFetch({
      'GET /dashboard': (_b, init) => (init.headers.Authorization === 'Bearer NEW' ? ok({ view: 'resident' }) : fail(401, 'TOKEN_INVALID', 'expired')),
      'POST /auth/refresh': () => {
        refreshes += 1;
        return ok({ accessToken: 'NEW', refreshToken: 'S'.repeat(30), user: {} });
      },
    });
    const [a, b] = await Promise.all([api.get('/dashboard'), api.get('/dashboard')]);
    expect(a.view).toBe('resident');
    expect(b.view).toBe('resident');
    expect(refreshes).toBe(1);
    expect(tokens.refreshToken()).toBe('S'.repeat(30));
  });

  it('clears the session and notifies when refresh is rejected', async () => {
    tokens.setSession({ accessToken: 'OLD', refreshToken: 'R'.repeat(30) });
    const lost = vi.fn();
    tokens.onSessionLost(lost);
    mockFetch({
      'GET /dashboard': () => fail(401, 'TOKEN_INVALID', 'expired'),
      'POST /auth/refresh': () => fail(401, 'REFRESH_INVALID', 'Session expired'),
    });
    await expect(api.get('/dashboard')).rejects.toBeInstanceOf(ApiError);
    expect(lost).toHaveBeenCalledOnce();
    expect(tokens.hasRefresh()).toBe(false);
  });

  it('maps validation details to form field errors', async () => {
    mockFetch({ 'POST /complaints': () => fail(422, 'VALIDATION_ERROR', 'Validation failed', [{ field: 'body.title', message: 'Too short' }]) });
    const err = await api.post('/complaints', { title: 'x' }).catch((e) => e);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.fieldErrors).toEqual({ title: 'Too short' });
  });

  it('turns network failures into a friendly error', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    const err = await api.get('/health').catch((e) => e);
    expect(err.code).toBe('NETWORK_ERROR');
  });
});
