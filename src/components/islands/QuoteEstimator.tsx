import { useMemo, useState } from 'preact/hooks';
import { ADD_ON_IDS, HOME_SIZES, PRICING_CONFIG, PRICING_NOTES, type AddOnId, type HomeSize } from '@/data/pricing';
import {
  buildEstimateMessage,
  computeEstimate,
  dateError,
  inr,
  resolveMove,
  type EstimateInput,
  type EstimatorCity,
  type EstimatorRoute,
} from '@/lib/estimate';

interface Props {
  cities: EstimatorCity[];
  routes: EstimatorRoute[];
  waNumber?: string; // digits-only wa.me number; '' while still a placeholder
  defaultFrom?: string; // city name
  defaultTo?: string; // city name
  headline?: string;
}

const ADDON_LABELS: Record<AddOnId, string> = {
  packing: 'Packing',
  unpacking: 'Unpacking',
  fragile: 'Fragile items',
  vehicle: 'Vehicle transport',
  storage: 'Storage',
};

const STEPS = ['Your Move', 'Home Details', 'Services', 'Estimate'] as const;

declare global {
  interface Window {
    sfxTrack?: (ev: string, params?: Record<string, unknown>) => void;
  }
}

/**
 * The ONE estimator for the whole site — every "Get quote" CTA lands here.
 * Steps: 01 Your Move → 02 Home Details → 03 Services → 04 Estimate.
 * Pure client-side, deterministic math from src/data/pricing.ts, then a
 * WhatsApp deep link carries the pre-filled enquiry. No backend involved.
 */
