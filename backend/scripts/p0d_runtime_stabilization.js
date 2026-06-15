'use strict';

/**
 * P0D.9 — Runtime Stabilization Documentation
 * READ ONLY · VALIDATION ONLY
 *
 * Uso:
 *   node backend/scripts/p0d_runtime_stabilization.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const runtime = require('../src/services/operations/runtimeActivationValidationService');
const registry = require('../src/services/operations/runtimeStabilizationRegistryService');

const DOCS = path.join(__dirname, '../docs');

function write(name, content) {
  fs.writeFileSync(path.join(DOCS, name), content, 'utf8');
  console.error(`[P0D] ${path.join(DOCS, name)}`);
}

async function main() {
  let report;
  let reg;
  try {
    reg = await registry.collectAndRegisterSnapshot(db, { windowHours: 24 });
    report = reg.report;
  } finally {
    try {
      await db.pool.end();
    } catch {
      /* ignore */
    }
  }

  const verdict = {
    phase: 'P0D',
    pass: report.pass,
    verdict: report.verdict || report.reason,
    reason: report.reason
  };

  write(
    'P0D_RUNTIME_ACTIVATION.md',
    `# P0D — Runtime Activation

**Gerado:** ${report.generated_at}

## Veredicto

\`\`\`json
${JSON.stringify(verdict, null, 2)}
\`\`\`

## P0D.1 — Activation validation

\`\`\`json
${JSON.stringify(report.activation ?? {}, null, 2)}
\`\`\`

${!report.pass ? `### Passos operador\n\n${(report.operator_steps_required || []).map((s, i) => `${i + 1}. \`${s}\``).join('\n')}` : ''}
`
  );

  write(
    'P0D_RUNTIME_STABILIZATION.md',
    `# P0D — Runtime Stabilization

**Gerado:** ${report.generated_at}

## P0D.2 — Early flow

\`\`\`json
${JSON.stringify(report.early_flow ?? { note: 'N/A — runtime não activado' }, null, 2)}
\`\`\`

## P0D.3 — Stabilization (24h)

\`\`\`json
${JSON.stringify(report.stabilization ?? { note: 'N/A' }, null, 2)}
\`\`\`

## Critério

\`\`\`json
${JSON.stringify({
  new_ioe_detected: report.early_flow?.new_ioe_detected ?? false,
  new_outbox_delivery_detected: report.early_flow?.new_outbox_delivery_detected ?? false,
  runtime_stable: report.stabilization?.runtime_stable ?? false
}, null, 2)}
\`\`\`
`
  );

  write(
    'P0D_RUNTIME_HEALTH.md',
    `# P0D — Runtime Health

**Gerado:** ${report.generated_at}

\`\`\`json
${JSON.stringify(report.health ?? {}, null, 2)}
\`\`\`

## Critério

\`\`\`json
${JSON.stringify({ runtime_health_ok: report.health?.runtime_health_ok ?? false }, null, 2)}
\`\`\`
`
  );

  write(
    'P0D_MULTI_TENANT_RUNTIME.md',
    `# P0D — Multi-Tenant Runtime

**Gerado:** ${report.generated_at}

\`\`\`json
${JSON.stringify(report.multi_tenant ?? {}, null, 2)}
\`\`\`

## Critério

\`\`\`json
${JSON.stringify({ tenant_isolation_preserved: report.multi_tenant?.tenant_isolation_preserved ?? false }, null, 2)}
\`\`\`
`
  );

  write(
    'P0D_OPERATIONAL_RUNTIME_REPORT.md',
    `# P0D — Operational Runtime Report

**Gerado:** ${report.generated_at}

---

## Resumo executivo

| Dimensão | Estado |
|----------|--------|
| Runtime activado | ${report.activation?.runtime_activated ? '✅' : '❌'} |
| Novos IOE | ${report.early_flow?.new_ioe_detected ? '✅' : '❌'} |
| Entregas outbox | ${report.early_flow?.new_outbox_delivery_detected ? '✅' : '❌'} |
| Estabilização 24h | ${report.stabilization?.runtime_stable ? '✅' : '❌'} |
| Isolamento tenant | ${report.multi_tenant?.tenant_isolation_preserved ? '✅' : '❌'} |
| Health runtime | ${report.health?.runtime_health_ok ? '✅' : '❌'} |

## Critérios finais

\`\`\`json
${JSON.stringify(report.criteria ?? {}, null, 2)}
\`\`\`

## Registry snapshot

\`\`\`json
${JSON.stringify(reg.latest, null, 2)}
\`\`\`

---

${report.pass ? '**PASS** — Runtime contínuo activado e estabilizado. Evidência para abertura MES/Qualidade/SST/Ambiental/Logística/Analytics.' : '**FAIL** — Activar runtime manualmente e re-executar P0D após estabilização.'}

*P0D — READ ONLY · sem activação automática.*
`
  );

  console.log(JSON.stringify(verdict, null, 2));
}

main().catch((err) => {
  console.error('[P0D] ERRO:', err.message);
  process.exit(2);
});
