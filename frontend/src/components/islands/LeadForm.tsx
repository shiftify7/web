import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { apiUrl, telHref, waLink } from '@/consts';
import LocationSelector, { type LocationSelection } from './LocationSelector';
import { canonicalCityHits, regionForState, type LocationHit } from '@/lib/locations';
import { deriveMoveType, type LocRef, type MoveTypeCode } from '@/lib/deriveMoveType';
import { QuoteProcessing, QuoteThanks } from './QuoteOutcome';

/**
 * Shiftify's single lead-generation form. The public payload keeps the
 * original CRM-friendly string fields and adds structured pickup/drop data.
 * The API, OTP and CRM flow are intentionally unchanged.
 */

type MoveType = 'within' | 'intercity';
export type LeadLocationContext = {
  kind: 'CITY' | 'STATE_ONLY' | 'OTHER_CITY';
  id?: string;
  city?: string;
  citySlug?: string;
  state?: string;
  stateCode?: string;
  locality?: string;
  freeText?: string;
};

export type LeadFormContext = {
  source?: string;
  fromCity?: string;
  fromLocality?: string;
  toCity?: string;
  toLocality?: string;
  fromState?: string;
  toState?: string;
  service?: string;
  date?: string;
  pickup?: LeadLocationContext;
  dropoff?: LeadLocationContext;
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  withinCity: string;
  withinLocation: LocationSelection | null;
  fromLocation: LocationSelection | null;
  toLocation: LocationSelection | null;
  fromLocality: string;
  toLocality: string;
  fromCity: string;
  fromState: string;
  toCity: string;
  toState: string;
  propertyType: string;
  date: string;
  message: string;
  company: string;
};

const PROPERTY_OPTIONS = ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK+', 'Office', 'Other'] as const;
const PHONE_RE = /^[6-9][0-9]{9}$/;
const CANONICAL_CITY_HITS = canonicalCityHits();

function selectionFromHit(hit: LocationHit): LocationSelection {
  return {
    kind: 'CITY',
    id: hit.id,
    name: hit.name,
    city: hit.city,
    citySlug: hit.citySlug,
    state: hit.state,
    stateCode: hit.stateCode,
    country: 'India',
    parentId: hit.parentId,
    aliases: hit.aliases,
    image: hit.image,
  };
}

