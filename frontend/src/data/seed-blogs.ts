import plan from '@/content/blog-seed/how-to-plan-house-move-without-stress.md?raw';
import pack from '@/content/blog-seed/complete-guide-packing-home-for-moving.md?raw';
import hire from '@/content/blog-seed/what-to-check-before-hiring-packers-and-movers.md?raw';
import ncr from '@/content/blog-seed/moving-within-ncr-delhi-gurgaon-noida.md?raw';

export type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  bannerImage: string;
  featuredImage: string;
  content: string;
  contentMode: 'markdown';
  status: 'published';
  seoTitle: string;
  seoDescription: string;
  author: string;
  tags: string[];
};

export const SEED_BLOGS: SeedPost[] = [
  {
    slug: 'how-to-plan-house-move-without-stress',
    title: 'How to Plan a House Move Without the Stress',
    excerpt: 'Work backwards from the date, inventory by room, and keep documents with you — a practical house-move plan.',
    category: 'Guides',
    publishedAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-15T08:00:00.000Z',
    bannerImage: '/blog/plan-house-move.webp',
    featuredImage: '/blog/plan-house-move.webp',
    content: plan,
    contentMode: 'markdown',
    status: 'published',
    seoTitle: 'How to Plan a House Move Without the Stress',
    seoDescription: 'A practical house-moving plan: date, inventory, packing timeline, fragile items, moving-day checks. From Shiftify Packers and Movers.',
    author: 'Shiftify',
    tags: ['house shifting', 'checklist'],
  },
  {
    slug: 'complete-guide-packing-home-for-moving',
    title: 'A Complete Guide to Packing Your Home for Moving',
    excerpt: 'Pack by room, keep cartons honest, label for the new house — a packing guide you can actually follow.',
    category: 'Guides',
    publishedAt: '2026-09-16T08:00:00.000Z',
    updatedAt: '2026-09-16T08:00:00.000Z',
    bannerImage: '/blog/packing-home.webp',
    featuredImage: '/blog/packing-home.webp',
    content: pack,
    contentMode: 'markdown',
    status: 'published',
    seoTitle: 'Complete Guide to Packing Your Home for Moving',
    seoDescription: 'Room-by-room packing for a house move: books, kitchen, electronics, labels and an essentials box. Shiftify guides.',
    author: 'Shiftify',
    tags: ['packing'],
  },
  {
    slug: 'what-to-check-before-hiring-packers-and-movers',
    title: 'What to Check Before Hiring Packers and Movers',
    excerpt: 'Read the quote, name what is included, and ask who is on site. A calm checklist before you book.',
    category: 'Guides',
    publishedAt: '2026-09-17T08:00:00.000Z',
    updatedAt: '2026-09-17T08:00:00.000Z',
    bannerImage: '/blog/hiring-movers.webp',
    featuredImage: '/blog/hiring-movers.webp',
    content: hire,
    contentMode: 'markdown',
    status: 'published',
    seoTitle: 'What to Check Before Hiring Packers and Movers',
    seoDescription: 'Questions to ask before you book movers: quote lines, packing scope, access, payment terms. No scare tactics.',
    author: 'Shiftify',
    tags: ['hiring'],
  },
  {
    slug: 'moving-within-ncr-delhi-gurgaon-noida',
    title: 'Moving Within NCR: A Practical Guide to Delhi, Gurgaon and Noida',
    excerpt: 'NCR moves turn on gates, lifts and loading hours — not kilometres. Planning notes for Delhi, Gurgaon and Noida.',
    category: 'NCR',
    publishedAt: '2026-09-18T08:00:00.000Z',
    updatedAt: '2026-09-18T08:00:00.000Z',
    bannerImage: '/blog/ncr-move.webp',
    featuredImage: '/blog/ncr-move.webp',
    content: ncr,
    contentMode: 'markdown',
    status: 'published',
    seoTitle: 'Moving Within NCR: Delhi, Gurgaon and Noida',
    seoDescription: 'Practical NCR relocation notes for Delhi, Gurgaon and Noida: society access, lifts, loading hours. Shiftify guides.',
    author: 'Shiftify',
    tags: ['NCR', 'Delhi', 'Gurgaon', 'Noida'],
  },
];

export function seedBySlug(slug: string) {
  return SEED_BLOGS.find((p) => p.slug === slug) || null;
}

export function mergePosts<T extends { slug: string }>(api: T[]): T[] {
  const have = new Set(api.map((p) => p.slug));
  const extra = SEED_BLOGS.filter((p) => !have.has(p.slug)) as unknown as T[];
  return [...api, ...extra];
}
