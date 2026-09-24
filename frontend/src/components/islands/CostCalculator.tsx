import { useMemo, useState } from 'preact/hooks';

interface CalcCity {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  homeLocal: Record<string, [number, number]>;
  homeNational: Record<string, [number, number]>;
  vehicle: { car: [number, number]; bike: [number, number] };
}
interface CalcRoute {
  from: string; // city name
  to: string; // city name
  distanceKm: number;
  transitDays: [number, number];
  prices: Record<string, [number, number]>;
}
interface Props {
  cities: CalcCity[];
  routes: CalcRoute[];
  waHrefBase?: string; // wa.me link base with prefilled start, '' when placeholder
  heading?: string;
}

const HOME_SIZES = ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK+'];
const VEHICLES = ['none', 'bike', 'car'] as const;
declare global {
  interface Window {
    sfxTrack?: (ev: string, params?: Record<string, unknown>) => void;
  }
}

function haversineKm(a: CalcCity, b: CalcCity): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round((2 * R * Math.asin(Math.sqrt(h)) * 1.25) / 10) * 10; // road factor ≈1.25
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const roundBand = (lo: number, hi: number): [number, number] => [Math.round(lo / 500) * 500, Math.round(hi / 500) * 500];
const sizeKey = (s: string) => s.replace(/\s/g, '');

