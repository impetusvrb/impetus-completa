/**
 * Z.26 — Apresentação people-native para Centro de Comando
 */

export function buildHrCockpitPresentation(resolved = null) {
  if (!resolved?.runtime?.consolidation_applied) return null;
  const health = resolved.health || {};
  return {
    titulo: 'Centro de Comando — Recursos Humanos',
    subtitulo: `Cockpit people-native · foco operacional ${Math.round((resolved.runtime.operational_focus || 0) * 100)}%`,
    healthBadge:
      health.specialization >= 0.6 ? 'PEOPLE_NATIVE' : health.specialization >= 0.4 ? 'SPECIALIZING' : 'HYBRID',
    centerCount: (resolved.centers || []).length
  };
}

export default buildHrCockpitPresentation;
