'use strict';

/**
 * SEC-RECON-GOV-001 — tráfego operacional legítimo do Painel Administrativo.
 * Prefixos canónicos; validação de identidade continua em requireAdminAuth.
 *
 * SEC-RECON-GOV-002 (INC-USER-PORTAL-RESTORE-004): estende a política a rotas
 * legítimas autenticadas do user-portal industrial. A navegação normal de um
 * dashboard operacional gera dezenas de endpoints distintos (PATH_DISCOVERY),
 * o que anteriormente ativava THROTTLE/CONTAIN de forma indevida em sessão
 * validated. A validação continua em requireAuth; este policy apenas evita que
 * o score de recon acumule para prefixos canónicos do portal do utilizador.
 *
 * SEC-RECON-GOV-004 (INC-STRUCTURAL-CARGOS-404): `/api/admin/*` (tenant admin
 * no app /app/admin/* — Base Estrutural, utilizadores, departamentos, etc.)
 * não estava na lista. Após navegação normal no dashboard, SEC-RECON bloqueava
 * GET/POST `/api/admin/structural/*` com 404 neutro «Not found», impedindo
 * cadastro de cargos/setores. Distinto de `/api/admin-portal` (SOC) e
 * `/api/impetus-admin` (painel global).
 */
const ADMIN_PORTAL_PREFIXES = Object.freeze([
  '/api/impetus-admin',
  '/api/admin-portal'
]);

const USER_PORTAL_PREFIXES = Object.freeze([
  '/api/admin',
  '/api/dashboard',
  '/api/live-dashboard',
  '/api/tasks',
  '/api/chat',
  '/api/manutencao-ia',
  '/api/manuals',
  '/api/technical-library',
  '/api/proacao',
  '/api/diagnostic',
  '/api/tpm',
  '/api/pulse',
  '/api/notifications',
  '/api/alerts',
  '/api/app-communications',
  '/api/factory-team',
  '/api/companies',
  '/api/onboarding',
  '/api/intelligent-registration',
  '/api/internal-chat',
  '/api/quality-operational',
  '/api/quality-governance',
  '/api/quality-navigation',
  '/api/safety-operational',
  '/api/safety-navigation',
  '/api/analytics',
  '/api/mes',
  '/api/logistics',
  '/api/enterprise-locale',
  '/api/asset-management',
  '/api/subscription',
  '/api/tts',
  '/api/voz',
  '/api/anam',
  '/api/audit',
  '/api/lgpd',
  '/api/feedback',
  '/api/realtime-presence',
  '/api/nexus-ia',
  '/api/role-verification',
  '/api/usuarios',
  '/api/vision',
  '/api/app-impetus',
  '/api/webhook',
  '/api/plc-alerts',
  '/api/central-ai',
  '/api/warehouse-intelligence',
  '/api/quality-intelligence'
]);

function isAdminPortalOperationalPath(path) {
  const p = String(path || '').split('?')[0];
  return ADMIN_PORTAL_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

function isUserPortalOperationalPath(path) {
  const p = String(path || '').split('?')[0];
  return USER_PORTAL_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

function isLegitimateOperationalPath(path) {
  return isAdminPortalOperationalPath(path) || isUserPortalOperationalPath(path);
}

/**
 * Pedido pós-validação de admin com sessão oficial (req.adminUser).
 * Não confiar em role/credential do frontend — exige validationSource do auth middleware.
 */
function isValidatedAdminOperationalRequest(identity, meta, path) {
  if (!identity?.authenticatedIdentity) return false;
  if (identity.identityType !== 'ADMIN') return false;
  if (meta?.validationSource !== 'requireAdminAuth') return false;
  return isAdminPortalOperationalPath(path);
}

/**
 * Pedido pós-validação de utilizador operacional (req.user) com JWT/session válido.
 * Só reduz decisão para rotas canónicas do user-portal. Requests anónimas ou de
 * rotas fora dos prefixos continuam sujeitas ao score integral.
 */
function isValidatedUserPortalRequest(identity, meta, path) {
  if (!identity?.authenticatedIdentity) return false;
  if (meta?.validationSource !== 'requireAuth') return false;
  return isUserPortalOperationalPath(path);
}

/**
 * Pedido pós-validação legítimo (admin OU user portal).
 * Consolida o downgrade CONTAIN/THROTTLE → SUSPECT para navegação autenticada.
 */
function isValidatedLegitimateOperationalRequest(identity, meta, path) {
  return (
    isValidatedAdminOperationalRequest(identity, meta, path) ||
    isValidatedUserPortalRequest(identity, meta, path)
  );
}

/**
 * Sinais de correlação de navegação normal (admin OU user portal autenticado) — não incrementam score de recon.
 * Só se aplica quando `signal.authenticated` é verdadeiro (identidade validada
 * em resolveIdentityContext), preservando a proteção anti-recon para tráfego
 * pré-autenticação ou rotas externas.
 */
function shouldSkipReconScoreForSignal(signal) {
  if (!signal?.authenticated) return false;
  return isLegitimateOperationalPath(signal.path);
}

module.exports = {
  ADMIN_PORTAL_PREFIXES,
  USER_PORTAL_PREFIXES,
  isAdminPortalOperationalPath,
  isUserPortalOperationalPath,
  isLegitimateOperationalPath,
  isValidatedAdminOperationalRequest,
  isValidatedUserPortalRequest,
  isValidatedLegitimateOperationalRequest,
  shouldSkipReconScoreForSignal
};
