import { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

import logo from '../../../assets/invoice.png';
import loginBg from '../../../assets/front.jpg';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { signIn, isSubmitting } = useAuth();

  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

      navigate(
        location.state?.from?.pathname || '/dashboard',
        {
          replace: true,
        },
      );
    } catch (error) {
      setServerError(
        error.response?.data?.message ||
          'Unable to sign in.',
      );
    }
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      {/* Left Image Section */}
      <section
        className="relative hidden min-h-screen overflow-hidden lg:flex lg:flex-col lg:justify-between"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Decorative overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/40" />

        <div className="relative z-10 flex items-center p-5">
          <div className="rounded-2xl bg-white/95 px-4 py-1 shadow-lg backdrop-blur">
            <img
              src={logo}
              alt="Customized Polycast"
              className="h-14 w-auto object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 max-w-2xl p-12 pb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
            Operations CRM
          </p>

          <h1 className="mt-5 text-3xl font-bold leading-[1.12] tracking-tight text-white xl:text-6xl">
            Manage your entire operation from one place.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-white/75">
            Purchasing, stock, production, orders, dispatch,
            payments and reports — connected in one secure
            workspace.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              'Stock Management',
              'Production',
              'Orders',
              'Reports',
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
        {/* Mobile background decoration */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-success/5 blur-3xl" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile Logo */}
          <div className="mb-8 lg:hidden">
            <img
              src={logo}
              alt="Customized Polycast"
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
            <div>
              <div className="inline-flex rounded-full bg-primary-tint px-3 py-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Secure Access
                </p>
              </div>

              <h2 className="mt-5 text-3xl font-bold tracking-tight text-heading">
                Welcome back
              </h2>

              <p className="mt-2 text-sm leading-6 text-body">
                Sign in to continue to Customized Polycast CRM.
              </p>
            </div>

            <form
              className="mt-8 space-y-5"
              onSubmit={handleSubmit(onSubmit)}
            >
              <Input
                label="Email address"
                leftIcon={Mail}
                placeholder="Enter your email"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email', {
                  required: 'Email is required.',
                })}
              />

              {/* Password */}
              <div className="relative">
                <Input
                  label="Password"
                  leftIcon={KeyRound}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  inputClassName="pr-10"
                  error={errors.password?.message}
                  {...register('password', {
                    required: 'Password is required.',
                  })}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  title={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  className="absolute right-3 top-[40px] flex h-9 w-9 items-center justify-center rounded-lg text-body-muted transition-all duration-200 hover:bg-background hover:text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {serverError ? (
                <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-tint px-4 py-3 text-sm text-danger">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                  <span>
                    {serverError}
                  </span>
                </div>
              ) : null}

              <Button
                className="mt-2 w-full"
                type="submit"
                loading={isSubmitting}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-8 border-t border-border pt-5 text-center">
              <p className="text-xs text-body-muted">
                Customized Polycast Operations CRM
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;