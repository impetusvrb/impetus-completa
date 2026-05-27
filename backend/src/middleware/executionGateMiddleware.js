'use strict';

/**
 * Execution Gate Middleware — Runtime State Enforcement
 *
 * Verifica se o módulo que processa a rota está autorizado para side effects.
 * Usado em rotas que declaram explicitamente o seu moduleId.
 *
 * Modos (via IMPETUS_RUNTIME_STATE_ENFORCEMENT):
 *   off     → no-op (default — backward compatible)
 *   audit   → permite mas loga tentativas não autorizadas
 *   enforce → bloqueia side effects de módulos observability/enrich/assistive
 *
 * Uso:
 *   router.post('/action', executionGate('proacao.evaluate'), handler);
 */

const { canExecute } = require('../governance/runtimeStateClassification');

/**
 * Factory: cria middleware que verifica execution rights para um moduleId.
 * @param {string} moduleId — ID do módulo no runtimeStateClassification
 * @param {object} [opts] — { action }
 */
function executionGate(moduleId, opts = {}) {
  return (req, res, next) => {
    const result = canExecute(moduleId, opts.action || `${req.method} ${req.path}`);

    if (!result.allowed) {
      return res.status(403).json({
        ok: false,
        error: 'Execution denied by runtime state classification',
        code: 'EXECUTION_GATE_DENIED',
        module: moduleId,
        stage: result.stage,
        enforcement: result.enforcement,
      });
    }

    req._executionGate = result;
    next();
  };
}

module.exports = { executionGate };
