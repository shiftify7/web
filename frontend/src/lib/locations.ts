import type { LocationImage } from '@/data/location-images';
import { LOCATION_IMAGES } from '@/data/location-images';

export type IndiaRegionType = 'state' | 'ut';
export type LocationRecordType = IndiaRegionType | 'city';

export type IndiaRegion = {
  id: string;
  name: string;
  slug: string;
  type: IndiaRegionType;
  stateCode: string;
  country: 'India';
  parentId: null;
  serviceable: false;
  aliases?: string[];
  capital: string;
  capitalSlug: string;
  capitalImageSlug: string;
};

export type CityLocationRecord = {
  id: string;
  type: 'city';
  slug: string;
  name: string;
  state: string;
  stateCode: string;
  country: 'India';
  parentId: string;
  serviceable: boolean;
  aliases?: string[];
  capital: boolean;
  capitalFor?: string[];
  image?: LocationImage;
  imageAlt?: string;
};

export type LocationRecord = IndiaRegion | CityLocationRecord;

const state = (
  slug: string,
  name: string,
  stateCode: string,
  capital: string,
  capitalSlug: string,
  capitalImageSlug: string,
  aliases: string[] = [],
): IndiaRegion => ({
  id: `state:${slug}`,
  name,
  slug,
  type: 'state',
  stateCode,
  country: 'India',
  parentId: null,
  serviceable: false,
  aliases,
  capital,
  capitalSlug,
  capitalImageSlug,
});

const ut = (
  slug: string,
  name: string,
  stateCode: string,
  capital: string,
  capitalSlug: string,
  capitalImageSlug: string,
  aliases: string[] = [],
): IndiaRegion => ({
  id: `ut:${slug}`,
  name,
  slug,
  type: 'ut',
  stateCode,
  country: 'India',
  parentId: null,
  serviceable: false,
  aliases,
  capital,
  capitalSlug,
  capitalImageSlug,
});

/** The only hardcoded national state directory. Keep selectors and pages on this source. */
export const INDIA_STATES: IndiaRegion[] = [
  state('andhra-pradesh', 'Andhra Pradesh', 'AP', 'Amaravati', 'amaravati', 'amaravati'),
  state('arunachal-pradesh', 'Arunachal Pradesh', 'AR', 'Itanagar', 'itanagar', 'itanagar'),
  state('assam', 'Assam', 'AS', 'Dispur', 'dispur', 'dispur'),
  state('bihar', 'Bihar', 'BR', 'Patna', 'patna', 'patna'),
  state('chhattisgarh', 'Chhattisgarh', 'CG', 'Raipur', 'raipur', 'raipur'),
  state('goa', 'Goa', 'GA', 'Panaji', 'panaji', 'panaji', ['Goa state']),
  state('gujarat', 'Gujarat', 'GJ', 'Gandhinagar', 'gandhinagar', 'gandhinagar'),
  state('haryana', 'Haryana', 'HR', 'Chandigarh', 'chandigarh', 'chandigarh'),
  state('himachal-pradesh', 'Himachal Pradesh', 'HP', 'Shimla', 'shimla', 'shimla'),
  state('jharkhand', 'Jharkhand', 'JH', 'Ranchi', 'ranchi', 'ranchi'),
  state('karnataka', 'Karnataka', 'KA', 'Bengaluru', 'bengaluru', 'bengaluru', ['Karnataka state']),
  state('kerala', 'Kerala', 'KL', 'Thiruvananthapuram', 'thiruvananthapuram', 'thiruvananthapuram', ['Trivandrum']),
  state('madhya-pradesh', 'Madhya Pradesh', 'MP', 'Bhopal', 'bhopal', 'bhopal'),
  state('maharashtra', 'Maharashtra', 'MH', 'Mumbai', 'mumbai', 'mumbai'),
  state('manipur', 'Manipur', 'MN', 'Imphal', 'imphal', 'imphal'),
  state('meghalaya', 'Meghalaya', 'ML', 'Shillong', 'shillong', 'shillong'),
  state('mizoram', 'Mizoram', 'MZ', 'Aizawl', 'aizawl', 'aizawl'),
  state('nagaland', 'Nagaland', 'NL', 'Kohima', 'kohima', 'kohima'),
  state('odisha', 'Odisha', 'OR', 'Bhubaneswar', 'bhubaneswar', 'bhubaneswar', ['Orissa']),
  state('punjab', 'Punjab', 'PB', 'Chandigarh', 'chandigarh', 'chandigarh'),
  state('rajasthan', 'Rajasthan', 'RJ', 'Jaipur', 'jaipur', 'jaipur'),
  state('sikkim', 'Sikkim', 'SK', 'Gangtok', 'gangtok', 'gangtok'),
  state('tamil-nadu', 'Tamil Nadu', 'TN', 'Chennai', 'chennai', 'chennai', ['Tamilnadu']),
  state('telangana', 'Telangana', 'TS', 'Hyderabad', 'hyderabad', 'hyderabad'),
  state('tripura', 'Tripura', 'TR', 'Agartala', 'agartala', 'agartala'),
  state('uttar-pradesh', 'Uttar Pradesh', 'UP', 'Lucknow', 'lucknow', 'lucknow'),
  state('uttarakhand', 'Uttarakhand', 'UK', 'Dehradun', 'dehradun', 'dehradun', ['Uttaranchal']),
  state('west-bengal', 'West Bengal', 'WB', 'Kolkata', 'kolkata', 'kolkata', ['Bengal']),
];

