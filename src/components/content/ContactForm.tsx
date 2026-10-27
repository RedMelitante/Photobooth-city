import { useId, useRef, useState, type FormEvent } from 'react';
import Icon from '@/components/react/Icon';
import { EMAIL_RE, submitContactMessage } from '@/lib/content-forms';

const TOPICS = ['Help choosing a booth', 'An existing order', 'Returns or damage', 'Something else'];
const field =
  'box-border h-[52px] w-full rounded-md border-[1.5px] border-line-strong bg-surface px-3.5 text-base font-normal text-ink-900 aria-[invalid=true]:border-sale-600';

interface Props {
  phone: string;
}

export default function ContactForm({ phone }: Props) {
  const id = useId();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [failed, setFailed] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const validateEmail = (value: string) => {
    const v = value.trim();
    if (!v) return 'Enter your email address so we can reply.';
    if (!EMAIL_RE.test(v)) return 'Enter a valid email address, like you@yourbusiness.com.';
    return '';
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') ?? '');
    const err = validateEmail(email);
    setEmailError(err);
    if (err) {
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      await submitContactMessage({
        name: String(data.get('name') ?? '').trim(),
        email: email.trim(),
        phone: String(data.get('phone') ?? '').trim(),
        topic: String(data.get('topic') ?? ''),
        comment: String(data.get('comment') ?? '').trim(),
      });
      setSent(true);
      requestAnimationFrame(() => headingRef.current?.focus());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-3.5 py-6">
        <span className="flex size-14 items-center justify-center rounded-full bg-success-700 text-white">
          <Icon name="check" size={28} stroke={2.8} />
        </span>
        <h2 ref={headingRef} tabIndex={-1} className="m-0 text-[26px] font-extrabold outline-none">
          Thanks — your message is in.
        </h2>
        <p className="m-0 text-base leading-[25px] text-ink-700">
          Our team will reply to the email you gave us. Need an answer sooner? Call {phone}.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setEmailError('');
          }}
          className="h-12 rounded-lg border-[1.5px] border-ink-900 bg-surface px-5 font-bold text-ink-900 hover:bg-chip"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <h2 id={`${id}-title`} className="m-0 mb-1 text-[22px] font-extrabold">
        Send us a message
      </h2>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-bold">
          Name
          <input name="name" type="text" autoComplete="name" className={field} />
        </label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-email`} className="text-[13px] font-bold">
            Email <span className="font-medium text-sale-600">required</span>
          </label>
          <input
            ref={emailRef}
            id={`${id}-email`}
            name="email"
            type="email"
            required
            aria-required="true"
            aria-invalid={emailError ? 'true' : 'false'}
            aria-describedby={emailError ? `${id}-email-err` : undefined}
            autoComplete="email"
            placeholder="you@yourbusiness.com"
            onBlur={(e) => emailError && setEmailError(validateEmail(e.currentTarget.value))}
            className={field}
          />
          {emailError && (
            <p id={`${id}-email-err`} className="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-sale-600">
              <Icon name="alert" size={14} />
              {emailError}
            </p>
          )}
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-bold">
          Phone number
          <input name="phone" type="tel" autoComplete="tel" className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-bold">
          <span>
            Topic <span className="font-medium text-ink-500">(optional)</span>
          </span>
          <select name="topic" className={`${field} px-3`}>
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-bold">
        Comment
        <textarea
          name="comment"
          rows={6}
          placeholder="E.g. I run a DJ business doing 6–8 weddings a month and want a roaming iPad booth that works with my 11-inch iPad Pro."
          className="box-border w-full resize-y rounded-md border-[1.5px] border-line-strong p-3.5 text-base leading-6 font-normal text-ink-900"
        />
      </label>
      {failed && (
        <p role="alert" className="m-0 rounded-md bg-sale-50 px-3 py-2.5 text-sm font-semibold text-sale-600">
          Something went wrong sending your message. Please try again or call {phone}.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <span className="text-[13px] text-ink-500">We reply by email. For faster help, call us.</span>
        <button
          type="submit"
          disabled={busy}
          className="h-14 flex-[1_1_100%] rounded-lg border-0 bg-brand-600 px-9 text-base font-extrabold text-white hover:bg-brand-700 disabled:opacity-70 sm:flex-none"
        >
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
