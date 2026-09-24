import { articleHtml, tocFromMarkdown } from '@/lib/blogRender';
import { cldSrcSet, cldUrl } from '@/lib/media';

export type ArticlePost = {
  slug?: string;
  title?: string;
  excerpt?: string;
  publishedAt?: string;
  bannerImage?: string;
  featuredImage?: string;
  content?: string;
  contentMode?: string;
  tags?: string[];
  category?: string;
  status?: string;
};

function fmt(d?: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

/** One article chrome for public pages and CRM customer preview. */
export default function BlogArticle({
  post,
  related = [],
  prev,
  next,
  showChrome = true,
}: {
  post: ArticlePost;
  related?: { slug: string; title: string }[];
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
  showChrome?: boolean;
}) {
  const body = articleHtml(post);
  const banner = post.bannerImage || post.featuredImage;
  const draft = post.status && post.status !== 'published';
  const toc = tocFromMarkdown(post.content || '');
  const mins = Math.max(1, Math.round(((post.content || '').split(/\s+/).length) / 200));

  return (
    <article class="sfx-article">
      {showChrome && (
        <p class="sfx-crumb">
          <a href="/">Home</a> / <a href="/blog/">Blog</a> / {post.title || 'Article'}
        </p>
      )}
      {draft && <span class="sfx-draft">DRAFT PREVIEW</span>}
      {post.category && <p class="blog-cat">{post.category}</p>}
      <h1>{post.title || 'Untitled'}</h1>
      {post.excerpt && <p class="sfx-dek">{post.excerpt}</p>}
      <p class="sfx-meta">{[fmt(post.publishedAt), `${mins} min read`, 'Shiftify'].filter(Boolean).join(' · ')}</p>
      {banner && (
        <img
          class="sfx-banner"
          src={cldUrl(banner, 1200)}
          {...(banner.includes('res.cloudinary.com') ? { srcSet: cldSrcSet(banner, [480, 768, 1024, 1200]), sizes: '(max-width: 820px) calc(100vw - 32px), 760px' } : {})}
          alt={post.title || 'Shiftify moving guide'}
          width="1200"
          height="630"
          loading="eager"
          decoding="async"
        />
      )}
      {toc.length > 0 && (
        <nav class="sfx-toc" aria-label="On this page">
          <p>On this page</p>
          <ol>
            {toc.slice(0, 6).map((t, n) => (
              <li key={t.id}><a href={`#${t.id}`}>{String(n + 1).padStart(2, '0')} {t.title}</a></li>
            ))}
          </ol>
        </nav>
      )}
      <div class="sfx-body" dangerouslySetInnerHTML={{ __html: body }} />
      {post.tags?.length ? <p class="sfx-tags">{post.tags.join(' · ')}</p> : null}

      <aside class="sfx-cta">
        <h2>Planning a move?</h2>
        <p>Tell us where you are moving, when, and what needs to go. After a short survey you get an itemised written quote.</p>
        <p>
          <a class="btn btn--blue" href="/#hero">Get a Free Quote</a>
        </p>
      </aside>

      {(prev || next) && (
        <nav class="sfx-pager">
          {prev && <a href={`/blog/${prev.slug}/`}>← {prev.title}</a>}
          {next && <a href={`/blog/${next.slug}/`}>{next.title} →</a>}
        </nav>
      )}
      {related.length > 0 && (
        <section class="sfx-related">
          <h2>Related guides</h2>
          <ul>
            {related.map((r) => (
              <li key={r.slug}><a href={`/blog/${r.slug}/`}>{r.title}</a></li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
