import { SITE, canonical } from '@/consts';
import type { City, Route, Service } from './data';
import type { IndiaRegion } from './locations';

/**
 * JSON-LD builders. Rules (per project SEO spec):
 * - Organization + WebSite sitewide.
 * - MovingCompany only on home/contact with the REAL HQ address.
 * - City pages: Service + areaServed. A LocalBusiness node is emitted ONLY
 *   where city.hasBranch && a real address exists — fabricated addresses are
 *   a known manual-action trigger.
 * - AggregateRating is emitted only when verified reviews exist.
 */

export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE.domain}/#organization`,
    name: SITE.tradeName,
    alternateName: SITE.name,
    url: `${SITE.domain}/`,
    ...(SITE.email ? { email: SITE.email } : {}),
    ...(SITE.phoneIntl ? { telephone: `+${SITE.phoneIntl}` } : {}),
    ...(SITE.gstin ? { taxID: SITE.gstin } : {}),
    logo: `${SITE.domain}/favicon-512.png`,
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE.domain}/#website`,
    url: `${SITE.domain}/`,
    name: SITE.tradeName,
    publisher: { '@id': `${SITE.domain}/#organization` },
    inLanguage: SITE.lang,
  };
}

export function movingCompanySchema() {
  if (!SITE.hqAddress) return null; // never emit a fabricated address
  return {
    '@type': 'MovingCompany',
    '@id': `${SITE.domain}/#movingcompany`,
    name: SITE.tradeName,
    url: `${SITE.domain}/`,
    address: { '@type': 'PostalAddress', streetAddress: SITE.hqAddress, addressCountry: 'IN' },
    ...(SITE.phoneIntl ? { telephone: `+${SITE.phoneIntl}` } : {}),
    ...(SITE.gstin ? { taxID: SITE.gstin } : {}),
  };
}

export function cityServiceSchema(city: City) {
  const service: Record<string, unknown> = {
    '@type': 'Service',
    '@id': canonical(`/packers-and-movers-${city.data.slug}/`) + '#service',
    serviceType: 'Packers and Movers',
    name: `Packers and Movers in ${city.data.name}`,
    provider: { '@id': `${SITE.domain}/#organization` },
    areaServed: {
      '@type': 'City',
      name: city.data.name,
      alternateName: city.data.aliases[0],
      geo: { '@type': 'GeoCoordinates', latitude: city.data.lat, longitude: city.data.lng },
    },
    url: canonical(`/packers-and-movers-${city.data.slug}/`),
  };
  const nodes: Record<string, unknown>[] = [service];
  // LocalBusiness ONLY for genuine branch offices.
  if (city.data.hasBranch && city.data.address) {
    nodes.push({
      '@type': 'MovingCompany',
      '@id': canonical(`/packers-and-movers-${city.data.slug}/`) + '#branch',
      name: `${SITE.tradeName} — ${city.data.name}`,
      address: { '@type': 'PostalAddress', streetAddress: city.data.address, addressCountry: 'IN' },
      ...(city.data.gstin ? { taxID: city.data.gstin } : {}),
      ...(city.data.phone ? { telephone: city.data.phone } : {}),
      parentOrganization: { '@id': `${SITE.domain}/#organization` },
    });
  }
  return nodes;
}

export function routeServiceSchema(route: Route, fromName: string, toName: string) {
  return {
    '@type': 'Service',
    '@id': canonical(`/packers-and-movers-${route.data.from}-to-${route.data.to}/`) + '#service',
    serviceType: 'Intercity Packers and Movers',
    name: `Packers and Movers ${fromName} to ${toName}`,
    provider: { '@id': `${SITE.domain}/#organization` },
    areaServed: [{ '@type': 'City', name: fromName }, { '@type': 'City', name: toName }],
    url: canonical(`/packers-and-movers-${route.data.from}-to-${route.data.to}/`),
  };
}

export function serviceSchema(service: Service) {
  return {
    '@type': 'Service',
    '@id': canonical(`/services/${service.data.slug}/`) + '#service',
    serviceType: service.data.name,
    name: `${service.data.name} — ${SITE.name}`,
    provider: { '@id': `${SITE.domain}/#organization` },
    url: canonical(`/services/${service.data.slug}/`),
  };
}

export function faqSchema(faqs: readonly { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbSchema(items: readonly { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: canonical(it.path),
    })),
  };
}

export function stateLandingSchema(region: IndiaRegion, capitalName: string) {
  const path = `/packers-and-movers-in-${region.slug}/`;
  return [
    {
      '@type': 'WebPage',
      '@id': canonical(path),
      name: `Packers and Movers in ${region.name}`,
      url: canonical(path),
      about: { '@type': 'AdministrativeArea', name: region.name, addressCountry: 'IN' },
      inLanguage: SITE.lang,
    },
    {
      '@type': 'Service',
      '@id': canonical(path) + '#service',
      serviceType: 'Packers and Movers',
      name: `Packers and Movers in ${region.name}`,
      provider: { '@id': `${SITE.domain}/#organization` },
      areaServed: { '@type': 'AdministrativeArea', name: region.name, addressCountry: 'IN' },
      description: `Moving and relocation planning information for ${region.name}, including ${capitalName}.`,
      url: canonical(path),
    },
  ];
}

/** Wrap nodes into a single @graph document. nulls are dropped. */
export function jsonLdGraph(...nodes: (Record<string, unknown> | null | undefined)[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}
