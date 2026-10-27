import { useEffect, useId, useRef, useState } from 'react';
import { login, register, reset, validateEmail, validatePassword } from '@/lib/account';
import { PAGES } from '@/lib/routes';

export type AuthMode = 'login' | 'register' | 'recover';

const COPY = {
  login: { heading: 'Welcome back', sub: 'Log in to track orders and check out faster.', cta: 'Sign in', busy: 'Signing in…', switchText: 'New to Photobooth City?', switchLink: 'Create an account', switchTo: 'register' },
  register: { heading: 'Create your account', sub: 'Save your details, track shipments and reorder in seconds.', cta: 'Create account', busy: 'Creating account…', switchText: 'Already have an account?', switchLink: 'Log in', switchTo: 'login' },
  recover: { heading: 'Reset your password', sub: 'We will send you an email to reset your password.', cta: 'Submit', busy: 'Sending…', switchText: 'Remembered it?', switchLink: 'Back to log in', switchTo: 'login' },
} as const;

/** URL each mode lives at, so reloads and shared links keep the mode. */
const MODE_URL: Record<AuthMode, string> = {
  login: PAGES.login,
  register: PAGES.register,
  recover: `${PAGES.login}#recover`,
};

type Errors = Partial<Record<'email' | 'password' | 'form', string>>;

const inputCls =
  'box-border h-[52px] w-full rounded-md border-[1.5px] border-line-strong bg-surface px-3.5 text-base font-medium text-ink-900 placeholder:font-normal placeholder:text-ink-500';
const invalidCls = ' border-sale-600!';
const labelCls = 'flex flex-col gap-1.5 text-[13px] font-bold text-ink-900';

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <span id={id} className="flex items-start gap-1.5 text-[13px] leading-[18px] font-semibold text-sale-600">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-px flex-none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.01" />
      </svg>
      {msg}
    </span>
  );
}

