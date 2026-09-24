import { useEffect, useRef, useState } from 'preact/hooks';
import { articleHtml } from './blogRender.js';
import BlogArticle from './BlogArticle.jsx';

const EMPTY = {
  title: '', slug: '', excerpt: '', content: '', contentMode: 'markdown',
  seoTitle: '', seoDescription: '', canonicalUrl: '', tags: '', category: '', author: '',
  featuredImage: '', bannerImage: '', status: 'draft', featured: false,
};

const CATS = ['', 'Moving Guides', 'Packing Tips', 'Intercity Moving', 'Home Relocation', 'Office Relocation'];

function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export function Blogs({ api }) {
  const [posts, setPosts] = useState([]);
  const [view, setView] = useState('list');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [slugLocked, setSlugLocked] = useState(false);
  const [err, setErr] = useState('');
  const [saveState, setSaveState] = useState('');
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewVp, setPreviewVp] = useState('desktop');
  const [editTab, setEditTab] = useState('edit');
  const [help, setHelp] = useState(false);
  const [picker, setPicker] = useState(false);
  const [media, setMedia] = useState([]);
  const [seoOpen, setSeoOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('updated');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, stats: { total: 0, published: 0, drafts: 0, unpublished: 0 } });
  const [listErr, setListErr] = useState('');
  const [listLoad, setListLoad] = useState(true);
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState(null);
  const ta = useRef(null);
  const timer = useRef(null);

  function load() {
    const p = new URLSearchParams({ page: String(page), limit: '10', sort });
    if (filter) p.set('status', filter);
    if (q) p.set('search', q);
    setListLoad(true); setListErr('');
    api('/api/crm/blogs?' + p.toString())
      .then((d) => {
        setPosts(d.posts || []);
        setMeta({ total: d.total || 0, totalPages: d.totalPages || 1, stats: d.stats || meta.stats });
        setListLoad(false);
      })
      .catch(() => { setListErr('Unable to load articles.'); setListLoad(false); });
  }
  useEffect(load, [page, filter, sort]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const on = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);

  useEffect(() => {
    if (!editId || !dirty) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save('draft', true), 2500);
    return () => clearTimeout(timer.current);
  }, [form, editId, dirty]);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
    setSaveState('');
  }

  function openNew() {
    setForm(EMPTY); setEditId(null); setSlugLocked(false); setView('edit'); setDirty(false); setErr('');
  }
  function openEdit(p) {
    setForm({ ...EMPTY, ...p, tags: (p.tags || []).join(', ') });
    setEditId(p._id); setSlugLocked(true); setView('edit'); setDirty(false); setErr('');
  }
  function leave() {
    if (dirty && !confirm('Unsaved changes. Leave without saving?')) return;
    setView('list'); setDirty(false); load();
  }

  function insert(before, after = '') {
    const el = ta.current;
    if (!el) { setField('content', (form.content || '') + before + after); return; }
    const a = el.selectionStart; const b = el.selectionEnd;
    const sel = form.content.slice(a, b) || 'text';
    const next = form.content.slice(0, a) + before + sel + after + form.content.slice(b);
    setField('content', next);
  }

  async function save(status, silent) {
    setErr('');
    if (status === 'published') {
      if (!form.title || !form.slug || !form.excerpt || !form.content) {
        setErr('Title, slug, description and content are required to publish.');
        return;
      }
      if (!form.bannerImage && !form.featuredImage) {
        setErr('Banner / featured image is required before publishing.');
        return;
      }
      if (!silent && !confirm(`Publish article?\n\n${form.title || 'Untitled'}\n\nThis will make the article publicly visible.`)) return;
    }
    const payload = { ...form, status, tags: String(form.tags).split(',').map((t) => t.trim()).filter(Boolean) };
    if (status === 'published' && !payload.publishedAt) payload.publishedAt = new Date().toISOString();
    setSaveState('Saving…');
    try {
      if (editId) {
        await api(`/api/crm/blogs/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        const d = await api('/api/crm/blogs', { method: 'POST', body: JSON.stringify(payload) });
        setEditId(d.post?._id);
      }
      setForm((f) => ({ ...f, status }));
      setDirty(false);
      setSaveState('Saved');
      setToast(status === 'published' ? 'Article published' : status === 'unpublished' ? 'Article unpublished' : 'Article saved');
      if (!silent) load();
    } catch (ex) {
      setSaveState('');
      const code = ex.data?.error;
      setErr(code === 'slug_taken' ? 'This slug is already in use.' : code === 'banner_required' ? 'Banner is required to publish.' : 'Could not save post.');
    }
  }

  async function openPicker() {
    setPicker(true);
    api('/api/crm/media').then((d) => setMedia(d.items || [])).catch(() => {});
  }
  function pick(url) {
    if (form.contentMode === 'html') insert(`<img src="${url}" alt="" />`);
    else insert(`![`, `](${url})`);
    setPicker(false);
  }

  const html = articleHtml(form);
  const statusLabel = form.status === 'published' ? 'PUBLISHED' : form.status === 'unpublished' ? 'UNPUBLISHED' : 'DRAFT';
  const previewPost = {
    ...form,
    tags: String(form.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
  };

  if (view === 'list') {
    return (
      <div>
        <div class="page-head">
          <div>
            <h2>Blog</h2>
            <p>Create, preview and publish Shiftify journal articles.</p>
          </div>
          <button type="button" onClick={openNew}>New article</button>
        </div>
        {posts.length === 0 ? <div class="empty">No blog posts yet.</div> : (
          <div class="panel" style={{ padding: 0 }}>
            <table class="crm">
              <thead><tr><th>Title</th><th>Slug</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p._id} onClick={() => openEdit(p)}>
                    <td>{p.title || 'Untitled'}</td>
                    <td>/{p.slug}</td>
                    <td><span class={`badge b-${p.status === 'published' ? 'CONVERTED' : 'NEW'}`}>{p.status}</span></td>
                    <td>
                      {p.status === 'published'
                        ? <button type="button" class="ghost" onClick={(e) => { e.stopPropagation(); api(`/api/crm/blogs/${p._id}`, { method: 'PATCH', body: JSON.stringify({ status: 'draft' }) }).then(load); }}>Unpublish</button>
                        : <button type="button" class="ghost" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>Edit</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div class="cms-bar">
        <button type="button" class="ghost" onClick={leave}>← Back to Blog</button>
        <strong>{editId ? 'Edit article' : 'New article'}</strong>
        <span class={`badge b-${statusLabel === 'PUBLISHED' ? 'CONVERTED' : 'NEW'}`}>{statusLabel}</span>
        <span class="hint">{saveState}</span>
        <span class="cms-actions">
          <button type="button" class="ghost" onClick={() => save('draft')}>Save draft</button>
          <button type="button" class="ghost" onClick={() => setPreviewOpen(true)}>Preview article</button>
          {form.status === 'published'
            ? <button type="button" class="ghost" onClick={() => { if (confirm('Unpublish this article?')) save('unpublished'); }}>Unpublish</button>
            : <button type="button" onClick={() => save('published')}>Publish</button>}
        </span>
      </div>
      {err && <p class="err">{err}</p>}
      <div class="cms-grid">
        <div>
          <label>Title *
            <input value={form.title} onInput={(e) => {
              const title = e.target.value;
              setForm((f) => ({ ...f, title, slug: slugLocked ? f.slug : slugify(title) }));
              setDirty(true);
            }} required />
          </label>
          <p class="hint">Recommended: 50–65 characters if this is also the SEO title.</p>
          <label>Slug *
            <input value={form.slug} onInput={(e) => { setSlugLocked(true); setField('slug', e.target.value); }} required />
          </label>
          <p class="hint">Public URL: https://shiftify.in/blog/{form.slug || '…'}/</p>
          <label>Description *
            <textarea rows="3" value={form.excerpt} onInput={(e) => setField('excerpt', e.target.value)} />
          </label>
          <p class="hint">Short summary used in article cards and metadata.</p>

          <div class="seg">
            <button type="button" class={form.contentMode === 'markdown' ? '' : 'ghost'} onClick={() => setField('contentMode', 'markdown')}>Markdown</button>
            <button type="button" class={form.contentMode === 'html' ? '' : 'ghost'} onClick={() => setField('contentMode', 'html')}>HTML</button>
            <button type="button" class={editTab === 'edit' ? '' : 'ghost'} onClick={() => setEditTab('edit')}>Edit</button>
            <button type="button" class={editTab === 'preview' ? '' : 'ghost'} onClick={() => setEditTab('preview')}>Preview</button>
            {form.contentMode === 'markdown' && <button type="button" class="ghost" onClick={() => setHelp(!help)} aria-label="Markdown guide">?</button>}
          </div>
          {help && (
            <pre class="md-help">{`# Heading
## Subheading
**Bold**  *Italic*
- List
1. Numbered
[Link](https://)
![Image](https://)
> Quote`}</pre>
          )}
          {editTab === 'edit' && form.contentMode === 'markdown' && (
            <div class="md-tools">
              {[
                ['H1', () => insert('# ')],
                ['H2', () => insert('## ')],
                ['B', () => insert('**', '**')],
                ['I', () => insert('*', '*')],
                ['Link', () => insert('[', '](https://)')],
                ['List', () => insert('- ')],
                ['1.', () => insert('1. ')],
                ['Quote', () => insert('> ')],
                ['Code', () => insert('`', '`')],
                ['Image', openPicker],
                ['—', () => insert('\n---\n')],
              ].map(([l, fn]) => <button type="button" class="ghost" key={l} onClick={fn}>{l}</button>)}
            </div>
          )}
          <div class="split-ed">
            <textarea
              ref={ta}
              class={form.contentMode === 'html' ? 'code-ed' : 'md-ed'}
              rows="18"
              value={form.content}
              onInput={(e) => setField('content', e.target.value)}
              spellcheck={form.contentMode !== 'html'}
            />
            <div class="live-pane">
              <p class="hint">Live customer render</p>
              <div class="sfx-body" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>
        </div>
        <aside class="cms-side">
          <label>Status
            <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </label>
          <label class="hint" style={{ fontWeight: 600 }}>
            <input type="checkbox" checked={Boolean(form.featured)} onChange={(e) => {
              if (e.target.checked && !confirm('Make this the featured article? Any previous featured post will be cleared.')) return;
              setField('featured', e.target.checked);
            }} /> Featured article
          </label>
          <p><strong>Banner image *</strong></p>
          <p class="hint">Required to publish. Recommended wide image.</p>
          {form.bannerImage && <img class="banner-prev" src={form.bannerImage} alt="Banner preview" />}
          <label>Banner URL<input value={form.bannerImage} onInput={(e) => setField('bannerImage', e.target.value)} /></label>
          <div class="btn-row">
            <button type="button" class="ghost" onClick={openPicker}>Media library</button>
            {form.bannerImage && <button type="button" class="ghost" onClick={() => setField('bannerImage', '')}>Remove</button>}
          </div>
          <label>Upload
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const fd = new FormData(); fd.append('file', f);
              try {
                const d = await api('/api/crm/media', { method: 'POST', body: fd });
                setField('bannerImage', d.item.url);
              } catch { setErr('Upload failed. Check Cloudinary.'); }
            }} />
          </label>
          <label>Author (optional)<input value={form.author} onInput={(e) => setField('author', e.target.value)} /></label>
          <label>Category (optional)
            <select value={form.category} onChange={(e) => setField('category', e.target.value)}>
              {CATS.map((c) => <option value={c}>{c || 'None'}</option>)}
            </select>
          </label>
          <label>Tags (optional)<input value={form.tags} onInput={(e) => setField('tags', e.target.value)} /></label>
          <button type="button" class="ghost" onClick={() => setSeoOpen(!seoOpen)}>SEO settings</button>
          {seoOpen && (
            <div>
              <label>SEO title (optional)<input value={form.seoTitle} onInput={(e) => setField('seoTitle', e.target.value)} /></label>
              <p class="hint">Used for search engines and browser title.</p>
              <label>SEO description (optional)<input value={form.seoDescription} onInput={(e) => setField('seoDescription', e.target.value)} /></label>
              <p class="hint">Short summary for search results.</p>
              <label>Canonical URL (optional)<input value={form.canonicalUrl} onInput={(e) => setField('canonicalUrl', e.target.value)} placeholder={`https://shiftify.in/blog/${form.slug || ''}/`} /></label>
              <p class="hint">Leave blank to use https://shiftify.in/blog/{form.slug || 'slug'}/</p>
              <div class="seo-sim">
                <strong>{form.seoTitle || form.title || 'Shiftify article'}</strong>
                <em>https://shiftify.in/blog/{form.slug || 'slug'}/</em>
                <p>{form.seoDescription || form.excerpt || '—'}</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {previewOpen && (
        <div class="preview-modal">
          <div class="preview-modal-bar">
            <span>Customer preview — unsaved editor state</span>
            <button type="button" class={previewVp === 'desktop' ? '' : 'ghost'} onClick={() => setPreviewVp('desktop')}>Desktop</button>
            <button type="button" class={previewVp === 'tablet' ? '' : 'ghost'} onClick={() => setPreviewVp('tablet')}>Tablet</button>
            <button type="button" class={previewVp === 'mobile' ? '' : 'ghost'} onClick={() => setPreviewVp('mobile')}>Mobile</button>
            <button type="button" class="ghost" onClick={() => setPreviewOpen(false)}>Close</button>
          </div>
          <div class={`preview-frame preview-frame--${previewVp}`}>
            <div class="site-chrome">
              <div class="site-chrome-bar">
                <img src="/logo-lockup.png" alt="Shiftify" />
                <span>Journal</span>
              </div>
              <div class="site-chrome-main">
                <BlogArticle post={previewPost} related={posts.filter((p) => p.status === 'published' && p._id !== editId).slice(0, 3)} />
              </div>
              <div class="site-chrome-foot">© Shiftify Packers and Movers</div>
            </div>
          </div>
        </div>
      )}

      {picker && (
        <div class="preview-modal" onClick={() => setPicker(false)}>
          <div class="panel" style={{ maxWidth: 640, margin: '8vh auto' }} onClick={(e) => e.stopPropagation()}>
            <h3>Media picker</h3>
            <div class="media-grid">
              {media.map((m) => (
                <div class="media" key={m._id}>
                  <img src={m.url} alt="" />
                  <button type="button" onClick={() => { setField('bannerImage', form.bannerImage || m.url); pick(m.url); }}>Select</button>
                </div>
              ))}
            </div>
            {media.length === 0 && <p class="empty">No media yet. Upload from Media or the banner field.</p>}
            <button type="button" class="ghost" onClick={() => setPicker(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
