'use strict';

function buildRolloutRecommendation(pack) {
  const pilot = pack.tenant_pilot_readiness || {};
  let status = pilot.status || 'remain_in_shadow';
  const rec = {
    ok: true,
    assistive_only: true,
    auto_promotion: false,
    governance_escalation: false,
    recommended_status: status,
    actions: []
  };

  if (status === 'remain_in_shadow') {
    rec.actions.push('Manter QUALITY/SAFETY/LOGISTICS em shadow');
    rec.actions.push('Recolher amostras multi-perfil por tenant');
  }
  if (status === 'pilot_ready') {
    rec.actions.push('Pilot manual por tenant/planta');
    rec.actions.push('Monitorizar friction 48h');
  }
  if (status === 'controlled_ready') {
    rec.actions.push('Expansão CONTROLLED apenas com revisão humana');
  }
  if (pack.friction && !pack.friction.acceptable) {
    rec.actions.push('Aplicar recomendações de densidade contextual');
  }
  if (pack.multi_domain_publication && !pack.multi_domain_publication.publication_stable) {
    rec.actions.push('Corrigir publication multi-domínio');
    rec.recommended_status = 'remain_in_shadow';
  }
  return rec;
}

module.exports = { buildRolloutRecommendation };
