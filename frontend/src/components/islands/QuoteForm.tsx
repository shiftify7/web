import { useEffect, useRef, useState } from 'preact/hooks';

interface CityOpt {
  slug: string;
  name: string;
  localities?: string[];
}
interface Props {
  variant?: 'full' | 'quick';
  cities: CityOpt[];
  defaultFrom?: string;
  headline?: string;
  endpoint?: string;
  turnstileSiteKey?: string;
}

interface Fields {
  fromCity: string;
  fromLocality: string;
  toCity: string;
  moveDate: string;
  homeSize: string;
  name: string;
  phone: string;
}

const HOME_SIZES = ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK+'];
declare global {
  interface Window {
    sfxAttr?: () => Record<string, string>;
    sfxTrack?: (ev: string, params?: Record<string, unknown>) => void;
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; getResponse: (id: string) => string };
  }
}

let turnstilePromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  turnstilePromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('turnstile failed'));
    document.head.appendChild(s);
  });
  return turnstilePromise;
}

function validPhone(raw: string): boolean {
  const d = raw.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0/, '');
  return /^[6-9]\d{9}$/.test(d);
}
function cleanPhone(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0/, '');
}

/**
 * Multi-step lead form (island). variant="quick" renders the city-page hero's
 * 3-field quick quote, then continues into the remaining steps in place.
 */