/** Delhi/NCT, Jammu and Kashmir and Ladakh intentionally remain UT records. */
export const INDIA_UNION_TERRITORIES: IndiaRegion[] = [
  ut('andaman-and-nicobar-islands', 'Andaman and Nicobar Islands', 'AN', 'Sri Vijaya Puram', 'sri-vijaya-puram', 'sri-vijaya-puram', ['Port Blair']),
  ut('chandigarh', 'Chandigarh', 'CH', 'Chandigarh', 'chandigarh', 'chandigarh'),
  ut('dadra-and-nagar-haveli-and-daman-and-diu', 'Dadra and Nagar Haveli and Daman and Diu', 'DN', 'Daman', 'daman', 'daman', ['Dadra and Nagar Haveli', 'Daman and Diu']),
  ut('delhi', 'Delhi', 'DL', 'New Delhi', 'new-delhi', 'new-delhi', ['Delhi NCT', 'NCT of Delhi']),
  ut('jammu-and-kashmir', 'Jammu and Kashmir', 'JK', 'Srinagar and Jammu', 'srinagar', 'srinagar', ['Jammu & Kashmir']),
  ut('ladakh', 'Ladakh', 'LA', 'Leh', 'leh', 'leh'),
  ut('lakshadweep', 'Lakshadweep', 'LD', 'Kavaratti', 'kavaratti', 'kavaratti'),
  ut('puducherry', 'Puducherry', 'PY', 'Puducherry', 'puducherry', 'puducherry', ['Pondicherry']),
];

export const INDIA_REGIONS: IndiaRegion[] = [...INDIA_STATES, ...INDIA_UNION_TERRITORIES];

const REGION_ALIASES: Record<string, string> = {
  'andaman & nicobar islands': 'andaman-and-nicobar-islands',
  'andaman and nicobar': 'andaman-and-nicobar-islands',
  'dadra nagar haveli': 'dadra-and-nagar-haveli-and-daman-and-diu',
  'dadra and nagar haveli': 'dadra-and-nagar-haveli-and-daman-and-diu',
  'daman and diu': 'dadra-and-nagar-haveli-and-daman-and-diu',
  'delhi nct': 'delhi',
  'delhi/nct': 'delhi',
  'delhi (nct)': 'delhi',
  'nct of delhi': 'delhi',
  'jammu & kashmir': 'jammu-and-kashmir',
  'tamilnadu': 'tamil-nadu',
  'uttaranchal': 'uttarakhand',
  orissa: 'odisha',
};

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/[()]/g, '').replace(/\s+/g, ' ');
}

