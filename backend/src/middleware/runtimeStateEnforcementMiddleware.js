'use strict';

/**
 * Runtime State Enforcement Middleware — Global side-effect isolation
 *
 * Intercepta todas as requisições e verifica se o módulo responsável
 * está classificado com permissão de execution.
 *
 * Modo: controlado por IMPETUS_RUNTIME_STATE_ENFORCEMENT
 *   off     → no-op (default, zero impacto)
 *   audit   → loga violations sem bloquear
 *   enforce → bloqueia mutations de módulos não-execution
 *
 * Route-to-module mapping: baseado em prefixo de rota → moduleId.
 * Se a rota não está mapeada, é permit-by-default (segurança contra breakage).
 */

const { canExecute, STAGES } = require('../governance/runtimeStateClassification');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Mapeamento de prefixos de rota → moduleId.
 * Apenas rotas com side effects conhecidos precisam de mapeamento.
 * Rotas GET não precisam — são always-allow.
 */
const ROUTE_MODULE_MAP = Object.freeze([
  ['/api/dashboard/visibility', 'dashboard.visibility'],
  ['/api/dashboard/chat', 'dashboard.chat'],
  ['/api/smart-panel', 'dashboard.panel_command'],
  ['/api/claude-panel', 'dashboard.panel_command'],
  ['/api/manuia/orders', 'manuia.orders'],
  ['/api/manuia', 'manuia.diagnostics'],
  ['/api/proacao/evaluate', 'proacao.evaluate'],
  ['/api/proacao', 'proacao.create'],
  ['/api/admin/users', 'admin.users'],
  ['/api/admin/settings', 'admin.settings'],
  ['/api/pulse', 'pulse.submit'],
  ['/api/auth/login', 'auth.login'],
  ['/api/auth/register', 'auth.login'],
  ['/api/lgpd', 'lgpd.anonymize'],
  // Prefixos específicos ANTES de /api/cognitive — evita capturar cognitive-council (EXECUTION).
  ['/api/cognitive-council', 'cognitive.council'],
  ['/api/cognitive-activation', 'cognitive.pulse'],
  ['/api/cognitive-registry', 'governance.audit'],
  ['/api/cognitive', 'cognitive.envelope'],
  ['/api/integrations', 'integrations.edge_ingest'],
]);

let _stats = { checked: 0, denied: 0, audit_violations: 0, passed: 0 };

function _getMode() {
  const v = String(process.env.IMPETUS_RUNTIME_STATE_ENFORCEMENT || '').trim().toLowerCase();
  if (['enforce', 'audit'].includes(v)) return v;
  return 'off';
}

function _resolveModule(path) {
  for (const [prefix, moduleId] of ROUTE_MODULE_MAP) {
    if (path.startsWith(prefix)) return moduleId;
  }
  return null;
}

function _log(event, data) {
  try {
    console.info('[RUNTIME_ENFORCEMENT]', JSON.stringify({ _type: 'runtime_state_enforcement', event, ts: new Date().toISOString(), ...data }));
  } catch { /* never throw */ }
}

function runtimeStateEnforcementMiddleware(req, res, next) {
  const mode = _getMode();
  if (mode === 'off') return next();
  if (!WRITE_METHODS.has(req.method)) return next();

  const path = (req.originalUrl || req.url || '').split('?')[0];
  const moduleId = _resolveModule(path);

  if (!moduleId) return next();

  _stats.checked++;
  const action = `${req.method} ${path}`;
  const result = canExecute(moduleId, action);

  if (result.allowed) {
    _stats.passed++;
    req._runtimeStageCheck = result;
    return next();
  }

  if (mode === 'audit') {
    _stats.audit_violations++;
    _log('audit_violation', { moduleId, path, method: req.method, stage: result.stage, action });
    req._runtimeStageCheck = result;
    return next();
  }

  _stats.denied++;
  _log('execution_blocked', { moduleId, path, method: req.method, stage: result.stage, action });

  // Non-blocking violation alerting
  setImmediate(() => {
    _emitViolationAlert(moduleId, action, result.stage, req).catch(() => {});
  });

  return res.status(403).json({
    ok: false,
    error: 'Execution blocked by runtime state enforcement',
    code: 'RUNTIME_STATE_BLOCKED',
    module: moduleId,
    stage: result.stage,
    enforcement: mode,
    _meta: { correlation_id: req.headers?.['x-correlation-id'] || null },
  });
}

let _violationCount = 0;
const MAX_ALERTS_PER_HOUR = 10;
let _alertWindowStart = Date.now();
let _alertsThisWindow = 0;

async function _emitViolationAlert(moduleId, action, stage, req) {
  _violationCount++;

  // Rate-limit alerts: max 10/hour
  if (Date.now() - _alertWindowStart > 3600000) {
    _alertWindowStart = Date.now();
    _alertsThisWindow = 0;
  }
  if (_alertsThisWindow >= MAX_ALERTS_PER_HOUR) return;
  _alertsThisWindow++;

  try {
    const db = require('../db');

    // Audit trail
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at)
      VALUES ('runtime_state_violation', 'module', $1, 'system:runtime_enforcement', NOW())
    `, [JSON.stringify({
      module: moduleId,
      action,
      stage,
      user_id: req.user?.id || null,
      ip: req.ip,
      blocked: true,
      violation_number: _violationCount,
    })]);

    // Notificar apenas admins do tenant corrente (se disponível no contexto)
    const tenantId = req?.user?.company_id || req?.tenantId || null;
    const adminQuery = tenantId
      ? `SELECT id, company_id FROM users WHERE hierarchy_level <= 1 AND active = true AND deleted_at IS NULL AND company_id = $1 LIMIT 5`
      : `SELECT id, company_id FROM users WHERE hierarchy_level <= 1 AND active = true AND deleted_at IS NULL AND company_id IS NOT NULL LIMIT 5`;
    const admins = await db.query(adminQuery, tenantId ? [tenantId] : []);

    for (const admin of admins.rows) {
      await db.query(`
        INSERT INTO notifications (company_id, user_id, type, priority, title, message, action_required, created_at, expires_at)
        VALUES ($1, $2, 'runtime_state_violation', 'critical', 'Violação de Runtime State detectada', $3, true, NOW(), NOW() + INTERVAL '7 days')
      `, [
        admin.company_id,
        admin.id,
        `Módulo "${moduleId}" (stage: ${stage}) tentou executar acção bloqueada: ${action.slice(0, 100)}. Violation #${_violationCount}.`,
      ]);
    }
  } catch { /* alerting non-blocking */ }
}

function getEnforcementStats() {
  return { ..._stats, mode: _getMode(), violations_total: _violationCount, alerts_this_hour: _alertsThisWindow };
}

module.exports = {
  runtimeStateEnforcementMiddleware,
  getEnforcementStats,
  /** @internal — testes de regressão de mapeamento rota→módulo */
  _resolveModuleForPath: _resolveModule,
  ROUTE_MODULE_MAP
};
