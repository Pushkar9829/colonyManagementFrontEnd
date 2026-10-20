import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { actingSummary, canLoginAsRole } from './lib';
import { minutesLeft } from './session';

const auth = { user: null, exitLoginAs: vi.fn() };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../context/LanguageContext', () => ({ useT: () => ({ t: (s) => s }) }));
vi.mock('./api', () => ({ useActingCheck: () => ({ error: null }) }));

const { ActingAsBanner } = await import('./components/ActingAsBanner');

const renderBanner = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ActingAsBanner />
      </MemoryRouter>
    </QueryClientProvider>,
  );

const actingUser = (minutes) => ({
  name: 'Ravi Iyer',
  unit: { label: 'A-101' },
  actingAs: { byName: 'Asha Admin', expiresAt: new Date(Date.now() + minutes * 60000).toISOString() },
});

describe('log in as helpers', () => {
  it('counts minutes left, rounding up and never below zero', () => {
    const now = Date.now();
    expect(minutesLeft(new Date(now + 23.5 * 60000), now)).toBe(24);
    expect(minutesLeft(new Date(now - 1000), now)).toBe(0);
  });

  it('summarises who is being viewed', () => {
    const user = actingUser(24);
    expect(actingSummary({ name: 'X' })).toBeNull();
    expect(actingSummary(user, Date.now())).toMatchObject({ who: 'Ravi Iyer (A-101)', minutes: 24, by: 'Asha Admin' });
  });

  it('only offers roles the rules allow', () => {
    const rules = { allowed: true, canTarget: ['guard', 'resident', 'staff'] };
    expect(canLoginAsRole(rules, 'resident')).toBe(true);
    expect(canLoginAsRole(rules, 'admin')).toBe(false);
    expect(canLoginAsRole({ allowed: false, canTarget: [] }, 'resident')).toBe(false);
    expect(canLoginAsRole(undefined, 'resident')).toBe(false);
  });
});

describe('acting-as banner', () => {
  afterEach(() => {
    vi.useRealTimers();
    auth.exitLoginAs.mockReset();
  });

  it('is hidden for a normal session', () => {
    auth.user = { name: 'Asha Admin' };
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows who, time left and exits on click', async () => {
    auth.user = actingUser(24);
    renderBanner();
    expect(screen.getByRole('status')).toHaveTextContent('You are viewing as Ravi Iyer (A-101)');
    expect(screen.getByRole('status')).toHaveTextContent('24 min left');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Exit/ })));
    expect(auth.exitLoginAs).toHaveBeenCalledTimes(1);
  });

  it('exits by itself when the time is up', async () => {
    vi.useFakeTimers();
    auth.user = actingUser(1);
    renderBanner();
    expect(auth.exitLoginAs).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(61000);
    });
    expect(auth.exitLoginAs).toHaveBeenCalledTimes(1);
  });
});