export function regionForState(value: string): IndiaRegion | undefined {
  const n = norm(value);
  const slug = REGION_ALIASES[n] || n.replace(/&/g, 'and').replace(/\s+/g, '-');
  return INDIA_REGIONS.find(
    (region) => region.slug === slug || norm(region.name) === n || region.aliases?.some((alias) => norm(alias) === n),
  );
}

export function canonicalStateName(value: string): string {
  return regionForState(value)?.name || value.replace(/\s*\(NCT\)/i, '').trim();
}

export function stateCodeOf(value: string): string {
  return regionForState(value)?.stateCode || '';
}

type CapitalSpec = {
  slug: string;
  name: string;
  stateSlug: string;
  aliases?: string[];
  imageSlug: string;
  imageAlt: string;
};

/** One record per capital city; Chandigarh is shared by Haryana and Punjab. */
const CAPITAL_SPECS: CapitalSpec[] = [
  { slug: 'amaravati', name: 'Amaravati', stateSlug: 'andhra-pradesh', imageSlug: 'amaravati', imageAlt: 'Amaravati Buddhist Monastery' },
  { slug: 'itanagar', name: 'Itanagar', stateSlug: 'arunachal-pradesh', imageSlug: 'itanagar', imageAlt: 'Buddhist temple in Itanagar' },
  { slug: 'dispur', name: 'Dispur', stateSlug: 'assam', imageSlug: 'dispur', imageAlt: 'Assam Secretariat in Dispur' },
  { slug: 'patna', name: 'Patna', stateSlug: 'bihar', imageSlug: 'patna', imageAlt: 'Golghar in Patna' },
  { slug: 'raipur', name: 'Raipur', stateSlug: 'chhattisgarh', imageSlug: 'raipur', imageAlt: 'NIT Raipur campus' },
  { slug: 'panaji', name: 'Panaji', stateSlug: 'goa', imageSlug: 'panaji', imageAlt: 'Panaji and the Mandovi River' },
  { slug: 'gandhinagar', name: 'Gandhinagar', stateSlug: 'gujarat', imageSlug: 'gandhinagar', imageAlt: 'Akshardham in Gandhinagar' },
  { slug: 'chandigarh', name: 'Chandigarh', stateSlug: 'chandigarh', imageSlug: 'chandigarh', imageAlt: 'Sukhna Lake in Chandigarh' },
  { slug: 'shimla', name: 'Shimla', stateSlug: 'himachal-pradesh', imageSlug: 'shimla', imageAlt: 'Shimla hills' },
  { slug: 'ranchi', name: 'Ranchi', stateSlug: 'jharkhand', imageSlug: 'ranchi', imageAlt: 'Ranchi Lake' },
  { slug: 'bengaluru', name: 'Bengaluru', stateSlug: 'karnataka', imageSlug: 'bengaluru', aliases: ['Bangalore'], imageAlt: 'Vidhana Soudha in Bengaluru' },
  { slug: 'thiruvananthapuram', name: 'Thiruvananthapuram', stateSlug: 'kerala', imageSlug: 'thiruvananthapuram', aliases: ['Trivandrum'], imageAlt: 'Padmanabhaswamy Temple in Thiruvananthapuram' },
  { slug: 'bhopal', name: 'Bhopal', stateSlug: 'madhya-pradesh', imageSlug: 'bhopal', imageAlt: 'Taj-ul-Masajid in Bhopal' },
  { slug: 'mumbai', name: 'Mumbai', stateSlug: 'maharashtra', imageSlug: 'mumbai', aliases: ['Bombay'], imageAlt: 'Gateway of India in Mumbai' },
  { slug: 'imphal', name: 'Imphal', stateSlug: 'manipur', imageSlug: 'imphal', imageAlt: 'Kangla Fort in Imphal' },
  { slug: 'shillong', name: 'Shillong', stateSlug: 'meghalaya', imageSlug: 'shillong', imageAlt: "Ward’s Lake in Shillong" },
  { slug: 'aizawl', name: 'Aizawl', stateSlug: 'mizoram', imageSlug: 'aizawl', imageAlt: "Solomon’s Temple in Aizawl" },
  { slug: 'kohima', name: 'Kohima', stateSlug: 'nagaland', imageSlug: 'kohima', imageAlt: 'Kohima Jain Temple' },
  { slug: 'bhubaneswar', name: 'Bhubaneswar', stateSlug: 'odisha', imageSlug: 'bhubaneswar', imageAlt: 'Lingaraja Temple in Bhubaneswar' },
  { slug: 'jaipur', name: 'Jaipur', stateSlug: 'rajasthan', imageSlug: 'jaipur', imageAlt: 'City Palace roofs in Jaipur' },
  { slug: 'gangtok', name: 'Gangtok', stateSlug: 'sikkim', imageSlug: 'gangtok', imageAlt: 'Gangtok city from the ropeway' },
  { slug: 'chennai', name: 'Chennai', stateSlug: 'tamil-nadu', imageSlug: 'chennai', imageAlt: 'Kapaleeshwarar Temple in Chennai' },
  { slug: 'hyderabad', name: 'Hyderabad', stateSlug: 'telangana', imageSlug: 'hyderabad', imageAlt: 'Charminar in Hyderabad' },
  { slug: 'agartala', name: 'Agartala', stateSlug: 'tripura', imageSlug: 'agartala', imageAlt: 'Ujjayanta Palace in Agartala' },
  { slug: 'lucknow', name: 'Lucknow', stateSlug: 'uttar-pradesh', imageSlug: 'lucknow', imageAlt: 'Bara Imambara in Lucknow' },
  { slug: 'dehradun', name: 'Dehradun', stateSlug: 'uttarakhand', imageSlug: 'dehradun', imageAlt: 'Ghantaghar in Dehradun' },
  { slug: 'kolkata', name: 'Kolkata', stateSlug: 'west-bengal', imageSlug: 'kolkata', imageAlt: 'Victoria Memorial in Kolkata' },
  { slug: 'new-delhi', name: 'New Delhi', stateSlug: 'delhi', imageSlug: 'new-delhi', aliases: ['Delhi', 'Delhi NCT'], imageAlt: 'India Gate in New Delhi' },
  { slug: 'sri-vijaya-puram', name: 'Sri Vijaya Puram', stateSlug: 'andaman-and-nicobar-islands', imageSlug: 'sri-vijaya-puram', aliases: ['Port Blair'], imageAlt: 'Cellular Jail in Sri Vijaya Puram' },
  { slug: 'daman', name: 'Daman', stateSlug: 'dadra-and-nagar-haveli-and-daman-and-diu', imageSlug: 'daman', imageAlt: 'Daman port' },
  { slug: 'srinagar', name: 'Srinagar', stateSlug: 'jammu-and-kashmir', imageSlug: 'srinagar', imageAlt: 'Srinagar panorama' },
  { slug: 'leh', name: 'Leh', stateSlug: 'ladakh', imageSlug: 'leh', imageAlt: 'Shanti Stupa in Leh' },
  { slug: 'kavaratti', name: 'Kavaratti', stateSlug: 'lakshadweep', imageSlug: 'kavaratti', imageAlt: 'Kavaratti island lagoon' },
  { slug: 'puducherry', name: 'Puducherry', stateSlug: 'puducherry', imageSlug: 'puducherry', imageAlt: 'Puducherry Promenade' },
];

