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
      className="relative min-h-[100dvh] overflow-hidden bg-slate-950"
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

        <section className="hidden min-h-[100dvh] min-w-0 flex-col justify-between px-8 py-8 lg:flex xl:px-12 xl:py-10">

          {/* Logo */}
          <div className="shrink-0">
            <div className="inline-flex rounded-[22px] bg-white px-5 py-3 shadow-[0_15px_40px_rgba(0,0,0,0.20)]">
              <img
                src={logo}
                alt="Customized Polycast"
                className="h-[30px] w-auto max-w-[220px] sm:justify-center object-contain xl:h-[62px] xl:max-w-[240px]"
              />
            </div>
          </div>

          {/* Hero Content */}
          <div className="my-4 max-w-[650px]">
            <div className="flex items-center gap-3">
              <span className="h-[2px] w-10 bg-[#8bcf32]" />

              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8bcf32] xl:text-sm">
                Operations CRM
              </p>
            </div>

            <h1 className="mt-5 text-[40px] font-bold leading-[1.03] tracking-[-0.045em] text-white xl:text-[52px] 2xl:text-[62px]">
              Manage your entire

              <span className="block text-[#8bcf32]">
                operation
              </span>

              from one place
              <span className="text-[#8bcf32]">.</span>
            </h1>

            <p className="mt-6 max-w-[540px] text-[14px] leading-7 text-white/75 xl:text-[16px] xl:leading-8">
              Purchasing, stock, production, orders, dispatch,
              payments and reports — connected in one secure
              workspace.
            </p>

            {/* Feature Cards */}
            <div className="mt-8 grid max-w-[650px] grid-cols-4 gap-2 2xl:grid-cols-4 2xl:gap-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={`${feature.title}-${feature.subtitle}`}
                    className="group flex items-center gap-3 rounded-[18px] border border-white/15 bg-[#071e2a]/45 px-4 py-3 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#8bcf32]/40 hover:bg-[#071e2a]/65 2xl:block 2xl:px-3 2xl:py-4 2xl:text-center"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#8bcf32]/20 bg-[#8bcf32]/10 text-[#8bcf32] 2xl:mx-auto">
                      <Icon
                        className="h-5 w-5"
                        strokeWidth={1.8}
                      />
                    </div>

                    <p className="text-xs font-semibold leading-5 text-white 2xl:mt-3">
                      {feature.title}

                      <span className="block text-white/70">
                        {feature.subtitle}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==========================================================
            RIGHT LOGIN SIDE
        ========================================================== */}

        <section className="relative flex min-h-[100dvh] items-center justify-center px-4 pb-6 pt-24 sm:px-6 sm:pt-28 md:px-10 lg:px-8 lg:py-8 xl:px-10">

          {/* Login Container */}
          <div className="relative z-10 w-full max-w-[450px]">

            {/* Login Card */}
            <div className="rounded-[24px] border border-white/60 bg-white/[0.96] px-5 py-6 shadow-[0_30px_90px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:rounded-[28px] sm:px-8 sm:py-5 xl:rounded-[30px] xl:px-10 xl:py-5">

              {/* Secure Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#eff9e9] px-3.5 py-1">
                <ShieldCheck
                  size={17}
                  className="text-[#63b52b]"
                />

                <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#4d9b22] sm:text-[11px]">
                  Secure Access
                </span>
              </div>

              {/* Header */}
              <div className=" sm:mt-6">
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
                className="mt-2 space-y-6 sm:mt-4 sm:space-y-5"
              >
                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-4 block text-md font-bold text-[#0b1f35]"
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
                        text-[12px]
                        text-[#07182c]
                        outline-none
                        ring-0
                        focus:bg-none
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
                    className="mb-4 block text-sm font-bold text-[#0b1f35]"
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
                        focus:bg-none
                        min-w-0
                        flex-1
                        border-none
                        bg-transparent
                        text-[12px]
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
              <div className="mt-2 border-t border-slate-200 pt-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck
                    size={15}
                    className="text-slate-400"
                  />

                  <p className="text-[16px] text-slate-400 sm:text-xs">
                    Customized Polycast Operations CRM
                  </p>
                </div>
              </div>
            </div>

            {/* Copyright */}

          </div>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;