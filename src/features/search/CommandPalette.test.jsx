import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { SearchButton } from './components/CommandPalette';
import { mockFetch, ok, renderWithProviders } from '../../test/utils';

const user = { _id: 'u1', name: 'Sara Admin', role: 'admin', membershipId: 'm1', society: { _id: 's1', name: 'Green Valley' } };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user }) }));

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function Screen() {
  return (
    <>
      <SearchButton />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </>
  );
}

const results = {
  q: 'bill',
  groups: [{ type: 'bill', items: [{ type: 'bill', id: 'b1', title: 'INV-2026-0001', subtitle: 'A-101 · 2026-10', link: '/billing' }] }],
};

describe('command palette', () => {
  it('opens with Ctrl+K, shows matching pages and debounced records, and navigates with the keyboard', async () => {
    const { calls } = mockFetch({ 'GET /features': () => ok({ enabled: [] }), 'GET /search': () => ok(results) });
    renderWithProviders(<Screen />, { withAuth: false });

    await userEvent.keyboard('{Control>}k{/Control}');
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const input = within(dialog).getByLabelText(/search pages and records/i);
    expect(input).toHaveFocus();

    await userEvent.type(input, 'bill');
    // pages come straight from the navigation, no request needed
    expect(within(dialog).getByRole('option', { name: /billing/i })).toBeInTheDocument();
    expect(await within(dialog).findByRole('option', { name: /INV-2026-0001/ })).toBeInTheDocument();
    // typing four characters fired a single debounced search
    const searches = calls.filter((c) => c.key === 'GET /search');
    expect(searches).toHaveLength(1);

    const options = within(dialog).getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowDown}');
    const record = within(dialog).getByRole('option', { name: /INV-2026-0001/ });
    await waitFor(() => expect(within(dialog).getAllByRole('option').findIndex((o) => o.getAttribute('aria-selected') === 'true')).toBe(1));
    expect(input).toHaveAttribute('aria-activedescendant', within(dialog).getAllByRole('option')[1].id);

    // move to the record result and open it
    while (record.getAttribute('aria-selected') !== 'true') await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('where')).toHaveTextContent('/billing');
  });

  it('opens from the top-bar button, closes on Escape and returns focus', async () => {
    mockFetch({ 'GET /features': () => ok({ enabled: [] }), 'GET /search': () => ok({ q: 'zz', groups: [] }) });
    renderWithProviders(<Screen />, { withAuth: false });
    const button = screen.getByRole('button', { name: /^search$/i });
    await userEvent.click(button);
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('combobox'), 'zzqq');
    expect(await within(dialog).findByText(/no results for/i)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
});
