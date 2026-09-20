import { allCities, allRoutes } from './data';

/** Props for the QuoteEstimator island — computed once from the collections. */
export async function calculatorProps() {
  const [cities, routes] = await Promise.all([allCities(), allRoutes()]);
  const nameOf = new Map(cities.map((c) => [c.data.slug, c.data.name]));
  return {
    cities: cities.map((c) => ({
      slug: c.data.slug,
      name: c.data.name,
      lat: c.data.lat,
      lng: c.data.lng,
      homeLocal: c.data.priceMatrix.homeLocal,
      homeNational: c.data.priceMatrix.homeNational,
      vehicle: c.data.priceMatrix.vehicle,
    })),
    routes: routes.map((r) => ({
      from: nameOf.get(r.data.from) ?? r.data.from,
      to: nameOf.get(r.data.to) ?? r.data.to,
      distanceKm: r.data.distanceKm,
      transitDays: r.data.transitDays,
      prices: r.data.priceMatrix as unknown as Record<string, [number, number]>,
    })),
  };
}


