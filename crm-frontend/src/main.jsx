import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './styles.css';
import './article.css';
import { Blogs } from './blogCms.jsx';
import { BusinessInfo } from './businessCms.jsx';
import { Media as MediaLib } from './mediaCms.jsx';
import { BUSINESS_CONTACT, whatsappHref } from './contact.js';

const API = import.meta.env.VITE_API_URL || '';

function api(path, opts = {}) {
  const token = localStorage.getItem('sfx_jwt') || '';
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...(opts.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      authorization: token ? `Bearer ${token}` : '',
      ...(opts.headers || {}),
    },
    credentials: 'include',
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || 'error'), { status: r.status, data });
    return data;
  });
}

function Ico({ path }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}
const I = {
  dash: 'M4 5h7v7H4V5zm9 0h7v4h-7V5zM4 14h7v5H4v-5zm9 6v-8h7v8h-7z',
  leads: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  blog: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  media: 'M4 16l4.6-6 3.4 4.5L15 12l5 6H4zM4 5h16v14H4z',
  meg: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zm13-1a4 4 0 0 1 0 6',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H8a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V8c.3.7 1 1.2 1.7 1.3H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
};

function Badge({ kind, children }) {
  return <span class={`badge b-${kind}`}>{children}</span>;
}

function Login({ onOk }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const d = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('sfx_jwt', d.token);
      onOk(email);
    } catch {
      setErr('Invalid login. Check credentials and try again.');
    } finally { setBusy(false); }
  }
  return (
    <form class="login" onSubmit={submit}>
      <img src="/logo-lockup.png" alt="Shiftify" />
      <h1>Shiftify CRM</h1>
      <p>Sign in to manage leads, content and operations.</p>
      <label>Email<input value={email} onInput={(e) => setEmail(e.target.value)} type="email" required autocomplete="username" /></label>
      <label>Password<input value={password} onInput={(e) => setPassword(e.target.value)} type="password" required autocomplete="current-password" /></label>
      {err && <p class="err">{err}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

function PageHead({ title, desc, action }) {
  return (
    <div class="page-head">
      <div>
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function Dashboard({ go }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [load, setLoad] = useState(true);
  function fetchDash() {
    setLoad(true); setErr('');
    api('/api/crm/dashboard').then((x) => { setD(x); setLoad(false); }).catch(() => { setErr('Unable to load dashboard data.'); setLoad(false); });
  }
  useEffect(fetchDash, []);
  if (load) {
    return <div class="skel">{[1, 2, 3, 4].map((i) => <div class="skel-bar" key={i} style={{ height: 72 }} />)}</div>;
  }
  if (err) return <div class="error">{err} <button type="button" onClick={fetchDash}>Retry</button></div>;
  const s = d.stats || {};
  const recent = d.recent || [];
  const primary = [
    ['Total leads', s.total, 'All enquiries', I.leads],
    ['New', s.neu, 'Unworked', I.leads],
    ['Today', s.today, 'Created today', I.dash],
    ['Contacted', s.contacted, 'Reached', I.mail],
    ['Follow-up', s.follow, 'Needs action', I.meg],
    ['Converted', s.converted, 'Booked', I.dash],
  ];
  return (
    <div>
      <PageHead title="Dashboard" desc="Monitor leads, enquiries and moving activity." />
      <div class="kpi-row">
        {primary.map(([label, n, hint, path]) => (
          <div class="kpi" key={label}>
            <div class="kpi-top"><span>{label}</span><Ico path={path} /></div>
            <strong>{n ?? 0}</strong>
            <em>{hint}</em>
          </div>
        ))}
      </div>
      <div class="kpi-row kpi-row--3">
        {[['Intra-city', s.intra], ['Intercity', s.inter], ['Interstate', s.state]].map(([k, v]) => (
          <div class="kpi" key={k}><div class="kpi-top"><span>{k}</span></div><strong>{v ?? 0}</strong><em>Move type</em></div>
        ))}
      </div>
      <div class="dash-split">
        <div class="panel">
          <h3>Recent leads</h3>
          {recent.length === 0 ? (
            <div class="empty">No leads yet. New enquiries submitted from the website will appear here.</div>
          ) : (
            <>
              <table class="crm">
                <thead><tr><th>Customer</th><th>Phone</th><th>Move</th><th>Status</th></tr></thead>
                <tbody>
                  {recent.map((l) => (
                    <tr key={l._id} onClick={() => go('leads')}>
                      <td>{l.name}</td><td>{l.phone}</td>
                      <td><Badge kind={l.moveType}>{l.moveType}</Badge></td>
                      <td><Badge kind={l.leadStatus}>{l.leadStatus}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div class="lead-cards">
                {recent.map((l) => (
                  <button type="button" class="lead-card ghost" key={l._id} onClick={() => go('leads')} style={{ textAlign: 'left' }}>
                    <strong>{l.name}</strong> · {l.phone}<br />
                    <Badge kind={l.moveType}>{l.moveType}</Badge> <Badge kind={l.leadStatus}>{l.leadStatus}</Badge>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div class="panel quick">
          <h3>Quick actions</h3>
          <button type="button" onClick={() => go('leads')}>Leads</button>
          <button type="button" class="ghost" onClick={() => go('blog')}>Create blog</button>
          <button type="button" class="ghost" onClick={() => go('media')}>Media</button>
          <button type="button" class="ghost" onClick={() => go('settings')}>Email settings</button>
        </div>
      </div>
    </div>
  );
}

function Leads() {
  const [leads, setLeads] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [moveType, setMoveType] = useState('');
  const [sel, setSel] = useState(null);
  const [load, setLoad] = useState(true);
  const [err, setErr] = useState('');
  function loadLeads() {
    const p = new URLSearchParams();
    if (q) p.set('search', q);
    if (status) p.set('status', status);
    if (moveType) p.set('moveType', moveType);
    setLoad(true); setErr('');
    api('/api/crm/leads?' + p.toString())
      .then((d) => { setLeads(d.leads || []); setLoad(false); })
      .catch(() => { setErr('Unable to load leads.'); setLoad(false); });
  }
  useEffect(loadLeads, [q, status, moveType]);
  return (
    <div>
      <PageHead title="Leads" desc="Manage and track customer enquiries." />
      <div class="filters">
        <input placeholder="Search name / phone / city" value={q} onInput={(e) => setQ(e.target.value)} />
        <select value={moveType} onChange={(e) => setMoveType(e.target.value)}>
          <option value="">All types</option>
          <option>INTRA_CITY</option><option>INTERCITY</option><option>INTERSTATE</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          {['NEW', 'CONTACTED', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED', 'LOST'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {load && <div class="skel"><div class="skel-bar" /><div class="skel-bar" /></div>}
      {err && <div class="error">{err} <button type="button" onClick={loadLeads}>Retry</button></div>}
      {!load && !err && leads.length === 0 && <div class="empty">No leads yet. Website enquiries will appear here.</div>}
      {!load && leads.length > 0 && (
        <>
          <div class="panel" style={{ padding: 0, overflow: 'auto' }}>
            <table class="crm">
              <thead>
                <tr>
                  <th>Customer</th><th>Phone</th><th>Type</th><th>From</th><th>To</th>
                  <th>Property</th><th>Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l._id} onClick={() => setSel(l)}>
                    <td>{l.name}</td><td>{l.phone}</td>
                    <td><Badge kind={l.moveType}>{l.moveType}</Badge></td>
                    <td>{l.from || l.fromCity}</td><td>{l.to || l.toCity}</td>
                    <td>{l.propertyType}</td><td>{l.movingDate}</td>
                    <td><Badge kind={l.leadStatus}>{l.leadStatus}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div class="lead-cards">
            {leads.map((l) => (
              <div class="lead-card" key={l._id} onClick={() => setSel(l)}>
                <strong>{l.name}</strong>
                <p>{l.phone} · {l.from || l.fromCity} → {l.to || l.toCity}</p>
                <Badge kind={l.moveType}>{l.moveType}</Badge> <Badge kind={l.leadStatus}>{l.leadStatus}</Badge>
              </div>
            ))}
          </div>
        </>
      )}
      {sel && (
        <div class="drawer">
          <h3>{sel.name}</h3>
          <p>{sel.phone} · {sel.email}</p>
          <p>Email: {sel.emailNotificationStatus}</p>
          <label>Status
            <select value={sel.leadStatus} onChange={async (e) => {
              const leadStatus = e.target.value;
              const d = await api(`/api/crm/leads/${sel._id}`, { method: 'PATCH', body: JSON.stringify({ leadStatus }) });
              setSel(d.lead); loadLeads();
            }}>
              {['NEW', 'CONTACTED', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED', 'LOST'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>Notes<textarea rows="4" value={sel.notes || ''} onInput={(e) => setSel({ ...sel, notes: e.target.value })} /></label>
          <label>Follow-up date<input type="date" value={sel.followUpDate || ''} onInput={(e) => setSel({ ...sel, followUpDate: e.target.value })} /></label>
          <div class="btn-row">
            <button type="button" onClick={async () => { await api(`/api/crm/leads/${sel._id}`, { method: 'PATCH', body: JSON.stringify({ notes: sel.notes, followUpDate: sel.followUpDate }) }); loadLeads(); }}>Save notes</button>
            <button type="button" class="ghost" onClick={() => api(`/api/crm/leads/${sel._id}/retry-email`, { method: 'POST' })}>Retry email</button>
            <button type="button" class="ghost" onClick={() => setSel(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const CONTACT_TEXT = `Call: ${BUSINESS_CONTACT.phoneDisplay}\nWhatsApp: ${whatsappHref().split('?')[0]}`;
const EMAIL_TEMPLATES = {
  custom: { subject: '', message: '' },
  followup: {
    subject: 'Following up on your Shiftify moving enquiry',
    message: `Hi,\n\nThis is Shiftify Packers & Movers following up on your enquiry. When is a good time to discuss your move and share a written quote?\n\n${CONTACT_TEXT}\n`,
  },
  quote: {
    subject: 'Your Shiftify moving quote discussion',
    message: `Hi,\n\nThank you for the survey details. We will discuss the written, itemised quote with you on a call — we do not publish prices on the website.\n\nShiftify Packers & Movers\n${CONTACT_TEXT}\n`,
  },
  thankyou: {
    subject: 'Thank you for contacting Shiftify',
    message: `Hi,\n\nThank you for contacting Shiftify. We have received your moving enquiry and our team will contact you shortly.\n\nNeed help now? ${CONTACT_TEXT}\n`,
  },
};

function Email() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/api/crm/email/preview').then(setPreview).catch(() => {}); }, []);
  return (
    <div>
      <PageHead title="Email" desc="Send follow-ups through the backend mail chain." />
      <form class="panel" onSubmit={async (e) => {
        e.preventDefault();
        setErr(''); setMsg(''); setBusy(true);
        try {
          const d = await api('/api/crm/email', { method: 'POST', body: JSON.stringify({ to, subject, message }) });
          setMsg(d.status);
        } catch {
          setErr('Could not send. Check email configuration in Settings.');
        } finally { setBusy(false); }
      }}>
        <label>Template
          <select onChange={(e) => {
            const t = EMAIL_TEMPLATES[e.target.value];
            if (t) { setSubject(t.subject); setMessage(t.message); }
          }}>
            <option value="custom">Custom</option>
            <option value="followup">Follow-up</option>
            <option value="quote">Quote discussion</option>
            <option value="thankyou">Thank-you</option>
          </select>
        </label>
        <label>To<input value={to} onInput={(e) => setTo(e.target.value)} required /></label>
        <label>Subject<input value={subject} onInput={(e) => setSubject(e.target.value)} required /></label>
        <label>Message<textarea rows="8" value={message} onInput={(e) => setMessage(e.target.value)} required /></label>
        <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send via backend'}</button>
        {msg && <p>{msg}</p>}
        {err && <p class="err">{err}</p>}
      </form>
      {preview && (
        <div class="mail-preview">
          <h3>Owner notification preview</h3>
          <iframe title="Owner email preview" srcDoc={preview.owner} />
          <h3>Customer confirmation preview</h3>
          <iframe title="Customer email preview" srcDoc={preview.customer} />
        </div>
      )}
    </div>
  );
}

function Media() {
  return <MediaLib api={api} />;
}

function Announcements() {
  const emptyAnn = { enabled: true, text: '', ctaLabel: '', ctaUrl: '', position: 'CENTER', background: '#1e3a8a', textColor: '#ffffff' };
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyAnn);
  const [editId, setEditId] = useState(null);
  const [preview, setPreview] = useState(false);
  const [toast, setToast] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  function load() {
    api('/api/crm/announcements').then((d) => {
      const list = d.items || [];
      setItems(list);
      if (list[0] && !editId) {
        const a = list[0];
        setEditId(a._id);
        setForm({
          enabled: Boolean(a.enabled),
          text: a.text || '',
          ctaLabel: a.ctaLabel || '',
          ctaUrl: a.ctaUrl || '',
          position: a.position || 'CENTER',
          background: a.background || '#1e3a8a',
          textColor: a.textColor || '#ffffff',
        });
      }
    }).catch(() => setErr('Unable to load announcement.'));
  }
  useEffect(load, []);
  const current = items[0];
  const payload = () => ({
    enabled: form.enabled,
    text: form.text.trim(),
    ctaLabel: form.ctaLabel.trim(),
    ctaUrl: form.ctaUrl.trim(),
    position: form.position,
    background: form.background,
    textColor: form.textColor,
  });
  return (
    <div>
      {toast && <p class="hint" role="status">{toast}</p>}
      {err && <p class="err">{err}</p>}
      <PageHead title="Announcement" desc="Manage the notice strip on the public website." />
      {items.length === 0 && <p class="empty">No announcement configured. Create one to show a strip at the top of the site.</p>}
      <form class="panel" onSubmit={async (e) => {
        e.preventDefault();
        if (!form.text.trim() || busy) return;
        setBusy(true); setErr(''); setToast('');
        try {
          const body = JSON.stringify(payload());
          if (editId) await api(`/api/crm/announcements/${editId}`, { method: 'PATCH', body });
          else {
            const d = await api('/api/crm/announcements', { method: 'POST', body });
            setEditId(d.item?._id);
          }
          setToast('Announcement saved');
          await load();
        } catch {
          setErr('Unable to save announcement. Please try again.');
        } finally { setBusy(false); }
      }}>
        <label>Enabled
          <select value={form.enabled ? 'on' : 'off'} onChange={(e) => setForm({ ...form, enabled: e.target.value === 'on' })}>
            <option value="on">ON</option>
            <option value="off">OFF</option>
          </select>
        </label>
        <label>Message *<input value={form.text} onInput={(e) => setForm({ ...form, text: e.target.value })} required /></label>
        <label>Link text<input value={form.ctaLabel} onInput={(e) => setForm({ ...form, ctaLabel: e.target.value })} /></label>
        <label>Link URL<input value={form.ctaUrl} onInput={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="/ or https://" /></label>
        <label>Position
          <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
            <option>LEFT</option><option>CENTER</option><option>RIGHT</option>
          </select>
        </label>
        <div class="btn-row">
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save announcement'}</button>
          <button type="button" class="ghost" onClick={() => setPreview(true)}>Preview</button>
          {(editId || current) && (
            <button type="button" class="danger" disabled={deleting} onClick={async () => {
              const id = String(editId || current?._id || '');
              if (!id || deleting) return;
              if (!confirm('Delete announcement?\n\nThis announcement will be removed from the website.')) return;
              setDeleting(true); setErr('');
              try {
                await api(`/api/crm/announcements/${id}`, { method: 'DELETE' });
                setEditId(null);
                setForm(emptyAnn);
                setToast('Announcement deleted successfully.');
                const d = await api('/api/crm/announcements');
                setItems(d.items || []);
              } catch {
                setErr('Unable to delete announcement. Please try again.');
              } finally { setDeleting(false); }
            }}>{deleting ? 'Deleting…' : 'Delete'}</button>
          )}
        </div>
      </form>
      {items.map((a) => (
        <p key={a._id} class="hint">
          {a.text} — {a.enabled ? 'ON' : 'OFF'}{' '}
          <button type="button" class="ghost" onClick={() => { setEditId(a._id); setForm({ ...form, ...a }); }}>Edit</button>
        </p>
      ))}
      {preview && (
        <div class="preview-modal" onClick={() => setPreview(false)}>
          <div class="preview-frame preview-frame--desktop" onClick={(e) => e.stopPropagation()}>
            <div class="site-chrome">
              <div class="site-chrome-bar"><img src="/logo-lockup.png" alt="Shiftify" /><span>Nav</span></div>
              <div style={{ background: form.background || '#1e3a8a', color: form.textColor || '#fff', padding: '8px 16px', display: 'flex', justifyContent: form.position === 'LEFT' ? 'flex-start' : form.position === 'RIGHT' ? 'flex-end' : 'center', gap: 12, fontWeight: 600, fontSize: '0.88rem' }}>
                <span>{form.text || 'Announcement message'}</span>
                {form.ctaLabel && <u>{form.ctaLabel}</u>}
              </div>
              <div class="site-chrome-main" style={{ minHeight: 160 }}><p class="hint">Hero / page content</p></div>
            </div>
            <button type="button" class="ghost" onClick={() => setPreview(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Reviews() {
  const empty = { name: '', text: '', rating: 5, image: '', status: 'unpublished' };
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [preview, setPreview] = useState(false);
  const [toast, setToast] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  function load() { return api('/api/crm/reviews').then((d) => setItems(d.items || [])).catch(() => setErr('Unable to load reviews.')); }
  useEffect(load, []);
  function fields() {
    return {
      name: form.name.trim(),
      text: form.text.trim(),
      rating: Number(form.rating),
      image: form.image.trim(),
      status: form.status === 'published' ? 'published' : 'unpublished',
    };
  }
  async function save(e) {
    e?.preventDefault?.();
    if (!form.name.trim() || !form.text.trim() || busy) return;
    const id = editId ? String(editId) : '';
    setBusy(true); setErr(''); setToast('');
    try {
      const body = JSON.stringify(fields());
      if (id) await api(`/api/crm/reviews/${id}`, { method: 'PATCH', body });
      else {
        const d = await api('/api/crm/reviews', { method: 'POST', body });
        setEditId(d.item?._id);
      }
      setToast(id ? 'Review updated successfully.' : 'Review saved');
      await load();
    } catch {
      setErr('Failed to update review.');
    } finally { setBusy(false); }
  }
  return (
    <div>
      {toast && <p class="hint" role="status">{toast}</p>}
      {err && <p class="err">{err}</p>}
      <PageHead title="Reviews" desc="Manage customer reviews shown in the homepage crawler." action={<button type="button" onClick={() => { setForm(empty); setEditId(null); setErr(''); }}>+ Add review</button>} />
      {items.length === 0 && <p class="empty">No reviews added yet. The public site will use fallback testimonials until you publish one.</p>}
      <form class="panel" onSubmit={save}>
        <label>Customer name *<input value={form.name} onInput={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Review *<textarea rows="4" value={form.text} onInput={(e) => setForm({ ...form, text: e.target.value })} required /></label>
        <label>Star rating
          <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => <option value={n}>{n} ★</option>)}
          </select>
        </label>
        <label>Image URL (optional)<input value={form.image} onInput={(e) => setForm({ ...form, image: e.target.value })} /></label>
        {form.image && <img src={form.image} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />}
        <label>Upload
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const fd = new FormData(); fd.append('file', f);
            try {
              const d = await api('/api/crm/media', { method: 'POST', body: fd });
              setForm({ ...form, image: d.item.url });
            } catch { setToast('Upload failed'); }
          }} />
        </label>
        {form.image && <button type="button" class="ghost" onClick={() => setForm({ ...form, image: '' })}>Remove image</button>}
        <label>Status
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="unpublished">Unpublished</option>
            <option value="published">Published</option>
          </select>
        </label>
        <div class="btn-row">
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : (editId ? 'Update review' : 'Save')}</button>
          <button type="button" class="ghost" onClick={() => setPreview(true)}>Preview</button>
        </div>
      </form>
      <div class="panel" style={{ marginTop: 16, padding: 0 }}>
        <table class="crm">
          <thead><tr><th>Customer</th><th>Rating</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((r) => (
              <tr key={r._id} onClick={() => { setEditId(String(r._id)); setForm({ name: r.name, text: r.text, rating: r.rating, image: r.image || '', status: r.status || 'unpublished' }); }}>
                <td>{r.name}</td>
                <td>{r.rating}★</td>
                <td>{r.status}</td>
                <td>
                  <button type="button" class="ghost" onClick={(e) => { e.stopPropagation(); setEditId(String(r._id)); setForm({ name: r.name, text: r.text, rating: r.rating, image: r.image || '', status: r.status || 'unpublished' }); }}>Edit</button>
                  <button type="button" class="danger" disabled={deletingId === String(r._id)} onClick={async (e) => {
                    e.stopPropagation();
                    const id = String(r._id || '');
                    if (!id || deletingId) return;
                    if (!confirm('Delete this review?\n\nThis review will be removed from the public website.')) return;
                    setDeletingId(id); setErr('');
                    try {
                      await api(`/api/crm/reviews/${id}`, { method: 'DELETE' });
                      if (editId === id) { setEditId(null); setForm(empty); }
                      setToast('Review deleted successfully.');
                      await load();
                    } catch {
                      setErr('Failed to delete review.');
                    } finally { setDeletingId(''); }
                  }}>{deletingId === String(r._id) ? 'Deleting…' : 'Delete'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preview && (
        <div class="preview-modal" onClick={() => setPreview(false)}>
          <div class="preview-frame preview-frame--desktop" onClick={(e) => e.stopPropagation()}>
            <p class="hint">Same crawler card as the public site</p>
            <figure class="review card" style={{ maxWidth: 360, padding: 16 }}>
              {form.image
                ? <img src={form.image} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                : <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#1e3a8a', display: 'inline-block' }} />}
              <p>{'★'.repeat(form.rating || 5)}</p>
              <blockquote>{form.text || 'Review text'}</blockquote>
              <strong>{form.name || 'Name'}</strong>
            </figure>
            <button type="button" class="ghost" onClick={() => setPreview(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Settings() {
  const [d, setD] = useState(null);
  const [form, setForm] = useState({ phone: '', whatsapp: '', email: '', address: '', blogAuthorDefault: '' });
  const [testTo, setTestTo] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [err, setErr] = useState('');
  function refresh() {
    api('/api/crm/settings').then((x) => {
      setD(x);
      setForm({
        phone: x.settings?.phone || '',
        whatsapp: x.settings?.whatsapp || '',
        email: x.settings?.email || '',
        address: x.settings?.address || '',
        blogAuthorDefault: x.settings?.blogAuthorDefault || '',
      });
    }).catch(() => setErr('Unable to load settings.'));
  }
  useEffect(refresh, []);
  if (err && !d) return <div class="error">{err} <button type="button" onClick={refresh}>Retry</button></div>;
  if (!d) return <div class="skel"><div class="skel-bar" style={{ height: 80 }} /></div>;
  const st = d.status || {};
  return (
    <div>
      <PageHead title="Settings" desc="Manage CRM configuration. Secrets stay on the server." />
      <div class="otp-card">
        <h3>OTP verification</h3>
        <p class="hint">When ON, public quote forms require a 6-digit code before the lead is stored.</p>
        <p><strong>Status: {d.otp}</strong></p>
        <button type="button" onClick={async () => {
          await api('/api/crm/settings', { method: 'PATCH', body: JSON.stringify({ otpEnabled: !d.settings.otpEnabled }) });
          refresh();
        }}>{d.settings?.otpEnabled ? 'Turn OTP off' : 'Turn OTP on'}</button>
      </div>
      <div class="panel" style={{ marginTop: 16 }}>
        <h3>Mail &amp; media (server env)</h3>
        <p>Hostinger SMTP: {st.hostingerSmtp ? 'CONNECTED' : 'NOT SET'}</p>
        <p>Resend: {st.resend ? 'CONFIGURED' : 'NOT SET'}</p>
        <p>Gmail fallback: {st.gmail ? 'CONFIGURED' : 'NOT SET'}</p>
        <p>Cloudinary: {st.cloudinary ? 'CONNECTED' : 'NOT SET'}</p>
        <label>Send test email to
          <input value={testTo} onInput={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
        </label>
        <button type="button" onClick={async () => {
          setTestMsg('');
          try {
            const r = await api('/api/crm/settings/test-email', { method: 'POST', body: JSON.stringify({ to: testTo }) });
            setTestMsg(`Result: ${r.status} → ${r.to}`);
          } catch {
            setTestMsg('Test failed. Check SMTP/Resend/Gmail env on the server.');
          }
        }}>Send test email</button>
        {testMsg && <p>{testMsg}</p>}
      </div>
      <div class="panel" style={{ marginTop: 16 }}>
        <h3>Public contact</h3>
        {['phone', 'whatsapp', 'email', 'address', 'blogAuthorDefault'].map((k) => (
          <label key={k}>{k}<input value={form[k]} onInput={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
        ))}
        <button type="button" onClick={async () => {
          await api('/api/crm/settings', { method: 'PATCH', body: JSON.stringify(form) });
          refresh();
        }}>Save contact</button>
      </div>
    </div>
  );
}

const NAV = [
  { group: 'Overview', items: [['dashboard', 'Dashboard', I.dash]] },
  { group: 'Operations', items: [['leads', 'Leads', I.leads], ['reviews', 'Reviews', I.mail], ['blog', 'Blog', I.blog], ['media', 'Media', I.media], ['announcements', 'Announcements', I.meg]] },
  { group: 'System', items: [['email', 'Email', I.mail], ['business', 'Business', I.cog], ['settings', 'Settings', I.cog]] },
];
const VIEWS = { dashboard: Dashboard, leads: Leads, reviews: Reviews, blog: Blogs, media: Media, announcements: Announcements, email: Email, business: BusinessInfo, settings: Settings };
const TITLES = { dashboard: 'Dashboard', leads: 'Leads', reviews: 'Reviews', blog: 'Blog', media: 'Media', announcements: 'Announcements', email: 'Email', business: 'Business Information', settings: 'Settings' };

function App() {
  const [authed, setAuthed] = useState(Boolean(localStorage.getItem('sfx_jwt')));
  const [tab, setTab] = useState('dashboard');
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(localStorage.getItem('sfx_admin') || 'Admin');
  if (!authed) return <Login onOk={(em) => { setAuthed(true); if (em) { localStorage.setItem('sfx_admin', em); setEmail(em); } }} />;
  const View = VIEWS[tab];
  function go(id) { setTab(id); setOpen(false); }
  return (
    <div class="shell">
      {open && <div class="scrim" onClick={() => setOpen(false)} />}
      <aside class={`sidebar${open ? ' open' : ''}`}>
        <div class="brand">
          <img src="/logo-lockup.png" alt="Shiftify" />
        </div>
        {NAV.map((g) => (
          <div key={g.group}>
            <div class="nav-label">{g.group.toUpperCase()}</div>
            {g.items.map(([id, label, path]) => (
              <button key={id} type="button" class={`nav-btn${tab === id ? ' on' : ''}`} onClick={() => go(id)}>
                <Ico path={path} />{label}
              </button>
            ))}
          </div>
        ))}
        <div class="sidebar-foot">
          <div class="admin-chip"><span class="avatar">{(email[0] || 'A').toUpperCase()}</span>{email}</div>
          <button type="button" class="nav-btn" onClick={() => { localStorage.removeItem('sfx_jwt'); api('/api/auth/logout', { method: 'POST' }).catch(() => {}); setAuthed(false); }}>Logout</button>
        </div>
      </aside>
      <div class="workspace">
        <header class="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" class="menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>☰</button>
            <div>
              <p class="crumb">Home / {TITLES[tab]}</p>
              <h1>{TITLES[tab]}</h1>
            </div>
          </div>
          <div class="topbar-right">
            <span class="avatar">{(email[0] || 'A').toUpperCase()}</span>
            <span>{email}</span>
          </div>
        </header>
        <main class="content">
          {tab === 'dashboard' ? <Dashboard go={go} /> : tab === 'blog' ? <Blogs api={api} /> : <View />}
        </main>
      </div>
    </div>
  );
}

render(<App />, document.getElementById('app'));
