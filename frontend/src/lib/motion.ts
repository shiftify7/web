import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let started = false;

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function directChildren(container: Element, selector: string): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) => el.parentElement === container);
}

function revealSections() {
  const sections = gsap.utils.toArray<HTMLElement>('main > section.section, main > section.ctaband');
  sections.forEach((section) => {
    gsap.from(section, {
      opacity: 0,
      y: 22,
      duration: 0.68,
      ease: 'power2.out',
      clearProps: 'transform,opacity',
      scrollTrigger: {
        trigger: section,
        start: 'top 86%',
        once: true,
      },
    });
  });
}

function revealGroups() {
  const groups: Array<[string, string]> = [
    ['.wd-grid', '.wd-card'],
    ['.proc-rail', '.proc-step'],
    ['.faq', ':scope > details'],
    ['.blog-grid', '.blog-card'],
    ['.blog-skels', '.blog-skel'],
  ];

  groups.forEach(([containerSelector, itemSelector]) => {
    document.querySelectorAll<HTMLElement>(containerSelector).forEach((container) => {
      const items = directChildren(container, itemSelector);
      if (!items.length) return;
      gsap.from(items, {
        opacity: 0,
        y: 16,
        duration: 0.56,
        ease: 'power2.out',
        stagger: 0.06,
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: container,
          start: 'top 88%',
          once: true,
        },
      });
    });
  });
}

function entrance() {
  const hero = document.querySelector<HTMLElement>('.hero');
  const header = document.querySelector<HTMLElement>('.site-header');

  if (header) {
    gsap.from(header, {
      opacity: 0.96,
      y: -6,
      duration: 0.45,
      ease: 'power2.out',
      clearProps: 'transform,opacity',
    });
  }

  if (!hero) return;

  const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
  const heroItems = gsap.utils.toArray<HTMLElement>('.hero .h-anim');

  if (heroItems.length) {
    timeline.from(
      heroItems,
      {
        opacity: 0,
        y: 18,
        duration: 0.62,
        stagger: 0.07,
        clearProps: 'transform,opacity',
      },
      0.04,
    );
  }

  const heroTrust = hero.querySelector<HTMLElement>('.hero-trust');
  if (heroTrust) {
    timeline.from(
      heroTrust,
      { opacity: 0, y: 10, duration: 0.48, clearProps: 'transform,opacity' },
      0.37,
    );
  }

  const quote = hero.querySelector<HTMLElement>('.hero-quote-wrap');
  if (quote) {
    timeline.from(
      quote,
      { opacity: 0, y: 12, duration: 0.54, clearProps: 'transform,opacity' },
      0.43,
    );
  }

  const trustStrip = hero.querySelector<HTMLElement>('.trust-strip');
  if (trustStrip) {
    timeline.from(
      trustStrip,
      { opacity: 0, duration: 0.48, clearProps: 'opacity' },
      0.56,
    );
  }

  const image = hero.querySelector<HTMLElement>('.hero-media__img.is-on');
  if (image) {
    gsap.fromTo(
      image,
      { opacity: 0.92, scale: 1.008 },
      { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out', clearProps: 'transform,opacity' },
    );
  }
}

export function initMotion() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || started) return;
  started = true;

  if (reducedMotion()) return;

  gsap.registerPlugin(ScrollTrigger);
  const context = gsap.context(() => {
    entrance();
    revealSections();
    revealGroups();

    const footer = document.querySelector<HTMLElement>('footer');
    if (footer) {
      gsap.from(footer, {
        opacity: 0,
        y: 16,
        duration: 0.6,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: footer, start: 'top 92%', once: true },
      });
    }
  }, document);

  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true, passive: true });

  // Keep a cleanup hook available if Astro view transitions are introduced later.
  window.addEventListener('beforeunload', () => context.revert(), { once: true });
}
