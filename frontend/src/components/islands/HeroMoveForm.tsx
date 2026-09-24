import { useMemo, useRef, useState } from 'preact/hooks';
import { apiUrl } from '@/consts';
import { deriveMoveType, moveTypeLabel, type LocRef } from '@/lib/deriveMoveType';
import { type LocationHit } from '@/lib/locations';
import LocationSelector, { type LocationSelection } from './LocationSelector';

const PHONE_RE = /^[6-9][0-9]{9}$/;

type Landmark = { src: string; alt: string };

function hitToSelection(hit: LocationHit): LocationSelection {
  if (hit.kind === 'state' || hit.kind === 'ut') {
    return { kind: 'STATE_ONLY', id: hit.id, name: hit.state, city: '', citySlug: '', state: hit.state, stateCode: hit.stateCode, country: 'India', parentId: hit.parentId };
  }
  return {
    kind: 'CITY', id: hit.id, name: hit.name, city: hit.city, citySlug: hit.citySlug, state: hit.state,
    stateCode: hit.stateCode, country: 'India', parentId: hit.parentId, locality: hit.kind === 'locality' ? hit.name : undefined, image: hit.image,
  };
}

function selectionToHit(value: LocationSelection): LocationHit {
  return {
    id: value.id,
    type: value.kind === 'STATE_ONLY' ? 'state' : 'city',
    kind: value.kind === 'STATE_ONLY' ? 'state' : 'city',
    name: value.name,
    slug: value.citySlug || value.state.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    city: value.city,
    citySlug: value.citySlug,
    state: value.state,
    stateCode: value.stateCode,
    country: 'India',
    parentId: value.parentId,
    serviceable: true,
    image: value.image,
  };
}

function toRef(value: LocationSelection | null): LocRef | null {
  return value ? { kind: value.kind, citySlug: value.citySlug, city: value.city, state: value.state, stateCode: value.stateCode } : null;
}

function SharedCityField({
  id,
  label,
  placeholder,
  locations,
  landmarks,
  value,
  onPick,
}: {
  id: string;
  label: string;
  placeholder: string;
  locations: LocationHit[];
  landmarks: Record<string, Landmark>;
  value: LocationHit | null;
  onPick: (hit: LocationHit) => void;
}) {
  return (
    <LocationSelector
      id={id}
      label={label}
      placeholder={placeholder}
      locations={locations}
      landmarks={landmarks}
      value={value ? hitToSelection(value) : null}
      onChange={(selection) => onPick(selectionToHit(selection))}
    />
  );
}

export default function HeroMoveForm({ locations, landmarks = {} }: { locations: LocationHit[]; landmarks?: Record<string, Landmark> }) {
  const [from, setFrom] = useState<LocationHit | null>(null);
  const [to, setTo] = useState<LocationHit | null>(null);
  const [date, setDate] = useState('');
  const [flex, setFlex] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');
  const sent = useRef(false);
  const today = new Date().toISOString().slice(0, 10);

  const moveType = useMemo(
    () => deriveMoveType(from ? toRef(hitToSelection(from)) : null, to ? toRef(hitToSelection(to)) : null),
    [from, to],
  );

  async function onSubmit(event: Event) {
    event.preventDefault();
    if (sent.current) return;
    if (!from) { setErr('Select your pickup city or state.'); return; }
    if (!to) { setErr('Select your destination city or state.'); return; }
    if (!flex && !date) { setErr('Select your moving date.'); return; }
    if (!name.trim()) { setErr('Please enter your name.'); return; }
    if (!PHONE_RE.test(phone)) { setErr('Enter a valid 10-digit Indian mobile number.'); return; }
    setErr('');
    sent.current = true;
    setStatus('sending');
    const fromValue = hitToSelection(from);
    const toValue = hitToSelection(to);
    const payload = {
      name: name.trim(), phone, moveType: moveType || 'INTERCITY',
      fromCity: fromValue.city, fromState: fromValue.state, fromLocality: fromValue.locality || '',
      toCity: toValue.city, toState: toValue.state, toLocality: toValue.locality || '',
      from: [fromValue.locality, fromValue.city || fromValue.name, fromValue.state].filter(Boolean).join(', '),
      to: [toValue.locality, toValue.city || toValue.name, toValue.state].filter(Boolean).join(', '),
      date: flex ? '' : date, message: flex ? 'Flexible on moving date' : '', source: 'home-hero',
      pickup: fromValue, destination: toValue, flexibleDate: flex,
    };
    try {
      const response = await fetch(apiUrl('/api/lead'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('bad');
      setStatus('done');
    } catch {
      sent.current = false;
      setStatus('error');
      setErr('We could not send the request. Please try again or WhatsApp us.');
    }
  }

  if (status === 'done') {
    return <div class="hmf hmf--done" id="lead-form" role="status"><h2>Thank you for contacting Shiftify.</h2><p>Our team will contact you shortly.</p></div>;
  }

  return (
    <form class="hmf" id="lead-form" onSubmit={onSubmit} noValidate>
      <h2>Where are you moving?</h2>
      <SharedCityField id="hmf-from" label="From" placeholder="Search pickup city" locations={locations} landmarks={landmarks} value={from} onPick={setFrom} />
      <SharedCityField id="hmf-to" label="To" placeholder="Search destination city" locations={locations} landmarks={landmarks} value={to} onPick={setTo} />
      {moveType && <p class="hmf-type"><span>Move type</span> {moveTypeLabel(moveType)}</p>}
      <div class="hmf-field"><label for="hmf-date">Moving date</label><input id="hmf-date" type="date" min={today} value={date} disabled={flex} onInput={(event: any) => setDate(event.target.value)} /></div>
      <label class="hmf-flex"><input type="checkbox" checked={flex} onChange={(event: any) => setFlex(event.target.checked)} /> I'm flexible on my moving date</label>
      <div class="hmf-field"><label for="hmf-name">Name</label><input id="hmf-name" type="text" autocomplete="name" value={name} onInput={(event: any) => setName(event.target.value)} /></div>
      <div class="hmf-field"><label for="hmf-phone">Mobile</label><input id="hmf-phone" type="tel" inputmode="numeric" maxlength={10} value={phone} onInput={(event: any) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} /></div>
      {err && <p class="hmf-err" role="alert">{err}</p>}
      <button class="hmf-btn" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Get a Quote'}</button>
    </form>
  );
}
