import { useEffect, useRef, useState } from 'react';
import { deleteAddress, listAddresses, saveAddress, type Address } from '@/lib/account';
import { US_STATES } from '@/lib/commerce';
import { btnOutline, btnPrimary, inputCls, labelCls } from './ui';

type Draft = Omit<Address, 'id'> & { id?: string };

const EMPTY: Draft = { firstName: '', lastName: '', company: '', address1: '', city: '', province: '', postalCode: '', country: 'United States', isDefault: false };

const REQUIRED: [keyof Draft, string][] = [
  ['firstName', 'Enter a first name.'],
  ['lastName', 'Enter a last name.'],
  ['address1', 'Enter an address.'],
  ['city', 'Enter a city.'],
  ['province', 'Select a state.'],
  ['postalCode', 'Enter a ZIP code.'],
];

function AddressForm({ initial, onCancel, onSaved }: { initial: Draft; onCancel: () => void; onSaved: (list: Address[]) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    ref.current?.querySelector('input')?.focus();
  }, []);

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setD((x) => ({ ...x, [k]: v }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: typeof errors = {};
    for (const [k, msg] of REQUIRED) if (!String(d[k]).trim()) er[k] = msg;
    if (d.postalCode.trim() && !/^\d{5}(-\d{4})?$/.test(d.postalCode.trim())) er.postalCode = 'Enter a 5-digit ZIP code.';
    setErrors(er);
    const first = REQUIRED.find(([k]) => er[k]) ?? (er.postalCode ? ['postalCode'] : null);
    if (first) {
      ref.current?.querySelector<HTMLElement>(`[name="${first[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    onSaved(await saveAddress({ ...d, postalCode: d.postalCode.trim() }));
    setBusy(false);
  };

  const field = (k: keyof Draft, label: string, auto: string, extra = '') => (
    <label className={labelCls + ' ' + extra}>
      {label}
      <input
        name={k}
        type="text"
        autoComplete={auto}
        value={String(d[k])}
        onChange={set(k)}
        aria-invalid={errors[k] ? true : undefined}
        aria-describedby={errors[k] ? `addr-${k}-err` : undefined}
        className={inputCls + (errors[k] ? ' border-sale-600!' : '')}
      />
      {errors[k] && (
        <span id={`addr-${k}-err`} className="text-[13px] font-semibold text-sale-600">
          {errors[k]}
        </span>
      )}
    </label>
  );

  return (
    <form ref={ref} noValidate onSubmit={submit} aria-label={d.id ? 'Edit address' : 'Add a new address'} className="col-span-full flex max-w-[560px] flex-col gap-3.5 rounded-[18px] border border-line p-5">
      <strong className="text-base">{d.id ? 'Edit address' : 'Add a new address'}</strong>
      <div className="grid grid-cols-2 gap-3">
        {field('firstName', 'First name', 'given-name')}
        {field('lastName', 'Last name', 'family-name')}
      </div>
      {field('company', 'Company (optional)', 'organization')}
      {field('address1', 'Address', 'address-line1')}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
        {field('city', 'City', 'address-level2', 'col-span-2 sm:col-span-1')}
        <label className={labelCls}>
          State
          <select
            name="province"
            autoComplete="address-level1"
            value={d.province}
            onChange={set('province')}
            aria-invalid={errors.province ? true : undefined}
            aria-describedby={errors.province ? 'addr-province-err' : undefined}
            className={inputCls + ' pr-2' + (errors.province ? ' border-sale-600!' : '')}
          >
            <option value="">—</option>
            {US_STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          {errors.province && <span id="addr-province-err" className="text-[13px] font-semibold text-sale-600">{errors.province}</span>}
        </label>
        {field('postalCode', 'ZIP code', 'postal-code')}
      </div>
      <label className="flex min-h-8 items-center gap-2.5 text-sm font-medium">
        <input type="checkbox" checked={d.isDefault} onChange={set('isDefault')} className="m-0 size-5 flex-none accent-brand-600" />
        Set as default address
      </label>
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Saving…' : 'Save address'}
        </button>
        <button type="button" onClick={onCancel} className={btnOutline}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AccountAddresses() {
  const [list, setList] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void listAddresses().then(setList);
  }, []);

  const done = (next?: Address[]) => {
    if (next) setList(next);
    setEditing(null);
    requestAnimationFrame(() => addRef.current?.focus());
  };

  return (
    <div className="flex flex-col gap-3.5">
      <h2 className="mb-1 text-[22px] font-extrabold">Addresses</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-3.5">
        {(list ?? []).map((a) =>
          editing?.id === a.id ? null : (
            <div key={a.id} className={'flex flex-col gap-1.5 rounded-[18px] border-2 p-5 text-[15px] leading-[23px] ' + (a.isDefault ? 'border-ink-900' : 'border-line')}>
              {a.isDefault && <span className="self-start rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-extrabold text-white">Default</span>}
              <strong>
                {a.firstName} {a.lastName}
              </strong>
              <span className="text-ink-700">
                {a.company && (
                  <>
                    {a.company}
                    <br />
                  </>
                )}
                {a.address1}
                <br />
                {a.city}, {a.province} {a.postalCode}
                <br />
                {a.country}
              </span>
              <span className="mt-1.5 flex gap-4">
                <button type="button" onClick={() => setEditing(a)} className="-my-2.5 min-h-11 border-0 bg-transparent p-0 font-bold text-brand-600 underline hover:text-brand-700" aria-label={`Edit address for ${a.firstName} ${a.lastName}`}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void deleteAddress(a.id).then((n) => done(n))}
                  className="-my-2.5 min-h-11 border-0 bg-transparent p-0 font-bold text-ink-700 underline hover:text-ink-900"
                  aria-label={`Delete address for ${a.firstName} ${a.lastName}`}
                >
                  Delete
                </button>
              </span>
            </div>
          ),
        )}
        {editing ? (
          <AddressForm key={editing.id ?? 'new'} initial={editing} onCancel={() => done()} onSaved={(n) => done(n)} />
        ) : (
          <button
            ref={addRef}
            type="button"
            onClick={() => setEditing({ ...EMPTY, isDefault: !list?.length })}
            className="min-h-[180px] rounded-[18px] border-2 border-dashed border-line-strong bg-surface text-[15px] font-extrabold text-ink-900 transition-colors hover:border-ink-900"
          >
            + Add a new address
          </button>
        )}
      </div>
    </div>
  );
}