export default function AuthForm({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [shopNote, setShopNote] = useState(false);
  const [fields, setFields] = useState({ firstName: '', lastName: '', email: '', password: '', marketing: true });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();
  const ids = { email: `${uid}-email`, emailErr: `${uid}-email-err`, pw: `${uid}-pw`, pwErr: `${uid}-pw-err`, pwHint: `${uid}-pw-hint`, form: `${uid}-form-err` };
  const copy = COPY[mode];
  const on = (m: AuthMode) => mode === m;

  // Shopify-style deep link: /account/login#recover opens the reset form.
  useEffect(() => {
    const fromHash = () => {
      if (window.location.hash === '#recover') setMode('recover');
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  const go = (m: AuthMode, focus = true) => {
    setMode(m);
    setErrors({});
    setSent(null);
    setShopNote(false);
    try {
      window.history.replaceState(null, '', MODE_URL[m]);
    } catch {
      /* ignore */
    }
    if (focus) requestAnimationFrame(() => headingRef.current?.focus());
  };

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = k === 'marketing' ? e.target.checked : e.target.value;
    setFields((f) => ({ ...f, [k]: v }));
    if (k === 'email' || k === 'password') setErrors((er) => (er[k] || er.form ? { ...er, [k]: undefined, form: undefined } : er));
  };

  const validate = (): Errors => {
    const er: Errors = {};
    const e = validateEmail(fields.email);
    if (e) er.email = e;
    if (mode !== 'recover') {
      const p = validatePassword(fields.password);
      if (p) er.password = p;
    }
    return er;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    const er = validate();
    setErrors(er);
    if (er.email || er.password) {
      document.getElementById(er.email ? ids.email : ids.pw)?.focus();
      return;
    }
    setBusy(true);
    try {
      if (mode === 'recover') {
        const r = await reset(fields.email);
        if (r.ok) setSent(fields.email.trim());
        else setErrors({ [r.field ?? 'form']: r.error });
        return;
      }
      const r =
        mode === 'login'
          ? await login(fields.email, fields.password)
          : await register({ firstName: fields.firstName, lastName: fields.lastName, email: fields.email, password: fields.password, acceptsMarketing: fields.marketing });
      if (r.ok) {
        window.location.href = PAGES.account;
        return;
      }
      setErrors({ [r.field === 'password' ? 'password' : r.field === 'email' ? 'email' : 'form']: r.error });
    } finally {
      setBusy(false);
    }
  };

  const tabCls = (active: boolean) =>
    'h-12 rounded-md border-0 text-[15px] font-extrabold text-ink-900 transition-[background-color,box-shadow] duration-150 ' +
    (active ? 'bg-surface shadow-[0_1px_3px_rgb(11_16_32/0.15)]' : 'bg-transparent hover:bg-surface/60');

  return (
    <div className="flex flex-col gap-[22px]">
      {!on('recover') && (
        <div role="tablist" aria-label="Account" className="grid grid-cols-2 rounded-[14px] bg-chip p-1">
          <button type="button" role="tab" aria-selected={on('login')} onClick={() => go('login', false)} className={tabCls(on('login'))}>
            Log in
          </button>
          <button type="button" role="tab" aria-selected={on('register')} onClick={() => go('register', false)} className={tabCls(on('register'))}>
            Create account
          </button>
        </div>
      )}

      <h1 id="acct-title" ref={headingRef} tabIndex={-1} className="m-0 font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] outline-none lg:text-5xl">
        {copy.heading}
      </h1>
      <p className="-mt-2 text-base leading-6 text-ink-700">{copy.sub}</p>

      {on('login') && (
        <>
          <button
            type="button"
            aria-label="Sign in with Shop"
            onClick={() => setShopNote(true)}
            className="flex h-[52px] items-center justify-center gap-2 rounded-lg border-0 bg-[#5A31F4] text-base font-extrabold text-white transition-colors hover:bg-[#4A22E0]"
          >
            Sign in with <span className="font-display text-xl font-extrabold tracking-[-0.02em]">shop</span>
          </button>
          {shopNote && (
            <p role="status" className="-mt-3 text-[13px] font-semibold text-ink-700">
              Shop sign-in isn’t connected yet. Use your email below.
            </p>
          )}
          <p aria-hidden="true" className="flex items-center gap-3 text-[13px] font-bold text-ink-500">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </p>
        </>
      )}

      {sent ? (
        <div role="status" className="flex flex-col gap-3.5">
          <div className="flex gap-3 rounded-card bg-success-50 p-4 text-[15px] leading-[22px] text-ink-900">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-px flex-none text-success-700" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            <span>
              We’ve sent you an email with a link to update your password. Check <strong>{sent}</strong>.
            </span>
          </div>
          <button type="button" onClick={() => go('login')} className="h-12 rounded-lg border-[1.5px] border-line-strong bg-surface text-[15px] font-bold text-ink-900 hover:border-ink-900">
            Back to log in
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} aria-describedby={errors.form ? ids.form : undefined} className="flex flex-col gap-3.5">
          {on('register') && (
            <div className="grid grid-cols-2 gap-3">
              <label className={labelCls}>
                First name
                <input type="text" autoComplete="given-name" value={fields.firstName} onChange={set('firstName')} className={inputCls} />
              </label>
              <label className={labelCls}>
                Last name
                <input type="text" autoComplete="family-name" value={fields.lastName} onChange={set('lastName')} className={inputCls} />
              </label>
            </div>
          )}
          <div className={labelCls}>
            <label htmlFor={ids.email}>Email</label>
            <input
              id={ids.email}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@yourbusiness.com"
              value={fields.email}
              onChange={set('email')}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? ids.emailErr : undefined}
              className={inputCls + (errors.email ? invalidCls : '')}
            />
            <FieldError id={ids.emailErr} msg={errors.email} />
          </div>

          {!on('recover') && (
            <div className={labelCls}>
              <span className="flex items-center justify-between gap-3">
                <label htmlFor={ids.pw}>Password</label>
                {on('login') && (
                  <button type="button" onClick={() => go('recover')} className="-my-3 min-h-11 border-0 bg-transparent p-0 text-[13px] font-bold text-brand-600 underline hover:text-brand-700">
                    Forgot your password?
                  </button>
                )}
              </span>
              <span className="relative flex">
                <input
                  id={ids.pw}
                  type={showPw ? 'text' : 'password'}
                  autoComplete={on('register') ? 'new-password' : 'current-password'}
                  value={fields.password}
                  onChange={set('password')}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={[errors.password ? ids.pwErr : '', on('register') ? ids.pwHint : ''].filter(Boolean).join(' ') || undefined}
                  className={inputCls + ' pr-[72px]' + (errors.password ? invalidCls : '')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  aria-pressed={showPw}
                  className="absolute top-1.5 right-1.5 h-10 rounded-lg border-0 bg-chip px-3 text-[13px] font-bold text-ink-900 hover:bg-line"
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </span>
              <FieldError id={ids.pwErr} msg={errors.password} />
              {on('register') && (
                <span id={ids.pwHint} className="font-medium text-ink-500">
                  At least 8 characters
                </span>
              )}
            </div>
          )}

          {on('register') && (
            <label className="flex min-h-8 items-center gap-2.5 text-sm font-medium text-ink-900">
              <input type="checkbox" checked={fields.marketing} onChange={set('marketing')} className="m-0 size-5 flex-none accent-brand-600" />
              Email me flash sales and new booth launches
            </label>
          )}

          {errors.form && (
            <p id={ids.form} role="alert" className="rounded-md bg-sale-50 px-3.5 py-3 text-sm font-semibold text-sale-600">
              {errors.form}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="mt-1.5 h-14 rounded-lg border-0 bg-brand-600 text-base font-extrabold text-white transition-colors hover:bg-brand-700 disabled:cursor-progress disabled:opacity-80"
          >
            {busy ? copy.busy : copy.cta}
          </button>
          {on('recover') && (
            <button type="button" onClick={() => go('login')} className="h-12 rounded-lg border-[1.5px] border-line-strong bg-surface text-[15px] font-bold text-ink-900 hover:border-ink-900">
              Cancel — back to log in
            </button>
          )}
        </form>
      )}

{!sent && (
      <p className="m-0 text-sm text-ink-700">
        {copy.switchText}{' '}
        <button type="button" onClick={() => go(copy.switchTo)} className="border-0 bg-transparent p-0 text-sm font-extrabold text-brand-600 underline hover:text-brand-700">
          {copy.switchLink}
        </button>
      </p>
      )}
    </div>
  );
}
