import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button, Modal } from '../../../components/ui';
import { useTemplate } from '../../../context/TemplateContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../context/LanguageContext';

// Asks before a template goes live for every member of the colony.
export function ApplyTemplateDialog({ open, name, onClose, onConfirm, busy }) {
  const { t } = useT();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('Apply {name}?', { name })}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={onConfirm}>Apply for everyone</Button>
        </>
      )}
    >
      <p className="text-sm text-slate-600">{t('Every resident, guard and staff member of the colony will see the app in this template, on every phone and computer.')}</p>
    </Modal>
  );
}

// "Try it" on Settings → Appearance: the template shows only in this browser tab until applied or cancelled.
export function TemplatePreviewBanner() {
  const { t } = useT();
  const toast = useToast();
  const { preview, cancelPreview, applyPreview } = useTemplate();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!preview) return null;

  const confirm = async () => {
    setBusy(true);
    try {
      await applyPreview();
      toast.success(t('Template applied for the whole colony'));
      setAsking(false);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800 sm:px-6">
      <Eye className="size-4 shrink-0" aria-hidden />
      <span className="font-semibold">{t('Previewing {name}', { name: t(preview.name) })}</span>
      <span className="hidden text-brand-700 md:inline">{t('Only you can see this until you apply it.')}</span>
      <span className="ml-auto flex gap-2">
        <Button size="sm" onClick={() => setAsking(true)}>Apply</Button>
        <Button size="sm" variant="secondary" onClick={cancelPreview}>Cancel</Button>
      </span>
      <ApplyTemplateDialog open={asking} name={t(preview.name)} busy={busy} onClose={() => setAsking(false)} onConfirm={confirm} />
    </div>
  );
}
