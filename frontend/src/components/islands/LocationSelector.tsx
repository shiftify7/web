import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  cityToHits,
  INDIA_REGIONS,
  regionLocationHits,
  searchLocations,
  type LocationHit,
} from '@/lib/locations';
import type { LocationImage } from '@/data/location-images';

export type CityOpt = {
  slug: string;
  name: string;
  state?: string;
  stateCode?: string;
  aliases?: string[];
  image?: LocationImage;
};

export type LocationSelectionKind = 'CITY' | 'STATE_ONLY' | 'OTHER_CITY';

export type LocationSelection = {
  kind: LocationSelectionKind;
  id: string;
  name: string;
  city: string;
  citySlug: string;
  state: string;
  stateCode: string;
  country: 'India';
  parentId: string | null;
  locality?: string;
  freeText?: string;
  aliases?: string[];
  image?: LocationImage;
};

type Landmark = { src: string; alt: string };

type SelectorProps = {
  id: string;
  label: string;
  placeholder?: string;
  /** Canonical location hits for the shared pickup/drop selector. */
  locations?: LocationHit[];
  /** Legacy prop accepted for existing call sites; it is normalized into hits. */
  cities?: CityOpt[];
  landmarks?: Record<string, Landmark>;
  value?: LocationSelection | string | null;
  onChange: (location: LocationSelection) => void;
  error?: string;
  variant?: 'default' | 'hero';
};

function slugify(value: string): string {
  return value.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'other-city';
}

function asLegacyHits(cities: CityOpt[]): LocationHit[] {
  return cities.flatMap((city) => cityToHits({
    slug: city.slug,
    name: city.name,
    state: city.state || '',
    aliases: city.aliases,
  }));
}

function imageFor(hit: LocationHit, landmarks: Record<string, Landmark>): Landmark | null {
  if (hit.image?.src) return { src: hit.image.src, alt: hit.imageAlt || `${hit.name} in ${hit.state}` };
  return landmarks[hit.citySlug] || landmarks[hit.slug] || null;
}

function Thumb({ hit, landmarks, hero = false }: { hit: LocationHit; landmarks: Record<string, Landmark>; hero?: boolean }) {
  const lm = imageFor(hit, landmarks);
  const [ok, setOk] = useState(Boolean(lm?.src));
  useEffect(() => setOk(Boolean(lm?.src)), [lm?.src]);
  if (lm?.src && ok) {
    return <img class={hero ? 'hqb-thumb' : 'locsel-img'} src={lm.src} alt={lm.alt} width="44" height="44" onError={() => setOk(false)} />;
  }
  // Do not leave an empty thumbnail box when a location has no local image.
  return null;
}

function hitToSelection(hit: LocationHit): LocationSelection {
  if (hit.kind === 'state' || hit.kind === 'ut') {
    return {
      kind: 'STATE_ONLY',
      id: hit.id,
      name: hit.state,
      city: '',
      citySlug: '',
      state: hit.state,
      stateCode: hit.stateCode,
      country: 'India',
      parentId: hit.parentId,
      image: hit.image,
    };
  }
  const city = hit.kind === 'locality' ? hit.city : hit.city;
  return {
    kind: 'CITY',
    id: hit.id,
    name: hit.name,
    city,
    citySlug: hit.citySlug,
    state: hit.state,
    stateCode: hit.stateCode,
    country: 'India',
    parentId: hit.parentId,
    locality: hit.kind === 'locality' ? hit.name : undefined,
    aliases: hit.aliases,
    image: hit.image,
  };
}

function selectionLabel(value: LocationSelection | string | null | undefined): { primary: string; secondary: string } | null {
  if (!value) return null;
  if (typeof value === 'string') return { primary: value, secondary: '' };
  if (value.kind === 'STATE_ONLY') return { primary: value.state, secondary: 'State or UT only' };
  return {
    primary: value.locality ? `${value.locality}, ${value.city}` : value.city || value.name,
    secondary: value.state,
  };
}

const VIEWPORT_GAP = 12;

function getHeroPlacement(trigger: HTMLElement, dropdown: HTMLElement): 'up' | 'down' {
  const rect = trigger.getBoundingClientRect();
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const height = Math.min(dropdown.offsetHeight || dropdown.scrollHeight || 280, 280);
  if (spaceBelow >= height + VIEWPORT_GAP) return 'down';
  if (spaceAbove >= height + VIEWPORT_GAP) return 'up';
  return spaceBelow >= spaceAbove ? 'down' : 'up';
}

/**
 * Shared pickup/drop selector. The quote bar and the detailed form use this
 * same search, keyboard and fallback behavior; only the visual variant differs.
 */
