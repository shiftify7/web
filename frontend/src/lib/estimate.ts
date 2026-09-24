import { PRICING_CONFIG, type AddOnId, type HomeSize } from '@/data/pricing';

/**
 * Deterministic moving-cost estimation — pure TS, no DOM, no network.
 * Same inputs ALWAYS produce the same output. Used by the QuoteEstimator
 * island; nothing here imports UI code.
 */

export interface EstimatorCity {
  slug: string;
  name: string;
  lat: number;
  lng: number;
}
export interface EstimatorRoute {
  from: string; // city name
  to: string; // city name
  distanceKm: number;
  transitDays: [number, number];
}

export interface MoveContext {
  ok: boolean;
  type: 'local' | 'intercity';
  distanceKm: number;
  transit: string;
  unsupported?: boolean; // city outside the supported dataset
  noDistance?: boolean; // route with no distance available
}

export interface EstimateInput {
  from: string; // city name
  to: string; // city name
  homeSize: HomeSize;
  date?: string; // ISO yyyy-mm-dd, optional
  addons: AddOnId[];
  vehicleType?: 'bike' | 'car'; // only when addons includes 'vehicle'
}

export interface EstimateResult {
  low: number;
  high: number;
  base: number;
  breakdown: Array<{ label: string; amount: number }>;
  move: MoveContext;
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Straight-line distance between two dataset coordinates (km). */
export function haversineKm(a: EstimatorCity, b: EstimatorCity): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Shortest-airport-code lookup is deliberately NOT used: routes come only from the
 *  internal dataset, falling back to dataset coordinates — never a maps API. */
export function resolveMove(fromName: string, toName: string, cities: EstimatorCity[], routes: EstimatorRoute[]): MoveContext {
  const from = cities.find((c) => c.name === fromName);
  const to = cities.find((c) => c.name === toName);
  if (!from || !to) return { ok: false, type: 'local', distanceKm: 0, transit: '', unsupported: true };

  if (from.slug === to.slug) {
    return { ok: true, type: 'local', distanceKm: 0, transit: 'Same day', };
  }

  const corridor = routes.find(
    (r) =>
      (r.from === from.name && r.to === to.name) || (r.from === to.name && r.to === from.name),
  );
  if (corridor) {
    return {
      ok: true,
      type: 'intercity',
      distanceKm: corridor.distanceKm,
      transit: `${corridor.transitDays[0]}–${corridor.transitDays[1]} days`,
    };
  }

  if (Number.isFinite(from.lat) && Number.isFinite(to.lat)) {
    const distanceKm = Math.round((haversineKm(from, to) * PRICING_CONFIG.roadFactor) / 10) * 10;
    const transit = distanceKm < 700 ? '2–3 days' : distanceKm < 1600 ? '3–5 days' : '4–6 days';
    return { ok: true, type: 'intercity', distanceKm, transit };
  }
  return { ok: false, type: 'intercity', distanceKm: 0, transit: '', noDistance: true };
}

const addOnLabels: Record<AddOnId, string> = {
  packing: 'Packing service',
  unpacking: 'Unpacking at destination',
  fragile: 'Fragile / high-value item handling',
  vehicle: 'Vehicle transport',
  storage: 'Storage (up to 7 days)',
};

/** The whole calculation — base → +km → +addons → range, always rounded & floored. */
export function computeEstimate(input: EstimateInput, move: MoveContext): EstimateResult {
  const cfg = PRICING_CONFIG;
  const breakdown: EstimateResult['breakdown'] = [];

  const base = move.type === 'local' ? cfg.local[input.homeSize] : cfg.intercityBase[input.homeSize];
  let subtotal = base;
  breakdown.push({
    label:
      move.type === 'local'
        ? `Local move · ${input.homeSize}`
        : `Intercity move · ${input.homeSize}`,
    amount: base,
  });

  if (move.type === 'intercity' && move.distanceKm > 0) {
    const kmCharge = move.distanceKm * cfg.intercityPerKm;
    subtotal += kmCharge;
    breakdown.push({ label: `Distance · ${move.distanceKm.toLocaleString('en-IN')} km`, amount: kmCharge });
  }

  for (const id of input.addons) {
    if (id === 'vehicle') {
      const v = input.vehicleType ?? 'bike';
      const amount = cfg.addons.vehicle[v];
      subtotal += amount;
      breakdown.push({ label: `Vehicle transport · ${v === 'car' ? 'Car (carrier)' : 'Bike (crated)'}`, amount });
      continue;
    }
    const amount = cfg.addons[id];
    subtotal += amount;
    breakdown.push({ label: addOnLabels[id], amount });
  }

  if (subtotal < cfg.minimumCharge) {
    subtotal = cfg.minimumCharge;
    breakdown.push({ label: 'Minimum charge applied', amount: 0 });
  }

  const q = cfg.roundTo;
  const low = Math.round((subtotal * cfg.rangeLowFactor) / q) * q;
  const high = Math.round((subtotal * cfg.rangeHighFactor) / q) * q;
  return { low, high, base: subtotal, breakdown, move };
}

export { inr };

/** Pre-filled WhatsApp enquiry — matches the site's existing deep-link builder. */
export function buildEstimateMessage(input: EstimateInput, est: EstimateResult): string {
  const dateLine = input.date
    ? `Moving Date: ${new Date(`${input.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : 'Moving Date: Flexible (to be decided)';
  const shortLabels: Record<AddOnId, string> = {
    packing: 'Packing',
    unpacking: 'Unpacking',
    fragile: 'Fragile Items',
    vehicle: 'Vehicle Transport',
    storage: 'Storage',
  };
  const addonLines = input.addons.length
    ? `Additional Services:\n${input.addons
        .map((a) =>
          a === 'vehicle'
            ? `Vehicle Transport (${input.vehicleType === 'car' ? 'Car' : 'Bike'})`
            : shortLabels[a],
        )
        .join(', ')}`
    : 'Additional Services: None';
  return [
    'Hi Shiftify,',
    '',
    'I would like to enquire about my move.',
    '',
    `Moving From: ${input.from}`,
    `Moving To: ${input.to}`,
    `Home Size: ${input.homeSize}`,
    `Move Type: ${est.move.type === 'local' ? 'Local' : 'Intercity'}`,
    dateLine,
    '',
    `Estimated Cost: ${inr(est.low)} – ${inr(est.high)}`,
    addonLines,
    '',
    'Please contact me regarding this move.',
    'Thank you.',
  ].join('\n');
}

/** Validate a user-selected move date: if present, it must be today or later. */
export function dateError(date: string | undefined): string {
  if (!date) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Please pick a valid date.';
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (date < todayIso) return 'Move date can’t be in the past.';
  return '';
}
