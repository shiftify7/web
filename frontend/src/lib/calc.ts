import { allCities, allRoutes } from './data';

type LegacyPriceBand = [number, number];
type LegacyCityPriceMatrix = {
  homeLocal: Record<string, LegacyPriceBand>;
  homeNational: Record<string, LegacyPriceBand>;
  vehicle: { car: LegacyPriceBand; bike: LegacyPriceBand };
};
type LegacyRoutePriceMatrix = Record<string, LegacyPriceBand>;

/** Props for the legacy quote-estimator island — kept type-safe for old content consumers. */
export async function calculatorProps() {
  const [cities, routes] = await Promise.all([allCities(), allRoutes()]);
  const nameOf = new Map(cities.map((c) => [c.data.slug, c.data.name]));
  return {
    cities: cities.map((c) => {
      const legacy = c.data as unknown as { priceMatrix: LegacyCityPriceMatrix };
      return {
        slug: c.data.slug,
        name: c.data.name,
        lat: c.data.lat,
        lng: c.data.lng,
        homeLocal: legacy.priceMatrix.homeLocal,
        homeNational: legacy.priceMatrix.homeNational,
        vehicle: legacy.priceMatrix.vehicle,
      };
    }),
    routes: routes.map((r) => {
      const legacy = r.data as unknown as { priceMatrix: LegacyRoutePriceMatrix };
      return {
        from: nameOf.get(r.data.from) ?? r.data.from,
        to: nameOf.get(r.data.to) ?? r.data.to,
        distanceKm: r.data.distanceKm,
        transitDays: r.data.transitDays,
        prices: legacy.priceMatrix,
      };
    }),
  };
}
