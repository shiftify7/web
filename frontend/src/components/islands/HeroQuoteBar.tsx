import { useEffect, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import '@/styles/quote-modal.css';
import { type LocationHit } from '@/lib/locations';
import LocationSelector, { type LocationSelection } from './LocationSelector';
import LeadForm from './LeadForm';

export default function HeroQuoteBar({
  locations,
  landmarks = {},
}: {
  locations: LocationHit[];
  landmarks?: Record<string, { src: string; alt: string }>;
}) {
  const [from, setFrom] = useState<LocationSelection | null>(null);
  const [to, setTo] = useState<LocationSelection | null>(null);
  const [date, setDate] = useState('');
  const [open, setOpen] = useState(false);
  const [barErr, setBarErr] = useState<{ from?: string; to?: string; date?: string }>({});
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  function openModal() {
    const next: typeof barErr = {};
    if (!from) next.from = 'Select your pickup location.';
    if (!to) next.to = 'Select your destination location.';
    if (!date) next.date = 'Select your moving date.';
    setBarErr(next);
    if (next.from || next.to || next.date) return;
    lastFocus.current = document.activeElement as HTMLElement;
    setOpen(true);
    setTimeout(() => closeBtn.current?.focus(), 30);
  }

  function closeModal() {
    setOpen(false);
    lastFocus.current?.focus?.();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = previous;
    };
  }, [open]);

  function contextFor(location: LocationSelection) {
    return {
      kind: location.kind,
      id: location.id,
      city: location.city,
      citySlug: location.citySlug,
      state: location.state,
      stateCode: location.stateCode,
      locality: location.locality || '',
      freeText: location.freeText || '',
    };
  }

  return (
    <>
      <form class="hqb" onSubmit={(event) => { event.preventDefault(); openModal(); }} noValidate aria-label="Quick moving quote">
        <LocationSelector
          id="hqb-from"
          label="Pickup City"
          placeholder="Pickup City"
          locations={locations}
          landmarks={landmarks}
          variant="hero"
          value={from}
          onChange={(location) => { setFrom(location); setBarErr((error) => ({ ...error, from: undefined })); }}
          error={barErr.from}
        />
        <LocationSelector
          id="hqb-to"
          label="Drop City"
          placeholder="Drop City"
          locations={locations}
          landmarks={landmarks}
          variant="hero"
          value={to}
          onChange={(location) => { setTo(location); setBarErr((error) => ({ ...error, to: undefined })); }}
          error={barErr.to}
        />
        <div class={`hqb-cell hqb-cell--date${barErr.date ? ' is-err' : ''}`}>
          <span class="hqb-cal" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4.5" width="18" height="17" rx="2" /><path d="M8 2.5v4M16 2.5v4M3 10h18" /></svg>
          </span>
          <div class="hqb-cell-body">
            <label class="hqb-lab" for="hqb-date">Shifting Date</label>
            <input id="hqb-date" type="date" min={today} value={date} onInput={(event: any) => { setDate(event.target.value); setBarErr((error) => ({ ...error, date: undefined })); }} />
            {barErr.date && <p class="hqb-field-err" role="alert">{barErr.date}</p>}
          </div>
        </div>
        <button class="hqb-cta" type="submit">
          Get Instant Quote
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path d="M5 12h13M13 6.5 18.5 12 13 17.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </form>

      {open && typeof document !== 'undefined' && createPortal((
        <div class="hqm" role="presentation">
          <div class="hqm-scrim" onClick={closeModal} />
          <div class="hqm-card cp-form card" role="dialog" aria-modal="true" aria-labelledby="hqm-title">
            <button class="hqm-x" type="button" aria-label="Close quote form" ref={closeBtn} onClick={closeModal}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
            <h2 id="hqm-title" class="lf-title">Plan this move</h2>
            {from && to && (
              <LeadForm
                context={{
                  source: 'home-hero',
                  fromCity: from.kind === 'STATE_ONLY' ? '' : from.city,
                  fromState: from.state,
                  fromLocality: from.locality || '',
                  toCity: to.kind === 'STATE_ONLY' ? '' : to.city,
                  toState: to.state,
                  toLocality: to.locality || '',
                  date,
                  pickup: contextFor(from),
                  dropoff: contextFor(to),
                }}
              />
            )}
          </div>
        </div>
      ), document.body)}
    </>
  );
}
