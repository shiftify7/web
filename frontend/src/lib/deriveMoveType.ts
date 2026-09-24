export type MoveTypeCode = 'INTRA_CITY' | 'INTERCITY' | 'INTERSTATE';

export type StructuredLocationKind = 'CITY' | 'STATE_ONLY' | 'OTHER_CITY';

export type LocRef = {
  /** Canonical city slug when known; blank for STATE_ONLY. */
  citySlug?: string;
  city?: string;
  state: string;
  stateCode?: string;
  kind?: StructuredLocationKind;
};

function identity(value: string | undefined): string {
  return (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Classify from the structured location identity, never from display labels.
 * INTRA_CITY is retained as the API-compatible name for WITHIN_CITY.
 * State-only and free-text other-city choices still classify from their state.
 */
export function deriveMoveType(source?: LocRef | null, destination?: LocRef | null): MoveTypeCode | null {
  if (!source || !destination) return null;
  const sourceState = source.stateCode || identity(source.state);
  const destinationState = destination.stateCode || identity(destination.state);
  if (!sourceState || !destinationState) return null;

  const sourceCity = source.citySlug || identity(source.city);
  const destinationCity = destination.citySlug || identity(destination.city);
  const sameState = sourceState === destinationState;
  const sameCity = Boolean(sourceCity && destinationCity && sourceCity === destinationCity);

  if (sameCity && sameState) return 'INTRA_CITY';
  if (sameState) return 'INTERCITY';
  return 'INTERSTATE';
}

export function moveTypeLabel(t: MoveTypeCode | null): string {
  if (t === 'INTRA_CITY') return 'Within City';
  if (t === 'INTERCITY') return 'Intercity Move';
  if (t === 'INTERSTATE') return 'Interstate Move';
  return '';
}
