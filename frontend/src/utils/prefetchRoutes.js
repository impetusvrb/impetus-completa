/**
 * Prefetch de rotas críticas — carrega chunks em segundo plano ao hover
 * Reduz delay percebido ao navegar (200-500ms → quase instantâneo)
 */
const prefetchMap = {
  '/app': () => import('../pages/Dashboard'),
  '/app/manutencao/manuia': () => import('../pages/ManuIA'),
  '/app/chatbot': () => import('../features/aiChat/AIChatPage'),
  '/app/proacao': () => import('../pages/Proposals'),
  '/chat': () => import('../pages/ChatPage'),
  '/app/cadastrar-com-ia': () => import('../pages/CadastrarComIA'),
  '/app/registro-inteligente': () => import('../pages/RegistroInteligente'),
  '/app/settings': () => import('../pages/UserSettings'),
  '/app/centro-previsao-operacional': () => import('../pages/CentroPrevisaoOperacional'),
  '/app/centro-custos-industriais': () => import('../pages/CentroCustosExecutivo'),
  '/app/mapa-vazamento-financeiro': () => import('../pages/MapaVazamentoFinanceiro'),
  '/app/biblioteca': () => import('../features/biblioteca'),
  '/app/operacional': () => import('../pages/Operacional'),
  '/app/admin/system-health': () => import('../pages/SystemHealthPage'),
};

const prefetched = new Set();

export function prefetchRoute(path) {
  const normalized = (path || '').split('?')[0].replace(/\/$/, '') || '/';
  const fn = prefetchMap[normalized];
  if (fn && !prefetched.has(normalized)) {
    prefetched.add(normalized);
    fn().catch(() => {});
  }
}
