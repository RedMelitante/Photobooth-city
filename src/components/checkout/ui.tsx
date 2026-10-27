import type { ReactNode } from 'react';
import Icon from '@/components/react/Icon';

const inputBase =
  'box-border h-[52px] w-full rounded-md border-[1.5px] bg-surface px-3 text-base font-normal text-ink-900 placeholder:text-ink-500 lg:px-3.5';

export function inputClass(invalid: boolean) {
  return `${inputBase} ${invalid ? 'border-sale-600' : 'border-line-strong'}`;
}

interface FieldProps {
  id: string;
  label: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
  children: (a11y: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; className: string }) => ReactNode;
}

/** Label + control + inline error (role=alert) + optional hint, as in the design's field stack. */
export function Field({ id, label, error, hint, className = '', children }: FieldProps) {
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-bold text-ink-900">
        {label}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy, className: inputClass(!!error) })}
      {error && (
        <span id={`${id}-err`} className="flex items-center gap-1.5 text-[13px] font-semibold text-sale-600">
          <Icon name="alert" size={14} stroke={2.4} />
          {error}
        </span>
      )}
      {hint && (
        <span id={`${id}-hint`} className="text-[13px] font-medium text-ink-500">
          {hint}
        </span>
      )}
    </div>
  );
}

export const Optional = () => <span className="font-medium text-ink-500">(optional)</span>;

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="m-0 size-5 flex-none accent-brand-600" />
      {children}
    </label>
  );
}

export function AlertCircle({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px flex-none text-sale-600">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </svg>
  );
}

export function DeclinedAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-lg border-[1.5px] border-sale-600 bg-sale-50 px-4 py-3.5 text-left text-sm leading-5 text-ink-900">
      <AlertCircle />
      <span>{children}</span>
    </div>
  );
}

export function Spinner({ size = 40, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg className="animate-spin [animation-duration:900ms]" width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="16" stroke={light ? 'rgb(255 255 255 / 0.35)' : 'var(--color-brand-100)'} strokeWidth="5" />
      <path d="M20 4a16 16 0 0 1 16 16" stroke={light ? '#fff' : 'var(--color-brand-600)'} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export const linkBtn = 'border-0 bg-transparent p-0 font-bold text-brand-600 hover:text-brand-700';
export const primaryBtn =
  'flex h-14 items-center justify-center gap-2.5 rounded-lg bg-brand-600 px-8 text-base font-extrabold text-white no-underline hover:bg-brand-700 hover:text-white disabled:opacity-70';
