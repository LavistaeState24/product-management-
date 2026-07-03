import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '@/components/ui/Button';

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel max-w-lg p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-info-tint text-info">
          <Compass className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-heading">404</h1>
        <p className="mt-3 text-sm text-body">
          The page you requested does not exist inside this CRM foundation.
        </p>
        <Link to="/dashboard" className="mt-6 inline-flex">
          <Button>Go to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
