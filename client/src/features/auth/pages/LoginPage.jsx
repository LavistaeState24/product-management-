import { useState } from 'react';
import { AlertCircle, KeyRound, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isSubmitting } = useAuth();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values) {
    setServerError('');

    try {
      await signIn(values);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (error) {
      setServerError(error.response?.data?.message || 'Unable to sign in.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-panel lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-sidebar bg-app-grid p-10 text-card lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-card-muted">Phase 1 Foundation</p>
            <h1 className="mt-6 max-w-lg text-5xl font-extrabold leading-tight text-card">
              Premium operations workspace for your next CRM rollout.
            </h1>
            <p className="mt-6 mb-4 max-w-xl text-base text-card-muted">
              Authentication, RBAC, reusable UI primitives, and a responsive command surface are ready. Business modules remain gated for later phases.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-card-soft bg-card-soft p-5">
              <p className="text-sm text-card-muted">Roles</p>
              <p className="mt-3 text-3xl font-bold text-card">12</p>
            </div>
            <div className="rounded-3xl border border-card-soft bg-card-soft p-5">
              <p className="text-sm text-card-muted">Permissions</p>
              <p className="mt-3 text-3xl font-bold text-card">20</p>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-md">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-primary">Secure Access</p>
              <h2 className="mt-3 text-3xl font-bold text-heading">Sign in to Operations CRM</h2>
              <p className="mt-3 text-sm text-body">
                Use the seeded boss account to access the foundation and validate role-aware routing.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <Input
                label="Email address"
                leftIcon={Mail}
                placeholder="Enter your email"
                type="email"
                error={errors.email?.message}
                {...register('email', {
                  required: 'Email is required.',
                })}
              />
              <Input
                label="Password"
                leftIcon={KeyRound}
                type="password"
                placeholder="Enter your password"
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required.',
                })}
              />

              {serverError ? (
                <div className="flex items-center gap-2 rounded-2xl border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
                  <AlertCircle className="h-4 w-4" />
                  <span>{serverError}</span>
                </div>
              ) : null}

              <Button className="w-full" type="submit" loading={isSubmitting}>
                Sign In
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
