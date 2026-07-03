import { Users } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

function UsersPage() {
  return (
    <EmptyState
      title="User management foundation only"
      description="RBAC and user-facing route protection are in place. Full user CRUD is intentionally deferred."
      icon={Users}
    />
  );
}

export default UsersPage;
