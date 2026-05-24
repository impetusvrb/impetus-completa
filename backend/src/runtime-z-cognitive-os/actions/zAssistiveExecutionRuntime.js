'use strict';

/**
 * Esta camada NÃO executa. Recebe um PreparedAction e devolve apenas o
 * descritor "pronto para revisão humana". Existe para deixar o contrato
 * explícito: se algum dia um runtime tentar invocar `execute()`, falha.
 */
function reviewPreparedAction(prepared) {
  if (!prepared || typeof prepared !== 'object') {
    return { ok: false, reason: 'invalid_prepared_action' };
  }
  return {
    ok: true,
    review_ready: true,
    auto_execution_blocked: true,
    requires_human_authority: true,
    action: prepared
  };
}

function execute() {
  return {
    ok: false,
    error: 'execution_blocked_by_sz2_invariant',
    invariant: 'assistive_only'
  };
}

module.exports = { reviewPreparedAction, execute };
