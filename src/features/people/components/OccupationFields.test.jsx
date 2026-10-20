import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OccupationFields, occupationBody, occupationForm } from './OccupationFields';
import { dayMonth, occupationSummary } from '../constants';

function Harness({ initial, onState }) {
  const [v, setV] = useState(occupationForm(initial));
  return <OccupationFields value={v} onChange={(x) => { setV(x); onState?.(x); }} />;
}

describe('OccupationFields', () => {
  it('shows no branch fields until a type is chosen', () => {
    render(<Harness />);
    expect(screen.queryByLabelText(/school \/ college name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/category/i)).not.toBeInTheDocument();
  });

  it('student shows institution fields; working shows work fields instead', async () => {
    const onState = vi.fn();
    render(<Harness onState={onState} />);
    await userEvent.selectOptions(screen.getByLabelText(/^occupation/i), 'student');
    expect(screen.getByLabelText(/school \/ college name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/institution type/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/designation/i)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/school \/ college name/i), 'COEP Pune');

    await userEvent.selectOptions(screen.getByLabelText(/^occupation/i), 'working');
    expect(screen.queryByLabelText(/school \/ college name/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/designation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company \/ organisation/i)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/work type/i), 'business');
    expect(screen.getByLabelText(/business \/ firm name/i)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/^category/i), 'it_software');

    const state = onState.mock.calls.at(-1)[0];
    expect(occupationBody(state)).toEqual({ type: 'working', working: expect.objectContaining({ mode: 'business', category: 'it_software' }) });
    // switching back keeps what was typed for the student branch
    await userEvent.selectOptions(screen.getByLabelText(/^occupation/i), 'student');
    expect(screen.getByLabelText(/school \/ college name/i)).toHaveValue('COEP Pune');
  });

  it('only the matching branch is sent', () => {
    const f = occupationForm({ type: 'student', student: { institutionName: 'DPS Pune' } });
    f.working.organisation = 'Leftover';
    expect(occupationBody(f)).toEqual({ type: 'student', student: expect.objectContaining({ institutionName: 'DPS Pune' }) });
    expect(occupationBody({ ...f, type: 'retired', notes: 'Retired teacher' })).toEqual({ type: 'retired', notes: 'Retired teacher' });
    expect(occupationBody(occupationForm(null))).toBeNull();
  });

  it('formats summaries and day-month birthdays', () => {
    expect(occupationSummary({ type: 'working', working: { mode: 'job', designation: 'Engineer', organisation: 'Infosys', category: 'it_software' } })).toBe('Engineer · Infosys (IT / Software)');
    expect(occupationSummary({ type: 'student', student: { institutionName: 'COEP Pune', course: 'B.Tech' } })).toBe('Student · COEP Pune · B.Tech');
    expect(dayMonth('03-10')).toBe('10 Mar');
  });
});
