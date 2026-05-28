'use strict';

/**
 * Relatório executivo final (markdown + estrutura JSON).
 */

function buildExecutiveReport(ctx) {
  const {
    scores,
    classification,
    promptValidation,
    antiPatterns,
    residual_debt,
    residual_roadmap,
    remaining_risks
  } = ctx;

  const summary_pt = [
    `Score global ponderado: ${scores.overall_weighted}/100.`,
    `Classificação: ${classification.classification_label}.`,
    `Prompts em produção ON: ${promptValidation.production_on_count}/${promptValidation.total} (${promptValidation.production_on_pct}%).`,
    `Certification readiness técnico: ${scores.certification_readiness_score}/100.`,
    antiPatterns.eternal_shadow_first
      ? 'Alerta: padrões shadow-first residuais em domínios industriais.'
      : 'Shadow-first eterno: mitigado nas waves P23–P32 (governança activa).'
  ].join(' ');

  const md = `# IMPETUS — Relatório Executivo de Consolidação Final (PROMPT 32)

**Gerado:** ${new Date().toISOString()}
**Classificação:** ${classification.classification_label} (\`${classification.classification}\`)
**Score global:** ${scores.overall_weighted}/100

## Sumário

${summary_pt}

## Scores dimensionais

| Dimensão | Score |
|----------|------:|
| Maturity | ${scores.maturity_score_final} |
| Architecture | ${scores.architecture_score} |
| Governance | ${scores.governance_score} |
| AI Safety | ${scores.ai_safety_score} |
| Industrial readiness | ${scores.industrial_readiness_score} |
| International readiness | ${scores.international_readiness_score} |
| Certification readiness | ${scores.certification_readiness_score} |

## Transição validada

| Antes | Estado |
|-------|--------|
| Shadow-first eterno | ${antiPatterns.eternal_shadow_first ? '⚠ Parcial' : '✓ Mitigado (waves ON)'} |
| Pilot fictício | ${antiPatterns.pilot_ficticio ? '⚠ Sim' : '✓ Não'} |
| Runtime só observativo | ${antiPatterns.runtime_observativo_only ? '⚠ Parcial' : '✓ Execução real (P23–P28)'} |
| Arquitectura experimental | ${antiPatterns.architecture_experimental ? '⚠ Sim' : '✓ Foundation madura'} |

## Tornou-se

${Object.entries(classification.became)
  .map(([k, v]) => `- **${k}:** ${v ? 'Sim' : 'Não'}`)
  .join('\n')}

## Prompts 1–32

Produção ON: **${promptValidation.production_on_count}** · Shadow: **${promptValidation.shadow_count}** · Off/Partial: **${promptValidation.off_count + promptValidation.partial_count}**

## Riscos remanescentes

${remaining_risks.map((r) => `- **${r.id}** (${r.severity}): ${r.title}`).join('\n')}

## Débito residual

Crítico: ${residual_debt.critical} · Médio: ${residual_debt.medium} · Baixo: ${residual_debt.low}

## Roadmap residual

${residual_roadmap.phases.map((p) => `### ${p.phase} — ${p.title}\n${p.items.map((i) => `- ${i}`).join('\n')}`).join('\n\n')}

---
*Avaliação técnica automatizada. Não substitui auditoria externa nem certificação formal.*
`;

  return {
    title: 'IMPETUS Final Consolidation Executive Report',
    summary_pt,
    markdown: md,
    classification,
    scores,
    prompt_summary: {
      on: promptValidation.production_on_count,
      total: promptValidation.total,
      pct: promptValidation.production_on_pct
    }
  };
}

function buildRemainingRisks(antiPatterns, scores) {
  const risks = [
    {
      id: 'R1',
      severity: 'high',
      title: 'Coexistência tripla Motor A / V2 / Z — custo de manutenção',
      mitigation: 'P27 deprecation + roadmap T2.10'
    },
    {
      id: 'R2',
      severity: 'high',
      title: 'Telemetria OT sem validação 90 dias em cliente real',
      mitigation: 'Lab industrial + IEC 62443 evidence'
    },
    {
      id: 'R3',
      severity: 'medium',
      title: 'Domínios Safety/Environment em publication shadow',
      mitigation: 'Promotion gates no Rollout Center'
    }
  ];
  if (antiPatterns.eternal_shadow_first) {
    risks.push({
      id: 'R4',
      severity: 'medium',
      title: 'Shadow-first residual em flags de publicação',
      mitigation: 'Promover tenants piloto com métricas'
    });
  }
  if (scores.international_readiness_score < 70) {
    risks.push({
      id: 'R5',
      severity: 'medium',
      title: 'Readiness internacional incompleto',
      mitigation: 'P30 locale + formal SOC2'
    });
  }
  return risks;
}

module.exports = { buildExecutiveReport, buildRemainingRisks };
