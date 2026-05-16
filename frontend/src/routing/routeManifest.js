/**
 * WAVE 6 — Route segmentation manifest.
 * Categoriza rotas em operational, management, admin, domain.
 * Não altera App.jsx — referência declarativa para futuras expansões.
 */

export const ROUTE_SEGMENT = Object.freeze({
  AUTH: 'auth',
  OPERATIONAL: 'operational',
  MANAGEMENT: 'management',
  ADMIN: 'admin',
  DOMAIN: 'domain'
});

/**
 * Mapeamento de prefixos de rota para segmento.
 * Ordem de prioridade: mais específico primeiro.
 */
const SEGMENT_RULES = [
  { test: (p) => p === '/' || p === '/login' || p === '/forgot-password' || p === '/reset-password' || p === '/setup-empresa', segment: ROUTE_SEGMENT.AUTH },
  { test: (p) => p.startsWith('/app/admin'), segment: ROUTE_SEGMENT.ADMIN },
  { test: (p) => p.startsWith('/app/settings'), segment: ROUTE_SEGMENT.MANAGEMENT },
  { test: (p) => p.startsWith('/app/quality') || p.startsWith('/app/safety') || p.startsWith('/app/environment') || p.startsWith('/app/logistics'), segment: ROUTE_SEGMENT.DOMAIN },
  { test: (p) => p.startsWith('/app'), segment: ROUTE_SEGMENT.OPERATIONAL },
  { test: () => true, segment: ROUTE_SEGMENT.OPERATIONAL }
];

/** @param {string} path */
export function getRouteSegment(path) {
  const norm = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  for (const rule of SEGMENT_RULES) {
    if (rule.test(norm)) return rule.segment;
  }
  return ROUTE_SEGMENT.OPERATIONAL;
}

/** Retorna true para rotas de gestão (painel de configuração / admin). */
export function isManagementRoute(path) {
  const seg = getRouteSegment(path);
  return seg === ROUTE_SEGMENT.MANAGEMENT || seg === ROUTE_SEGMENT.ADMIN;
}

/** Retorna true para rotas operacionais (dashboard, chat, operational AI). */
export function isOperationalRoute(path) {
  return getRouteSegment(path) === ROUTE_SEGMENT.OPERATIONAL;
}

/** Retorna true para rotas de domínio industrial futuro. */
export function isDomainRoute(path) {
  return getRouteSegment(path) === ROUTE_SEGMENT.DOMAIN;
}
