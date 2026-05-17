'use strict';

/**
 * SafetyExecutiveOperationalInsights — narrativas assistivas (sem IA autónoma / sem authority).
 */

function buildExecutiveNarrative(pack) {
  const readiness = pack.pilot_readiness || {};
  const behavior = pack.behavior_summary?.aggregates || {};
  const ux = pack.ux_validation || {};
  const cog = pack.cognitive_pressure || {};

  const lines = [];
  lines.push(
    `Domínio SST em estágio «${readiness.stage || 'shadow'}» com classificação de prontidão «${readiness.level || 'SHADOW_READY'}» (score ${readiness.score ?? '—'}/100).`
  );
  if (behavior.sample_count || pack.behavior_summary?.sample_count) {
    lines.push(
      `Foram analisadas ${pack.behavior_summary.sample_count} interações operacionais; tempo médio em ecrã ~${behavior.avg_screen_dwell_ms || 0} ms.`
    );
  }
  if (behavior.denied_route_rate > 0.1) {
    lines.push('Atenção: taxa elevada de rotas negadas — rever publication guards e módulo safety_intelligence por tenant.');
  }
  if (cog.overload_detected) {
    lines.push('Pressão cognitiva elevada detectada — recomenda-se simplificar menu ou reduzir vistas simultâneas antes de pilot.');
  } else if (cog.cognitive_risk_score != null && cog.cognitive_risk_score < 50) {
    lines.push('Carga cognitiva dentro de limites aceitáveis para avanço controlado.');
  }
  if (ux.acceptable === false) {
    lines.push('UX contextual apresenta desvios por perfil — ajustar densidade antes de expandir rollout.');
  }

  const recommendations = [];
  if (readiness.level === 'SHADOW_READY') {
    recommendations.push('Manter shadow; recolher mais amostras multi-perfil.');
    recommendations.push('Validar safety_intelligence no tenant piloto.');
  }
  if (readiness.level === 'PILOT_READY') {
    recommendations.push('Autorizar IMPETUS_SAFETY_ACTIVATION_STAGE=pilot apenas para tenant/planta seleccionados.');
    recommendations.push('Monitorizar denied_route_rate e abandonment durante 48h.');
  }
  if (readiness.level === 'NOT_READY') {
    recommendations.push('Não avançar rollout; corrigir razões listadas em readiness.reasons.');
  }

  return {
    ok: true,
    bounded: true,
    assistive_only: true,
    narrative: lines.join(' '),
    bullets: lines,
    recommendations,
    risks: (readiness.reasons || []).map((r) => ({ code: r, severity: 'review' }))
  };
}

module.exports = { buildExecutiveNarrative };