function selectionFromContext(city = '', state = '', structured?: LeadLocationContext): LocationSelection | null {
  if (structured?.kind && (structured.state || state)) {
    const resolvedState = structured.state || state;
    const region = regionForState(resolvedState);
    const stateName = region?.name || resolvedState;
    const stateCode = structured.stateCode || region?.stateCode || '';
    const cityName = structured.city || city;
    const knownCity = structured.kind === 'CITY'
      ? CANONICAL_CITY_HITS.find((candidate) => (
        (structured.citySlug && candidate.slug === structured.citySlug)
        || ([candidate.name, candidate.city, ...(candidate.aliases || [])].some((name) => name.toLowerCase() === cityName.toLowerCase())
          && (!stateCode || candidate.stateCode === stateCode))
      ))
      : undefined;
    if (structured.kind === 'STATE_ONLY' || !cityName) {
      return {
        kind: 'STATE_ONLY',
        id: structured.id || region?.id || `state:${stateName.toLowerCase().replace(/\s+/g, '-')}`,
        name: stateName,
        city: '',
        citySlug: '',
        state: stateName,
        stateCode,
        country: 'India',
        parentId: region?.id || null,
      };
    }
    return {
      kind: structured.kind,
      id: structured.id || `city:${structured.citySlug || cityName.toLowerCase().replace(/\s+/g, '-')}`,
      name: cityName,
      city: cityName,
      citySlug: structured.citySlug || cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      state: stateName,
      stateCode,
      country: 'India',
      parentId: region?.id || null,
      locality: structured.locality || '',
      freeText: structured.freeText,
      image: knownCity?.image,
    };
  }

  const cityName = city.trim();
  const stateName = state.trim();
  const hit = CANONICAL_CITY_HITS.find((candidate) => {
    const names = [candidate.name, candidate.city, ...(candidate.aliases || [])].map((value) => value.toLowerCase());
    return names.includes(cityName.toLowerCase()) && (!stateName || candidate.state.toLowerCase() === stateName.toLowerCase());
  });
  if (hit) return selectionFromHit(hit);
  const region = stateName ? regionForState(stateName) : undefined;
  if (!cityName && !region) return null;
  if (!cityName && region) {
    return {
      kind: 'STATE_ONLY', id: region.id, name: region.name, city: '', citySlug: '', state: region.name,
      stateCode: region.stateCode, country: 'India', parentId: region.id,
    };
  }
  if (!region) return null;
  return {
    kind: 'OTHER_CITY',
    id: `other-city:${region.slug}:${cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: cityName,
    city: cityName,
    citySlug: cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    state: region.name,
    stateCode: region.stateCode,
    country: 'India',
    parentId: region.id,
    freeText: cityName,
  };
}

function toRef(value: LocationSelection | null): LocRef | null {
  if (!value) return null;
  return {
    kind: value.kind,
    citySlug: value.citySlug,
    city: value.city,
    state: value.state,
    stateCode: value.stateCode,
  };
}

function serializeLocation(value: LocationSelection | null) {
  if (!value) return null;
  return {
    kind: value.kind,
    id: value.id,
    name: value.name,
    city: value.city,
    citySlug: value.citySlug,
    state: value.state,
    stateCode: value.stateCode,
    country: value.country,
    parentId: value.parentId,
    locality: value.locality || '',
    freeText: value.freeText || '',
  };
}

function displayLocation(value: LocationSelection | null, locality = ''): string {
  if (!value) return '';
  if (value.kind === 'STATE_ONLY') return value.state;
  const city = value.city || value.name;
  return [locality || value.locality, city, value.state].filter(Boolean).join(', ');
}

export default function LeadForm({ context = {}, horizontal = false, heading }: { context?: LeadFormContext; horizontal?: boolean; heading?: string }) {
  const full = useMemo(() => ({
    fromCity: context.fromCity ?? '',
    fromLocality: context.fromLocality ?? '',
    toCity: context.toCity ?? '',
    toLocality: context.toLocality ?? '',
    fromState: context.fromState ?? '',
    toState: context.toState ?? '',
    service: context.service ?? '',
    date: context.date ?? '',
    pickup: context.pickup,
    dropoff: context.dropoff,
  }), [context]);

  const initialFrom = selectionFromContext(full.fromCity, full.fromState, full.pickup);
  const initialTo = selectionFromContext(full.toCity, full.toState, full.dropoff);
  const defaultWithin = initialFrom?.kind === 'CITY' ? initialFrom : selectionFromContext('Delhi', 'Delhi');
  const initialDerived = deriveMoveType(toRef(initialFrom), toRef(initialTo));
  const [moveType, setMoveType] = useState<MoveType>(initialDerived && initialDerived !== 'INTRA_CITY' ? 'intercity' : 'within');
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    withinCity: defaultWithin?.city || full.fromCity || 'Delhi',
    withinLocation: defaultWithin,
    fromLocation: initialFrom,
    toLocation: initialTo,
    fromLocality: full.fromLocality,
    toLocality: full.toLocality,
    fromCity: full.fromCity,
    fromState: full.fromState,
    toCity: full.toCity,
    toState: full.toState,
    propertyType: '2 BHK',
    date: full.date,
    message: '',
    company: '',
  });
  const [phoneErr, setPhoneErr] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'otp' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [otp, setOtp] = useState('');
  const [otpEnabled, setOtpEnabled] = useState(false);
  const sentRef = useRef(false);
  const payloadRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(apiUrl('/api/public/settings'))
      .then((response) => response.json())
      .then((data) => setOtpEnabled(Boolean(data.otpEnabled)))
      .catch(() => {});
    try { (window as any).sfxTrack?.('lead_form_view', { source: context.source }); } catch {}
  }, []);

  const set = (key: string) => (event: any) => setForm((current) => ({ ...current, [key]: event.target.value }));

  // Hero quick quote → mounted form. Structured values are preferred; legacy
  // strings remain accepted for any older event sender.
  useEffect(() => {
    const apply = (data: any) => {
      if (!data) return;
      const pickup = selectionFromContext(data.fromCity || '', data.fromState || '', data.pickup);
      const dropoff = selectionFromContext(data.toCity || '', data.toState || '', data.dropoff);
      const derived = deriveMoveType(toRef(pickup), toRef(dropoff));
      setMoveType(derived && derived !== 'INTRA_CITY' ? 'intercity' : 'within');
      setForm((current) => ({
        ...current,
        fromLocation: pickup || current.fromLocation,
        toLocation: dropoff || current.toLocation,
        withinLocation: pickup?.kind === 'CITY' ? pickup : current.withinLocation,
        withinCity: pickup?.city || current.withinCity,
        fromCity: data.fromCity ?? current.fromCity,
        fromState: data.fromState ?? current.fromState,
        toCity: data.toCity ?? current.toCity,
        toState: data.toState ?? current.toState,
        date: data.date ?? current.date,
      }));
    };
    const handler = (event: Event) => apply((event as CustomEvent).detail);
    window.addEventListener('sfx:hero-quote', handler);
    try {
      const raw = sessionStorage.getItem('sfx:hero-quote');
      if (raw) {
        apply(JSON.parse(raw));
        sessionStorage.removeItem('sfx:hero-quote');
      }
    } catch { /* storage unavailable — fine */ }
    return () => window.removeEventListener('sfx:hero-quote', handler);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const pickup = moveType === 'within' ? form.withinLocation : form.fromLocation;
  const dropoff = moveType === 'within' ? form.withinLocation : form.toLocation;
  const fromText = displayLocation(pickup, form.fromLocality);
  const toText = displayLocation(dropoff, form.toLocality);
  const derivedMoveType = deriveMoveType(toRef(pickup), toRef(dropoff));

  const waMessage = [
    'Hi Shiftify, I would like to enquire about a move.',
    '',
    `Name: ${form.name}`,
    `Move Type: ${derivedMoveType || (moveType === 'within' ? 'Within City' : 'Intercity / Interstate')}`,
    `From: ${fromText}`,
    `To: ${toText}`,
    `Property Type: ${form.propertyType}`,
    `Preferred Date: ${form.date || 'Flexible'}`,
  ].join('\n');
  const waHref = waLink(waMessage);

  function validate(): string {
    if (!form.name.trim()) return 'Please enter your full name.';
    if (!PHONE_RE.test(form.phone)) return 'Enter a valid 10-digit Indian mobile number.';
    if (moveType === 'within') {
      if (!form.withinLocation || form.withinLocation.kind !== 'CITY') return 'Please choose a pickup city, or use a state/city fallback for an intercity move.';
      if (!form.fromLocality.trim() || !form.toLocality.trim()) return 'Please fill both localities.';
    } else if (!form.fromLocation?.state || !form.toLocation?.state) {
      return 'Please choose a pickup and destination state or city.';
    }
    if (!form.date) return 'Please pick a preferred moving date.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email address, or leave it blank.';
    return '';
  }

  function chooseFrom(location: LocationSelection) {
    if (moveType === 'within') {
      if (location.kind !== 'CITY') {
        setMoveType('intercity');
        setForm((current) => ({ ...current, fromLocation: location, fromCity: location.city, fromState: location.state }));
        return;
      }
      setForm((current) => ({ ...current, withinLocation: location, fromLocation: location, withinCity: location.city, fromCity: location.city, fromState: location.state }));
      return;
    }
    setForm((current) => ({ ...current, fromLocation: location, fromCity: location.city, fromState: location.state }));
  }

  function chooseTo(location: LocationSelection) {
    const origin = moveType === 'within' ? form.withinLocation : form.fromLocation;
    const nextType = deriveMoveType(toRef(origin), toRef(location));
    if (origin && nextType === 'INTRA_CITY' && location.kind === 'CITY') {
      setMoveType('within');
      setForm((current) => ({ ...current, withinLocation: origin, fromLocation: origin, toLocation: location, withinCity: origin.city, toCity: location.city, toState: location.state }));
      return;
    }
    setMoveType('intercity');
    setForm((current) => ({
      ...current,
      fromLocation: origin || current.fromLocation,
      toLocation: location,
      fromCity: origin?.city || current.fromCity,
      fromState: origin?.state || current.fromState,
      toCity: location.city,
      toState: location.state,
    }));
  }

  async function onSubmit(event: Event) {
    event.preventDefault();
    if (sentRef.current) return;
    const validation = validate();
    if (validation) {
      if (validation.includes('mobile')) setPhoneErr('Enter a valid 10-digit Indian mobile number.');
      setErrorMsg(validation);
      return;
    }
    setErrorMsg('');
    setPhoneErr('');
    sentRef.current = true;
    setStatus('sending');
    try { (window as any).sfxTrack?.('lead_form_submit', { source: context.source }); } catch {}
    const attr = (() => { try { return (window as any).sfxAttr?.() || {}; } catch { return {}; } })();
    const fromValue = pickup;
    const toValue = dropoff;
    const calculatedType: MoveTypeCode = derivedMoveType || (moveType === 'within' ? 'INTRA_CITY' : 'INTERCITY');
    const payload = {
      name: form.name.trim(),
      phone: form.phone,
      email: form.email.trim(),
      // Existing CRM-compatible code plus an explicit human-readable alias.
      moveType: calculatedType,
      moveTypeCanonical: calculatedType === 'INTRA_CITY' ? 'WITHIN_CITY' : calculatedType,
      withinCity: form.withinLocation?.city || form.withinCity,
      fromCity: moveType === 'within' ? (form.withinLocation?.city || form.withinCity) : (fromValue?.city || ''),
      fromState: fromValue?.state || form.fromState,
      fromLocality: form.fromLocality,
      toCity: moveType === 'within' ? (form.withinLocation?.city || form.withinCity) : (toValue?.city || ''),
      toState: toValue?.state || form.toState,
      toLocality: form.toLocality,
      from: fromText,
      to: toText,
      pickup: serializeLocation(fromValue),
      dropoff: serializeLocation(toValue),
      pickupLocation: serializeLocation(fromValue),
      destination: serializeLocation(toValue),
      propertyType: form.propertyType,
      date: form.date,
      message: form.message.trim(),
      service: full.service,
      source: context.source ?? 'site',
      company: form.company,
      submittedAt: new Date().toISOString(),
      landingPage: attr.landing || (typeof location !== 'undefined' ? location.pathname : ''),
      utmSource: attr.utm_source,
      utmMedium: attr.utm_medium,
      utmCampaign: attr.utm_campaign,
      utmTerm: attr.utm_term,
      utmContent: attr.utm_content,
      gclid: attr.gclid,
    };
    payloadRef.current = payload;
    try {
      if (otpEnabled) {
        const response = await fetch(apiUrl('/api/otp/request'), {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: form.phone, payload }),
        });
        if (response.status === 429) {
          sentRef.current = false;
          setStatus('idle');
          setErrorMsg('Please wait a moment before requesting another code.');
          return;
        }
        if (!response.ok) throw new Error('otp');
        try { (window as any).sfxTrack?.('otp_requested'); } catch {}
        setStatus('otp');
        sentRef.current = false;
        return;
      }
      const response = await fetch(apiUrl('/api/lead'), {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`bad status ${response.status}`);
      try { (window as any).sfxTrack?.('lead_form_success'); } catch {}
      setStatus('done');
    } catch {
      sentRef.current = false;
      setStatus('error');
      setErrorMsg('');
      try { (window as any).sfxTrack?.('lead_form_error'); } catch {}
    }
  }

  async function verifyOtp(event: Event) {
    event.preventDefault();
    setStatus('sending');
    try {
      const response = await fetch(apiUrl('/api/otp/verify'), {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: form.phone, code: otp, payload: payloadRef.current }),
      });
      if (!response.ok) throw new Error('bad otp');
      try { (window as any).sfxTrack?.('otp_verified'); } catch {}
      try { (window as any).sfxTrack?.('lead_form_success'); } catch {}
      setStatus('done');
    } catch {
      setStatus('otp');
      setErrorMsg('That code did not work. Try again.');
    }
  }

  if (status === 'sending') {
    return <div class="lf lf--done"><QuoteProcessing /></div>;
  }

  if (status === 'done') {
    return (
      <div class="lf lf--done" role="status">
        <QuoteThanks title="Thank you" body="We will contact you soon." />
        <div class="lf-actions">
          <a class="lf-btn lf-btn--call" href={telHref() || '/contact/'} data-event="call_click">Call Now</a>
          <a class="lf-btn lf-btn--wa" href={waHref} target="_blank" rel="noopener" data-event="whatsapp_click">WhatsApp Us</a>
        </div>
      </div>
    );
  }

  if (status === 'otp') {
    return (
      <form class="lf" onSubmit={verifyOtp}>
        <p>Enter the 6-digit code we sent to verify your number.</p>
        <div class="lf-field">
          <label for="lf-otp">OTP</label>
          <input id="lf-otp" inputmode="numeric" autocomplete="one-time-code" maxlength={6} value={otp} onInput={(event: any) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
        </div>
        {errorMsg && <p class="lf-err" role="alert">{errorMsg}</p>}
        <button class="lf-submit" type="submit">Verify</button>
      </form>
    );
  }

  return (
    <form class={`lf${horizontal ? ' lf--h' : ''}`} onSubmit={onSubmit} noValidate id="lead-form" onFocusCapture={() => { try { (window as any).sfxTrack?.('lead_form_start', { source: context.source }); } catch {} }}>
      <input type="text" name="company" tabindex={-1} autocomplete="off" aria-hidden="true" class="lf-hp" value={form.company} onInput={set('company')} />
      {heading ? <h2 class="lf-title">{heading}</h2> : null}

      <div class="lf-field lf-span">
        <label for="lf-name">Full name</label>
        <input id="lf-name" name="name" type="text" autocomplete="name" placeholder="e.g. Ananya Sharma" value={form.name} onInput={set('name')} required />
      </div>

      <div class="lf-field lf-span">
        <label for="lf-phone">Mobile number</label>
        <div class={`lf-phone${phoneErr ? ' lf-phone--err' : ''}`}>
          <span class="lf-phone-cc" aria-hidden="true">+91</span>
          <input
            id="lf-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="10-digit mobile" maxlength={10} value={form.phone}
            onInput={(event: any) => {
              const value = event.target.value.replace(/\D/g, '').slice(0, 10);
              setForm((current) => ({ ...current, phone: value }));
              setPhoneErr(value.length === 10 && !PHONE_RE.test(value) ? 'Enter a valid 10-digit Indian mobile number.' : '');
            }}
            onBlur={() => { if (form.phone && !PHONE_RE.test(form.phone)) setPhoneErr('Enter a valid 10-digit Indian mobile number.'); }}
            required
          />
        </div>
        {phoneErr && <p class="lf-err" role="alert">{phoneErr}</p>}
      </div>

      <div class="lf-row">
        <div class="lf-field">
          <LocationSelector
            id="lf-fcity"
            label="From city"
            locations={CANONICAL_CITY_HITS}
            value={moveType === 'within' ? form.withinLocation : form.fromLocation}
            onChange={chooseFrom}
          />
        </div>
        <div class="lf-field">
          <LocationSelector
            id="lf-tcity"
            label="To city"
            locations={CANONICAL_CITY_HITS}
            value={moveType === 'within' ? form.withinLocation : form.toLocation}
            onChange={chooseTo}
          />
        </div>
      </div>

      {moveType === 'within' && (
        <div class="lf-row">
          <div class="lf-field">
            <label for="lf-floc">From locality</label>
            <input id="lf-floc" type="text" placeholder="e.g. Dwarka" value={form.fromLocality} onInput={set('fromLocality')} required />
          </div>
          <div class="lf-field">
            <label for="lf-tloc">To locality</label>
            <input id="lf-tloc" type="text" placeholder="e.g. Rohini" value={form.toLocality} onInput={set('toLocality')} required />
          </div>
        </div>
      )}

      <div class="lf-row">
        <div class="lf-field">
          <label for="lf-prop">Home / property type</label>
          <select id="lf-prop" name="propertyType" value={form.propertyType} onChange={set('propertyType')}>
            {PROPERTY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div class="lf-field">
          <label for="lf-date">Preferred moving date</label>
          <input id="lf-date" name="date" type="date" min={today} value={form.date} onInput={set('date')} required />
        </div>
      </div>

      <div class="lf-field lf-span">
        <label for="lf-email">Email <span class="lf-opt">(optional)</span></label>
        <input id="lf-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" value={form.email} onInput={set('email')} />
      </div>

      {!horizontal && (
        <div class="lf-field">
          <label for="lf-msg">Additional requirements <span class="lf-opt">(optional)</span></label>
          <textarea id="lf-msg" name="message" rows={2} placeholder="Vehicle, floor, lift, anything we should know…" value={form.message} onInput={set('message')} />
        </div>
      )}

      {status === 'error' && <p class="lf-err lf-err--send" role="alert">We couldn't send your request from this page. Please try again — or reach us instantly:</p>}

      <div class="lf-foot">
        <button class="lf-submit" type="submit">Get a Free Quote</button>
        {status === 'error' && <><a class="lf-btn lf-btn--call" href={telHref() || '/contact/'}>Call Now</a><a class="lf-btn lf-btn--wa" href={waHref} target="_blank" rel="noopener">WhatsApp Us</a></>}
        <p class="lf-note">Free · no obligation</p>
      </div>
    </form>
  );
}
