import { useEffect, useState } from 'preact/hooks';

const CATS = ['LANDING_PAGE', 'BLOG', 'REVIEW', 'SERVICE', 'CITY', 'LOCALITY', 'GENERAL'];
const CITY_SLUGS = ['delhi', 'gurgaon', 'noida', 'mumbai', 'bengaluru'];
const SECTIONS = [
  'HERO', 'ABOUT', 'SERVICES', 'PROCESS', 'WHY_SHIFTIFY', 'PACKING',
  'HOUSE_SHIFTING', 'OFFICE_SHIFTING', 'INTERCITY', 'VEHICLE_MOVING',
  'TESTIMONIALS', 'CTA', 'FOOTER', 'OTHER',
];

export function Media({ api }) {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [cat, setCat] = useState('LANDING_PAGE');
  const [sec, setSec] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const empty = { title: '', alt: '', description: '', category: 'LANDING_PAGE', section: 'HERO', sortOrder: 0, isActive: true, locationSlug: '' };
  const [form, setForm] = useState(empty);
  const [edit, setEdit] = useState(null);

  function load() {
    const p = new URLSearchParams();
    if (cat) p.set('category', cat);
    if (sec) p.set('section', sec);
    if (status) p.set('status', status);
    if (q) p.set('search', q);
    api('/api/crm/media?' + p.toString())
      .then((d) => setItems(d.items || []))
      .catch(() => setErr('Unable to load media.'));
  }
  useEffect(load, [cat, sec, status, q]);

  async function upload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setErr('');
    const fd = new FormData();
    fd.append('file', f);
    fd.append('title', form.title);
    fd.append('alt', form.alt);
    fd.append('description', form.description);
    fd.append('category', form.category);
    fd.append('section', form.section);
    fd.append('sortOrder', String(form.sortOrder || 0));
    fd.append('isActive', form.isActive ? 'true' : 'false');
    fd.append('locationSlug', form.locationSlug || '');
    try {
      await api('/api/crm/media', { method: 'POST', body: fd });
      load();
    } catch {
      setErr('Upload failed. Check Cloudinary on the server.');
    } finally { setBusy(false); e.target.value = ''; }
  }

  const grouped = {};
  items.forEach((m) => {
    const k = m.section || 'OTHER';
    (grouped[k] = grouped[k] || []).push(m);
  });

  return (
    <div>
      <div class="page-head">
        <div>
          <h2>Media Manager</h2>
          <p>Upload Shiftify photographs. Landing page sections pull active images by category and section.</p>
        </div>
        <label class="ghost" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 42, padding: '0 14px', border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer' }}>
          {busy ? 'Uploading…' : '+ Upload image'}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden disabled={busy} onChange={upload} />
        </label>
      </div>
      {err && <p class="err">{err}</p>}
      <div class="filters">
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {CATS.map((c) => <option key={c}>{c}</option>)}
        </select>
        {cat === 'LANDING_PAGE' && (
          <select value={sec} onChange={(e) => setSec(e.target.value)}>
            <option value="">All sections</option>
            {SECTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input placeholder="Search title / alt" value={q} onInput={(e) => setQ(e.target.value)} />
      </div>
      <form class="panel" onSubmit={(e) => e.preventDefault()} style={{ marginBottom: 16 }}>
        <p class="hint">Set these fields before upload. They tag Cloudinary and assign the landing section.</p>
        <label>Title<input value={form.title} onInput={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Alt text<input value={form.alt} onInput={(e) => setForm({ ...form, alt: e.target.value })} /></label>
        <label>Category
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Section
          <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
            {SECTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>Sort order<input type="number" value={form.sortOrder} onInput={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></label>
        {(form.category === 'CITY' || form.category === 'LOCALITY') && (
          <label>Location slug
            <select value={form.locationSlug} onChange={(e) => setForm({ ...form, locationSlug: e.target.value })}>
              <option value="">— none —</option>
              {CITY_SLUGS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
      </form>
      {items.length === 0 ? <div class="empty">No media in this filter. Upload JPEG, PNG, WebP or GIF.</div> : (
        Object.keys(grouped).sort().map((g) => (
          <div key={g} style={{ marginBottom: 20 }}>
            <h3>{g}</h3>
            <div class="media-grid">
              {grouped[g].map((m) => (
                <div key={m._id} class="media">
                  <img src={m.url} alt={m.alt || ''} />
                  <p><strong>{m.title || 'Untitled'}</strong></p>
                  <p>{m.category} · {m.section} · {m.locationSlug || '—'} · {m.isActive === false ? 'Inactive' : 'Active'}</p>
                  <p>{m.width}×{m.height} {m.format} {m.bytes ? Math.round(m.bytes / 1024) + ' KB' : ''}</p>
                  <div class="btn-row">
                    <button type="button" class="ghost" onClick={() => { setEdit(m); }}>Edit</button>
                    <button type="button" class="ghost" onClick={() => api(`/api/crm/media/${m._id}`, { method: 'PATCH', body: JSON.stringify({ isActive: m.isActive === false }) }).then(load)}>
                      {m.isActive === false ? 'Enable' : 'Disable'}
                    </button>
                    <button type="button" class="danger" onClick={() => {
                      if (!confirm('Remove from website? (Cloudinary file kept unless you confirm permanent delete next.)')) return;
                      const perm = confirm('Also delete permanently from Cloudinary?');
                      api(`/api/crm/media/${m._id}${perm ? '?cloudinary=1' : ''}`, { method: 'DELETE' }).then(load);
                    }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      {edit && (
        <div class="drawer">
          <h3>Edit media</h3>
          <label>Title<input value={edit.title || ''} onInput={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
          <label>Alt<input value={edit.alt || ''} onInput={(e) => setEdit({ ...edit, alt: e.target.value })} /></label>
          <label>Section
            <select value={edit.section || 'OTHER'} onChange={(e) => setEdit({ ...edit, section: e.target.value })}>
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>Sort<input type="number" value={edit.sortOrder || 0} onInput={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} /></label>
          <div class="btn-row">
            <button type="button" onClick={async () => {
              await api(`/api/crm/media/${edit._id}`, { method: 'PATCH', body: JSON.stringify({
                title: edit.title, alt: edit.alt, section: edit.section, category: edit.category, sortOrder: edit.sortOrder,
              }) });
              setEdit(null); load();
            }}>Save</button>
            <button type="button" class="ghost" onClick={() => setEdit(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
