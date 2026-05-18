/** Rotas legacy preservadas quando publication runtime falha. */
export const ENVIRONMENT_FALLBACK_PATHS = Object.freeze([
  '/app',
  '/app/chatbot',
  '/chat',
  '/app/ambiental-inteligente'
]);

export function isEnvironmentFallbackPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return ENVIRONMENT_FALLBACK_PATHS.includes(p);
}
