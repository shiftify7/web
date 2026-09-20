import { useState } from 'preact/hooks';

/**
 * Horizontal quick-quote bar for the hero (Pickup → Drop → Date → CTA).
 * Never collects the lead itself: on submit it hands the values to the main
 * LeadForm (via event + sessionStorage), then smooth-scrolls the user to the
 * full quote panel — one conversion system, no duplicate endpoint logic.
 */

type CityOpt = { name: string; state: string };

export default function HeroQuoteBar({ cities = [] as CityOpt[] }) {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [date, setDate] = useState('');
  const [err, setErr] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  function go(e: Event) {
    e.preventDefault();
    if (!pickup.trim() || !drop.trim()) {
      setErr('Add your pickup and drop cities to continue.');
      return;
    }
    setErr('');
    const find = (n: string) => cities.find((c) => c.name.toLowerCase() === n.trim().toLowerCase());
    const p = find(pickup);
    const d = find(drop);
    const detail = {
      fromCity: pickup.trim(),
      fromState: p?.state ?? '',
      toCity: drop.trim(),
      toState: d?.state ?? '',
      date,
    };
    try {
      sessionStorage.setItem('sfx:hero-quote', JSON.stringify(detail));
    } catch { /* private mode — the live event below still works */ }
    window.dispatchEvent(new CustomEvent('sfx:hero-quote', { detail }));
    // open the quote popup with the values just handed over
    window.dispatchEvent(new CustomEvent('sfx:quote-open'));
    window.setTimeout(
      () => (document.getElementById('lf-name') as HTMLInputElement | null)?.focus({ preventScroll: true }),
      350,
    );
  }

  return (
    <form class="hqb" onSubmit={go} noValidate aria-label="Quick quote — pickup, drop and date">
      <div class="hqb-field">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="hqb-ic">
          <path d="M12 21s-7-5.1-7-11a7 7 0 1 1 14 0c0 5.9-7 11-7 11z" fill="none" stroke="currentColor" stroke-width="1.8" />
          <circle cx="12" cy="10" r="2.6" fill="currentColor" />
        </svg>
        <input
          type="text"
          name="pickup"
          list="hqb-cities"
          placeholder="Pickup City"
          autocomplete="off"
          value={pickup}
          onInput={(e: any) => setPickup(e.target.value)}
          aria-label="Pickup city"
        />
      </div>

      <div class="hqb-field">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="hqb-ic hqb-ic--accent">
          <path d="M12 21s-7-5.1-7-11a7 7 0 1 1 14 0c0 5.9-7 11-7 11z" fill="none" stroke="currentColor" stroke-width="1.8" />
          <circle cx="12" cy="10" r="2.6" fill="currentColor" />
        </svg>
        <input
          type="text"
          name="drop"
          list="hqb-cities"
          placeholder="Drop City"
          autocomplete="off"
          value={drop}
          onInput={(e: any) => setDrop(e.target.value)}
          aria-label="Drop city"
        />
      </div>

      <div class="hqb-field hqb-field--date">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="hqb-ic">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <input
          type="date"
          name="date"
          min={today}
          value={date}
          onInput={(e: any) => setDate(e.target.value)}
          aria-label="Shifting date (optional)"
        />
      </div>

      <datalist id="hqb-cities">
        {cities.map((c) => (
          <option value={c.name} />
        ))}
      </datalist>

      <button class="hqb-btn" type="submit">
        Get Instant Quote
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
          <path d="M5 12h13M13 6.5 18.5 12 13 17.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      {err && (
        <p class="hqb-err" role="alert">
          {err}
        </p>
      )}
    </form>
  );
}
