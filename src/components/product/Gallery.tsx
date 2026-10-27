import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/react/Icon';
import { sized } from '@/lib/product';
import type { ProductImage } from '@/lib/types';

interface Props {
  images: ProductImage[];
  title: string;
  /** 'pdp' = vertical thumbs + captions + Zoom button (Ring Roamer design) */
  layout: 'pdp' | 'template';
  labels?: string[];
  labelsMobile?: string[];
  sale?: boolean;
  soldOut?: boolean;
}

const LENS = 200;

const srcset = (url: string) => (url.includes('cdn.shopify.com') ? [600, 900, 1200, 1600].map((w) => `${sized(url, w)} ${w}w`).join(', ') : undefined);

export default function Gallery({ images, title, layout, labels = [], labelsMobile = [], sale = false, soldOut = false }: Props) {
  const pdp = layout === 'pdp';
  const imgs = images.length ? images : [{ url: '', alt: title }];
  const n = imgs.length;
  const multi = n > 1;
  const [idx, setIdx] = useState(0);
  const [mIdx, setMIdx] = useState(0);
  const [lens, setLens] = useState<{ x: number; y: number; bx: number; by: number; bw: number; bh: number } | null>(null);
  const [lbIdx, setLbIdx] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const cur = imgs[idx];
  const altFor = (i: number) => (labels[i] ? `${title} — ${labels[i]}` : imgs[i].alt || title);

  // ── 2× lens (desktop, fine pointer only) ──────────────────────────
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !mainRef.current || !imgRef.current) return;
    const img = imgRef.current;
    const r = mainRef.current.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(img).paddingLeft) || 0;
    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;
    const cw = r.width - pad * 2;
    const ch = r.height - pad * 2;
    const k = Math.min(cw / nw, ch / nh);
    const rw = nw * k;
    const rh = nh * k;
    const rx = r.left + pad + (cw - rw) / 2;
    const ry = r.top + pad + (ch - rh) / 2;
    const mx = e.clientX;
    const my = e.clientY;
    if (mx < rx || mx > rx + rw || my < ry || my > ry + rh) return setLens(null);
    setLens({
      x: mx - r.left - LENS / 2,
      y: my - r.top - LENS / 2,
      bw: rw * 2,
      bh: rh * 2,
      bx: -((mx - rx) * 2 - LENS / 2),
      by: -((my - ry) * 2 - LENS / 2),
    });
  };

  // ── lightbox ──────────────────────────────────────────────────────
  const openLightbox = (i: number, from?: HTMLElement | null) => {
    if (!cur.url) return;
    opener.current = from ?? (document.activeElement as HTMLElement);
    setLbIdx(i);
    setLens(null);
    dialogRef.current?.showModal();
    document.documentElement.style.overflow = 'hidden';
  };
  const closeLightbox = () => dialogRef.current?.close();
  const step = useCallback((d: number) => setLbIdx((i) => (i + d + n) % n), [n]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClose = () => {
      document.documentElement.style.overflow = '';
      opener.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    dlg.addEventListener('close', onClose);
    dlg.addEventListener('keydown', onKey);
    return () => {
      dlg.removeEventListener('close', onClose);
      dlg.removeEventListener('keydown', onKey);
    };
  }, [step]);

  // ── mobile carousel (scroll-snap) ─────────────────────────────────
  const onScroll = () => {
    const t = trackRef.current;
    if (!t) return;
    setMIdx(Math.round(t.scrollLeft / t.clientWidth));
  };
  const goTo = (i: number) => {
    const t = trackRef.current;
    if (!t) return;
    const j = (i + n) % n;
    t.scrollTo({ left: j * t.clientWidth, behavior: 'smooth' });
  };

  const counter = (i: number) => `${i + 1} / ${n}`;

  const thumbs = (vertical: boolean) => (
    <ul className={'m-0 flex list-none gap-3 p-0 ' + (vertical ? 'flex-none flex-col' : 'overflow-x-auto pb-1 [scrollbar-width:thin]')} aria-label="Image thumbnails">
      {imgs.map((im, i) => (
        <li key={im.url + i} className="flex-none">
          <button
            type="button"
            onClick={() => setIdx(i)}
            aria-label={pdp && labels[i] ? `View image: ${labels[i]}` : `View image ${i + 1} of ${n}`}
            aria-current={i === idx}
            className={'flex size-[84px] items-center justify-center overflow-hidden rounded-lg border-2 bg-canvas p-0 transition-colors duration-150 ' + (i === idx ? 'border-ink-900' : 'border-transparent hover:border-line-strong')}
          >
            <img src={sized(im.url, 200)} alt="" width={84} height={84} loading="lazy" decoding="async" className={'product-shot size-full ' + (pdp ? '' : 'p-1')} />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label="Product images" className="min-w-0">
      {/* ── Desktop ── */}
      <div className={'max-lg:hidden ' + (pdp ? 'flex gap-4' : 'flex flex-col gap-3')}>
        {pdp && multi && thumbs(true)}
        <div
          ref={mainRef}
          className={'relative aspect-square min-w-0 flex-1 overflow-hidden rounded-[20px] bg-canvas ' + (cur.url ? 'cursor-zoom-in' : '')}
          onPointerMove={onMove}
          onPointerLeave={() => setLens(null)}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            openLightbox(idx, e.currentTarget.querySelector('button'));
          }}
        >
          {cur.url && (
            <img
              ref={imgRef}
              key={cur.url}
              src={sized(cur.url, 1200)}
              srcSet={srcset(cur.url)}
              sizes="(min-width: 1440px) 760px, 60vw"
              alt={altFor(idx)}
              width={1200}
              height={1200}
              fetchPriority="high"
              decoding="async"
              className={'product-shot absolute inset-0 size-full animate-fade-in ' + (pdp ? 'p-[4%]' : 'p-[5%]') + (soldOut ? ' opacity-60' : '')}
            />
          )}
          {lens && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute z-10 rounded-full border-[3px] border-white bg-canvas bg-no-repeat shadow-pop"
              style={{
                width: LENS,
                height: LENS,
                left: lens.x,
                top: lens.y,
                backgroundImage: `url("${sized(cur.url, 1600)}")`,
                backgroundSize: `${lens.bw}px ${lens.bh}px`,
                backgroundPosition: `${lens.bx}px ${lens.by}px`,
                backgroundBlendMode: 'multiply',
              }}
            />
          )}
          {pdp ? (
            <>
              {labels[idx] && <span className="absolute top-5 left-5 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink-700">{labels[idx]}</span>}
              {!labels[idx] && sale && <span className="absolute top-5 left-5 rounded-full bg-sale-600 px-3 py-1.5 text-xs font-extrabold text-white">Sale</span>}
              {cur.url && (
                <button
                  type="button"
                  onClick={(e) => openLightbox(idx, e.currentTarget)}
                  aria-label="Zoom image"
                  className="absolute right-5 bottom-5 flex h-11 cursor-zoom-in items-center gap-2 rounded-full bg-surface px-4 text-[13px] font-bold text-ink-900 shadow-pop"
                >
                  <Icon name="zoom" size={18} stroke={2.2} />
                  Zoom
                </button>
              )}
              <span className="absolute bottom-6 left-5 text-xs font-bold text-ink-500">{counter(idx)}</span>
            </>
          ) : (
            <>
              {sale && <span className="absolute top-4 left-4 rounded-full bg-sale-600 px-3 py-1.5 text-xs font-extrabold text-white">Sale</span>}
              {soldOut && <span className="absolute top-4 left-4 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-extrabold text-white">Sold out</span>}
              <span className="absolute right-4 bottom-4 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-ink-700">{counter(idx)}</span>
              {cur.url && (
                <button type="button" onClick={(e) => openLightbox(idx, e.currentTarget)} className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:rounded-full focus:bg-surface focus:px-3 focus:py-1.5 focus:text-xs focus:font-bold">
                  Open full-screen image
                </button>
              )}
            </>
          )}
        </div>
        {!pdp && multi && thumbs(false)}
      </div>

      {/* ── Mobile: swipe carousel ── */}
      <div className="lg:hidden" aria-roledescription="carousel">
        <div className="relative aspect-square overflow-hidden rounded-[20px] bg-canvas">
          <div ref={trackRef} onScroll={onScroll} className="snap-row size-full">
            {imgs.map((im, i) => (
              <div key={im.url + i} className="relative size-full flex-none" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}`}>
                {im.url && (
                  <img
                    src={sized(im.url, 900)}
                    srcSet={srcset(im.url)}
                    sizes="100vw"
                    alt={labelsMobile[i] ? `${title} — ${labelsMobile[i]}` : altFor(i)}
                    width={900}
                    height={900}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className={'product-shot absolute inset-0 size-full p-[6%] ' + (soldOut ? 'opacity-60' : '')}
                  />
                )}
              </div>
            ))}
          </div>
          {pdp && labelsMobile[mIdx] ? (
            <span className="pointer-events-none absolute top-3.5 left-3.5 rounded-full bg-surface px-2.5 py-[5px] text-[11px] font-bold text-ink-700">{labelsMobile[mIdx]}</span>
          ) : sale ? (
            <span className="pointer-events-none absolute top-3.5 left-3.5 rounded-full bg-sale-600 px-2.5 py-[5px] text-xs font-extrabold text-white">Sale</span>
          ) : soldOut ? (
            <span className="pointer-events-none absolute top-3.5 left-3.5 rounded-full bg-ink-900 px-2.5 py-[5px] text-xs font-extrabold text-white">Sold out</span>
          ) : null}
          {multi && (
            <>
              <span className="pointer-events-none absolute top-3.5 right-3.5 rounded-full bg-ink-950/75 px-2.5 py-[5px] text-xs font-bold text-white">{counter(mIdx)}</span>
              <button type="button" onClick={() => goTo(mIdx - 1)} aria-label="Previous image" className="absolute top-1/2 left-2.5 -mt-[22px] flex size-11 items-center justify-center rounded-full bg-surface text-ink-900 shadow-[0_4px_12px_rgb(11_16_32/0.15)]">
                <Icon name="chevron-left" size={18} stroke={2.4} />
              </button>
              <button type="button" onClick={() => goTo(mIdx + 1)} aria-label="Next image" className="absolute top-1/2 right-2.5 -mt-[22px] flex size-11 items-center justify-center rounded-full bg-surface text-ink-900 shadow-[0_4px_12px_rgb(11_16_32/0.15)]">
                <Icon name="chevron-right" size={18} stroke={2.4} />
              </button>
            </>
          )}
        </div>
        {multi && (
          <div className="flex flex-wrap justify-center gap-1.5 pt-3.5">
            {imgs.map((_, i) => (
              <button key={i} type="button" onClick={() => goTo(i)} aria-label={`Image ${i + 1}`} aria-current={i === mIdx} className="flex size-6 items-center justify-center p-0">
                <span className={'h-2 rounded-full transition-[width,background-color] duration-200 ' + (i === mIdx ? 'w-[22px] bg-ink-900' : 'w-2 bg-line-strong')} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      <dialog
        ref={dialogRef}
        aria-label={`${title} — images`}
        className="fixed inset-0 m-0 size-full max-h-none max-w-none bg-surface p-0 text-ink-900 backdrop:bg-ink-950/60"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeLightbox();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8 lg:py-5">
            <span className="text-sm font-bold text-ink-700" aria-live="polite">
              {counter(lbIdx)}
              {labels[lbIdx] ? ` · ${labels[lbIdx]}` : ''}
            </span>
            <button type="button" onClick={closeLightbox} aria-label="Close" autoFocus className="flex size-11 items-center justify-center rounded-full bg-chip text-ink-900 hover:bg-line">
              <Icon name="close" size={20} stroke={2.4} />
            </button>
          </div>
          <div className="relative min-h-0 flex-1" onClick={(e) => e.target === e.currentTarget && closeLightbox()}>
            {imgs[lbIdx]?.url && (
              <img key={imgs[lbIdx].url} src={sized(imgs[lbIdx].url, 1600)} alt={altFor(lbIdx)} className="product-shot absolute inset-0 m-auto size-full animate-fade-in p-4 lg:p-10" />
            )}
            {multi && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous image" className="absolute top-1/2 left-3 -mt-6 flex size-12 items-center justify-center rounded-full bg-surface text-ink-900 shadow-pop lg:left-8">
                  <Icon name="chevron-left" size={22} stroke={2.4} />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next image" className="absolute top-1/2 right-3 -mt-6 flex size-12 items-center justify-center rounded-full bg-surface text-ink-900 shadow-pop lg:right-8">
                  <Icon name="chevron-right" size={22} stroke={2.4} />
                </button>
              </>
            )}
          </div>
          {multi && (
            <ul className="m-0 flex list-none justify-center gap-2 overflow-x-auto px-4 py-4 max-lg:hidden">
              {imgs.map((im, i) => (
                <li key={im.url + i} className="flex-none">
                  <button type="button" onClick={() => setLbIdx(i)} aria-label={`View image ${i + 1} of ${n}`} aria-current={i === lbIdx} className={'flex size-16 overflow-hidden rounded-md border-2 bg-canvas p-0 ' + (i === lbIdx ? 'border-ink-900' : 'border-transparent')}>
                    <img src={sized(im.url, 160)} alt="" loading="lazy" className="product-shot size-full p-1" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </section>
  );
}
