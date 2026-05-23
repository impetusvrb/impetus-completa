/**
 * Z.25 — Apresentação safety-native para Centro de Comando
 */

export function buildSafetyCockpitPresentation(resolved = null) {
  if (!resolved?.runtime?.consolidation_applied) return null;
  const health = resolved.health?.safety_cognitive_health || resolved.health || {};
  return {
    titulo: 'Centro de Comando — Segurança do Trabalho',
    subtitulo: `Cockpit safety-native · foco operacional ${Math.round((resolved.runtime.operational_focus || 0) * 100)}%`,
    healthBadge:
      health.specialization >= 0.6
        ? 'SAFETY_NATIVE'
        : health.specialization >= 0.4
          ? 'SPECIALIZING'
          : 'HYBRID',
    centerCount: (resolved.centers || []).length
  };
}

export default buildSafetyCockpitPresentation;
