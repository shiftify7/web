/** CRM-ready hero media config. Frontend reads this; CRM can later overwrite. */
export type HeroSlide = {
  id: string;
  image: string;
  alt: string;
  order: number;
  active: boolean;
};

export type HeroSlideshowConfig = {
  enabled: boolean;
  autoplay: boolean;
  duration: number;
  slides: HeroSlide[];
};

export const HERO_FALLBACK = '/hero-packers.webp';

export const heroSlideshow: HeroSlideshowConfig = {
  enabled: false,
  autoplay: false,
  duration: 6000,
  slides: [
    {
      id: 'fallback',
      image: HERO_FALLBACK,
      alt: '',
      order: 0,
      active: true,
    },
  ],
};

export function heroFirstSlide(cmsUrls: { url: string; alt?: string }[]): HeroSlide {
  const cms = cmsUrls.find((x) => x.url);
  if (cms) {
    return { id: 'cms-0', image: cms.url, alt: cms.alt || '', order: 0, active: true };
  }
  return heroSlideshow.slides[0] ?? {
    id: 'fallback',
    image: HERO_FALLBACK,
    alt: '',
    order: 0,
    active: true,
  };
}
