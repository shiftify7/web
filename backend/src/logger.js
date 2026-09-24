const SENSITIVE_KEY_RE = /(authorization|cookie|password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|mongodb[_-]?uri|otp|verification[_-]?code)/i;
const MONGODB_URI_RE = /mongodb(?:\+srv)?:\/\/[^\s"'`]+/gi;
const BEARER_RE = /Bearer\s+[^\s"'`]+/gi;
const SECRET_ASSIGNMENT_RE = /((?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key)\s*[=:]\s*)([^\s,}]+)/gi;

function redactString(value) {
  return String(value)
    .replace(MONGODB_URI_RE, '[REDACTED_MONGODB_URI]')
    .replace(BEARER_RE, 'Bearer [REDACTED]')
    .replace(SECRET_ASSIGNMENT_RE, '$1[REDACTED]');
}

function redact(value, key = '') {
  if (SENSITIVE_KEY_RE.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return redactString(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
    };
  }
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]));
  }
  return value;
}

function write(level, event, details = {}) {
  const entry = redact({
    timestamp: new Date().toISOString(),
    level,
    service: 'shiftify-backend',
    event,
    ...details,
  });
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info(event, details = {}) {
    write('info', event, details);
  },
  warn(event, details = {}) {
    write('warn', event, details);
  },
  error(event, error, details = {}) {
    const failure = error instanceof Error ? error : new Error(String(error));
    write('error', event, { ...details, error: failure });
  },
};
