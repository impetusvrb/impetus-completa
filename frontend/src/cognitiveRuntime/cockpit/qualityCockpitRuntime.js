/**
 * Z.23 — Labels e hints quality-native para Centro de Comando
 */

export function buildQualityCockpitPresentation(resolved = null) {
  if (!resolved?.runtime?.consolidation_applied) return null;
  const health = resolved.health || {};
  return {
    titulo: 'Centro de Comando — Qualidade',
    subtitulo: `Cockpit cognitivo nativo · foco operacional ${Math.round((resolved.runtime.operational_focus || 0) * 100)}%`,
    healthBadge:
      health.specialization >= 0.6
        ? 'QUALITY_NATIVE'
        : health.specialization >= 0.4
          ? 'SPECIALIZING'
          : 'HYBRID',
    centerCount: (resolved.centers || []).length
  };
}

export default buildQualityCockpitPresentation;
