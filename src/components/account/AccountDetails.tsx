import { useState } from 'react';
import { updateCustomer, validateEmail, type Customer } from '@/lib/account';
import { PAGES } from '@/lib/routes';
import { btnOutline, btnPrimary, inputCls, labelCls } from './ui';

export default function AccountDetails({ customer, onSaved }: { customer: Customer; onSaved: (c: Customer) => void }) {
  const [d, setD] = useState({ firstName: customer.firstName, lastName: customer.lastName, email: customer.email, acceptsMarketing: customer.acceptsMarketing });
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [formErr, setFormErr] = useState('');

  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setD((x) => ({ ...x, [k]: k === 'acceptsMarketing' ? e.target.checked : e.target.value }));
    if (k === 'email') setEmailErr(null);
    setStatus('idle');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(d.email);
    setEmailErr(err);
    if (err) {
      document.getElementById('acct-details-email')?.focus();
      return;
    }
    setStatus('saving');
    const r = await updateCustomer(d);
    if (r.ok) {
      onSaved(r.data);
      setStatus('saved');
    } else {
      setFormErr(r.error);
      setStatus('error');
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex max-w-[560px] flex-col gap-3.5">
      <h2 className="mb-1 text-[22px] font-extrabold">Account details</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          First name
          <input type="text" autoComplete="given-name" value={d.firstName} onChange={set('firstName')} className={inputCls} />
        </label>
        <label className={labelCls}>
          Last name
          <input type="text" autoComplete="family-name" value={d.lastName} onChange={set('lastName')} className={inputCls} />
        </label>
      </div>
      <label className={labelCls}>
        Email
        <input
          id="acct-details-email"
          type="email"
          autoComplete="email"
          placeholder="you@yourbusiness.com"
          value={d.email}
          onChange={set('email')}
          aria-invalid={emailErr ? true : undefined}
          aria-describedby={emailErr ? 'acct-details-email-err' : undefined}
          className={inputCls + (emailErr ? ' border-sale-600!' : '')}
        />
        {emailErr && (
          <span id="acct-details-email-err" className="text-[13px] font-semibold text-sale-600">
            {emailErr}
          </span>
        )}
      </label>
      <label className="flex min-h-8 items-center gap-2.5 text-sm">
        <input type="checkbox" checked={d.acceptsMarketing} onChange={set('acceptsMarketing')} className="m-0 size-5 flex-none accent-brand-600" />
        Email me flash sales and new booth launches
      </label>
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={status === 'saving'} className={btnPrimary}>
          {status === 'saving' ? 'Saving…' : 'Save changes'}
        </button>
        <a href={`${PAGES.login}#recover`} className={btnOutline}>
          Change password
        </a>
        <span role="status" className="text-sm font-bold text-success-700">
          {status === 'saved' ? 'Changes saved' : ''}
        </span>
      </div>
      {status === 'error' && (
        <p role="alert" className="rounded-md bg-sale-50 px-3.5 py-3 text-sm font-semibold text-sale-600">
          {formErr}
        </p>
      )}
    </form>
  );
}
