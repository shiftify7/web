import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Content Layer collections — every data file is Zod-validated at build time.
 * A bad city/route/service entry fails the build; it never ships broken HTML.
 * Editorial-quality rules (≥300 words of unique local copy, <70% pairwise
 * similarity) are enforced separately by scripts/validate-content.mjs.
 */

const faq = z.object({
  q: z.string().min(8),
  a: z.string().min(20),
});

const localRule = z.object({
  title: z.string().min(3),
  detail: z.string().min(20),
});

const cities = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/cities' }),
  schema: z.object({
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/, 'slug must be lowercase-kebab')
      .describe('used in /packers-and-movers-{slug}/'),
    name: z.string(),
    aliases: z.array(z.string()).default([]),
    state: z.string(),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    /** true only where a genuine, GST-registered office exists */
    hasBranch: z.boolean(),
    address: z.string().optional(),
    gstin: z.string().optional(),
    /** city-desk phone; empty string = placeholder token */
    phone: z.string().default(''),
    localities: z
      .array(
        z.object({
          name: z.string(),
          slug: z.string().regex(/^[a-z0-9-]+$/),
          pincode: z.string().regex(/^\d{6}$/),
          /** 1–2 unique sentences about moving in this locality */
          intro: z.string().min(40),
          highlights: z.array(z.string().min(10)).min(2),
        }),
      )
      .default([]),
    topRoutes: z.array(z.string()).max(6),
    localRules: z.array(localRule).min(4),
    seasonality: z.object({ peak: z.string(), note: z.string().min(20) }),
    landmarks: z.array(z.string()).min(2),
    faqs: z.array(faq).min(5),
    nearbyCities: z.array(z.string()).min(1).max(6),
    /** unique 2–3 sentence city intro (anti-doorway content) */
    intro: z.string().min(80),
    /** unique "why Shiftify is different here" copy (anti-doorway content) */
    whyLocal: z.string().min(200),
    heroImage: z.string().optional(),
    metaTitle: z.string().min(20).max(65),
    metaDescription: z.string().min(60).max(160),
  }),
});

const routes = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/routes' }),
  schema: z.object({
    from: z.string().regex(/^[a-z0-9-]+$/),
    to: z.string().regex(/^[a-z0-9-]+$/),
    distanceKm: z.number().int().positive(),
    transitDays: z.tuple([z.number().int().positive(), z.number().int().positive()]),
    modes: z.array(z.enum(['dedicated-truck', 'shared-load', 'container', 'car-carrier'])).min(1),
    tollsAndPermits: z.string().min(20),
    faqs: z.array(faq).min(3),
    notes: z.string().min(40),
    metaTitle: z.string().min(20).max(65),
    metaDescription: z.string().min(60).max(160),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/services' }),
  schema: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string(),
    short: z.string().min(20).max(120),
    icon: z.enum(['home', 'bldg', 'car', 'truck', 'ware', 'route', 'box', 'globe']),
    description: z.string().min(80),
    features: z.array(z.object({ title: z.string(), text: z.string().min(20) })).min(3),
    faqs: z.array(faq).min(3),
    metaTitle: z.string().min(20).max(65),
    metaDescription: z.string().min(60).max(160),
  }),
});

const testimonials = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/testimonials' }),
  schema: z.object({
    name: z.string(),
    locality: z.string(),
    city: z.string().describe('city slug'),
    service: z.string().describe('service slug'),
    rating: z.number().int().min(1).max(5),
    text: z.string(),
    date: z.string().date(),
    /**
     * placeholder:true renders a visible dashed "sample review" state and the
     * review is excluded from AggregateRating. Never ship invented reviews.
     */
    placeholder: z.boolean(),
    verified: z.boolean().default(false),
  }),
});

const faqs = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/faqs' }),
  schema: z.object({
    q: z.string().min(8),
    a: z.string().min(20),
    tags: z.array(z.string()).default(['general']),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(60).max(160),
    pubDate: z.string().date(),
    updatedDate: z.string().date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { cities, routes, services, testimonials, faqs, guides };
