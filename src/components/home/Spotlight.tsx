// Hero product spotlight (Main board): three products on a gridded light disc,
// switched with the 01/02/03 buttons (aria-pressed). Slides are resolved from
// the catalog at build time (spotlightSlides() in src/lib/home.ts).
import { useState } from 'react';
import Icon from '@/components/react/Icon';
import type { SpotlightSlide } from '@/lib/home';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const callout = 'eyebrow absolute z-[2] hidden border-b border-cyan-400 bg-ink-950 pt-1 pb-1.5 text-[10px] tracking-[0.12em] text-fog lg:block';

export default function Spotlight({ slides }: { slides: SpotlightSlide[] }) {
  const [i, setI] = useState(0);
  const s = slides[i];
  if (!s) return null;

  return (
    <div aria-roledescription="carousel" aria-label="Product spotlight" className="flex min-w-0 flex-col gap-3.5 lg:flex-[1_1_560px]">
      <div className="eyebrow flex justify-between text-ink-300">
        <span>Product spotlight</span>
        <span>
          {s.idx} / 0{slides.length}
        </span>
      </div>

      <div className="relative flex h-[320px] items-center justify-center lg:h-[470px]">
        <div aria-hidden="true" className="absolute size-[330px] rounded-full border border-cyan-400/22 lg:size-[500px]" />
        <div
          aria-hidden="true"
          className="absolute size-[260px] overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_42%,#F4F7F7_0%,#DCE5E5_62%,#B9C8C9_100%)] shadow-[0_0_0_10px_rgba(116,237,245,0.06),0_40px_80px_-20px_rgba(116,237,245,0.35)] lg:size-[380px]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,19,22,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(16,19,22,0.06)_1px,transparent_1px)] bg-size-[28px_28px]" />
        </div>
        <div className="relative size-[230px] lg:size-[350px]">
          {slides.map((x, n) => (
            <img
              key={x.idx}
              src={x.img}
              alt={n === i ? x.name : ''}
              aria-hidden={n === i ? undefined : true}
              width="350"
              height="350"
              loading={n === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className={cx('absolute inset-0 size-full object-contain mix-blend-multiply transition-opacity duration-300', n === i ? 'opacity-100' : 'opacity-0')}
            />
          ))}
        </div>
        <span className={cx(callout, 'top-[22%] left-0')}>{s.c1}</span>
        <span className={cx(callout, 'right-0 bottom-[20%] text-right')}>{s.c2}</span>
        <span aria-hidden="true" className="absolute top-1/2 left-[14%] hidden text-lg leading-none text-line-dark-strong lg:block">
          +
        </span>
        <span aria-hidden="true" className="absolute top-1/2 right-[2%] hidden text-lg leading-none text-line-dark-strong lg:block">
          +
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1" aria-live="polite">
          <span className="eyebrow text-ink-300">
            {s.idx} / {s.type}
          </span>
          <a href={s.href} className="text-[20px] leading-tight font-extrabold tracking-[-0.045em] text-pretty text-[#F6F8F8] no-underline hover:text-cyan-400 lg:text-[22px]">
            {s.name}
            <Icon name="arrow-right" size={16} stroke={2.4} className="ml-2 inline-block align-[-2px]" />
          </a>
          <span className="text-sm font-extrabold text-cyan-400">
            {s.price} <span className="text-[9px] tracking-[0.04em]">USD</span>
          </span>
        </div>
        <div role="group" aria-label="Choose product" className="flex flex-none gap-1.5">
          {slides.map((x, n) => {
            const on = n === i;
            return (
              <button
                key={x.idx}
                type="button"
                aria-pressed={on}
                aria-label={x.name}
                onClick={() => setI(n)}
                className={cx(
                  'eyebrow h-[34px] w-[38px] rounded-sm border text-[11px] tracking-[0.06em] transition-colors',
                  on ? 'border-cyan-400 bg-cyan-400/12 text-cyan-400' : 'border-line-dark bg-transparent text-fog hover:border-line-dark-strong',
                )}
              >
                {x.idx}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
