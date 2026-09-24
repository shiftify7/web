import { useEffect, useState } from 'preact/hooks';

const FIELDS = [
  { group: 'CONTACT', keys: [
    ['phoneDisplay', 'Phone display'],
    ['phoneIntl', 'Phone international'],
    ['whatsappIntl', 'WhatsApp (digits)'],
    ['email', 'Email'],
  ]},
  { group: 'LEGAL', keys: [
    ['legalEntity', 'Legal entity'],
    ['gstin', 'GSTIN'],
  ]},
  { group: 'LOCATION', keys: [
    ['hqAddress', 'HQ / registered office'],
  ]},
  { group: 'SUPPORT', keys: [
    ['supportHours', 'Support hours'],
  ]},
  { group: 'BUSINESS DETAILS', keys: [
    ['insuranceCover', 'Insurance cover'],
    ['insurerName', 'Insurer name'],
  ]},
  { group: 'SOCIAL', keys: [
    ['instagram', 'Instagram URL'],
    ['facebook', 'Facebook URL'],
    ['linkedin', 'LinkedIn URL'],
    ['youtube', 'YouTube URL'],
  ]},
];

const MODES = ['AUTO', 'ENV', 'CRM', 'FRONTEND'];

export function BusinessInfo({ api }) {
  const [data, setData] = useState(null);
  const [values, setValues] = useState({});
  const [sources, setSources] = useState({});
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  function load() {
    setErr('');
    api('/api/crm/business').then((d) => {
      setData(d);
      setValues({ ...(d.crm || {}) });
      setSources({ ...(d.sources || {}) });
      setDirty(false);
    }).catch(() => setErr('Unable to load business information.'));
  }
  useEffect(load, []);

  useEffect(() => {
    const on = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);

  async function save() {
    setBusy(true); setErr(''); setToast('');
    try {
      const d = await api('/api/crm/business', { method: 'PATCH', body: JSON.stringify({ values, sources }) });
      setData(d);
      setValues({ ...(d.crm || {}) });
      setSources({ ...(d.sources || {}) });
      setDirty(false);
      setToast('Business information saved.');
    } catch (e) {
      setErr(e?.data?.error === 'invalid_email' ? 'Enter a valid email.' : 'Unable to save. Please try again.');
    } finally { setBusy(false); }
  }

  if (err && !data) return <div class="error">{err} <button type="button" onClick={load}>Retry</button></div>;
  if (!data) return <div class="skel"><div class="skel-bar" style={{ height: 80 }} /></div>;

  const resolved = data.values || {};
  const from = data.resolvedFrom || {};
  const envPresent = data.envPresent || {};

  return (
    <div>
      {toast && <p class="hint" role="status">{toast}</p>}
      {err && <p class="err">{err}</p>}
      {dirty && <p class="hint">Unsaved changes</p>}
      <div class="page-head">
        <div>
          <h2>Business Information</h2>
          <p>Manage the business information used across the Shiftify website.</p>
        </div>
        <div class="btn-row">
          <button type="button" class="ghost" disabled={!dirty || busy} onClick={load}>Cancel</button>
          <button type="button" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>

      <div class="panel" style={{ marginBottom: 16 }}>
        <h3>Current website information (resolved)</h3>
        <p class="hint">This is what the public site will show after save (AUTO / ENV / CRM / FRONTEND).</p>
        <p><strong>Phone</strong> {resolved.phoneDisplay || '—'}</p>
        <p><strong>Email</strong> {resolved.email || '—'}</p>
        {resolved.supportHours && <p><strong>Support</strong> {resolved.supportHours}</p>}
        {resolved.legalEntity && <p><strong>Legal</strong> {resolved.legalEntity}</p>}
        {resolved.gstin && <p><strong>GSTIN</strong> {resolved.gstin}</p>}
        {resolved.hqAddress && <p><strong>Address</strong> {resolved.hqAddress}</p>}
      </div>

      {FIELDS.map((g) => (
        <div class="panel" style={{ marginBottom: 12 }} key={g.group}>
          <h3>{g.group}</h3>
          {g.keys.map(([k, label]) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10, alignItems: 'end', marginBottom: 10 }}>
              <label>{label}
                <input value={values[k] || ''} onInput={(e) => { setValues({ ...values, [k]: e.target.value }); setDirty(true); }} />
              </label>
              <label>Source
                <select value={sources[k] || 'AUTO'} onChange={(e) => { setSources({ ...sources, [k]: e.target.value }); setDirty(true); }}>
                  {MODES.map((m) => <option key={m} value={m}>{m === 'FRONTEND' ? 'FRONTEND DEFAULT' : m === 'ENV' ? 'ENVIRONMENT' : m}</option>)}
                </select>
              </label>
              <p class="hint" style={{ gridColumn: '1 / -1', margin: 0 }}>
                Resolved: {resolved[k] || '—'} · From: {from[k] || 'none'}
                {sources[k] === 'ENV' && !envPresent[k] ? ' · Environment value is not configured.' : ''}
                {resolved[k] ? ' · Available' : ' · Hidden on public site'}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
