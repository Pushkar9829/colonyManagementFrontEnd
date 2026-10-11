import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, StatusBadge, Tabs, FileUpload } from './index';
import { useForm } from '../../hooks/useForm';
import { ToastProvider } from '../../context/ToastContext';

describe('UI kit', () => {
  it('StatusBadge humanises and colours statuses', () => {
    render(<StatusBadge status="checked_in" />);
    const badge = screen.getByText('Checked In');
    expect(badge.className).toMatch(/sky/);
  });

  it('Button shows a spinner and is disabled while loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('Tabs reports the clicked tab and badges counts', async () => {
    const onChange = vi.fn();
    render(<Tabs value="a" onChange={onChange} tabs={[{ value: 'a', label: 'Active' }, { value: 'p', label: 'Requests', count: 3 }]} />);
    expect(screen.getByRole('tab', { name: /active/i })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: /requests/i }));
    expect(onChange).toHaveBeenCalledWith('p');
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('FileUpload refuses files over 5 MB before uploading', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const onChange = vi.fn();
    const { container } = render(
      <ToastProvider>
        <FileUpload folder="complaints" files={[]} onChange={onChange} />
      </ToastProvider>,
    );
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.jpg', { type: 'image/jpeg' });
    await userEvent.upload(container.querySelector('input[type=file]'), big);
    expect(await screen.findByText(/larger than 5 MB/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('useForm', () => {
  it('binds inputs and applies server field errors, clearing them on edit', () => {
    const { result } = renderHook(() => useForm({ name: '' }));
    act(() => result.current.applyServerErrors({ fieldErrors: { name: 'Required' } }));
    expect(result.current.bind('name').error).toBe('Required');
    act(() => result.current.bind('name').onChange({ target: { type: 'text', value: 'Ravi' } }));
    expect(result.current.values.name).toBe('Ravi');
    expect(result.current.bind('name').error).toBeUndefined();
  });
});
