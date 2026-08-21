import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Box,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  PackageCheck,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

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

      navigate(location.state?.from?.pathname || '/dashboard', {
        replace: true,
      });
    } catch (error) {
      setServerError(
        error.response?.data?.message || 'Unable to sign in.',
      );
    }
  }

  const features = [
    {
      title: 'Stock',
      subtitle: 'Management',
      icon: Box,
    },
    {
      title: 'Production',
      subtitle: 'Control',
      icon: Settings,
    },
    {
      title: 'Orders &',
      subtitle: 'Dispatch',
      icon: PackageCheck,
    },
    {
      title: 'Reports &',
      subtitle: 'Insights',
      icon: BarChart3,
    },
  ];

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-slate-950"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* ============================================================
          FULL PAGE BACKGROUND OVERLAYS
      ============================================================ */}

      {/* Base dark overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[#031923]/30" />

      {/* Desktop gradient */}
      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-[#021824]/95 via-[#032638]/60 to-[#071c2a]/20 lg:block" />

      {/* Mobile / tablet overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[#021824]/65 lg:hidden" />

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#021722]/70 via-transparent to-black/10" />

      {/* Soft right overlay */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[47%] bg-white/[0.03] lg:block" />

      {/* Decorative circles */}
      <div className="pointer-events-none absolute -bottom-48 -left-48 hidden h-[500px] w-[500px] rounded-full border border-[#8bcf32]/10 md:block" />

      <div className="pointer-events-none absolute -bottom-32 -left-28 hidden h-[350px] w-[350px] rounded-full border border-[#8bcf32]/15 md:block" />

      {/* Decorative dots */}
      <div className="pointer-events-none absolute left-8 top-[150px] hidden grid-cols-5 gap-2 opacity-20 lg:grid">
        {Array.from({ length: 20 }).map((_, index) => (
          <span
            key={index}
            className="h-1 w-1 rounded-full bg-[#8bcf32]"
          />
        ))}
      </div>

      {/* ============================================================
          PAGE CONTENT
      ============================================================ */}

      <div className="relative z-10 min-h-[100dvh] lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">

        {/* ==========================================================
            LEFT SIDE
        ========================================================== */}

        <section className="hidden min-h-screen min-w-0 flex-col justify-between px-8 py-8 lg:flex xl:px-12 xl:py-10">

          {/* Logo */}
          <div className="shrink-0">
            <div className="inline-flex rounded-[22px] bg-white px-5 py-3">
              <img
                src={logo}
                alt="Customized Polycast"
                className="h-[52px] sm:hiddedn w-auto max-w-[220px] object-contain xl:h-[62px] xl:max-w-[240px]"
              />
            </div>
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

        {/* ==========================================================
            RIGHT LOGIN SIDE
        ========================================================== */}

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
            </div>
          </div>

          {/* Login Container */}
          <div className="relative z-10 w-full max-w-[580px]">

            {/* Login Card */}
            <div className="rounded-[24px] border border-white/60 bg-white/[0.96] px-5 py-6 shadow-[0_30px_90px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:rounded-[28px] sm:px-8 sm:py-8 xl:rounded-[30px] xl:px-10 xl:py-9">

              {/* Secure Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#eff9e9] px-3.5 py-2">
                <ShieldCheck
                  size={17}
                  className="text-[#63b52b]"
                />

                <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#4d9b22] sm:text-[11px]">
                  Secure Access
                </span>
              </div>

              {/* Header */}
              <div className="sm:mt-6">
                <h2 className="text-[30px] font-bold tracking-[-0.035em] text-[#07182c] sm:text-[36px] xl:text-[40px]">
                  Welcome back!
                </h2>

                <p className="mt-2 text-[13px] leading-6 text-slate-500 sm:text-[15px]">
                  Sign in to continue to Customized Polycast CRM.
                </p>
              </div>

              {/* ======================================================
                  FORM
              ====================================================== */}

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-5 space-y-5 sm:mt-8"
              >
                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-md font-bold text-[#0b1f35]"
                  >
                    Email address
                  </label>

                  <div
                    className={`group flex h-[54px] items-center rounded-[14px] border bg-white px-4 transition-colors duration-200 sm:h-[58px] sm:rounded-[15px] ${errors.email
                      ? 'border-red-400'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <Mail
                      size={20}
                      strokeWidth={1.8}
                      className="mr-3 shrink-0 text-slate-400"
                    />

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      className="
                        h-full
                        min-w-0
                        flex-1
                        border-none
                        bg-transparent
                        text-[14px]
                        text-[#07182c]
                        outline-none
                        ring-0
                        placeholder:text-slate-400
                        focus:border-none
                        focus:outline-none
                        focus:ring-0
                        focus-visible:outline-none
                        focus-visible:ring-0
                        sm:text-[15px]
                      "
                      {...register('email', {
                        required: 'Email is required.',
                      })}
                    />
                  </div>

                  {errors.email?.message ? (
                    <p className="mt-2 text-xs font-medium text-red-500">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>

                {/* PASSWORD */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-md font-bold text-[#0b1f35]"
                  >
                    Password
                  </label>

                  <div
                    className={`group flex h-[54px] items-center rounded-[14px] border bg-white px-4 transition-colors duration-200 sm:h-[58px] sm:rounded-[15px] ${errors.password
                      ? 'border-red-400'
                      : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <KeyRound
                      size={20}
                      strokeWidth={1.8}
                      className="mr-3 shrink-0 text-slate-400"
                    />

                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="
                        h-full
                        min-w-0
                        flex-1
                        border-none
                        bg-transparent
                        text-[14px]
                        text-[#07182c]
                        outline-none
                        ring-0
                        placeholder:text-slate-400
                        focus:border-none
                        focus:outline-none
                        focus:ring-0
                        focus-visible:outline-none
                        focus-visible:ring-0
                        sm:text-[15px]
                      "
                      {...register('password', {
                        required: 'Password is required.',
                      })}
                    />

                    {/* Eye Button */}
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
                      className="
                        ml-2
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        text-slate-400
                        transition-colors
                        hover:bg-slate-100
                        hover:text-[#2876d8]
                        focus:outline-none
                        focus:ring-0
                        focus-visible:outline-none
                      "
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {errors.password?.message ? (
                    <p className="mt-2 text-xs font-medium text-red-500">
                      {errors.password.message}
                    </p>
                  ) : null}
                </div>

                {/* Server Error */}
                {serverError ? (
                  <div className="flex items-start gap-3 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>{serverError}</span>
                  </div>
                ) : null}

                {/* Sign In */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="
                    group
                    flex
                    h-[54px]
                    w-full
                    items-center
                    justify-center
                    gap-3
                    rounded-[14px]
                    bg-gradient-to-r
                    from-[#75c92f]
                    via-[#42a862]
                    to-[#2876d8]
                    px-5
                    text-[15px]
                    font-semibold
                    text-white
                    shadow-[0_10px_25px_rgba(40,118,216,0.20)]
                    transition-all
                    duration-300
                    hover:-translate-y-0.5
                    hover:shadow-[0_16px_35px_rgba(40,118,216,0.28)]
                    focus:outline-none
                    focus:ring-0
                    disabled:pointer-events-none
                    disabled:opacity-60
                    sm:h-[58px]
                  "
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>

                      <ArrowRight
                        size={18}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-7 border-t border-slate-200 pt-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck
                    size={15}
                    className="text-slate-400"
                  />

                  <p className="text-[10px] text-slate-400 sm:text-xs">
                    Customized Polycast Operations CRM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;