export default function QuoteEstimator({ cities, routes, waNumber = '', defaultFrom = '', defaultTo = '', headline = 'Get an instant estimate' }: Props) {
  const [step, setStep] = useState(0);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [homeSize, setHomeSize] = useState<HomeSize | ''>('');
  const [date, setDate] = useState('');
  const [addons, setAddons] = useState<AddOnId[]>([]);
  const [vehicleType, setVehicleType] = useState<'bike' | 'car'>('bike');
  const [touched, setTouched] = useState(false);

  const cityNames = useMemo(() => cities.map((c) => c.name), [cities]);
  const fromCity = cities.find((c) => c.name === from);
  const toCity = cities.find((c) => c.name === to);

  const move = useMemo(
    () => (from && to && fromCity && toCity ? resolveMove(from, to, cities, routes) : null),
    [from, to, fromCity, toCity, cities, routes],
  );

  const input: EstimateInput = { from, to, homeSize: homeSize as HomeSize, date: date || undefined, addons, vehicleType };
  const estimate = useMemo(
    () => (step === 3 && homeSize && move?.ok ? computeEstimate(input, move) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, homeSize, move, input.addons.length, input.vehicleType, from, to],
  );

  // ── validation ───────────────────────────────────────────────
  const dErr = dateError(date || undefined);
  const stepErrors: Record<number, string> = {
    0: !from ? 'Select the city you are moving from.' : !to ? 'Select where you are moving to.' : '',
    1: !homeSize ? 'Choose your home size.' : dErr,
    2: '',
  };
  const currentError = stepErrors[step] ?? '';
  const canNext = !currentError;

  const next = () => {
    setTouched(true);
    if (!canNext) return;
    setTouched(false);
    if (step === 2) window.sfxTrack?.('estimate_calculated', { from, to, home_size: homeSize, addons: addons.length });
    setStep(Math.min(step + 1, 3));
  };
  const back = () => setStep(Math.max(step - 1, 0));

  const waText = estimate
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(buildEstimateMessage(input, estimate))}`
    : '';

  const toggleAddon = (id: AddOnId) =>
    setAddons((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const unsupported = step === 3 && move && !move.ok;

  return (
    <div class="qe" id="quote" role="region" aria-label={headline}>
      {/* progress */}
      <ol class="qe-progress" aria-label="Estimator progress">
        {STEPS.map((label, i) => (
          <li key={label} class={`${i === step ? 'cur' : ''} ${i < step ? 'done' : ''}`} aria-current={i === step ? 'step' : undefined}>
            <span class="qe-dot">{i < step ? '✓' : `0${i + 1}`}</span>
            <span class="qe-dot-label">{label}</span>
          </li>
        ))}
      </ol>
      <p class="qe-headline">{headline}</p>

      {/* ── 01 · YOUR MOVE ─────────────────────────────────── */}
      {step === 0 && (
        <fieldset class="qe-step">
          <div class="qe-field">
            <label for="qe-from">Moving from</label>
            <select id="qe-from" value={from} onChange={(e) => setFrom((e.target as HTMLSelectElement).value)}>
              <option value="">Select city</option>
              {cityNames.map((n) => <option value={n}>{n}</option>)}
              <option value="other">Another city (enquire on WhatsApp)</option>
            </select>
          </div>
          <div class="qe-field">
            <label for="qe-to">Moving to</label>
            <select id="qe-to" value={to} onChange={(e) => setTo((e.target as HTMLSelectElement).value)}>
              <option value="">Select city</option>
              {cityNames.map((n) => <option value={n}>{n}</option>)}
              <option value="other">Another city (enquire on WhatsApp)</option>
            </select>
          </div>
          {from === 'other' || to === 'other' ? (
            <p class="qe-note">We’re currently unable to calculate an instant estimate for this route — tap Calculate to continue on WhatsApp instead.</p>
          ) : (
            from &&
            to &&
            move && <p class="qe-hint">{move.ok ? (move.type === 'local' ? `Local move within ${from}. Transit: same day.` : `Intercity · ~${move.distanceKm.toLocaleString('en-IN')} km · transit ${move.transit}.`) : 'Route not in the instant-estimate dataset.'}</p>
          )}
        </fieldset>
      )}

      {/* ── 02 · HOME DETAILS ──────────────────────────────── */}
      {step === 1 && (
        <fieldset class="qe-step">
          <div class="qe-field">
            <span class="qe-leg" id="qe-hs">Home size</span>
            <div class="qe-seg" role="radiogroup" aria-labelledby="qe-hs">
              {HOME_SIZES.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={homeSize === s} class={`qe-segbtn${homeSize === s ? ' on' : ''}`} onClick={() => setHomeSize(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div class="qe-field">
            <label for="qe-date">Moving date <span class="qe-opt">(optional)</span></label>
            <input id="qe-date" type="date" value={date} min={new Date().toISOString().slice(0, 10)} onInput={(e) => setDate((e.target as HTMLInputElement).value)} aria-invalid={!!dErr} />
          </div>
        </fieldset>
      )}

      {/* ── 03 · SERVICES ──────────────────────────────────── */}
      {step === 2 && (
        <fieldset class="qe-step">
          <div class="qe-field">
            <span class="qe-leg">Additional services</span>
            <div class="qe-checks">
              {ADD_ON_IDS.map((id) => (
                <label key={id} class={`qe-check${addons.includes(id) ? ' on' : ''}`}>
                  <input type="checkbox" checked={addons.includes(id)} onChange={() => toggleAddon(id)} />
                  <span>{ADDON_LABELS[id]}</span>
                </label>
              ))}
            </div>
          </div>
          {addons.includes('vehicle') && (
            <div class="qe-field">
              <span class="qe-leg" id="qe-vt">Vehicle type</span>
              <div class="qe-seg" role="radiogroup" aria-labelledby="qe-vt">
                {(['bike', 'car'] as const).map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={vehicleType === v} class={`qe-segbtn${vehicleType === v ? ' on' : ''}`} onClick={() => setVehicleType(v)}>
                    {v === 'bike' ? 'Bike (crated)' : 'Car (carrier)'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p class="qe-note">No strong feelings? Skip — everything here is optional.</p>
        </fieldset>
      )}

      {/* ── 04 · ESTIMATE ──────────────────────────────────── */}
      {step === 3 && estimate && (
        <div class="qe-result" role="status">
          <p class="qe-r-eyebrow">{PRICING_NOTES.estimateHeading}</p>
          <p class="qe-range">
            {inr(estimate.low)} – {inr(estimate.high)}
          </p>
          <dl class="qe-recap">
            <div><dt>From</dt><dd>{from}</dd></div>
            <div><dt>To</dt><dd>{to}</dd></div>
            <div><dt>Home</dt><dd>{homeSize}</dd></div>
            <div><dt>Move</dt><dd>{move!.type === 'local' ? 'Local' : 'Intercity'}</dd></div>
          </dl>
          <details class="qe-lines">
            <summary>See the full breakdown</summary>
            <ul>
              {estimate.breakdown.map((b) => (
                <li><span>{b.label}</span><span>{b.amount > 0 ? inr(b.amount) : '—'}</span></li>
              ))}
            </ul>
          </details>
          <p class="qe-fine">
            {PRICING_NOTES.indicative} {PRICING_NOTES.vary}
          </p>
          {PRICING_CONFIG.placeholderMatrix && <p class="qe-sample">{PRICING_NOTES.samplePricing}</p>}
          {waNumber ? (
            <a class="qe-wa" href={waText} target="_blank" rel="noopener" data-event="whatsapp_click" data-event-position="estimator">
              Get This Estimate on WhatsApp
            </a>
          ) : (
            <p class="qe-token">Add the WhatsApp number in src/consts.ts to enable the one-tap hand-off. <code>[WHATSAPP_NUMBER]</code></p>
          )}
        </div>
      )}
      {unsupported && (
        <div class="qe-result" role="status">
          <p class="qe-r-eyebrow">Instant estimate unavailable</p>
          <p class="qe-fine">We’re currently unable to calculate an instant estimate for this route.</p>
          <a
            class="qe-wa"
            href={waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi Shiftify, I would like to enquire about a move from ${from} to ${to}. Please contact me.`)}` : '/contact/'}
            target="_blank"
            rel="noopener"
            data-event="whatsapp_click"
            data-event-position="estimator-unsupported"
          >
            Contact on WhatsApp
          </a>
        </div>
      )}

      {/* navigation — hidden once the estimate (or fallback) is on screen */}
      {step < 3 || (!estimate && !unsupported) ? (
        <div class="qe-actions">
          {step > 0 && (
            <button type="button" class="qe-back" onClick={back}>
              Back
            </button>
          )}
          <button type="button" class="qe-next" onClick={next} aria-disabled={!canNext}>
            {step < 2 ? 'Next' : 'Calculate my estimate'}
          </button>
        </div>
      ) : null}
      {touched && currentError && <p class="qe-err" role="alert">{currentError}</p>}
      {step < 3 && <p class="qe-micro">Instant, on-device estimate — no login, no spam. We confirm the final number after a short survey.</p>}

      <style>{`
        .qe{background:#fff}
        .qe-progress{list-style:none;display:flex;gap:6px;margin:0 0 14px;padding:0}
        .qe-progress li{flex:1;min-width:64px}
        .qe-dot{display:grid;place-items:center;height:30px;border-radius:5px;background:#eef2f9;color:#64748b;font-size:.7rem;font-weight:700;letter-spacing:.04em}
        .qe-progress li.cur .qe-dot{background:#2563eb;color:#fff}
        .qe-progress li.done .qe-dot{background:#1e3a8a;color:#fff}
        .qe-dot-label{display:block;text-align:center;font-size:.58rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .qe-progress li.cur .qe-dot-label{color:#1e3a8a}
        .qe-headline{font-weight:700;font-size:1.05rem;margin-bottom:16px}
        .qe-step{border:0;margin:0;padding:0;display:grid;gap:14px}
        .qe-field label,.qe-leg{display:block;font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:7px}
        .qe-opt{font-weight:400;text-transform:none;letter-spacing:0;color:#94a3b8}
        .qe-field select,.qe-field input[type="date"]{width:100%;min-height:48px;padding:10px 12px;background:#fbfcfe;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:.95rem;color:#0f172a}
        .qe-field select:focus,.qe-field input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px #dce7fb;background:#fff}
        .qe-hint{font-size:.78rem;color:#1e3a8a;background:#eff6ff;border:1px solid #cbdcf9;border-radius:6px;padding:9px 11px}
        .qe-note{font-size:.8rem;color:#8a97ab}
        .qe-seg{display:flex;gap:6px;flex-wrap:wrap}
        .qe-segbtn{flex:1;min-width:60px;min-height:48px;border:1px solid #e2e8f0;border-radius:5px;background:#fff;font-size:.86rem;font-weight:600;color:#64748b;cursor:pointer;transition:all .18s}
        .qe-segbtn.on{background:#1e3a8a;border-color:#1e3a8a;color:#fff}
        .qe-checks{display:grid;gap:8px}
        .qe-check{display:flex;align-items:center;gap:10px;min-height:48px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:5px;background:#fbfcfe;cursor:pointer;font-size:.9rem;font-weight:600;color:#0f172a;transition:all .15s}
        .qe-check.on{border-color:#2563eb;background:#eff6ff}
        .qe-check input{width:18px;height:18px;accent-color:#2563eb}
        .qe-actions{display:flex;gap:10px;margin-top:18px}
        .qe-next{flex:1;min-height:52px;border:0;border-radius:5px;background:#2563eb;color:#fff;font-weight:700;font-size:.95rem;cursor:pointer;transition:transform .18s}
        .qe-next:hover{transform:translateY(-2px)}
        .qe-next[aria-disabled="true"]{opacity:.65}
        .qe-back{min-height:52px;padding:0 18px;border-radius:5px;background:transparent;border:1.5px solid #c6d0de;color:#1e3a8a;font-weight:600;cursor:pointer}
        .qe-err{font-size:.78rem;color:#dc2626;margin-top:10px;font-weight:600}
        .qe-micro{font-size:.72rem;color:#8a97ab;margin-top:12px;text-align:center}
        .qe-result{margin-top:2px}
        .qe-r-eyebrow{font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#64748b}
        .qe-range{font-size:clamp(1.6rem,5vw,2.1rem);font-weight:800;letter-spacing:-.02em;color:#1e3a8a;font-variant-numeric:tabular-nums;margin-top:6px}
        .qe-recap{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin:14px 0;padding:14px;background:#f8fafd;border:1px solid #e7edf6;border-radius:6px}
        .qe-recap dt{font-size:.62rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8}
        .qe-recap dd{margin:2px 0 0;font-size:.88rem;font-weight:700;color:#0f172a}
        .qe-lines summary{cursor:pointer;font-size:.8rem;font-weight:600;color:#2563eb;margin:6px 0}
        .qe-lines ul{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}
        .qe-lines li{display:flex;justify-content:space-between;gap:12px;font-size:.82rem;color:#64748b;border-bottom:1px dashed #e2e8f0;padding-bottom:6px;font-variant-numeric:tabular-nums}
        .qe-fine{font-size:.78rem;color:#8a97ab;margin-top:12px}
        .qe-sample{display:inline-block;font-size:.68rem;font-weight:700;letter-spacing:.06em;color:#a16207;background:#fefce8;border:1px dashed #e7d48a;border-radius:5px;padding:5px 9px;margin-top:8px}
        .qe-wa{display:block;text-align:center;min-height:54px;line-height:54px;margin-top:16px;border-radius:6px;background:#1fa855;color:#fff;font-weight:700;font-size:1rem;text-decoration:none;transition:transform .18s,box-shadow .18s}
        .qe-wa:hover{transform:translateY(-2px);box-shadow:0 14px 28px -14px rgba(31,168,85,.55)}
        .qe-token{font-size:.78rem;color:#64748b;border:1px dashed #c6d0de;border-radius:6px;padding:10px 12px;margin-top:14px}
        .qe-token code{background:#eef2f9;padding:1px 5px;border-radius:4px}
        @media(max-width:420px){.qe-dot-label{display:none}.qe-segbtn{min-width:calc(50% - 3px);flex:1 0 calc(50% - 3px)}}
      `}</style>
    </div>
  );
}
