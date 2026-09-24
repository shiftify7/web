import { useEffect, useState } from 'preact/hooks';
import { FRONTEND_BUSINESS, fetchBusiness, telFromIntl } from '@/lib/business';
import { PhoneIco } from './contact-icons';

export default function PhoneLink(props: { withIcon?: boolean; label?: string; class?: string }) {
  const withIcon = props.withIcon;
  const label = props.label;
  const cls = props.class || '';
  const [display, setDisplay] = useState(FRONTEND_BUSINESS.phoneDisplay);
  const [href, setHref] = useState(telFromIntl(FRONTEND_BUSINESS.phoneIntl));

  useEffect(() => {
    fetchBusiness().then((b) => {
      setDisplay(b.phoneDisplay || FRONTEND_BUSINESS.phoneDisplay);
      setHref(telFromIntl(b.phoneIntl || FRONTEND_BUSINESS.phoneIntl));
    });
  }, []);

  const text = label ?? display;
  if (!href && !text) return null;
  return (
    <a href={href || '/contact/'} class={cls} data-sfx-phone data-event="call_click" rel="nofollow">
      {withIcon ? <PhoneIco /> : null}
      <span>{text}</span>
    </a>
  );
}