function regionBySlug(slug: string): IndiaRegion {
  const region = INDIA_REGIONS.find((item) => item.slug === slug);
  if (!region) throw new Error(`Unknown India region slug: ${slug}`);
  return region;
}

function capitalRecord(spec: CapitalSpec): CityLocationRecord {
  const region = regionBySlug(spec.stateSlug);
  const isStateCapital = region.type === 'state';
  const capitalFor = INDIA_REGIONS
    .filter((item) => item.capitalSlug === spec.slug)
    .map((item) => item.name);
  return {
    id: `city:${spec.slug}`,
    type: 'city',
    slug: spec.slug,
    name: spec.name,
    state: region.name,
    stateCode: region.stateCode,
    country: 'India',
    parentId: region.id,
    serviceable: true,
    aliases: spec.aliases,
    capital: true,
    capitalFor: capitalFor.length ? capitalFor : isStateCapital ? [region.name] : undefined,
    image: LOCATION_IMAGES[spec.imageSlug],
    imageAlt: spec.imageAlt,
  };
}

export const CAPITAL_CITY_RECORDS: CityLocationRecord[] = CAPITAL_SPECS.map(capitalRecord);

export function capitalForRegion(region: IndiaRegion): CityLocationRecord | undefined {
  return CAPITAL_CITY_RECORDS.find((city) => city.slug === region.capitalSlug);
}

