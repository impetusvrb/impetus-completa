/**
 * IMPETUS - MIDDLEWARE DE VERIFICAÇÃO DE CARGO
 * Bloqueia acesso a dados estratégicos quando role_verified = false
 */

const roleVerification = require('../services/roleVerificationService');

/**
 * Rotas que exigem cargo verificado (dados estratégicos)
 * Padrões de path que contêm dados sensíveis
 */
const STRATEGIC_PATHS = [
  '/dashboard/me',
  '/dashboard/executive',
  '/dashboard/executive-query',
  '/dashboard/panel-command',
  '/dashboard/claude-panel',
  '/dashboard/smart-summary',
  '/dashboard/visibility',
  '/dashboard/operational-brain',
  '/dashboard/maintenance',
  '/dashboard/industrial',
  '/dashboard/audio',
  // '/proacao' removido: módulo operacional para colaboradores, não exige verificação de cargo
  '/admin/audit-logs',
  '/admin/users',
  // '/plc-alerts' removido: alertas operacionais de manutenção, não exige verificação de cargo
  '/communications'
];

function isStrategicPath(path) {
  const p = (path || '').replace(/^\/api/, '');
  return STRATEGIC_PATHS.some(prefix => p.startsWith(prefix));
}

/**
 * Middleware: exige role_verified para rotas estratégicas
 * Usuários com role_verified=false ou pending não acessam dados sensíveis
 */
function requireRoleVerified(req, res, next) {
  const user = req.user;
  if (!user) return next();

  if (!roleVerification.isStrategicRole(user.role)) {
    return next();
  }

  if (user.role_verified === true || user.is_company_root === true) {
    return next();
  }

  const path = req.path || '';
  if (!isStrategicPath(path)) {
    return next();
  }

  const isGet = req.method === 'GET';
  const allowedBasicPaths = [
    '/dashboard/industrial/status', '/dashboard/industrial/events', '/dashboard/industrial/profiles',
    '/dashboard/me',
    '/dashboard/maintenance'
  ];
  const pathNorm = (req.path || path || '').replace(/^\/api/, '');
  if (isGet && allowedBasicPaths.some(ap => pathNorm.includes(ap))) {
    return next();
  }

  return res.status(403).json({
    ok: false,
    error: 'Cargo não verificado. Valide seu cargo para acessar dados estratégicos.',
    code: 'ROLE_VERIFICATION_REQUIRED',
    needs_verification: true
  });
}

/**
 * Injeta needs_role_verification no req para o frontend
 */
function injectVerificationStatus(req, res, next) {
  if (!req.user) return next();
  req.roleVerificationNeeded = roleVerification.needsVerification(req.user);
  next();
}

module.exports = {
  requireRoleVerified,
  injectVerificationStatus,
  isStrategicPath,
  STRATEGIC_PATHS
};
