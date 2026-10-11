import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import { RequireAuth, RequireRole } from '../../components/layout/ProtectedRoute';
import { fail, mockFetch, ok, renderWithProviders } from '../../test/utils';

const profile = (role, extra = {}) => ({
  _id: 'u1',
  name: 'Ravi Iyer',
  role,
  membershipId: 'm1',
  society: { _id: 's1', name: 'Green Valley' },
  memberships: [],
  ...extra,
});

function LoginScreen() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>Home screen</p>} />
    </Routes>
  );
}

describe('login page', () => {
  it('shows the server message on bad credentials', async () => {
    mockFetch({ 'POST /auth/login': () => fail(401, 'INVALID_CREDENTIALS', 'Invalid credentials') });
    renderWithProviders(<LoginScreen />, { route: '/login' });
    await userEvent.type(await screen.findByLabelText(/email or phone/i), 'x@demo.test');
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrong-pass');
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('logs in with password and lands on home', async () => {
    mockFetch({ 'POST /auth/login': () => ok({ accessToken: 'A', refreshToken: 'R'.repeat(30), user: profile('resident') }) });
    renderWithProviders(<LoginScreen />, { route: '/login' });
    await userEvent.type(await screen.findByLabelText(/email or phone/i), 'resident@demo.test');
    await userEvent.type(screen.getByLabelText(/^password/i), 'Password@123');
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(await screen.findByText('Home screen')).toBeInTheDocument();
  });

  it('logs in with an SMS code', async () => {
    const { calls } = mockFetch({
      'POST /auth/otp/request': () => ok({ message: 'If this number is registered, a login code has been sent by SMS.', devCode: '123456' }),
      'POST /auth/otp/verify': (body) => (body.code === '123456' ? ok({ accessToken: 'A', refreshToken: 'R'.repeat(30), user: profile('resident') }) : fail(401, 'OTP_INVALID', 'Invalid or expired code')),
    });
    renderWithProviders(<LoginScreen />, { route: '/login' });
    await userEvent.click(await screen.findByRole('tab', { name: /sms code/i }));
    await userEvent.type(screen.getByLabelText(/mobile number/i), '9000000011');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));
    expect(await screen.findByText(/Dev code: 123456/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend code \(\d+s\)/i })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));
    expect(await screen.findByText('Home screen')).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'POST /auth/otp/verify').body).toEqual({ phone: '9000000011', code: '123456' });
  });
});

describe('route guards', () => {
  const app = (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route path="/" element={<p>Dashboard</p>} />
        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="/units" element={<p>Units admin</p>} />
        </Route>
      </Route>
      <Route path="/login" element={<p>Login screen</p>} />
    </Routes>
  );

  it('sends visitors without a session to login', async () => {
    renderWithProviders(app, { route: '/units' });
    expect(await screen.findByText('Login screen')).toBeInTheDocument();
  });

  it('keeps residents out of admin pages', async () => {
    localStorage.setItem('cms.refreshToken', 'R'.repeat(30));
    mockFetch({ 'POST /auth/refresh': () => ok({ accessToken: 'A', refreshToken: 'S'.repeat(30), user: profile('resident') }) });
    renderWithProviders(app, { route: '/units' });
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Units admin')).not.toBeInTheDocument();
  });

  it('lets admins in', async () => {
    localStorage.setItem('cms.refreshToken', 'R'.repeat(30));
    mockFetch({ 'POST /auth/refresh': () => ok({ accessToken: 'A', refreshToken: 'S'.repeat(30), user: profile('admin') }) });
    renderWithProviders(app, { route: '/units' });
    await waitFor(() => expect(screen.getByText('Units admin')).toBeInTheDocument());
  });
});
