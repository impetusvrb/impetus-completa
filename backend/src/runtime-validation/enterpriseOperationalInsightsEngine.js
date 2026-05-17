'use strict';

/**
 * EnterpriseOperationalInsightsEngine — narrativa assistiva (sem IA autónoma).
 */
function buildOperationalInsights(pack) {
  const runtime = pack.runtime_validation || {};
  const behavior = pack.behavior_summary?.aggregates || {};
  const ux = pack.ux_validation || {};
  const cog = pack.cognitive_maturity || {};
  const rollout = pack.controlled_rollout || {};
  const audience = pack.audience_validation || {};

  const bullets = [];
  bullets.push(
    `Runtime enterprise ${runtime.stable ? 'estável' : 'com conflitos'} — validação em ${runtime.runtime_validation_ms ?? '—'} ms.`
  );
  if (behavior.sample_count != null || pack.behavior_summary?.sample_count) {
    bullets.push(
      `Comportamento: ${pack.behavior_summary?.sample_count || 0} amostras; abandono ${((behavior.route_abandonment_rate || 0) * 100).toFixed(1)}%.`
    );
  }
  if (ux.worst_pressure_class) {
    bullets.push(`Pressão UX contextual: ${ux.worst_pressure_class}.`);
  }
  if (cog.cognitive_maturity_score != null) {
    bullets.push(
      `Maturidade cognitiva ${cog.cognitive_maturity_score}/100; readiness rollout ${cog.rollout_readiness_score}/100.`
    );
  }
  if (audience.failure_count > 0) {
    bullets.push(`Audiência: ${audience.failure_count} falha(s) de visibilidade/publication.`);
  }

  const recommendations = [];
  const risks = [];

  if (!runtime.stable) {
    recommendations.push('Corrigir conflitos de manifest/publication antes de qualquer expansão.');
    risks.push({ code: 'runtime_conflict', severity: 'high' });
  }
  if (ux.worst_pressure_class === 'CRITICAL' || ux.worst_pressure_class === 'HIGH') {
    recommendations.push('Reduzir densidade de menu e dashboards por perfil.');
    risks.push({ code: 'ux_overload', severity: 'medium' });
  }
  if (cog.cognitive_overload) {
    recommendations.push('Activar saturação protection / rever branching operacional.');
    risks.push({ code: 'cognitive_overload', severity: 'medium' });
  }
  if (rollout.recommended_stage === 'PILOT' && rollout.current_stage === 'SHADOW') {
    recommendations.push('Condições sugerem pilot manual — registar scope e não auto-promover.');
  }
  if (rollout.blockers?.length) {
    recommendations.push(`Bloqueadores rollout: ${rollout.blockers.join(', ')}.`);
  }

  const opportunities = [];
  if (runtime.stable && cog.rollout_readiness_score >= 55) {
    opportunities.push('Coletar mais amostras multi-perfil para consolidar maturidade operacional.');
  }

  return {
    ok: true,
    assistive_only: true,
    bounded: true,
    human_review_required: true,
    narrative: bullets.join(' '),
    bullets,
    recommendations,
    risks,
    opportunities
  };
}

module.exports = { buildOperationalInsights };
