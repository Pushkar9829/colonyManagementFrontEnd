import { useState } from 'react';
import { Button, Modal, Textarea } from '../../../components/ui';

// Confirmation for the irreversible draw actions. With `reasonLabel` it also asks for a reason (min 3 chars).
export function ConfirmModal({ title, message, confirmLabel = 'Confirm', variant = 'primary', reasonLabel, loading, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const needsReason = Boolean(reasonLabel);
  return (
    <Modal open onClose={onClose} size="sm" title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Back</Button>
          <Button variant={variant} loading={loading} disabled={needsReason && reason.trim().length < 3} onClick={() => onConfirm(needsReason ? reason.trim() : undefined)}>{confirmLabel}</Button>
        </>
      }>
      <div className="space-y-3 text-sm text-slate-600">
        <p>{message}</p>
        {needsReason && <Textarea label={reasonLabel} required value={reason} onChange={(e) => setReason(e.target.value)} />}
      </div>
    </Modal>
  );
}
