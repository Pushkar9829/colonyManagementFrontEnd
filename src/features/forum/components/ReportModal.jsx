import { useState } from 'react';
import { Button, Modal, Select, Textarea } from '../../../components/ui';

// Shared "report this" dialog (forum posts, marketplace listings). onSubmit({ reason, note }).
export function ReportModal({ open, onClose, onSubmit, loading, reasons, title = 'Report this post' }) {
  const [reason, setReason] = useState(reasons[0].value);
  const [note, setNote] = useState('');
  return (
    <Modal open={open} onClose={onClose} title={title} description="Moderators will review it. The author is not told who reported."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" loading={loading} onClick={() => onSubmit({ reason, note: note.trim() || undefined })}>Report</Button></>}>
      <div className="space-y-4">
        <Select label="Reason" options={reasons} value={reason} onChange={(e) => setReason(e.target.value)} />
        <Textarea label="Details" hint="Optional" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}

export const FORUM_REPORT_REASONS = [
  { value: 'abusive', label: 'Abusive or offensive' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam / advertising' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'off_topic', label: 'Off topic' },
  { value: 'other', label: 'Something else' },
];
