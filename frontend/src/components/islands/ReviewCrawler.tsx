import { useEffect, useRef, useState } from 'preact/hooks';
import { apiUrl } from '@/consts';

export type ReviewItem = {
  name: string;
  text: string;
  rating: number;
  image?: string;
  locality?: string;
  service?: string;
  fallback?: boolean;
};

export const FALLBACK_REVIEWS: ReviewItem[] = [
  { name: 'Rahul Sharma', text: 'Very smooth shifting experience. The team handled everything carefully.', rating: 5, fallback: true },
  { name: 'Priya Verma', text: 'Good communication and timely service throughout the move.', rating: 5, fallback: true },
  { name: 'Amit Kumar', text: 'Packing was handled properly and the entire process was smooth.', rating: 4, fallback: true },
  { name: 'Neha Singh', text: 'Professional team and an easy relocation experience.', rating: 5, fallback: true },
  { name: 'Rohit Mehta', text: 'Kept us updated and the crew was careful with our furniture.', rating: 4, fallback: true },
];

function Avatar({ name, image }: { name: string; image?: string }) {
  if (image) return <img class="review-av" src={image} alt="" width="40" height="40" />;
  return (
    <span class="review-av review-av--fb" title={name} aria-hidden="true">
      <svg viewBox="0 0 40 40" width="40" height="40">
        <circle cx="20" cy="20" r="20" fill="#1e3a8a" />
        <circle cx="20" cy="16" r="7" fill="#93c5fd" />
        <path d="M8 34c2-8 8-12 12-12s10 4 12 12" fill="#93c5fd" />
      </svg>
    </span>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span class="review-stars" aria-label={`Rated ${n} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width="14" height="14" class={i < n ? 'star-on' : 'star-off'} aria-hidden="true">
          <path fill="currentColor" d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.05 1.1-6.5L2.6 9.35l6.5-.95L12 2.5z" />
        </svg>
      ))}
    </span>
  );
}

export function ReviewCard({ t }: { t: ReviewItem }) {
  return (
    <figure class="review card card--pad-s">
      <div class="review-top">
        <Avatar name={t.name} image={t.image} />
        <Stars n={t.rating} />
      </div>
      <blockquote>{t.text}</blockquote>
      <figcaption>
        <strong>{t.name}</strong>
        {(t.locality || t.service) && (
          <span class="review-meta">{[t.locality, t.service].filter(Boolean).join(' · ')}</span>
        )}
      </figcaption>
    </figure>
  );
}

export default function ReviewCrawler({ items }: { items?: ReviewItem[] }) {
  const [list, setList] = useState<ReviewItem[] | null>(items || null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items?.length) {
      setList(items);
      return;
    }
    fetch(apiUrl('/api/public/reviews'), { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const rec = (d.reviews || []) as ReviewItem[];
        setList(rec.length ? rec : FALLBACK_REVIEWS);
      })
      .catch(() => setList(FALLBACK_REVIEWS));
  }, []);

  useEffect(() => {
    if (!list || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = root.current;
    if (!el) return;
    const track = el.querySelector<HTMLElement>('[data-reviews-track]');
    const total = list.length;
    if (!track || total < 2) return;
    let i = 0;
    let timer: number | null = null;
    const slide = () => {
      i += 1;
      if (i > total) i = total;
      const child = track.children[Math.min(i, track.children.length - 1)] as HTMLElement;
      track.style.transform = 'translateX(' + -child.offsetLeft + 'px)';
      if (i === total) {
        setTimeout(() => {
          track.classList.add('no-anim');
          i = 0;
          track.style.transform = 'translateX(0px)';
          void track.offsetWidth;
          track.classList.remove('no-anim');
        }, 780);
      }
    };
    const start = () => { if (!timer) timer = window.setInterval(slide, 4500); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    el.addEventListener('mouseenter', stop);
    el.addEventListener('mouseleave', start);
    start();
    return () => { stop(); el.removeEventListener('mouseenter', stop); el.removeEventListener('mouseleave', start); };
  }, [list]);

  if (!list) return <div class="reviews-viewport" aria-busy="true" />;
  const clones = list.slice(0, 3);
  return (
    <div class="reviews-viewport" data-reviews ref={root} data-count={list.length}>
      <div class="reviews-track" data-reviews-track>
        {list.map((t, i) => <ReviewCard t={t} key={'r' + i} />)}
        {clones.map((t, i) => <ReviewCard t={t} key={'c' + i} />)}
      </div>
    </div>
  );
}
