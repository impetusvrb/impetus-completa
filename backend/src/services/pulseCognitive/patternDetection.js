/**
 * CERT-PULSE-02 FASE 6 — Detecção de padrões organizacionais (escopo equipe/setor).
 */
'use strict';

function avg(nums) {
  const v = nums.filter((n) => n != null && !Number.isNaN(n));
  if (!v.length) return null;
  return v.reduce((s, n) => s + n, 0) / v.length;
}

/**
 * Agrega padrões de múltiplos colaboradores num escopo.
 * @param {Array<{ pulse_index: number, dimensions: object, patterns?: object[] }>} members
 */
function detectScopePatterns(members = [], scopeLabel = '') {
  if (!members.length) {
    return {
      patterns: [],
      organizational_state: 'stable_team',
      pulse_index: 50,
      dimensions: {},
      confidence: 0.35
    };
  }

  const indices = members.map((m) => m.pulse_index).filter((n) => n != null);
  const pulseIndex = avg(indices) ?? 50;

  const dimKeys = [
    'engagement',
    'participation',
    'development',
    'collaboration',
    'learning',
    'stability',
    'integration',
    'consistency',
    'evolution'
  ];
  const dimensions = {};
  for (const k of dimKeys) {
    dimensions[k] = Math.round(avg(members.map((m) => m.dimensions?.[k])) ?? 50);
  }

  const patternCounts = {};
  for (const m of members) {
    for (const p of m.patterns || []) {
      patternCounts[p.code] = (patternCounts[p.code] || 0) + 1;
    }
  }

  const patterns = [];
  const n = members.length;
  const threshold = Math.max(2, Math.ceil(n * 0.35));

  if ((patternCounts.disengagement_risk || 0) >= threshold) {
    patterns.push({
      code: 'team_disengagement_cluster',
      label: `${scopeLabel || 'Escopo'}: cluster de possível desengajamento`,
      severity: 'elevated',
      affected_ratio: patternCounts.disengagement_risk / n,
      confidence: 0.7
    });
  }
  if ((patternCounts.overload_signal || 0) >= threshold) {
    patterns.push({
      code: 'team_overload_cluster',
      label: `${scopeLabel || 'Escopo'}: sobrecarga recorrente`,
      severity: 'watch',
      affected_ratio: patternCounts.overload_signal / n,
      confidence: 0.68
    });
  }
  if ((patternCounts.positive_evolution || 0) >= threshold && dimensions.evolution >= 60) {
    patterns.push({
      code: 'team_evolution_cluster',
      label: `${scopeLabel || 'Escopo'}: equipe em evolução`,
      severity: 'info',
      affected_ratio: patternCounts.positive_evolution / n,
      confidence: 0.65
    });
  }
  if (dimensions.engagement < 42 && dimensions.participation < 42) {
    patterns.push({
      code: 'team_low_engagement_aggregate',
      label: `${scopeLabel || 'Escopo'}: queda agregada de participação`,
      severity: 'elevated',
      confidence: 0.62
    });
  }
  if (dimensions.stability < 45 && dimensions.evolution < 50) {
    patterns.push({
      code: 'team_risk_cascade',
      label: `${scopeLabel || 'Escopo'}: risco crescente (estabilidade + evolução)`,
      severity: 'critical',
      confidence: 0.66
    });
  }

  let organizational_state = 'stable_team';
  if (patterns.some((p) => p.severity === 'critical')) organizational_state = 'at_risk_team';
  else if (patterns.some((p) => p.code === 'team_evolution_cluster')) organizational_state = 'growing_team';
  else if (patterns.some((p) => p.code === 'team_overload_cluster')) organizational_state = 'overloaded_team';
  else if (patterns.some((p) => p.code === 'team_disengagement_cluster')) organizational_state = 'disengaged_team';
  else if (pulseIndex >= 75) organizational_state = 'healthy_team';

  return {
    patterns,
    organizational_state,
    pulse_index: Math.round(pulseIndex * 100) / 100,
    dimensions,
    confidence: patterns.length ? 0.55 + patterns.length * 0.05 : 0.45,
    member_count: n
  };
}

module.exports = { detectScopePatterns };
