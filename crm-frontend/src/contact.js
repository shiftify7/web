const digits = (value = '') => String(value).replace(/\D/g, '');

/** CRM-only fallback for the public business values; server settings remain authoritative. */
export const BUSINESS_CONTACT = {
  phoneDisplay: import.meta.env.VITE_PUBLIC_PHONE_DISPLAY || '+91 87663 31715',
  phoneIntl: digits(import.meta.env.VITE_PUBLIC_PHONE_INTL || '918766331715'),
  whatsappIntl: digits(import.meta.env.VITE_PUBLIC_WHATSAPP_INTL || '918766331715'),
};

export function phoneHref() {
  return BUSINESS_CONTACT.phoneIntl ? `tel:+${BUSINESS_CONTACT.phoneIntl}` : '';
}

export function whatsappHref(message = 'Hi Shiftify, I need help with my moving enquiry.') {
  return BUSINESS_CONTACT.whatsappIntl
    ? `https://wa.me/${BUSINESS_CONTACT.whatsappIntl}?text=${encodeURIComponent(message)}`
    : '';
}
