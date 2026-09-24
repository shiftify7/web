import { useEffect, useState } from 'preact/hooks';

export type PlaceSlide = {
  slug: string;
  city: string;
  state: string;
  href: string;
  desc: string;
  img: { src: string; alt: string; width: number; height: number };
};

function ChevPrev() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M15 5.5 8.5 12 15 18.5" />
    </svg>
  );
}
function ChevNext() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 5.5 15.5 12 9 18.5" />
    </svg>
  );
}
function ArrowIco() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 12h15M13 5.5 19.5 12 13 18.5" />
    </svg>
  );
}

export default function PlacesCarousel({ items }: { items: PlaceSlide[] }) {
  const n = items.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const cur = items[i];
  if (!cur || n === 0) return null;
  const pad = (x: number) => String(x).padStart(2, '0');

  useEffect(() => {
    if (paused || n < 2) return;
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setI((a) => (a + 1) % n), 6200);
    return () => window.clearInterval(id);
  }, [paused, n]);

  return (
    <div
      class="plc"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusIn={() => setPaused(true)}
      onFocusOut={(e) => {
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div class="plc-copy">
        <div class="plc-meta">
          <span class="kicker">Where we help</span>
          <span class="plc-idx">{pad(i + 1)} / {pad(n)}</span>
        </div>
        <p class="plc-state">{cur.state}</p>
        <h2 class="plc-city">{cur.city}</h2>
        <p class="plc-desc">{cur.desc}</p>
        <a class="plc-cta" href={cur.href}>
          Packers &amp; movers
          <ArrowIco />
        </a>
        <div class="plc-nav">
          <button type="button" class="plc-btn" aria-label="Previous location" onClick={() => setI((a) => (a - 1 + n) % n)}>
            <ChevPrev />
          </button>
          <div class="plc-dots" role="tablist" aria-label="Locations">
            {items.map((p, k) => (
              <button
                key={p.slug}
                type="button"
                role="tab"
                aria-selected={k === i}
                aria-label={p.city}
                class={`plc-dot${k === i ? ' is-on' : ''}`}
                onClick={() => setI(k)}
              />
            ))}
          </div>
          <button type="button" class="plc-btn" aria-label="Next location" onClick={() => setI((a) => (a + 1) % n)}>
            <ChevNext />
          </button>
        </div>
        <a class="plc-all" href="/cities/">Explore all cities →</a>
      </div>
      <figure class="plc-fig">
        {items.map((p, k) => (
          <img
            key={p.slug}
            class={k === i ? 'is-on' : ''}
            src={p.img.src}
            width={p.img.width}
            height={p.img.height}
            alt={p.img.alt}
            loading={k === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}
      </figure>
    </div>
  );
}