export default function LocationSelector({
  id,
  label,
  placeholder = 'Select your city',
  locations = [],
  cities,
  landmarks = {},
  value = null,
  onChange,
  error,
  variant = 'default',
}: SelectorProps) {
  const hero = variant === 'hero';
  const allLocations = useMemo(() => {
    const base = locations.length ? locations : (cities ? asLegacyHits(cities) : []);
    const byId = new Map<string, LocationHit>();
    [...base, ...regionLocationHits()].forEach((hit) => byId.set(hit.id, hit));
    return [...byId.values()];
  }, [locations, cities]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const [fallback, setFallback] = useState<'prompt' | 'state' | 'other'>('prompt');
  const [fallbackState, setFallbackState] = useState('');
  const [otherCity, setOtherCity] = useState('');
  const [dir, setDir] = useState<'up' | 'down'>('down');
  const root = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listId = `${id}-list`;
  const labelInfo = selectionLabel(value);
  const selectedId = typeof value === 'object' && value ? value.id : '';
  const hits = useMemo(() => searchLocations(allLocations, q, hero ? 7 : 10), [allLocations, q, hero]);
  const stateOptions = INDIA_REGIONS;

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    setHi(0);
  }, [q, fallback, open]);

  useLayoutEffect(() => {
    if (!hero || !open) {
      setDir('down');
      return;
    }
    const place = () => {
      const trigger = triggerRef.current;
      const dropdown = dropdownRef.current;
      if (!trigger || !dropdown) return;
      const next = getHeroPlacement(trigger, dropdown);
      setDir((previous) => previous === next ? previous : next);
      const box = dropdown.getBoundingClientRect();
      let shift = 0;
      if (box.left < VIEWPORT_GAP) shift = VIEWPORT_GAP - box.left;
      else if (box.right > window.innerWidth - VIEWPORT_GAP) shift = window.innerWidth - VIEWPORT_GAP - box.right;
      dropdown.style.transform = shift ? `translateX(${shift}px)` : '';
    };
    place();
    let raf = 0;
    const update = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [hero, open, hits.length, fallback]);

  function openSelector() {
    setOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  function closeSelector() {
    setOpen(false);
    setFallback('prompt');
    setQ('');
  }

  function pick(hit: LocationHit) {
    onChange(hitToSelection(hit));
    closeSelector();
  }

  function useFallback() {
    const region = stateOptions.find((item) => item.slug === fallbackState);
    if (!region) return;
    if (fallback === 'other' && !otherCity.trim()) return;
    if (fallback === 'state') {
      onChange({
        kind: 'STATE_ONLY',
        id: region.id,
        name: region.name,
        city: '',
        citySlug: '',
        state: region.name,
        stateCode: region.stateCode,
        country: 'India',
        parentId: region.id,
        image: undefined,
      });
    } else {
      const name = otherCity.trim();
      onChange({
        kind: 'OTHER_CITY',
        id: `other-city:${region.slug}:${slugify(name)}`,
        name,
        city: name,
        citySlug: slugify(name),
        state: region.name,
        stateCode: region.stateCode,
        country: 'India',
        parentId: region.id,
        freeText: name,
      });
    }
    closeSelector();
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSelector();
      triggerRef.current?.focus();
      return;
    }
    if (!open && (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === ' ')) {
      event.preventDefault();
      openSelector();
      return;
    }
    if (!open || fallback !== 'prompt') return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHi((index) => Math.min(index + 1, Math.max(0, hits.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHi((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (hits[hi]) pick(hits[hi]);
    }
  }

  const rootClass = hero ? `hqb-cell${error ? ' is-err' : ''}` : `locsel${error ? ' is-err' : ''}`;
  const bodyClass = hero ? 'hqb-cell-body' : 'locsel-body';
  const triggerClass = hero ? 'hqb-trigger' : 'locsel-btn';
  const dropdownClass = hero ? `hqb-dd ${dir === 'up' ? 'is-up' : 'is-down'}` : 'locsel-pop';
  const searchClass = hero ? 'hqb-search' : 'locsel-search';
  const resultsClass = hero ? 'hqb-results' : 'locsel-results';
  const optionClass = hero ? 'hqb-opt' : 'locsel-opt';
  const emptyClass = hero ? 'hqb-empty' : 'locsel-empty';

  return (
    <div class={rootClass} ref={root}>
      {hero && (
        <span class="hqb-pin" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9">
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.6" />
          </svg>
        </span>
      )}
      <div class={bodyClass}>
        <label class={hero ? 'hqb-lab' : undefined} for={id}>{label}</label>
        <button
          id={id}
          ref={triggerRef}
          type="button"
          class={triggerClass}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && fallback === 'prompt' && hits[hi] ? `${id}-option-${hi}` : undefined}
          onClick={() => open ? closeSelector() : openSelector()}
          onKeyDown={onKey}
        >
          {labelInfo ? (
            <span class={hero ? 'hqb-sel' : 'locsel-sel'}>
              {typeof value === 'object' && value && value.kind === 'CITY' && (
                <Thumb hit={{
                  id: value.id, type: 'city', kind: 'city', name: value.city || value.name, slug: value.citySlug,
                  city: value.city, citySlug: value.citySlug, state: value.state, stateCode: value.stateCode,
                  country: 'India', parentId: value.parentId, serviceable: true, image: value.image,
                }} landmarks={landmarks} hero={hero} />
              )}
              <span class={hero ? undefined : 'locsel-txt'}>
                <strong>{labelInfo.primary}</strong>
                <em>{labelInfo.secondary}</em>
              </span>
            </span>
          ) : (
            <span class={hero ? 'hqb-ph' : undefined}>{placeholder}</span>
          )}
          {!hero && <span class="locsel-caret" aria-hidden="true">▾</span>}
        </button>
        {error && <p class={hero ? 'hqb-field-err' : 'locsel-error'} role="alert">{error}</p>}
        {open && (
          <div class={dropdownClass} id={listId} role="listbox" aria-labelledby={id} ref={dropdownRef}>
            {fallback === 'prompt' ? (
              <input
                ref={searchRef}
                class={searchClass}
                type="search"
                placeholder="Search city, state or alias"
                value={q}
                autoFocus
                onInput={(event: any) => { setQ(event.target.value); setHi(0); }}
                onKeyDown={onKey}
                aria-label={`Search ${label.toLowerCase()}`}
              />
            ) : (
              <div class="locsel-fallback-head">
                <button type="button" class="locsel-back" onClick={() => setFallback('prompt')}>← Search again</button>
                <strong>{fallback === 'state' ? 'Choose a state or UT' : 'Add another city'}</strong>
              </div>
            )}
            <div class={resultsClass}>
              {fallback === 'prompt' ? (
                <>
                  {hits.length === 0 ? (
                    <p class={emptyClass}>No matching city or state.</p>
                  ) : hits.map((hit, index) => (
                    <button
                      key={hit.id}
                      id={`${id}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={selectedId === hit.id}
                      class={`${optionClass}${index === hi ? ' is-hi' : ''}${selectedId === hit.id ? ' is-on' : ''}`}
                      onMouseEnter={() => setHi(index)}
                      onClick={() => pick(hit)}
                    >
                      <Thumb hit={hit} landmarks={landmarks} hero={hero} />
                      <span class={hero ? undefined : 'locsel-txt'}>
                        <strong>{hit.kind === 'state' || hit.kind === 'ut' ? hit.state : hit.name}</strong>
                        <em>{hit.kind === 'locality' ? `${hit.city}, ${hit.state}` : hit.kind === 'state' || hit.kind === 'ut' ? 'Use state only' : hit.state}</em>
                      </span>
                    </button>
                  ))}
                  <div class="locsel-help" role="group" aria-label="More location choices">
                    <p>Not finding your city?</p>
                    <div>
                      <button type="button" onClick={() => setFallback('state')}>I don’t know the city</button>
                      <button type="button" onClick={() => setFallback('other')}>Other city</button>
                    </div>
                  </div>
                </>
              ) : (
                <div class="locsel-fallback-form">
                  <label for={`${id}-state`}>State or Union Territory</label>
                  <select id={`${id}-state`} value={fallbackState} onChange={(event: any) => setFallbackState(event.target.value)}>
                    <option value="">Select a state or UT</option>
                    {stateOptions.map((region) => <option key={region.id} value={region.slug}>{region.name}{region.type === 'ut' ? ' (UT)' : ''}</option>)}
                  </select>
                  {fallback === 'other' && (
                    <>
                      <label for={`${id}-other-city`}>City name</label>
                      <input
                        id={`${id}-other-city`}
                        type="text"
                        value={otherCity}
                        placeholder="Type your city"
                        onInput={(event: any) => setOtherCity(event.target.value)}
                      />
                    </>
                  )}
                  <button class="locsel-use" type="button" disabled={!fallbackState || (fallback === 'other' && !otherCity.trim())} onClick={useFallback}>
                    {fallback === 'state' ? 'Use state only' : 'Use this city'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
