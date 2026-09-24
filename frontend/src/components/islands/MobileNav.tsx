import { useEffect, useRef, useState } from 'preact/hooks';
import { SITE, telHref, waLink, waMessageFor } from '@/consts';

type Link = { label: string; href: string };
type LocationSection = { label: string; links: Link[] };

interface Props {
  services: Link[];
  locations: {
    sections: LocationSection[];
    territories: string[];
  };
}

const PRIMARY: Link[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about/' },
  { label: 'FAQ', href: '/faq/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Guides', href: '/guides/' },
  { label: 'Contact', href: '/contact/' },
];

/**
 * Full-screen mobile drawer. Services and Locations are explicit disclosure
 * controls rather than long, always-open link lists, keeping the drawer useful
 * at 320px as well as on larger phones.
 */
export default function MobileNav({ services, locations }: Props) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<'services' | 'locations' | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const previousOverflowRef = useRef('');

  useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const getFocusable = () => Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ) || [],
    );

    const focusables = getFocusable();
    focusables[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflowRef.current;
      returnFocusRef.current?.focus();
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setSection(null);
  };
  const toggle = (name: 'services' | 'locations') => setSection((current) => current === name ? null : name);
  const phone = telHref();
  const whatsapp = waLink(waMessageFor());

  return (
    <>
      <button
        type="button"
        class="mnav-burger"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-navigation"
          class="mnav-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          ref={panelRef}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div class="mnav-panel">
            <div class="mnav-head">
              <span class="mnav-title">Shiftify navigation</span>
              <button type="button" class="mnav-close" aria-label="Close menu" onClick={close}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>

            <nav class="mnav-body" aria-label="Mobile primary">
              <a class="mnav-primary" href="/" onClick={close}>Home</a>

              <div class="mnav-disclosure">
                <button
                  type="button"
                  class="mnav-disclosure-trigger"
                  aria-expanded={section === 'services'}
                  aria-controls="mobile-services"
                  onClick={() => toggle('services')}
                >
                  <span>Services</span><span class="mnav-chevron" aria-hidden="true">{section === 'services' ? '−' : '+'}</span>
                </button>
                {section === 'services' && (
                  <div id="mobile-services" class="mnav-subnav">
                    <a href="/services/" onClick={close}>All services</a>
                    {services.map((link) => <a key={link.href} href={link.href} onClick={close}>{link.label}</a>)}
                  </div>
                )}
              </div>

              <div class="mnav-disclosure">
                <button
                  type="button"
                  class="mnav-disclosure-trigger"
                  aria-expanded={section === 'locations'}
                  aria-controls="mobile-locations"
                  onClick={() => toggle('locations')}
                >
                  <span>Locations</span><span class="mnav-chevron" aria-hidden="true">{section === 'locations' ? '−' : '+'}</span>
                </button>
                {section === 'locations' && (
                  <div id="mobile-locations" class="mnav-subnav">
                    <a href="/cities/" onClick={close}>All city guides</a>
                    {locations.sections.map((group) => (
                      <div class="mnav-location-group" key={group.label}>
                        <p>{group.label}</p>
                        {group.links.map((link) => <a key={link.href} href={link.href} onClick={close}>{link.label}</a>)}
                      </div>
                    ))}
                    <div class="mnav-location-group">
                      <p>Union Territories</p>
                      <span class="mnav-territories">{locations.territories.join(' · ')}</span>
                    </div>
                  </div>
                )}
              </div>

              <p class="mnav-sect">Shiftify</p>
              {PRIMARY.slice(1).map((link) => <a key={link.href} class="mnav-primary" href={link.href} onClick={close}>{link.label}</a>)}
            </nav>

            <div class="mnav-actions" aria-label="Contact Shiftify">
              {phone && <a class="mnav-action mnav-action--call" href={phone} onClick={close}>Call <span>{SITE.phoneDisplay}</span></a>}
              {whatsapp && <a class="mnav-action mnav-action--wa" href={whatsapp} target="_blank" rel="noopener" onClick={close}>WhatsApp us</a>}
              <a class="mnav-action mnav-action--quote" href="/#hero" onClick={close}>Get an instant quote</a>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mnav-burger{display:grid;place-items:center;width:44px;height:44px;color:#0f172a;border:1px solid #dbe4f5;border-radius:6px;background:#fff;cursor:pointer}
        .mnav-burger:focus-visible,.mnav-close:focus-visible,.mnav-disclosure-trigger:focus-visible,.mnav-body a:focus-visible,.mnav-action:focus-visible{outline:3px solid rgba(59,123,240,.45);outline-offset:2px}
        .mnav-overlay{position:fixed;inset:0;z-index:100;background:rgba(7,13,31,.56);overflow:auto}
        .mnav-panel{min-height:100%;width:min(100%,560px);margin-left:auto;background:#0a1633;color:#dce7fb;display:flex;flex-direction:column;box-shadow:-18px 0 48px rgba(7,13,31,.25)}
        .mnav-head{display:flex;align-items:center;justify-content:space-between;padding:14px max(20px,5vw);border-bottom:1px solid rgba(255,255,255,.14)}
        .mnav-title{font-weight:700;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#9fb5dd}
        .mnav-close{display:grid;place-items:center;width:44px;height:44px;color:#fff;border:1px solid rgba(255,255,255,.22);border-radius:6px;background:transparent;cursor:pointer}
        .mnav-body{padding:8px max(20px,5vw) 28px;display:flex;flex-direction:column}
        .mnav-body a{color:#dce7fb;text-decoration:none}
        .mnav-primary,.mnav-disclosure-trigger{min-height:48px;padding:13px 4px;border-bottom:1px solid rgba(255,255,255,.1);font:inherit;font-size:1rem;font-weight:650;text-align:left}
        .mnav-primary:hover,.mnav-primary:focus-visible,.mnav-disclosure-trigger:hover,.mnav-disclosure-trigger:focus-visible{color:#fff}
        .mnav-disclosure-trigger{display:flex;align-items:center;justify-content:space-between;width:100%;color:#fff;background:transparent;border-inline:0;border-top:0;cursor:pointer}
        .mnav-chevron{font-size:1.2rem;color:#7fa5ed;font-weight:400}
        .mnav-subnav{padding:4px 0 8px 14px;border-bottom:1px solid rgba(255,255,255,.1);border-left:2px solid #2563eb}
        .mnav-subnav>a{display:block;padding:9px 4px;font-size:.92rem;color:#b9c9e6}
        .mnav-subnav>a:first-child{color:#fff;font-weight:700}
        .mnav-subnav>a:hover,.mnav-subnav>a:focus-visible{color:#fff}
        .mnav-location-group{padding-top:10px}
        .mnav-location-group p{margin:0;padding:4px;font-size:.66rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6f91ce}
        .mnav-location-group>a{display:block;padding:7px 4px;font-size:.88rem;color:#b9c9e6}
        .mnav-territories{display:block;padding:7px 4px;color:#91a6c9;font-size:.82rem;line-height:1.6}
        .mnav-sect{margin:18px 0 2px;padding:0 4px;font-size:.68rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#5e8deb}
        .mnav-actions{display:grid;gap:8px;margin-top:auto;padding:16px max(20px,5vw) calc(20px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,255,255,.14)}
        .mnav-action{display:flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:10px 14px;border:1px solid rgba(255,255,255,.2);border-radius:6px;font-size:.9rem;font-weight:700;text-align:center}
        .mnav-action span{font-weight:500;opacity:.82}
        .mnav-action--call{background:#fff;color:#0a1633;border-color:#fff}
        .mnav-action--wa{background:#188b4b;color:#fff;border-color:#188b4b}
        .mnav-action--quote{background:#f07816;color:#fff;border-color:#f07816}
        @media(min-width:1280px){.mnav-burger{display:none}}
      `}</style>
    </>
  );
}
