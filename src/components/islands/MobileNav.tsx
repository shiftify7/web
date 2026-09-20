import { useEffect, useRef, useState } from 'preact/hooks';

interface Link {
  label: string;
  href: string;
}
interface Props {
  services: Link[];
}

const PRIMARY: Link[] = [
  { label: 'About', href: '/about/' },
  { label: 'Reviews', href: '/reviews/' },
  { label: 'FAQ', href: '/faq/' },
  { label: 'Guides', href: '/guides/' },
  { label: 'Cities we serve', href: '/cities/' },
  { label: 'Contact', href: '/contact/' },
];

/**
 * Full-screen navy drawer — the only JS the header ships, and only on mobile.
 * Zero runtime on desktop: the island renders the burger via CSS media queries.
 */
export default function MobileNav({ services }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    if (open) {
      window.addEventListener('keydown', onKey);
      panelRef.current?.querySelector('a,button')?.dispatchEvent(new Event('focus'));
      (panelRef.current?.querySelector('.mnav-close') as HTMLElement | null)?.focus();
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        class="mnav-burger"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {open && (
        <div class="mnav-overlay" role="dialog" aria-modal="true" aria-label="Menu" ref={panelRef} onClick={(e) => {
          if ((e.target as HTMLElement).classList.contains('mnav-overlay')) setOpen(false);
        }}>
          <div class="mnav-head">
            <span class="mnav-title">Menu</span>
            <button type="button" class="mnav-close" aria-label="Close menu" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <nav class="mnav-body" aria-label="Mobile">
            <p class="mnav-sect">Services</p>
            {services.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
            <p class="mnav-sect">Shiftify</p>
            {PRIMARY.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>
        </div>
      )}
      <style>{`
        .mnav-burger{display:grid;place-items:center;width:44px;height:44px;color:#0f172a;border:1px solid #e2e8f0;border-radius:5px;background:#fff}
        .mnav-overlay{position:fixed;inset:0;z-index:100;background:#0a1633;color:#dce7fb;display:flex;flex-direction:column;overflow:auto}
        .mnav-head{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.14)}
        .mnav-title{font-weight:700;font-size:.8rem;letter-spacing:.16em;text-transform:uppercase;color:#7e96c8}
        .mnav-close{display:grid;place-items:center;width:44px;height:44px;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:5px;background:transparent}
        .mnav-body{padding:12px 20px 40px;display:flex;flex-direction:column}
        .mnav-body a{padding:12px 4px;font-size:1rem;font-weight:600;color:#dce7fb;border-bottom:1px dashed rgba(255,255,255,.08);text-decoration:none}
        .mnav-body a:hover,.mnav-body a:focus{color:#fff}
        .mnav-sect{margin:18px 0 4px;font-size:.68rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#3b7bf0}
        @media(min-width:641px){.mnav-burger{display:none}}
      `}</style>
    </>
  );
}
