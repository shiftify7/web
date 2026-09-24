import { useEffect, useState } from 'preact/hooks';
import { apiUrl } from '@/consts';
import BlogArticle, { type ArticlePost } from './BlogArticle';
import { seedBySlug, SEED_BLOGS } from '@/data/seed-blogs';

export default function BlogPost({ slug }: { slug: string }) {
  const [post, setPost] = useState<ArticlePost | null>(null);
  const [related, setRelated] = useState<{ slug: string; title: string }[]>([]);
  const [prev, setPrev] = useState<{ slug: string; title: string } | null>(null);
  const [next, setNext] = useState<{ slug: string; title: string } | null>(null);
  const [err, setErr] = useState<'load' | 'missing' | ''>('');

  useEffect(() => {
    fetch(apiUrl(`/api/public/blogs/${slug}`))
      .then((r) => r.json())
      .then((d) => {
        if (!d.post) {
          const seed = seedBySlug(slug);
          if (seed) setPost(seed);
          else setErr('missing');
        } else {
          setPost(d.post);
          setPrev(d.prev || null);
          setNext(d.next || null);
          document.title = `${d.post.seoTitle || d.post.title} | Shiftify`;
          const desc = d.post.seoDescription || d.post.excerpt;
          if (desc) {
            let m = document.querySelector('meta[name="description"]');
            if (!m) {
              m = document.createElement('meta');
              m.setAttribute('name', 'description');
              document.head.appendChild(m);
            }
            m.setAttribute('content', desc);
          }
          const ld = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: d.post.title,
            description: d.post.seoDescription || d.post.excerpt,
            datePublished: d.post.publishedAt,
            dateModified: d.post.updatedAt || d.post.publishedAt,
            author: d.post.author
              ? { '@type': 'Person', name: d.post.author }
              : { '@type': 'Organization', name: 'Shiftify' },
            publisher: { '@type': 'Organization', name: 'Shiftify Packers and Movers' },
            image: d.post.bannerImage || d.post.featuredImage,
            mainEntityOfPage: location.href,
          };
          const s = document.createElement('script');
          s.type = 'application/ld+json';
          s.textContent = JSON.stringify(ld);
          document.head.appendChild(s);
        }
      })
      .catch(() => {
        const seed = seedBySlug(slug);
        if (seed) setPost(seed);
        else setErr('load');
      });
    fetch(apiUrl('/api/public/blogs?limit=12'))
      .then((r) => r.json())
      .then((d) => {
        const list = (d.posts || []).filter((p: ArticlePost) => p.slug !== slug);
        const extra = SEED_BLOGS.filter((p) => p.slug !== slug && !list.some((x: ArticlePost) => x.slug === p.slug));
        setRelated([...list, ...extra].slice(0, 2).map((p: ArticlePost) => ({ slug: p.slug || '', title: p.title || '' })));
      })
      .catch(() => {
        setRelated(SEED_BLOGS.filter((p) => p.slug !== slug).slice(0, 2).map((p) => ({ slug: p.slug, title: p.title })));
      });
  }, [slug]);

  if (err === 'load') {
    return (
      <p>
        Unable to load this article.{' '}
        <button type="button" onClick={() => location.reload()}>Try again</button>
      </p>
    );
  }
  if (err === 'missing') return <p>This article is not published.</p>;
  if (!post) return <div class="blog-skel" aria-busy="true" />;

  return <BlogArticle post={post} related={related} prev={prev} next={next} showChrome={false} />;
}
