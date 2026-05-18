'use strict';

const fs = require('fs');
const path = require('path');
const orchestrator = require('../../enterprise-ecosystem-consolidation/enterpriseEcosystemConsolidationOrchestrator');

const DOCS = path.resolve(__dirname, '../../../docs');
const ts = new Date().toISOString();

const pack = orchestrator.runEcosystemFinalConsolidation({
  tenant_id: 'pre-environment-global',
  run_soak: true,
  soak_dry_run: false,
  check_pm2: true
});

const decision = pack.environment_decision?.decision || 'BLOCK_ENVIRONMENT';
const ecmi = pack.cognitive_maturity_index?.enterprise_cognitive_maturity_index ?? 0;

function write(name, body) {
  fs.writeFileSync(path.join(DOCS, name), body, 'utf8');
  console.log(`wrote ${name}`);
}

write(
  'enterprise-ecosystem-final-consolidation-report.md',
  `# Enterprise Ecosystem Final Consolidation Report

Generated: ${ts}

## Summary

| Field | Value |
|-------|-------|
| Framework | ${pack.framework} |
| Phase | ${pack.phase} |
| Domains | quality, safety, logistics |
| Runtime stable | ${pack.ecosystem_runtime?.stable} |
| Soak stable | ${pack.stability_soak?.stable} |
| Governance OK | ${pack.governance_validation?.ok} |
| ECMI | ${ecmi} |
| Environment decision | **${decision}** |

## Fase 1 — Ecosystem Runtime Validation

- Navigation stable: ${pack.ecosystem_runtime?.navigation_stable}
- Lazy routes safe: ${pack.ecosystem_runtime?.lazy_routes_safe}
- Multi-domain publication: ${pack.ecosystem_runtime?.publication?.publication_stable}
- Coexistence IA/Chat/Dashboard: ${pack.ecosystem_runtime?.coexistence?.ia_chat_dashboard}

## Fase 2 — Enterprise Stability Soak

- Passed suites: ${pack.stability_soak?.passed}/${pack.stability_soak?.total}
- PM2 backend present: ${pack.stability_soak?.pm2?.ok}

## Fase 3 — Cognitive Maturity

- ECMI: ${ecmi}
- Acceptable for environment: ${pack.cognitive_maturity_index?.acceptable_for_environment}
- Overload count: ${pack.cognitive_maturity_index?.overload_count}

## Fase 4 — Governance

- Tenant isolation: ${pack.governance_validation?.tenant_isolation}
- Bounded publication: ${pack.governance_validation?.publication_governance?.bounded}

## Fase 5 — Environment Gate

\`\`\`json
${JSON.stringify(pack.environment_decision, null, 2)}
\`\`\`

## Restrições respeitadas

- Sem FULL rollout automático
- Additive-only / shadow-first
- Pilot manual_only

API: \`POST /api/enterprise-ecosystem-consolidation/consolidate\`
`
);

write(
  'enterprise-readiness-before-environment.md',
  `# Enterprise Readiness Before ENVIRONMENT

Generated: ${ts}

## Decisão

**${decision}**

${decision === 'ENVIRONMENT_READY' ? 'O ecossistema QUALITY / SAFETY / LOGISTICS está autorizado a iniciar desenvolvimento do domínio ENVIRONMENT (com sign-off manual).' : 'ENVIRONMENT permanece bloqueado até resolução dos motivos abaixo.'}

## Motivos

${(pack.environment_decision?.reasons || []).map((r) => `- ${r}`).join('\n') || '- nenhum bloqueio estrutural'}

## Pré-requisitos

| Check | Status |
|-------|--------|
| Q/S/L runtime stable | ${pack.environment_decision?.prerequisites_met?.quality_safety_logistics_stable} |
| Soak passed | ${pack.environment_decision?.prerequisites_met?.soak_passed} |
| Cognitive OK | ${pack.environment_decision?.prerequisites_met?.cognitive_ok} |
| Governance OK | ${pack.environment_decision?.prerequisites_met?.governance_ok} |
| No auto FULL | ${pack.environment_decision?.prerequisites_met?.no_full_rollout} |

## Próximos passos

1. Manter domínios em SHADOW até pilot aprovado.
2. Reexecutar: \`npm run test:enterprise-ecosystem-consolidation\`
3. Endpoint: \`GET /api/enterprise-ecosystem-consolidation/environment-decision\`
`
);

write(
  'enterprise-runtime-final-health-report.md',
  `# Enterprise Runtime Final Health Report

Generated: ${ts}

## Runtime snapshot

\`\`\`json
${JSON.stringify(
  {
    stable: pack.ecosystem_runtime?.stable,
    domains: pack.ecosystem_runtime?.domains,
    mount_issues: pack.ecosystem_runtime?.runtime_snapshot?.mount_issues,
    legacy_coexistence: pack.ecosystem_runtime?.coexistence?.legacy_coexistence
  },
  null,
  2
)}
\`\`\`

## Validation pack decision

${pack.ecosystem_runtime?.validation_pack?.enterprise_decision?.decision || 'n/a'}

## Shadow cycle

- Friction score: ${pack.ecosystem_runtime?.shadow_cycle?.friction?.friction_score ?? 'n/a'}
- Rollout recommendation: ${pack.ecosystem_runtime?.shadow_cycle?.rollout_recommendation?.recommended_status ?? 'n/a'}

## Soak suites

${(pack.stability_soak?.suites || [])
  .map((s) => `- ${s.id}: ${s.ok ? 'PASS' : 'FAIL'}`)
  .join('\n')}
`
);

write(
  'enterprise-cognitive-final-report.md',
  `# Enterprise Cognitive Final Report

Generated: ${ts}

## Enterprise Cognitive Maturity Index (ECMI)

**${ecmi}** / 100

## Scores

| Dimension | Score |
|-----------|-------|
| Cognitive | ${pack.cognitive_maturity_index?.cognitive_maturity_score} |
| Operational | ${pack.cognitive_maturity_index?.operational_maturity_score} |
| Contextual | ${pack.cognitive_maturity_index?.contextual_maturity_score} |
| Rollout readiness | ${pack.cognitive_maturity_index?.rollout_readiness_score} |

## Pressures

\`\`\`json
${JSON.stringify(pack.cognitive_maturity_index?.pressures, null, 2)}
\`\`\`

## Recommended actions

${(pack.cognitive_maturity_index?.recommended_actions || []).map((a) => `- ${a}`).join('\n') || '- none'}
`
);

write(
  'ecosystem-publication-final-report.md',
  `# Ecosystem Publication Final Report

Generated: ${ts}

## Multi-domain pipeline

Domains: quality → safety → logistics

## Publication validation

\`\`\`json
${JSON.stringify(pack.ecosystem_runtime?.publication, null, 2)}
\`\`\`

## Governance

- Bounded publication: ${pack.governance_validation?.publication_governance?.bounded}
- Pipeline: ${(pack.governance_validation?.publication_governance?.pipeline || []).join(' → ')}

## Status

Publication stable: **${pack.ecosystem_runtime?.publication?.publication_stable !== false}**

Shadow-first; sem promoção automática para FULL.
`
);

console.log(`\nDecision: ${decision}\n`);
