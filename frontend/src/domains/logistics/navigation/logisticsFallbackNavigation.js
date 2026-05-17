/** Rotas legacy preservadas quando publication runtime falha. */
export const LOGISTICS_FALLBACK_PATHS = Object.freeze([
  '/app',
  '/app/chatbot',
  '/chat',
  '/app/logistica-inteligente'
]);

export function isLogisticsFallbackPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return LOGISTICS_FALLBACK_PATHS.includes(p);
}