export const STATE_CAPITAL_RECORDS = INDIA_STATES.map((region) => ({
  state: region,
  capital: capitalForRegion(region),
}));

export type ServiceableCityOption = CityLocationRecord & { serviceable: true; capital: boolean };

function serviceableCity(slug: string, name: string, stateName: string, aliases: string[] = []): ServiceableCityOption {
  const region = regionForState(stateName);
  if (!region) throw new Error(`Unknown India state or UT: ${stateName}`);
  const capital = CAPITAL_CITY_RECORDS.find((city) => city.slug === slug);
  return {
    id: `city:${slug}`,
    type: 'city',
    slug,
    name,
    state: region.name,
    stateCode: region.stateCode,
    country: 'India',
    parentId: region.id,
    serviceable: true,
    aliases,
    capital: capital?.capital ?? false,
    capitalFor: capital?.capitalFor,
    image: capital?.image || LOCATION_IMAGES[slug],
    imageAlt: capital?.imageAlt,
  };
}

/** Existing selector coverage plus the NCR cities required by the national flow. */
export const SERVICEABLE_CITY_OPTIONS: ServiceableCityOption[] = [
  serviceableCity('delhi', 'Delhi', 'Delhi', ['New Delhi', 'Delhi NCR']),
  serviceableCity('gurgaon', 'Gurgaon', 'Haryana', ['Gurugram']),
  serviceableCity('noida', 'Noida', 'Uttar Pradesh', ['Noida Extension', 'Greater Noida West']),
  serviceableCity('ghaziabad', 'Ghaziabad', 'Uttar Pradesh'),
  serviceableCity('faridabad', 'Faridabad', 'Haryana'),
  serviceableCity('mumbai', 'Mumbai', 'Maharashtra', ['Bombay', 'Navi Mumbai', 'Thane']),
  serviceableCity('bengaluru', 'Bengaluru', 'Karnataka', ['Bangalore']),
];

/** One canonical record list used by selector search, metadata and integrations. */
export const INDIA_LOCATION_RECORDS: LocationRecord[] = (() => {
  const records = new Map<string, LocationRecord>();
  for (const region of INDIA_REGIONS) records.set(region.id, region);
  for (const city of CAPITAL_CITY_RECORDS) records.set(city.id, city);
  for (const city of SERVICEABLE_CITY_OPTIONS) {
    const previous = records.get(city.id);
    records.set(city.id, previous && previous.type === 'city' ? { ...previous, ...city, capital: previous.capital || city.capital } : city);
  }
  return [...records.values()];
})();

export type LocationHit = {
  id: string;
  type: 'city' | 'locality' | 'state' | 'ut';
  name: string;
  slug: string;
  city: string;
  citySlug: string;
  state: string;
  stateCode: string;
  country: 'India';
  kind: 'city' | 'locality' | 'state' | 'ut';
  parentId: string | null;
  serviceable: boolean;
  aliases?: string[];
  capital?: boolean;
  capitalFor?: string[];
  image?: LocationImage;
  imageAlt?: string;
};

