import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';

function ForbiddenPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="panel max-w-lg p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-warning-tint text-warning">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-heading">403</h1>
        <p className="mt-3 text-sm text-body">
          Your current role does not have permission to access this area.
        </p>
        <Link to="/dashboard" className="mt-6 inline-flex">
          <Button>Return to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

export default ForbiddenPage;
