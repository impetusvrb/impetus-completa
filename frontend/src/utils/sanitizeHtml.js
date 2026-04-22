import DOMPurify from 'dompurify';

/**
 * HTML destinado a dangerouslySetInnerHTML — remove scripts e vetores XSS comuns.
 */
export function sanitizeHtml(dirty) {
  if (dirty == null || dirty === '') return '';
  const s = typeof dirty === 'string' ? dirty : String(dirty);
  return DOMPurify.sanitize(s, {
    USE_PROFILES: { html: true }
  });
}
