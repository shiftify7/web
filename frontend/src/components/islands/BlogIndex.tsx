import { useEffect, useState } from 'preact/hooks';
import { apiUrl } from '@/consts';
import { mergePosts } from '@/data/seed-blogs';
import { cldSrcSet, cldUrl } from '@/lib/media';

type Post = {
  slug: string;
  title: string;
  excerpt?: string;
  publishedAt?: string;
  bannerImage?: string;
  featuredImage?: string;
  category?: string;
  featured?: boolean;
};

function fmt(d?: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function Card({ p, featured }: { p: Post; featured?: boolean }) {
  const banner = p.bannerImage || p.featuredImage;
  const inner = (
    <>
      {banner && (
        <img
          src={cldUrl(banner, featured ? 1200 : 720)}
          {...(banner.includes('res.cloudinary.com') ? { srcSet: cldSrcSet(banner, featured ? [480, 768, 1024, 1200] : [320, 480, 720]), sizes: featured ? '(max-width: 820px) calc(100vw - 32px), 820px' : '(max-width: 720px) calc(100vw - 32px), 360px' } : {})}
          alt={p.title || 'Shiftify moving guide'}
          width="1200"
          height="630"
          loading={featured ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
      <div class={featured ? '' : 'blog-card-body'}>
        {featured && <span class="kicker">Featured</span>}
        {p.category && <p class="blog-cat">{p.category}</p>}
        {featured ? <h2>{p.title}</h2> : <h3>{p.title}</h3>}
        {p.excerpt && <p>{p.excerpt}</p>}
        {p.publishedAt && <p class="blog-date">{fmt(p.publishedAt)}</p>}
        <span class="blog-more">Read article →</span>
      </div>
    </>
  );
  return featured
    ? <a class="blog-feat" href={`/blog/${p.slug}/`}>{inner}</a>
    : <a class="blog-card" href={`/blog/${p.slug}/`}>{inner}</a>;
}

export default function BlogIndex() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [featured, setFeatured] = useState<Post | null>(null);
  const [err, setErr] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');

  function load(p = page, append = false) {
    setErr(false);
    const params = new URLSearchParams({ page: String(p), limit: '12' });
    if (q.trim()) params.set('search', q.trim());
    fetch(apiUrl('/api/public/blogs?' + params.toString()))
      .then((r) => {
        if (!r.ok) throw new Error('bad');
        return r.json();
      })
      .then((d) => {
        const list: Post[] = mergePosts(d.posts || []);
        setPosts((prev) => (append && prev ? [...prev, ...list] : list));
        setFeatured(d.featured || list[0] || null);
        setTotalPages(d.totalPages || 1);
        setPage(d.page || p);
      })
      .catch(() => {
        const fallback = mergePosts([]) as Post[];
        if (!append) {
          setPosts(fallback);
          setFeatured(fallback[0] || null);
        }
        setErr(fallback.length === 0);
      });
  }

  useEffect(() => { load(1, false); }, []);

  if (posts === null) {
    return (
      <div class="blog-skels" aria-hidden="true">
        <div class="blog-skel" />
        <div class="blog-skel" />
        <div class="blog-skel" />
      </div>
    );
  }
  if (err && !posts.length) {
    return (
      <div class="blog-empty">
        <p>Unable to load articles.</p>
        <button type="button" class="btn btn--blue" onClick={() => load(1, false)}>Try again</button>
      </div>
    );
  }
  if (!posts.length) {
    return (
      <div class="blog-empty">
        <h2>No articles yet</h2>
        <p>We're preparing useful moving guides and resources.</p>
      </div>
    );
  }

  const rest = posts.filter((p) => p.slug !== featured?.slug);

  return (
    <div>
      <form class="blog-search" onSubmit={(e) => { e.preventDefault(); load(1, false); }}>
        <input value={q} onInput={(e: any) => setQ(e.target.value)} placeholder="Search articles" aria-label="Search articles" />
        <button type="submit" class="btn btn--ghost">Search</button>
      </form>
      {featured && <Card p={featured} featured />}
      {rest.length > 0 && (
        <>
          <h2 class="blog-latest">Latest articles</h2>
          <div class="blog-grid">
            {rest.map((p) => <Card p={p} key={p.slug} />)}
          </div>
        </>
      )}
      {page < totalPages && (
        <p style={{ marginTop: 20 }}>
          <button type="button" class="btn btn--ghost" onClick={() => load(page + 1, true)}>Load more</button>
          {' '}
          <a href={`/blog/?page=${page + 1}`}>Page {page + 1}</a>
        </p>
      )}
    </div>
  );
}
