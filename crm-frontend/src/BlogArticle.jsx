import { articleHtml } from './blogRender.js';
import { whatsappHref } from './contact.js';

function fmt(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

/** Same chrome as public BlogArticle.tsx */
export default function BlogArticle({ post, related = [], showChrome = true }) {
  const body = articleHtml(post);
  const banner = post.bannerImage || post.featuredImage;
  const draft = post.status && post.status !== 'published';
  return (
    <article class="sfx-article">
      {showChrome && (
        <p class="sfx-crumb">Home / Blog / {post.title || 'Article'}</p>
      )}
      {draft && <span class="sfx-draft">DRAFT PREVIEW</span>}
      {post.category && <p class="blog-cat">{post.category}</p>}
      <h1>{post.title || 'Untitled'}</h1>
      {post.excerpt && <p class="sfx-dek">{post.excerpt}</p>}
      {post.publishedAt && <p class="sfx-meta">{fmt(post.publishedAt)}</p>}
      {banner && <img class="sfx-banner" src={banner} alt="" />}
      <div class="sfx-body" dangerouslySetInnerHTML={{ __html: body }} />
      {post.tags?.length ? <p class="sfx-tags">{Array.isArray(post.tags) ? post.tags.join(' · ') : post.tags}</p> : null}
      <aside class="sfx-cta">
        <h2>Planning your next move?</h2>
        <p>Talk to Shiftify about your moving requirements.</p>
        <p>
          <a class="btn-sim" href="#">Get a quote</a>
          {' '}
          <a class="btn-sim ghost" href={whatsappHref('Hi Shiftify, I have a question about your moving guides.')}>WhatsApp us</a>
        </p>
      </aside>
      {related.length > 0 && (
        <section class="sfx-related">
          <h2>You may also like</h2>
          <ul>{related.map((r) => <li key={r.slug || r.title}>{r.title}</li>)}</ul>
        </section>
      )}
    </article>
  );
}