/** Moving-cost calculator (island, client:visible). All prices from the content collections via props. */
export default function CostCalculator({ cities, routes, waHrefBase = '', heading = 'Estimate your moving cost' }: Props) {
  const [from, setFrom] = useState(cities[0]?.name ?? '');
  const [to, setTo] = useState(cities[1]?.name ?? '');
  const [size, setSize] = useState('2 BHK');
  const [vehicle, setVehicle] = useState<(typeof VEHICLES)[number]>('none');
  const [computed, setComputed] = useState(false);

  const fromCity = cities.find((c) => c.name === from);
  const toCity = cities.find((c) => c.name === to);

  const result = useMemo(() => {
    if (!fromCity || !toCity) return null;
    const local = fromCity.slug === toCity.slug;
    const direct = routes.find(
      (r) => (r.from === fromCity.name && r.to === toCity.name) || (r.from === toCity.name && r.to === fromCity.name),
    );
    const distanceKm = local ? 0 : direct?.distanceKm ?? haversineKm(fromCity, toCity);

    let band: [number, number] | null = null;
    let basis = '';
    if (local) {
      band = fromCity.homeLocal[size] ?? null;
      basis = `Local move within ${fromCity.name} (bands from our published ${fromCity.name} price matrix)`;
    } else if (direct) {
      band = direct.prices[sizeKey(size)] ?? null;
      basis = `Corridor pricing for ${direct.from} → ${direct.to} (~${direct.distanceKm.toLocaleString('en-IN')} km)`;
    } else {
      // scale the origin city's national band by distance (1250 km ≈ 1.0)
      const base = fromCity.homeNational[size];
      const f = Math.min(1.7, Math.max(0.75, distanceKm / 1250));
      band = base ? roundBand(base[0] * f, base[1] * f) : null;
      basis = `Estimated from ${fromCity.name} long-haul bands, scaled to ~${distanceKm.toLocaleString('en-IN')} km`;
    }
    if (!band) return null;

    let vehicleBand: [number, number] | null = null;
    if (vehicle !== 'none') {
      if (direct?.prices[vehicle]) vehicleBand = direct.prices[vehicle];
      else if (!local) {
        const vb = fromCity.vehicle[vehicle];
        const f = Math.min(1.7, Math.max(0.75, distanceKm / 1250));
        vehicleBand = roundBand(vb[0] * f, vb[1] * f);
      } else {
        vehicleBand = null; // vehicle shipping within one city is unusual
      }
    }
    const total: [number, number] = [band[0] + (vehicleBand?.[0] ?? 0), band[1] + (vehicleBand?.[1] ?? 0)];
    const transit = local ? 'same day' : direct ? `${direct.transitDays[0]}–${direct.transitDays[1]} days` : distanceKm < 700 ? '2–3 days' : distanceKm < 1600 ? '3–5 days' : '4–6 days';
    return { total, basis, distanceKm, transit, vehicleBand };
  }, [fromCity, toCity, size, vehicle]);

  function compute() {
    setComputed(true);
    if (result) {
      window.sfxTrack?.('calculator_complete', { from, to, home_size: size, vehicle, low: result.total[0], high: result.total[1] });
    }
  }

  const waText = result
    ? `${waHrefBase}${encodeURIComponent(` I used the calculator: ${from} to ${to}, ${size}${vehicle !== 'none' ? ' + ' + vehicle : ''}, estimate ${inr(result.total[0])}–${inr(result.total[1])}.`)}`
    : '';

  return (
    <div class="cc" aria-label={heading}>
      <p class="cc-heading">{heading}</p>
      <div class="cc-grid">
        <div class="cc-field">
          <label for="cc-from">Moving from</label>
          <select id="cc-from" value={from} onChange={(e) => setFrom((e.target as HTMLSelectElement).value)}>
            {cities.map((c) => <option value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div class="cc-field">
          <label for="cc-to">Moving to</label>
          <select id="cc-to" value={to} onChange={(e) => setTo((e.target as HTMLSelectElement).value)}>
            {cities.map((c) => <option value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div class="cc-field cc-span">
          <span class="cc-leg" id="cc-hs">Home size</span>
          <div class="cc-seg" role="radiogroup" aria-labelledby="cc-hs">
            {HOME_SIZES.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={size === s} class={`cc-segbtn${size === s ? ' on' : ''}`} onClick={() => setSize(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div class="cc-field cc-span">
          <span class="cc-leg" id="cc-vh">Add a vehicle (optional)</span>
          <div class="cc-seg" role="radiogroup" aria-labelledby="cc-vh">
            {VEHICLES.map((v) => (
              <button key={v} type="button" role="radio" aria-checked={vehicle === v} class={`cc-segbtn${vehicle === v ? ' on' : ''}`} onClick={() => setVehicle(v)}>
                {v === 'none' ? 'No vehicle' : v === 'bike' ? 'Bike (crated)' : 'Car (carrier)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button type="button" class="cc-btn" onClick={compute}>
        Calculate estimated cost
      </button>

      {computed && result && (
        <div class="cc-out" role="status">
          <p class="cc-range">{inr(result.total[0])} – {inr(result.total[1])}</p>
          <p class="cc-meta">
            {from} → {to}
            {result.distanceKm ? ` · ~${result.distanceKm.toLocaleString('en-IN')} km` : ''} · transit {result.transit}
          </p>
          <p class="cc-basis">{result.basis}. Indicative range only — your written quote after survey is the firm price.</p>
          <div class="cc-cta">
            {waHrefBase && (
              <a class="cc-wa" href={waText} target="_blank" rel="noopener" data-event="whatsapp_click" data-event-position="calculator">
                Send this estimate on WhatsApp
              </a>
            )}
            <a class="cc-quote" href="#quote" data-event="quote_cta_click" data-event-position="calculator">Get an exact written quote</a>
          </div>
        </div>
      )}
      {computed && !result && <p class="cc-err">Pick two different cities (or the same one for a local move) to see a range.</p>}

      <style>{`
        .cc{background:#fbfcfe}
        .cc-heading{font-weight:700;font-size:1.05rem;margin-bottom:16px}
        .cc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .cc-field label,.cc-leg{display:block;font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:7px}
        .cc-field select{width:100%;min-height:48px;padding:10px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:.95rem}
        .cc-field select:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px #dce7fb}
        .cc-span{grid-column:1/-1}
        .cc-seg{display:flex;gap:6px;flex-wrap:wrap}
        .cc-segbtn{flex:1;min-width:64px;min-height:48px;border:1px solid #e2e8f0;border-radius:5px;background:#fff;font-size:.86rem;font-weight:600;color:#64748b;cursor:pointer;transition:all .18s}
        .cc-segbtn.on{background:#1e3a8a;border-color:#1e3a8a;color:#fff}
        .cc-btn{margin-top:16px;width:100%;min-height:52px;border:0;border-radius:5px;background:#2563eb;color:#fff;font-weight:600;font-size:1rem;cursor:pointer}
        .cc-btn:hover{background:#1d55d0}
        .cc-out{margin-top:18px;border:1px solid #cbdcf9;background:#eff6ff;border-radius:8px;padding:18px}
        .cc-range{font-size:1.7rem;font-weight:800;letter-spacing:-.02em;color:#1e3a8a;font-variant-numeric:tabular-nums}
        .cc-meta{font-size:.82rem;font-weight:600;color:#0f172a;margin-top:4px}
        .cc-basis{font-size:.78rem;color:#64748b;margin-top:8px}
        .cc-cta{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
        .cc-wa,.cc-quote{flex:1;min-width:200px;text-align:center;padding:12px;border-radius:5px;font-weight:600;font-size:.9rem;text-decoration:none}
        .cc-wa{background:#1fa855;color:#fff}
        .cc-quote{background:#0f172a;color:#fff}
        .cc-err{margin-top:14px;font-size:.85rem;color:#dc2626}
        @media(max-width:640px){.cc-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
