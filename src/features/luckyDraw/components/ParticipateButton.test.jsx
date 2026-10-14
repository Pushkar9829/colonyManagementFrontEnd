import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParticipateButton } from './ParticipateButton';
import { duration } from '../lib';

const base = { _id: 'd1', phase: 'open', eligible: true, ineligibleReason: null, myEntry: null, myWins: [], entryOpensAt: new Date(Date.now() + 3600000).toISOString() };

describe('ParticipateButton', () => {
  it('shows Participate when open and eligible, and calls onEnter', async () => {
    const onEnter = vi.fn();
    render(<ParticipateButton draw={base} onEnter={onEnter} />);
    await userEvent.click(screen.getByRole('button', { name: /participate/i }));
    expect(onEnter).toHaveBeenCalledWith('d1');
  });

  it("shows You're in with a Withdraw button once entered", async () => {
    const onWithdraw = vi.fn();
    render(<ParticipateButton draw={{ ...base, myEntry: { status: 'entered' } }} onWithdraw={onWithdraw} />);
    expect(screen.getByRole('status')).toHaveTextContent("You're in");
    expect(screen.queryByRole('button', { name: /participate/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /withdraw/i }));
    expect(onWithdraw).toHaveBeenCalledWith('d1');
  });

  it('a withdrawn entry can participate again', () => {
    render(<ParticipateButton draw={{ ...base, myEntry: { status: 'withdrawn' } }} />);
    expect(screen.getByRole('button', { name: /participate/i })).toBeEnabled();
  });

  it('upcoming draws show a disabled countdown', () => {
    render(<ParticipateButton draw={{ ...base, phase: 'upcoming' }} />);
    expect(screen.getByRole('button', { name: /entries open in/i })).toBeDisabled();
  });

  it('explains why an ineligible member cannot enter', () => {
    render(<ParticipateButton draw={{ ...base, eligible: false, ineligibleReason: 'This draw is for flat owners only' }} />);
    expect(screen.getByText('This draw is for flat owners only')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('highlights a win after the draw', () => {
    render(<ParticipateButton draw={{ ...base, phase: 'drawn', myEntry: { status: 'entered' }, myWins: [{ prize: 'Smart TV' }] }} />);
    expect(screen.getByText(/You won Smart TV!/)).toBeInTheDocument();
  });

  it('formats countdowns', () => {
    expect(duration((2 * 24 + 3) * 3600000)).toBe('2 days 3 hours');
    expect(duration(90 * 60000)).toBe('1 hour 30 min');
    expect(duration(30000)).toBe('less than a minute');
  });
});
