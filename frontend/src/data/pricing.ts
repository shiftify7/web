/**
 * Shiftify — pricing configuration (SINGLE SOURCE OF TRUTH for the estimator).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  PLACEHOLDER MATRIX — owner action required                             │
 * │  These values are sensible EXAMPLE numbers so the estimator works       │
 * │  end-to-end. They are NOT Shiftify's actual prices. Replace every      │
 * │  figure below with the real pricing matrix before production launch,   │
 * │  then set `placeholderMatrix: false`. While this flag stays true, the  │
 * │  estimator visibly labels results "indicative sample pricing".         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Everything monetary is INR. The estimator, result card and WhatsApp
 * hand-off all derive from this object — no pricing number lives in markup.
 */

export const HOME_SIZES = ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK+'] as const;
export type HomeSize = (typeof HOME_SIZES)[number];

export const ADD_ON_IDS = ['packing', 'unpacking', 'fragile', 'vehicle', 'storage'] as const;
export type AddOnId = (typeof ADD_ON_IDS)[number];

export const PRICING_CONFIG = {
  /** TRUE = numbers below are examples pending the owner's real matrix. */
  placeholderMatrix: true,

  /** Base price for a local move (within one city, up to ~30 km), per home size. */
  local: {
    '1 RK': 4200,
    '1 BHK': 5900,
    '2 BHK': 8200,
    '3 BHK': 11200,
    '4 BHK+': 14800,
  } as Record<HomeSize, number>,

  /** Base price for an intercity move — before the per-km distance charge. */
  intercityBase: {
    '1 RK': 9500,
    '1 BHK': 13000,
    '2 BHK': 17500,
    '3 BHK': 22500,
    '4 BHK+': 28500,
  } as Record<HomeSize, number>,

  /** ₹ per kilometre added to the intercity base. */
  intercityPerKm: 12,

  /** Flat add-on charges. Vehicle transport uses the nested bike/car figures. */
  addons: {
    packing: 2500,
    unpacking: 1500,
    fragile: 1800,
    storage: 3000, // up to 7 days, one flat handling + holding charge
    vehicle: { bike: 4800, car: 9000 },
  },

  /** Floor below which no estimate is ever shown. */
  minimumCharge: 4000,

  /** Estimate RANGE: base ± spread → lower/upper bounds (then rounded to ±₹500). */
  rangeLowFactor: 0.92, // min ≈ 92 % of the computed base
  rangeHighFactor: 1.1, // max ≈ 110 % of the computed base

  /** Round the band edges to the nearest ₹ — keeps display bands tidy and stable. */
  roundTo: 500,

  /** Road-distance factor when no published corridor distance exists:
   *  straight-line (haversine) km × this multiplier. Deterministic, no maps API. */
  roadFactor: 1.25,
} as const;

export const PRICING_NOTES = {
  estimateHeading: 'Estimated Moving Cost',
  indicative: 'Approximate estimate based on the details provided.',
  vary: 'Final price may vary after a detailed assessment.',
  samplePricing: 'Sample pricing matrix — final rates will be published after owner review.',
} as const;
