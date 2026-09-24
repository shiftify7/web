export function QuoteProcessing({ label = 'Processing your request' }: { label?: string }) {
  return (
    <div class="qproc" role="status" aria-live="polite">
      <span class="qproc-spin" aria-hidden="true" />
      <h3>{label}</h3>
      <p>Please wait a moment…</p>
    </div>
  );
}

export function QuoteThanks({
  title = 'Thank you',
  body = 'We will contact you soon.',
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div class="qthanks" role="status">
      <div class="qthanks-check" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32">
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
