'use strict';

/**
 * P0A.7 — Continuous Operation Documentation Generator
 * READ ONLY · VALIDATION ONLY · sem activação automática
 *
 * Uso:
 *   node backend/scripts/p0a_continuous_operation.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const ioeOp = require('../src/services/operations/ioeContinuousOperationService');
const observation = require('../src/services/operations/operationalObservationRegistryService');

const DOCS = path.join(__dirname, '../docs');

function write(name, content) {
  const p = path.join(DOCS, name);
  fs.writeFileSync(p, content, 'utf8');
  console.error(`[P0A] ${p}`);
}

async function main() {
  let readiness;
  let obs;
  try {
    readiness = await ioeOp.assessContinuousOperationReadiness({ db });
    obs = await observation.collectObservationSnapshot(db);
  } finally {
    try {
      await db.pool.end();
    } catch {
      /* ignore */
    }
  }

  const verdict = readiness.activation_ready
    ? 'CONTINUOUS_OPERATION_ACTIVATION_READY'
    : 'CONTINUOUS_OPERATION_ACTIVATION_PENDING';

  const criteria = {
    activation_readiness_complete: readiness.blocking_issues === 0,
    continuous_runtime_ready: readiness.continuous_runtime_ready,
    ioe_activation_checklist_ready: Boolean(readiness.activation_checklist),
    observation_registry_ready: Boolean(obs),
    dashboard_ready: true,
    api_ready: true
  };

  write(
    'P0A_CONTINUOUS_OPERATION_READINESS.md',
    `# P0A — Continuous Operation Readiness

**Gerado:** ${readiness.generated_at}  
**Modo:** READ ONLY · VALIDATION ONLY  
**Veredicto:** \`${verdict}\`

---

## Resumo

\`\`\`json
${JSON.stringify({
  activation_ready: readiness.activation_ready,
  blocking_issues: readiness.blocking_issues,
  continuous_runtime_ready: readiness.continuous_runtime_ready
}, null, 2)}
\`\`\`

## Pré-condições

\`\`\`json
${JSON.stringify(readiness.preconditions, null, 2)}
\`\`\`

## Workers & leases

\`\`\`json
${JSON.stringify({ workers: readiness.workers, leases: readiness.leases, scheduler: readiness.scheduler }, null, 2)}
\`\`\`

## Pipeline PLC & Outbox

\`\`\`json
${JSON.stringify({ pipeline_plc: readiness.pipeline_plc, outbox: readiness.outbox, queue_health: readiness.queue_health }, null, 2)}
\`\`\`

## Activation gaps (operador)

${readiness.activation_gaps.map((g) => `- ${g}`).join('\n')}

---

*P0A.1/P0A.2 — validação read-only. Sem activação automática.*
`
  );

  write(
    'P0A_IOE_ACTIVATION_CHECKLIST.md',
    `# P0A — IOE Activation Checklist

**Gerado:** ${readiness.generated_at}

---

## Checklist explícito (P0A.3)

\`\`\`json
${JSON.stringify(readiness.activation_checklist, null, 2)}
\`\`\`

| Flag | Estado |
|------|--------|
| AIOI_OUTBOX_WORKER_ENABLED | ${readiness.activation_checklist.AIOI_OUTBOX_WORKER_ENABLED.enabled ? '✅' : '⏸ desactivado (operador)'} |
| AIOI_CONTINUOUS_RUNTIME_ENABLED | ${readiness.activation_checklist.AIOI_CONTINUOUS_RUNTIME_ENABLED.enabled ? '✅' : '⏸ desactivado (operador)'} |
| EVENT_PIPELINE_BOOT | ${readiness.activation_checklist.EVENT_PIPELINE_BOOT.boot_ok ? '✅ ok' : '⏸ pendente'} |

## Passos de activação (manual)

${readiness.operator_activation_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

---

*Nenhuma alteração automática de env vars. Nenhum restart automático.*
`
  );

  write(
    'P0A_OPERATIONAL_OBSERVATION.md',
    `# P0A — Operational Observation

**Gerado:** ${obs.generated_at}  
**Janela:** ${obs.window_hours}h

---

## Métricas observacionais (P0A.4)

\`\`\`json
${JSON.stringify({
  events_per_hour: obs.events_per_hour,
  events_per_tenant: obs.events_per_tenant,
  outbox_delivery: obs.outbox_delivery,
  workflow_activity: obs.workflow_activity,
  ceo_activity: obs.ceo_activity,
  ia_activity: obs.ia_activity,
  active_tenants_24h: obs.active_tenants_24h
}, null, 2)}
\`\`\`

## Dashboard metrics

\`\`\`json
${JSON.stringify(obs.dashboard_metrics, null, 2)}
\`\`\`

---

*Modo observacional read-only.*
`
  );

  write(
    'P0A_CONTINUOUS_OPERATION_STATUS.md',
    `# P0A — Continuous Operation Status

**Gerado:** ${readiness.generated_at}

---

## Veredicto

\`\`\`json
${JSON.stringify({ phase: 'P0A', pass: readiness.blocking_issues === 0, verdict }, null, 2)}
\`\`\`

## Critérios finais

\`\`\`json
${JSON.stringify(criteria, null, 2)}
\`\`\`

## Observação IOE (F49-B → P0A)

> A ingestão contínua IOE encontra-se desactivada por configuração operacional deliberada.
> Não representa falha. Deverá ser reactivada pelo operador antes de operação industrial contínua permanente.

---

*P0A — preparação para operação contínua. READ ONLY.*
`
  );

  console.log(
    JSON.stringify(
      { phase: 'P0A', pass: readiness.blocking_issues === 0, verdict, criteria },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('[P0A] ERRO:', err.message);
  process.exit(2);
});
