import { Lock } from 'lucide-react';
import { Card, EmptyState } from '../../../components/ui';
import { useCan } from '../useCan';

// Wraps a platform page: members whose role lacks `permission` see a short note instead of a broken page.
export function PermissionGate({ permission, children }) {
  const can = useCan();
  if (can(permission)) return children;
  return (
    <Card>
      <EmptyState icon={Lock} title="Your role doesn’t include this page" description="Ask a platform owner if you need access." />
    </Card>
  );
}