export default function QuoteForm({
  variant = 'full',
  cities,
  defaultFrom,
  headline,
  endpoint = '/api/lead',
  turnstileSiteKey = '',
}: Props) {
  const [fields, setFields] = useState<Fields>({
    fromCity: defaultFrom ?? '',
    fromLocality: '',
    toCity: '',
    moveDate: '',
    homeSize: '2 BHK',
    name: '',
    phone: '',
  });
  const [step, setStep] = useState<1 | 2 | 3>(variant === 'quick' ? 2 : 1);
  const [quickMode, setQuickMode] = useState(variant === 'quick');
  const [errors, setErrors] = useState<Partial<Record<keyof Fields | 'form', string>>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [honey, setHoney] = useState('');
  const [t0] = useState(() => Date.now());
  const tsRef = useRef<HTMLDivElement>(null);
  const tsWidget = useRef<string | null>(null);

  const set = (k: keyof Fields) => (e: Event) => {
    setFields({ ...fields, [k]: (e.target as HTMLInputElement).value });
    setErrors({ ...errors, [k]: undefined });
  };

  // Render Turnstile on the final step (lazy — never blocks first paint)
  useEffect(() => {
    if (!turnstileSiteKey || step !== 3 || tsWidget.current) return;
    loadTurnstile()
      .then(() => {
        if (tsRef.current && window.turnstile && !tsWidget.current) {
          tsWidget.current = window.turnstile.render(tsRef.current, { sitekey: turnstileSiteKey, theme: 'light' });
        }
      })
      .catch(() => {});
  }, [step, turnstileSiteKey]);

  const fromCityObj = cities.find((c) => c.slug === fields.fromCity || c.name === fields.fromCity);
  const localityOptions = fromCityObj?.localities ?? [];

  function validateStep(n: number): boolean {
    const e: typeof errors = {};
    if (quickMode) {
      if (!fields.toCity.trim()) e.toCity = 'Enter the destination city';
      if (!validPhone(fields.phone)) e.phone = 'Enter a valid 10-digit mobile number';
    } else if (n === 1) {
      if (!fields.fromCity.trim()) e.fromCity = 'Select your current city';
      if (!fields.toCity.trim()) e.toCity = 'Enter the destination city';
    } else if (n === 2) {
      if (!fields.homeSize) e.homeSize = 'Select your home size';
    } else if (n === 3) {
      if (fields.name.trim().length < 3) e.name = 'Enter your name';
      if (!validPhone(fields.phone)) e.phone = 'Enter a valid 10-digit mobile number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    if (quickMode) {
      setQuickMode(false);
      setStep(2);
      window.sfxTrack?.('form_step_2', { via: 'quick_quote' });
      return;
    }
    if (step === 1) window.sfxTrack?.('form_step_2', { via: 'full_form' });
    if (step < 3) setStep((step + 1) as 1 | 2 | 3);
  }

  async function submit(ev: Event) {
    ev.preventDefault();
    if (!validateStep(3) || status === 'submitting') return;
    setStatus('submitting');
    const attr = window.sfxAttr?.() ?? {};
    const fd = new FormData();
    fd.set('from_city', quickMode && fields.fromLocality && !fields.fromCity ? fromCityObj?.name ?? '' : fields.fromCity);
    fd.set('from_locality', fields.fromLocality);
    fd.set('to_city', fields.toCity);
    fd.set('move_date', fields.moveDate);
    fd.set('home_size', fields.homeSize);
    fd.set('name', fields.name.trim());
    fd.set('phone', cleanPhone(fields.phone));
    fd.set('company', honey); // honeypot — must stay empty
    fd.set('t0', String(t0));
    fd.set('page', location.pathname);
    fd.set('device', matchMedia('(max-width:760px)').matches ? 'mobile' : 'desktop');
    Object.entries(attr).forEach(([k, v]) => fd.set(k, String(v)));
    if (tsWidget.current && window.turnstile) {
      fd.set('cf-turnstile-response', window.turnstile.getResponse(tsWidget.current) ?? '');
    }
    try {
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      if (!res.ok && res.type !== 'opaqueredirect') throw new Error(String(res.status));
      window.sfxTrack?.('generate_lead', { from: fields.fromCity, to: fields.toCity, home_size: fields.homeSize });
      const q = new URLSearchParams({ city: fields.toCity || fields.fromCity });
      location.assign(`/thank-you/?${q.toString()}`);
    } catch {
      setStatus('error');
      setErrors({ form: 'Something went wrong sending your request. Please WhatsApp or call us instead — sorry.' });
      window.sfxTrack?.('lead_error', { endpoint });
    }
  }

  const inputCls = (bad?: string) => `qf-input${bad ? ' qf-bad' : ''}`;
  const progress = quickMode ? 1 : step;
  const totalSteps = 3;

  return (
    <form class="qf" onSubmit={submit} noValidate id="quote" aria-label={headline ?? 'Get a moving quote'}>
      <div class="qf-top">
        {headline && <p class="qf-headline">{headline}</p>}
        <p class="qf-progress" aria-live="polite">
          <span class="qf-bar" style={{ '--p': `${(progress / totalSteps) * 100}%` }} />
          Step {progress} of {totalSteps}
        </p>
      </div>

      {quickMode && (
        <div class="qf-grid qf-grid--quick">
          <div class="qf-field">
            <label for="qf-fl">Moving from (locality)</label>
            <input id="qf-fl" class={inputCls()} placeholder={defaultFrom ? `Locality in ${fromCityObj?.name ?? 'your city'}` : 'Locality / area'} value={fields.fromLocality} onInput={set('fromLocality')} list="qf-locs" autocomplete="address-level3" />
            <datalist id="qf-locs">{localityOptions.map((l) => <option value={l} />)}</datalist>
          </div>
          <div class="qf-field">
            <label for="qf-to">Moving to (city)</label>
            <input id="qf-to" class={inputCls(errors.toCity)} placeholder="e.g. Mumbai" value={fields.toCity} onInput={set('toCity')} list="qf-cities" aria-invalid={!!errors.toCity} />
            <datalist id="qf-cities">{cities.map((c) => <option value={c.name} />)}</datalist>
            {errors.toCity && <p class="qf-err">{errors.toCity}</p>}
          </div>
          <div class="qf-field">
            <label for="qf-ph">Phone</label>
            <input id="qf-ph" class={inputCls(errors.phone)} type="tel" inputmode="numeric" placeholder="10-digit mobile" value={fields.phone} onInput={set('phone')} aria-invalid={!!errors.phone} autocomplete="tel-national" />
            {errors.phone && <p class="qf-err">{errors.phone}</p>}
          </div>
        </div>
      )}

      {!quickMode && step === 1 && (
        <div class="qf-grid qf-grid--pairs">
          <div class="qf-field">
            <label for="qf-fc">Moving from</label>
            <select id="qf-fc" class={inputCls(errors.fromCity)} value={fields.fromCity} onChange={set('fromCity')} aria-invalid={!!errors.fromCity}>
              <option value="">Select city</option>
              {cities.map((c) => <option value={c.name}>{c.name}</option>)}
              <option value="Other">Other (tell us on the next step)</option>
            </select>
            {errors.fromCity && <p class="qf-err">{errors.fromCity}</p>}
          </div>
          <div class="qf-field">
            <label for="qf-to2">Moving to</label>
            <input id="qf-to2" class={inputCls(errors.toCity)} placeholder="Destination city" value={fields.toCity} onInput={set('toCity')} list="qf-cities2" aria-invalid={!!errors.toCity} />
            <datalist id="qf-cities2">{cities.map((c) => <option value={c.name} />)}</datalist>
            {errors.toCity && <p class="qf-err">{errors.toCity}</p>}
          </div>
          <div class="qf-field qf-span">
            <label for="qf-fl2">From locality (optional)</label>
            <div class="qf-iconfield">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <input id="qf-fl2" class={inputCls()} placeholder="Area / society" value={fields.fromLocality} onInput={set('fromLocality')} list="qf-locs2" />
            </div>
            <datalist id="qf-locs2">{localityOptions.map((l) => <option value={l} />)}</datalist>
          </div>
        </div>
      )}

      {!quickMode && step === 2 && (
        <div class="qf-grid">
          <div class="qf-field">
            <label for="qf-dt">Move date (or rough)</label>
            <input id="qf-dt" class={inputCls()} type="date" value={fields.moveDate} onInput={set('moveDate')} min={new Date().toISOString().slice(0, 10)} />
          </div>
          <div class="qf-field qf-span">
            <span class="qf-leg" id="qf-hs-label">Home size</span>
            <div class="qf-seg" role="radiogroup" aria-labelledby="qf-hs-label">
              {HOME_SIZES.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={fields.homeSize === s} class={`qf-segbtn${fields.homeSize === s ? ' on' : ''}`} onClick={() => setFields({ ...fields, homeSize: s })}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!quickMode && step === 3 && (
        <div class="qf-grid">
          <div class="qf-field">
            <label for="qf-nm">Your name</label>
            <input id="qf-nm" class={inputCls(errors.name)} placeholder="Full name" value={fields.name} onInput={set('name')} aria-invalid={!!errors.name} autocomplete="name" />
            {errors.name && <p class="qf-err">{errors.name}</p>}
          </div>
          <div class="qf-field">
            <label for="qf-ph2">Phone</label>
            <input id="qf-ph2" class={inputCls(errors.phone)} type="tel" inputmode="numeric" placeholder="10-digit mobile" value={fields.phone} onInput={set('phone')} aria-invalid={!!errors.phone} autocomplete="tel-national" />
            {errors.phone && <p class="qf-err">{errors.phone}</p>}
          </div>
          {turnstileSiteKey && <div class="qf-field qf-span"><div ref={tsRef} class="qf-ts" /></div>}
        </div>
      )}

      {/* honeypot — bots only */}
      <input type="text" name="company" value={honey} onInput={(e) => setHoney((e.target as HTMLInputElement).value)} class="qf-hp" tabindex={-1} autocomplete="off" aria-hidden="true" />

      <div class="qf-actions">
        {!quickMode && step > 1 && (
          <button type="button" class="qf-back" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>← Back</button>
        )}
        {quickMode || step < 3 ? (
          <button type="button" class="qf-btn" onClick={next}>
            {quickMode ? 'Get Quote →' : 'Continue →'}
          </button>
        ) : (
          <button type="submit" class="qf-btn" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Sending…' : 'Get my written quote'}
          </button>
        )}
      </div>
      {errors.form && <p class="qf-err" role="alert">{errors.form}</p>}
      <p class="qf-micro">No advance payment · Free, itemised written estimate · We never spam or sell your number. Read our <a href="/privacy-policy/">privacy policy</a>.</p>

      <style>{`
        .qf{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:18px;box-shadow:0 14px 30px -22px rgba(30,58,138,.4)}
        .qf-top{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}
        .qf-headline{font-weight:700;font-size:1.02rem;letter-spacing:-.01em}
        .qf-progress{position:relative;font-size:.72rem;font-weight:600;color:#64748b;padding-top:10px}
        .qf-bar{position:absolute;top:0;left:0;height:2px;width:100%;background:#e2e8f0}
        .qf-bar::after{content:"";position:absolute;inset:0;width:var(--p,33%);background:#2563eb;transition:width .3s}
        .qf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .qf-grid--quick{grid-template-columns:1.2fr 1.2fr 1fr}
        .qf-grid--pairs{grid-template-columns:1fr 1fr}
        .qf-iconfield{position:relative}
        .qf-iconfield svg{position:absolute;left:13px;top:50%;width:17px;height:17px;transform:translateY(-50%);color:#94a3b8;pointer-events:none}
        .qf-iconfield .qf-input{padding-left:38px}
        @media(max-width:720px){.qf-grid--pairs{grid-template-columns:1fr}}
        .qf-field label,.qf-leg{display:block;font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:7px}
        .qf-input{width:100%;min-height:48px;padding:10px 12px;background:#fbfcfe;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:.95rem;color:#0f172a}
        .qf-input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px #dce7fb;background:#fff}
        .qf-bad{border-color:#dc2626 !important;box-shadow:0 0 0 3px rgba(220,38,38,.12) !important}
        .qf-err{font-size:.75rem;color:#dc2626;margin-top:5px}
        .qf-span{grid-column:1/-1}
        .qf-seg{display:flex;gap:6px;flex-wrap:wrap}
        .qf-segbtn{flex:1;min-width:64px;min-height:48px;border:1px solid #e2e8f0;border-radius:5px;background:#fff;font-size:.86rem;font-weight:600;color:#64748b;cursor:pointer;transition:all .18s}
        .qf-segbtn.on{background:#1e3a8a;border-color:#1e3a8a;color:#fff}
        .qf-actions{display:flex;gap:10px;margin-top:16px}
        .qf-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:12px 20px;border-radius:5px;background:#2563eb;border:1.5px solid #2563eb;color:#fff;font-weight:600;font-size:.95rem;cursor:pointer;transition:transform .18s}
        .qf-btn:hover{transform:translateY(-2px)}
        .qf-btn:disabled{opacity:.6;transform:none;cursor:progress}
        .qf-back{min-height:50px;padding:12px 16px;border-radius:5px;background:transparent;border:1.5px solid #c6d0de;color:#1e3a8a;font-weight:600;cursor:pointer}
        .qf-micro{font-size:.72rem;color:#8a97ab;margin-top:12px}
        .qf-micro a{color:#2563eb}
        .qf-hp{position:absolute !important;left:-9999px !important;width:1px;height:1px;opacity:0}
        .qf-ts{min-height:65px}
        @media(max-width:720px){.qf-grid,.qf-grid--quick{grid-template-columns:1fr}.qf-actions{flex-direction:column-reverse}}
      `}</style>
    </form>
  );
}
