'use strict';

/**
 * P0C.9 — Active Continuous Operation Documentation
 * READ ONLY · VALIDATION ONLY
 *
 * Uso:
 *   node backend/scripts/p0c_active_continuous_operation.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const active = require('../src/services/operations/activeContinuousOperationValidationService');

const DOCS = path.join(__dirname, '../docs');

function write(name, content) {
  fs.writeFileSync(path.join(DOCS, name), content, 'utf8');
  console.error(`[P0C] ${path.join(DOCS, name)}`);
}

async function main() {
  let report;
  try {
    report = await active.generateActiveOperationValidation({ db, activationWindowMinutes: 60 });
  } finally {
    try {
      await db.pool.end();
    } catch {
      /* ignore */
    }
  }

  const verdict = {
    phase: 'P0C',
    pass: report.pass,
    verdict: report.verdict || report.reason,
    reason: report.reason
  };

  write(
    'P0C_ACTIVE_CONTINUOUS_OPERATION.md',
    `# P0C — Active Continuous Operation Validation

**Gerado:** ${report.generated_at}  
**Modo:** READ ONLY · VALIDATION ONLY

---

## Veredicto

\`\`\`json
${JSON.stringify(verdict, null, 2)}
\`\`\`

## Pré-condição

\`\`\`json
${JSON.stringify(report.precondition ?? {}, null, 2)}
\`\`\`

${!report.pass ? `## Passos operador obrigatórios\n\n${(report.operator_steps_required || []).map((s, i) => `${i + 1}. \`${s}\``).join('\n')}` : '## Pipeline activado — validação activa executada'}

---

*P0C — validação de operação contínua REAL.*
`
  );

  write(
    'P0C_IOE_ACTIVE_VALIDATION.md',
    `# P0C — IOE Active Validation

**Gerado:** ${report.generated_at}

${report.ioe ? `\`\`\`json\n${JSON.stringify(report.ioe, null, 2)}\n\`\`\`\n\n## Critério\n\n\`\`\`json\n${JSON.stringify({
  continuous_ingestion_active: report.ioe.continuous_ingestion_active,
  new_events_detected: report.ioe.new_events_detected
}, null, 2)}\n\`\`\`` : `**Estado:** validação não executada — \`${report.reason}\``}
`
  );

  write(
    'P0C_RUNTIME_ACTIVE_VALIDATION.md',
    `# P0C — Runtime Active Validation

**Gerado:** ${report.generated_at}

${report.runtime ? `\`\`\`json\n${JSON.stringify(report.runtime, null, 2)}\n\`\`\`\n\n## Critério\n\n\`\`\`json\n${JSON.stringify({ continuous_runtime_operational: report.runtime.continuous_runtime_operational }, null, 2)}\n\`\`\`` : `**Estado:** validação não executada — \`${report.reason}\``}
`
  );

  write(
    'P0C_OUTBOX_ACTIVE_VALIDATION.md',
    `# P0C — Outbox Active Validation

**Gerado:** ${report.generated_at}

${report.outbox ? `\`\`\`json\n${JSON.stringify(report.outbox, null, 2)}\n\`\`\`\n\n## Critério\n\n\`\`\`json\n${JSON.stringify({
  outbox_operational: report.outbox.outbox_operational,
  delivery_rate_healthy: report.outbox.delivery_rate_healthy
}, null, 2)}\n\`\`\`` : `**Estado:** validação não executada — \`${report.reason}\``}
`
  );

  write(
    'P0C_OPERATIONAL_STABILITY_VALIDATION.md',
    `# P0C — Operational Stability Validation

**Gerado:** ${report.generated_at}

${report.stability ? `\`\`\`json\n${JSON.stringify(report.stability, null, 2)}\n\`\`\`\n\n## Critério\n\n\`\`\`json\n${JSON.stringify({
  critical_failures: report.stability.critical_failures,
  platform_stable: report.stability.platform_stable
}, null, 2)}\n\`\`\`` : `**Estado:** validação parcial — pipeline não activado.`}
`
  );

  write(
    'P0C_FINAL_OPERATIONAL_VALIDATION.md',
    `# P0C — Final Operational Validation

**Gerado:** ${report.generated_at}

---

## Veredicto final

\`\`\`json
${JSON.stringify(verdict, null, 2)}
\`\`\`

## Critérios finais

\`\`\`json
${JSON.stringify(report.criteria ?? {}, null, 2)}
\`\`\`

## Summary

\`\`\`json
${JSON.stringify(report.summary ?? {}, null, 2)}
\`\`\`

---

${report.pass ? '**PASS** — Primeira certificação com ingestão contínua activa, workers activos e dados novos pós-activação.' : '**FAIL** — Activar pipeline manualmente e re-executar validação P0C.'}

Somente após PASS desta fase está tecnicamente justificada a abertura dos módulos MES, Qualidade, SST, Ambiental, Logística e Analytics.

---

*P0C — READ ONLY · sem activação automática.*
`
  );

  console.log(JSON.stringify(verdict, null, 2));
}

main().catch((err) => {
  console.error('[P0C] ERRO:', err.message);
  process.exit(2);
});
