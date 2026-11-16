// Hero product spotlight: three cut-out product renders on a dark stage (rings, glow, floor),
// switched with the 01/02/03 buttons (aria-pressed). Slides are resolved from
// the catalog at build time (spotlightSlides() in src/lib/home.ts).
import { useState } from 'react';
import Icon from '@/components/react/Icon';
import type { SpotlightSlide } from '@/lib/home';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const callout = 'eyebrow absolute z-[2] hidden border-b border-cyan-400/60 pt-1 pb-2 text-[11px] tracking-[0.12em] text-fog lg:block';

export default function Spotlight({ slides }: { slides: SpotlightSlide[] }) {
  const [i, setI] = useState(0);
  const s = slides[i];
  if (!s) return null;

  return (
    <div aria-roledescription="carousel" aria-label="Product spotlight" className="flex w-full min-w-0 flex-col gap-3.5 lg:w-auto lg:flex-[1_1_560px]">
      <div className="eyebrow flex justify-between text-ink-300">
        <span>Product spotlight</span>
        <span>
          {s.idx} / 0{slides.length}
        </span>
      </div>

      <div className="relative flex h-[340px] items-center justify-center overflow-hidden lg:h-[560px]">
        {/* stage: faint grid fading out, teal glow, two rings, glowing floor */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(rgba(116,237,245,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(116,237,245,0.05)_1px,transparent_1px)] bg-size-[56px_56px] [mask-image:radial-gradient(ellipse_at_50%_45%,#000_30%,transparent_72%)]"
        />
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 size-[420px] -translate-1/2 rounded-full bg-[radial-gradient(circle,rgba(41,88,98,0.55)_0%,rgba(20,25,28,0)_65%)] lg:size-[640px]" />
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 size-[300px] -translate-1/2 rounded-full border border-cyan-400/25 lg:size-[540px]" />
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 size-[230px] -translate-1/2 rounded-full border border-dashed border-cyan-400/20 lg:size-[430px]" />
        <div aria-hidden="true" className="absolute bottom-[4%] left-1/2 h-[46px] w-[90%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgba(116,237,245,0.28)_0%,rgba(116,237,245,0.08)_45%,transparent_72%)] blur-[2px] lg:h-[80px]" />

        <div className="relative flex h-[88%] w-full items-end justify-center pb-[5%]">
          {slides.map((x, n) => (
            <svg
              key={x.idx}
              viewBox={x.art.viewBox}
              role={n === i ? 'img' : undefined}
              aria-label={n === i ? x.alt : undefined}
              aria-hidden={n === i ? undefined : true}
              preserveAspectRatio="xMidYMax meet"
              className={cx(
                'absolute bottom-[5%] left-1/2 h-full w-[80%] -translate-x-1/2 drop-shadow-[0_24px_30px_rgba(0,0,0,0.55)] transition-opacity duration-300',
                n === i ? 'opacity-100' : 'opacity-0',
              )}
            >
              <clipPath id={`spot-cut-${x.idx}`} clipPathUnits="userSpaceOnUse">
                <path d={x.art.d} fillRule={x.art.fillRule} clipRule={x.art.fillRule} />
              </clipPath>
              <g clipPath={`url(#spot-cut-${x.idx})`}>
                <image href={x.art.src} width={x.art.width} height={x.art.height} />
              </g>
            </svg>
          ))}
        </div>
        <span className={cx(callout, 'top-[24%] left-0 min-w-[150px]')}>{s.c1}</span>
        <span className={cx(callout, 'right-0 bottom-[26%] min-w-[150px] text-right')}>{s.c2}</span>
        <span aria-hidden="true" className="absolute top-1/2 left-[13%] hidden text-lg leading-none text-line-dark-strong lg:block">
          +
        </span>
        <span aria-hidden="true" className="absolute top-1/2 right-[3%] hidden text-lg leading-none text-line-dark-strong lg:block">
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
