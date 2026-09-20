import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

/**
 * Shiftify lead-generation form — the site's single conversion system.
 *
 * - Move type toggle (within-city / intercity-interstate) swaps the location
 *   field set so users never see irrelevant inputs.
 * - Indian mobile numbers only: ^[6-9][0-9]{9}$, inline error, submit blocked.
 * - Server-side delivery to /api/lead (Cloudflare Pages Function). If the
 *   endpoint is unreachable (e.g. static preview), the user gets an honest
 *   error plus Call/WhatsApp fallback actions — never a fake success.
 * - Prefill via props so SEO pages hand the form its route/locality context.
 */

export type LeadFormContext = {
  source?: string; // page label for the email, e.g. 'home' | 'service:bike-transportation'
  fromCity?: string;
  fromLocality?: string;
  toCity?: string;
  toLocality?: string;
  fromState?: string;
  toState?: string;
  service?: string;
};

type MoveType = 'within' | 'intercity';

const PROPERTY_OPTIONS = ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK+', 'Office', 'Other'] as const;
const PHONE_RE = /^[6-9][0-9]{9}$/;

export default function LeadForm({ context = {}, horizontal = false }: { context?: LeadFormContext; horizontal?: boolean }) {
  const full = useMemo(() => ({
    fromCity: context.fromCity ?? '',
    fromLocality: context.fromLocality ?? '',
    toCity: context.toCity ?? '',
    toLocality: context.toLocality ?? '',
    fromState: context.fromState ?? '',
    toState: context.toState ?? '',
    service: context.service ?? '',
  }), [context]);

  const [moveType, setMoveType] = useState<MoveType>(full.toCity || full.toState ? 'intercity' : 'within');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    withinCity: full.fromCity || 'Delhi',
    fromLocality: full.fromLocality,
    toLocality: full.toLocality,
    fromCity: full.fromCity,
    fromState: full.fromState,
    toCity: full.toCity,
    toState: full.toState,
    propertyType: '2 BHK',
    date: '',
    message: '',
    company: '', // honeypot — humans never fill this
  });
  const [phoneErr, setPhoneErr] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const sentRef = useRef(false);

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Hero quick-quote bar → prefill: intercity city names (+states when the
  // typed cities match our network) and the chosen date. Live event for the
  // mounted form, sessionStorage stash for the one mounting right after.
  useEffect(() => {
    const apply = (d: any) => {
      if (!d) return;
      setMoveType('intercity');
      setForm((f) => ({
        ...f,
        fromCity: d.fromCity ?? f.fromCity,
        fromState: d.fromState ?? f.fromState,
        toCity: d.toCity ?? f.toCity,
        toState: d.toState ?? f.toState,
        date: d.date ?? f.date,
      }));
    };
    const handler = (e: Event) => apply((e as CustomEvent).detail);
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

  const fromText = moveType === 'within'
    ? [form.fromLocality, form.withinCity].filter(Boolean).join(', ')
    : [form.fromCity, form.fromState].filter(Boolean).join(', ');
  const toText = moveType === 'within'
    ? [form.toLocality, form.withinCity].filter(Boolean).join(', ')
    : [form.toCity, form.toState].filter(Boolean).join(', ');

  const waMessage = [
    'Hi Shiftify, I would like to enquire about a move.',
    '',
    `Name: ${form.name}`,
    `Move Type: ${moveType === 'within' ? 'Within City' : 'Intercity / Interstate'}`,
    `From: ${fromText}`,
    `To: ${toText}`,
    `Property Type: ${form.propertyType}`,
    `Preferred Date: ${form.date || 'Flexible'}`,
  ].join('\n');
  const waHref = `https://wa.me/918766331715?text=${encodeURIComponent(waMessage)}`;

  function validate(): string {
    if (!form.name.trim()) return 'Please enter your full name.';
    if (!PHONE_RE.test(form.phone)) return 'Enter a valid 10-digit Indian mobile number.';
    if (moveType === 'within') {
      if (!form.fromLocality.trim() || !form.toLocality.trim()) return 'Please fill both localities.';
    } else {
      if (!form.fromCity.trim() || !form.fromState.trim() || !form.toCity.trim() || !form.toState.trim())
        return 'Please fill from/to city and state.';
    }
    if (!form.date) return 'Please pick a preferred moving date.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email address, or leave it blank.';
    return '';
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    if (sentRef.current) return; // hard duplicate-submission guard
    const v = validate();
    if (v) {
      if (v.includes('mobile')) setPhoneErr('Enter a valid 10-digit Indian mobile number.');
      setErrorMsg(v);
      return;
    }
    setErrorMsg('');
    setPhoneErr('');
    sentRef.current = true;
    setStatus('sending');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          email: form.email.trim(),
          moveType: moveType === 'within' ? 'Within City' : 'Intercity / Interstate',
          from: fromText,
          to: toText,
          propertyType: form.propertyType,
          date: form.date,
          message: form.message.trim(),
          service: full.service,
          source: context.source ?? 'site',
          company: form.company, // honeypot
          submittedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('bad status ' + res.status);
      setStatus('done');
    } catch {
      sentRef.current = false;
      setStatus('error');
      setErrorMsg('');
    }
  }

  if (status === 'done') {
    return (
      <div class="lf lf--done" role="status">
        <div class="lf-done-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h3>Thanks, {form.name.split(' ')[0]}! Your request has been received.</h3>
        <p>Our team will contact you shortly on <strong>+91 {form.phone}</strong>. Want a faster reply?</p>
        <div class="lf-actions">
          <a class="lf-btn lf-btn--call" href="tel:+918766331715">Call Now</a>
          <a class="lf-btn lf-btn--wa" href={waHref} target="_blank" rel="noopener">WhatsApp Us</a>
        </div>
      </div>
    );
  }

  return (
    <form class={`lf${horizontal ? ' lf--h' : ''}`} onSubmit={onSubmit} noValidate id="lead-form">
      {/* honeypot — kept off-screen and off the tab order */}
      <input
        type="text" name="company" tabindex={-1} autocomplete="off" aria-hidden="true"
        class="lf-hp" value={form.company} onInput={set('company')}
      />

      <fieldset class="lf-mtype">
        <legend class="lf-legend">Move type</legend>
        <div class="lf-mtype-opts" role="radiogroup" aria-label="Move type">
          <label class={`lf-mopt${moveType === 'within' ? ' is-on' : ''}`}>
            <input type="radio" name="moveType" checked={moveType === 'within'} onChange={() => setMoveType('within')} />
            Within City
          </label>
          <label class={`lf-mopt${moveType === 'intercity' ? ' is-on' : ''}`}>
            <input type="radio" name="moveType" checked={moveType === 'intercity'} onChange={() => setMoveType('intercity')} />
            Intercity / Interstate
          </label>
        </div>
      </fieldset>

      <div class="lf-field">
        <label for="lf-name">Full name</label>
        <input id="lf-name" name="name" type="text" autocomplete="name" placeholder="e.g. Ananya Sharma" value={form.name} onInput={set('name')} required />
      </div>

      <div class="lf-field">
        <label for="lf-phone">Mobile number</label>
        <div class={`lf-phone${phoneErr ? ' lf-phone--err' : ''}`}>
          <span class="lf-phone-cc" aria-hidden="true">+91</span>
          <input
            id="lf-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national"
            placeholder="10-digit mobile" maxlength={10} value={form.phone}
            onInput={(e: any) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 10);
              setForm((f) => ({ ...f, phone: v }));
              setPhoneErr(v.length === 10 && !PHONE_RE.test(v) ? 'Enter a valid 10-digit Indian mobile number.' : '');
            }}
            onBlur={() => { if (form.phone && !PHONE_RE.test(form.phone)) setPhoneErr('Enter a valid 10-digit Indian mobile number.'); }}
            required
          />
        </div>
        {phoneErr && <p class="lf-err" role="alert">{phoneErr}</p>}
      </div>

      {moveType === 'within' ? (
        <div class="lf-row">
          <div class="lf-field">
            <label for="lf-wcity">City</label>
            <select id="lf-wcity" name="withinCity" value={form.withinCity} onChange={set('withinCity')}>
              {['Delhi', 'Gurgaon', 'Noida', 'Mumbai', 'Bengaluru'].map((c) => <option value={c}>{c}</option>)}
            </select>
          </div>
          <div class="lf-field">
            <label for="lf-floc">From locality</label>
            <input id="lf-floc" type="text" placeholder="e.g. Dwarka" value={form.fromLocality} onInput={set('fromLocality')} required />
          </div>
          <div class="lf-field">
            <label for="lf-tloc">To locality</label>
            <input id="lf-tloc" type="text" placeholder="e.g. Rohini" value={form.toLocality} onInput={set('toLocality')} required />
          </div>
        </div>
      ) : (
        <div class="lf-row lf-row--4">
          <div class="lf-field">
            <label for="lf-fcity">From city</label>
            <input id="lf-fcity" type="text" placeholder="e.g. Delhi" value={form.fromCity} onInput={set('fromCity')} required />
          </div>
          <div class="lf-field">
            <label for="lf-fstate">From state</label>
            <input id="lf-fstate" type="text" placeholder="e.g. Delhi" value={form.fromState} onInput={set('fromState')} required />
          </div>
          <div class="lf-field">
            <label for="lf-tcity">To city</label>
            <input id="lf-tcity" type="text" placeholder="e.g. Gurgaon" value={form.toCity} onInput={set('toCity')} required />
          </div>
          <div class="lf-field">
            <label for="lf-tstate">To state</label>
            <input id="lf-tstate" type="text" placeholder="e.g. Haryana" value={form.toState} onInput={set('toState')} required />
          </div>
        </div>
      )}

      <div class="lf-row">
        <div class="lf-field">
          <label for="lf-prop">Home / property type</label>
          <select id="lf-prop" name="propertyType" value={form.propertyType} onChange={set('propertyType')}>
            {PROPERTY_OPTIONS.map((o) => <option value={o}>{o}</option>)}
          </select>
        </div>
        <div class="lf-field">
          <label for="lf-date">Preferred moving date</label>
          <input id="lf-date" name="date" type="date" min={today} value={form.date} onInput={set('date')} required />
        </div>
        <div class="lf-field">
          <label for="lf-email">Email <span class="lf-opt">(optional)</span></label>
          <input id="lf-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" value={form.email} onInput={set('email')} />
        </div>
      </div>

      {!horizontal && (
        <div class="lf-field">
          <label for="lf-msg">Additional requirements <span class="lf-opt">(optional)</span></label>
          <textarea id="lf-msg" name="message" rows={2} placeholder="Vehicle, floor, lift, anything we should know…" value={form.message} onInput={set('message')} />
        </div>
      )}

      {status === 'error' && (
        <p class="lf-err lf-err--send" role="alert">
          We couldn't send your request from this page. Please try again — or reach us instantly:
        </p>
      )}

      <div class="lf-foot">
        <button class="lf-submit" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Get a Free Quote'}
        </button>
        {status === 'error' && (
          <>
            <a class="lf-btn lf-btn--call" href="tel:+918766331715">Call Now</a>
            <a class="lf-btn lf-btn--wa" href={waHref} target="_blank" rel="noopener">WhatsApp Us</a>
          </>
        )}
        <p class="lf-note">Free · no obligation · a human calls you back</p>
      </div>
    </form>
  );
}
