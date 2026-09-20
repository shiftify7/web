import { useEffect, useRef, useState } from 'preact/hooks';

export type ServiceSlide = {
  slug: string;
  name: string;
  short: string;
  features: string[];
  img: { src: string; srcset: string; width: number; height: number; alt: string };
};

/**
 * Services showpiece — one service at a time, auto-advancing crossfade.
 * No arrows, dots or thumbs (same taste as the review stream); pauses on
 * hover/focus; stage height adapts to the active slide. Slide transitions
 * reduce to instant swaps under prefers-reduced-motion (CSS side).
 */
export default function ServicesCarousel({ items }: { items: ServiceSlide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Auto-advance. Runs under reduced-motion too — the CSS disables the
  // visual transition there — so every visitor eventually sees all services.
  useEffect(() => {
    if (paused || items.length < 2) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % items.length), 5400);
    return () => window.clearInterval(id);
  }, [paused, items.length]);

  // Adaptive height: pin the visible stage to the active slide's height and
  // keep it in sync as fonts/images settle or the column reflows.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const slide = stage.children[active] as HTMLElement | undefined;
    if (!slide) return;
    const sync = () => {
      stage.style.height = slide.offsetHeight + 'px';
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(slide);
    return () => ro.disconnect();
  }, [active]);

  return (
    <div
      ref={wrapRef}
      class="svcc card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusIn={() => setPaused(true)}
      onFocusOut={(e) => {
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div class="svcc-stage" ref={stageRef}>
        {items.map((s, i) => {
          const on = i === active;
          return (
            <article class={`svcc-slide${on ? ' is-active' : ''}`} aria-hidden={!on} key={s.slug}>
              <div class="svcc-text">
                <span class="svcc-idx">
                  {String(i + 1).padStart(2, '0')}
                  <em> / {String(items.length).padStart(2, '0')}</em>
                </span>
                <h3 class="svcc-name">{s.name}</h3>
                <p class="svcc-short">{s.short}</p>
                <ul class="svcc-feats">
                  {s.features.map((f) => (
                    <li>
                      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                        <path
                          d="M3 8.5l3.2 3L13 4.8"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <div class="svcc-ctas">
                  <a class="svcc-link" href={`/services/${s.slug}/`} tabindex={on ? undefined : -1}>
                    Service details
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                      <path
                        d="M3 8h9M8.5 4 12.5 8l-4 4"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </a>
                  <a class="svcc-link svcc-link--q" href="/#lead-section" tabindex={on ? undefined : -1}>
                    Get a Free Quote
                  </a>
                </div>
              </div>
              <figure class="svcc-fig" aria-hidden="true">
                <img
                  src={s.img.src}
                  srcset={s.img.srcset}
                  sizes="(max-width: 880px) 92vw, 44vw"
                  width={s.img.width}
                  height={s.img.height}
                  alt={s.img.alt}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </figure>
            </article>
          );
        })}
      </div>
    </div>
  );
}