function recordToHit(record: LocationRecord): LocationHit {
  if ('capitalSlug' in record) {
    return {
      id: record.id,
      type: record.type,
      name: record.name,
      slug: record.slug,
      city: record.capital,
      citySlug: record.capitalSlug,
      state: record.name,
      stateCode: record.stateCode,
      country: 'India',
      kind: record.type,
      parentId: null,
      serviceable: false,
      aliases: record.aliases,
      capital: true,
      image: LOCATION_IMAGES[record.capitalImageSlug],
      imageAlt: record.capital,
    };
  }
  return {
    id: record.id,
    type: 'city',
    name: record.name,
    slug: record.slug,
    city: record.name,
    citySlug: record.slug,
    state: record.state,
    stateCode: record.stateCode,
    country: 'India',
    kind: 'city',
    parentId: record.parentId,
    serviceable: record.serviceable,
    aliases: record.aliases,
    capital: record.capital,
    capitalFor: record.capitalFor,
    image: record.image,
    imageAlt: record.imageAlt,
  };
}

export function cityToHits(c: {
  slug: string;
  name: string;
  state: string;
  aliases?: string[];
  localities?: { name: string; slug: string }[];
}): LocationHit[] {
  const region = regionForState(c.state);
  if (!region || !region.stateCode) throw new Error(`Unknown India state or UT: ${c.state}`);
  const known = INDIA_LOCATION_RECORDS.find((record) => record.type === 'city' && record.slug === c.slug);
  const city: LocationHit = {
    id: `city:${c.slug}`,
    type: 'city',
    name: c.name,
    slug: c.slug,
    city: c.name,
    citySlug: c.slug,
    state: region.name,
    stateCode: region.stateCode,
    country: 'India',
    kind: 'city',
    parentId: region.id,
    serviceable: true,
    aliases: [...new Set([...(known?.type === 'city' ? known.aliases || [] : []), ...(c.aliases || [])])],
    capital: known?.type === 'city' ? known.capital : false,
    capitalFor: known?.type === 'city' ? known.capitalFor : undefined,
    image: known?.type === 'city' ? known.image : LOCATION_IMAGES[c.slug],
    imageAlt: known?.type === 'city' ? known.imageAlt : c.name,
  };
  const locs = (c.localities || []).map((l) => ({
    id: `loc:${c.slug}:${l.slug}`,
    type: 'locality' as const,
    name: l.name,
    slug: l.slug,
    city: c.name,
    citySlug: c.slug,
    state: region.name,
    stateCode: region.stateCode,
    country: 'India' as const,
    kind: 'locality' as const,
    parentId: city.id,
    serviceable: true,
  }));
  return [city, ...locs];
}

export function serviceableCityHits(existingSlugs: Iterable<string> = []): LocationHit[] {
  const existing = new Set(existingSlugs);
  return SERVICEABLE_CITY_OPTIONS.filter((city) => !existing.has(city.slug)).map(recordToHit);
}

export function capitalCityHits(existingSlugs: Iterable<string> = []): LocationHit[] {
  const existing = new Set(existingSlugs);
  return CAPITAL_CITY_RECORDS.filter((city) => !existing.has(city.slug)).map(recordToHit);
}

export function regionLocationHits(): LocationHit[] {
  return INDIA_REGIONS.map(recordToHit);
}

export function canonicalCityHits(): LocationHit[] {
  return INDIA_LOCATION_RECORDS.filter((record) => record.type === 'city').map(recordToHit);
}

export function searchLocations(all: LocationHit[], q: string, limit = 8): LocationHit[] {
  const s = q.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return all.filter((x) => x.kind === 'city').slice(0, limit);
  const scored = all
    .map((x) => {
      const names = [x.name, x.city, x.state, ...(x.aliases || [])].map((value) => value.toLowerCase());
      let score = 0;
      if (names.some((name) => name === s)) score = 100;
      else if (names.some((name) => name.startsWith(s))) score = 80;
      else if (names.some((name) => name.includes(s)) || x.slug.includes(s.replace(/\s/g, '-'))) score = 50;
      if (x.kind === 'state' || x.kind === 'ut') score -= 3;
      return { x, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.x.kind.localeCompare(b.x.kind) || a.x.name.localeCompare(b.x.name));
  return scored.slice(0, limit).map((r) => r.x);
}
