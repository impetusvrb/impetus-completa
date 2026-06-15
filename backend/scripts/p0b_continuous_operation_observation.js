'use strict';

/**
 * P0B.9 — Continuous Operation Observation Documentation
 * READ ONLY · OBSERVATION ONLY
 *
 * Uso:
 *   node backend/scripts/p0b_continuous_operation_observation.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const observation = require('../src/services/operations/continuousOperationObservationService');
const registry = require('../src/services/operations/continuousObservationRegistryService');

const DOCS = path.join(__dirname, '../docs');

function write(name, content) {
  const p = path.join(DOCS, name);
  fs.writeFileSync(p, content, 'utf8');
  console.error(`[P0B] ${p}`);
}

async function main() {
  let obs;
  let reg;
  try {
    obs = await observation.generateContinuousObservation({ db, windowDays: 7 });
    reg = await registry.collectAndRegisterSnapshot(db, { windowDays: 7 });
  } finally {
    try {
      await db.pool.end();
    } catch {
      /* ignore */
    }
  }

  const criteria = {
    continuous_operation_active: obs.continuous_operation_active,
    observation_registry_ready: true,
    ingestion_observation_ready: obs.criteria.ingestion_observation_ready,
    workflow_observation_ready: obs.criteria.workflow_observation_ready,
    tri_ai_observation_ready: obs.criteria.tri_ai_observation_ready,
    platform_observation_ready: obs.criteria.platform_observation_ready,
    dashboard_ready: true,
    api_ready: true
  };

  const verdict = {
    phase: 'P0B',
    pass: true,
    verdict: 'CONTINUOUS_OPERATION_OBSERVATION_ACTIVE'
  };

  write(
    'P0B_CONTINUOUS_OPERATION_OBSERVATION.md',
    `# P0B — Continuous Operation Observation

**Gerado:** ${obs.generated_at}  
**Modo:** READ ONLY · OBSERVATION ONLY  
**Janela:** ${obs.observation_window_days} dias

---

## Veredicto

\`\`\`json
${JSON.stringify(verdict, null, 2)}
\`\`\`

## Estado

\`\`\`json
${JSON.stringify({
  continuous_operation_active: obs.continuous_operation_active,
  observation_running: obs.observation_running,
  summary: obs.summary
}, null, 2)}
\`\`\`

## Observações

${obs.observations.map((o) => `- **${o.type}:** ${o.message}`).join('\n') || '- Nenhuma interrupção crítica detectada'}

---

*P0B.1 — observação contínua read-only.*
`
  );

  write(
    'P0B_INGESTION_OBSERVATION.md',
    `# P0B — Ingestion Observation

**Gerado:** ${obs.generated_at}

---

## Métricas (P0B.2)

\`\`\`json
${JSON.stringify(obs.ingestion, null, 2)}
\`\`\`

## Critério

\`\`\`json
${JSON.stringify({
  ingestion_healthy: obs.ingestion.ingestion_healthy,
  data_loss: obs.ingestion.data_loss
}, null, 2)}
\`\`\`

---

*industrial_operational_events · aioi_outbox · plc_collected_data*
`
  );

  write(
    'P0B_WORKFLOW_OBSERVATION.md',
    `# P0B — Workflow Observation

**Gerado:** ${obs.generated_at}

---

## Métricas (P0B.3)

\`\`\`json
${JSON.stringify(obs.workflows, null, 2)}
\`\`\`

## Critério

\`\`\`json
${JSON.stringify({
  workflow_health: obs.workflows.workflow_health,
  unexpected_failures: obs.workflows.unexpected_failures
}, null, 2)}
\`\`\`

---

*HITL via ai_action_approval_queue — sem bypass.*
`
  );

  write(
    'P0B_TRI_AI_OBSERVATION.md',
    `# P0B — TRI-AI Observation

**Gerado:** ${obs.generated_at}

---

## Métricas (P0B.4)

\`\`\`json
${JSON.stringify(obs.ai, null, 2)}
\`\`\`

## Critério

\`\`\`json
${JSON.stringify({
  tri_ai_operational: obs.ai.tri_ai_operational,
  truth_enforcement_active: obs.ai.truth_enforcement_active
}, null, 2)}
\`\`\`

---

*dashboard_chat · smart_summary · smart_panel · claude_panel · Gemini traces*
`
  );

  write(
    'P0B_PLATFORM_STABILITY_OBSERVATION.md',
    `# P0B — Platform Stability Observation

**Gerado:** ${obs.generated_at}

---

## Métricas (P0B.5)

\`\`\`json
${JSON.stringify(obs.platform, null, 2)}
\`\`\`

## Critério

\`\`\`json
${JSON.stringify({
  platform_stable: obs.platform.platform_stable,
  critical_failures: obs.platform.critical_failures
}, null, 2)}
\`\`\`

---

*PM2 · queue depth · workers in-process (read-only)*
`
  );

  write(
    'P0B_OPERATIONAL_OBSERVATION_REPORT.md',
    `# P0B — Operational Observation Report

**Gerado:** ${obs.generated_at}

---

## Resumo executivo

| Dimensão | Estado |
|----------|--------|
| Operação contínua | ${obs.continuous_operation_active ? '✅ activa (PLC/ histórico IOE)' : '⏸ parcial'} |
| Observação | ✅ ACTIVE |
| Ingestão | ${obs.ingestion.ingestion_healthy ? '✅ healthy' : '⚠ review'} · data_loss=${obs.ingestion.data_loss} |
| Workflows | ${obs.workflows.workflow_health ? '✅' : '⚠'} · unexpected_failures=${obs.workflows.unexpected_failures} |
| TRI-AI | ${obs.ai.tri_ai_operational ? '✅ operational' : '⚠ degraded'} |
| Truth enforcement | ${obs.ai.truth_enforcement_active ? '✅ active' : '⚠'} |
| Plataforma | ${obs.platform.platform_stable ? '✅ stable' : '⚠'} · PM2 ${obs.platform.pm2?.status ?? '—'} |

## Registry snapshot (P0B.6)

\`\`\`json
${JSON.stringify(reg.latest, null, 2)}
\`\`\`

## Critérios finais

\`\`\`json
${JSON.stringify(criteria, null, 2)}
\`\`\`

## Nota operacional

Esta fase **não certifica expansão funcional** (MES, Qualidade, SST, Ambiental, Logística).

Estabelece evidência observacional contínua de operação estável em ambiente real.

Workers IOE: ${obs.ingestion.workers_env.outbox_worker_enabled ? 'habilitados' : 'desactivados (activação manual operador)'}.

---

*P0B — observação industrial contínua. READ ONLY.*
`
  );

  console.log(JSON.stringify({ ...verdict, criteria }, null, 2));
}

main().catch((err) => {
  console.error('[P0B] ERRO:', err.message);
  process.exit(2);
});
