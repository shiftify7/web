import { getCollection, type CollectionEntry } from 'astro:content';

export type City = CollectionEntry<'cities'>;
export type Route = CollectionEntry<'routes'>;
export type Service = CollectionEntry<'services'>;
export type Testimonial = CollectionEntry<'testimonials'>;

let _cities: Promise<City[]> | null = null;
let _routes: Promise<Route[]> | null = null;
let _services: Promise<Service[]> | null = null;
let _testimonials: Promise<Testimonial[]> | null = null;

/** All served cities, Tier 1 first (cached per build). */
export function allCities() {
  return (_cities ??= getCollection('cities').then((c) =>
    [...c].sort((a, b) => a.data.tier - b.data.tier || a.data.name.localeCompare(b.data.name)),
  ));
}

export function allRoutes() {
  return (_routes ??= getCollection('routes'));
}

export function allServices() {
  return (_services ??= getCollection('services').then((s) =>
    [...s].sort((a, b) => a.data.name.localeCompare(b.data.name)),
  ));
}

export function allTestimonials() {
  return (_testimonials ??= getCollection('testimonials'));
}

export async function getCity(slug: string) {
  return (await allCities()).find((c) => c.data.slug === slug);
}

export async function cityMap() {
  return new Map((await allCities()).map((c) => [c.data.slug, c]));
}

export async function routeSlug(route: Route) {
  return `packers-and-movers-${route.data.from}-to-${route.data.to}`;
}

export function routeSlugFromData(from: string, to: string) {
  return `packers-and-movers-${from}-to-${to}`;
}

/** Routes that depart from a city (for "popular routes" blocks). */
export async function routesFrom(citySlug: string) {
  return (await allRoutes()).filter((r) => r.data.from === citySlug);
}

/** Routes that touch a city in either direction. */
export async function routesTouching(citySlug: string) {
  return (await allRoutes()).filter((r) => r.data.from === citySlug || r.data.to === citySlug);
}

export async function testimonialsFor(citySlug: string) {
  return (await allTestimonials()).filter((t) => t.data.city === citySlug);
}

/** Flat list of [city, locality] pairs that have locality pages (Tier-1 with data). */
export async function allLocalityPages() {
  const cities = await allCities();
  return cities.flatMap((c) => c.data.localities.map((l) => ({ city: c, locality: l })));
}
