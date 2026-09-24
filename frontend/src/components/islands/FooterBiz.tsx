import { useEffect, useState } from 'preact/hooks';
import { FRONTEND_BUSINESS, fetchBusiness, telFromIntl, waFromIntl, type BusinessValues } from '@/lib/business';
import { PhoneIco, WhatsAppIco, MailIco, ClockIco } from './contact-icons';

export default function FooterBiz({ tradeName, part = 'all' }: { tradeName: string; part?: 'legal' | 'contact' | 'all' }) {
  const [b, setB] = useState<BusinessValues>(FRONTEND_BUSINESS);
  useEffect(() => { fetchBusiness().then(setB); }, []);
  const tel = telFromIntl(b.phoneIntl);
  const wa = waFromIntl(b.whatsappIntl);
  const legal = (
      <div class="foot-legal">
        <p>
          <strong>{tradeName}</strong>
          {b.legalEntity ? ` (${b.legalEntity})` : null}
        </p>
        {b.gstin ? <p>GSTIN: {b.gstin}</p> : null}
        {b.hqAddress ? <p>{b.hqAddress}</p> : null}
      </div>
  );
  const contact = (
      <ul>
        {b.phoneDisplay && (
          <li>
            <a href={tel || '/contact/'} class="foot-contact" data-event="call_click" rel="nofollow">
              <PhoneIco />
              <span>{b.phoneDisplay}</span>
            </a>
          </li>
        )}
        {wa && (
          <li>
            <a href={wa} class="foot-contact" data-event="whatsapp_click" target="_blank" rel="noopener">
              <WhatsAppIco />
              <span>+{b.whatsappIntl}</span>
            </a>
          </li>
        )}
        {b.email && (
          <li>
            <a href={`mailto:${b.email}`} class="foot-contact" data-event="email_click">
              <MailIco />
              <span>{b.email}</span>
            </a>
          </li>
        )}
        {b.supportHours && (
          <li class="foot-hours">
            <ClockIco />
            <span>Support: {b.supportHours}</span>
          </li>
        )}
      </ul>
  );
  if (part === 'legal') return legal;
  if (part === 'contact') return contact;
  return <>{legal}{contact}</>;
}
