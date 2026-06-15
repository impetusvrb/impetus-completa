'use strict';

/**
 * P0E.8 — Go-Live Monitoring Documentation
 * READ ONLY · OBSERVATIONAL ONLY
 *
 * Uso:
 *   node backend/scripts/p0e_go_live_monitoring.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const registry = require('../src/services/operations/goLiveRegistryService');

const DOCS = path.join(__dirname, '../docs');

function write(name, content) {
  fs.writeFileSync(path.join(DOCS, name), content, 'utf8');
  console.error(`[P0E] ${path.join(DOCS, name)}`);
}

async function main() {
  let reg;
  try {
    reg = await registry.collectAndRegisterSnapshot(db);
  } finally {
    try {
      await db.pool.end();
    } catch {
      /* ignore */
    }
  }

  const report = reg.report;
  const verdict = {
    phase: 'P0E',
    pass: report.pass,
    verdict: report.verdict,
    reason: report.reason
  };

  write(
    'P0E_GO_LIVE_MONITORING.md',
    `# P0E — Go-Live Monitoring

**Gerado:** ${report.generated_at}  
**Modo:** READ ONLY · OBSERVATIONAL ONLY

## Veredicto

\`\`\`json
${JSON.stringify(verdict, null, 2)}
\`\`\`

## P0E.1 — Go-Live Detection

\`\`\`json
${JSON.stringify(report.go_live ?? {}, null, 2)}
\`\`\`

${!report.go_live?.go_live_detected ? `### Activacao pendente\n\n${(report.operator_steps_required || []).map((s, i) => `${i + 1}. \`${s}\``).join('\n')}` : ''}
`
  );

  write(
    'P0E_FIRST_24H_VALIDATION.md',
    `# P0E — First 24h Validation

**Gerado:** ${report.generated_at}

\`\`\`json
${JSON.stringify(report.first_24h ?? { note: 'Aguardando go-live' }, null, 2)}
\`\`\`

## Critério

\`\`\`json
${JSON.stringify({ first_24h_stable: report.first_24h?.first_24h_stable ?? false }, null, 2)}
\`\`\`
`
  );

  write(
    'P0E_FIRST_72H_VALIDATION.md',
    `# P0E — First 72h Validation

**Gerado:** ${report.generated_at}

\`\`\`json
${JSON.stringify(report.first_72h ?? { note: 'Aguardando go-live' }, null, 2)}
\`\`\`

## Critério

\`\`\`json
${JSON.stringify({ first_72h_stable: report.first_72h?.first_72h_stable ?? false }, null, 2)}
\`\`\`
`
  );

  write(
    'P0E_PRODUCTION_ACCEPTANCE.md',
    `# P0E — Production Acceptance

**Gerado:** ${report.generated_at}

\`\`\`json
${JSON.stringify({
  production_accepted: report.production_accepted ?? false,
  criteria: report.criteria
}, null, 2)}
\`\`\`
`
  );

  write(
    'P0E_OPERATIONAL_GO_LIVE_REPORT.md',
    `# P0E — Operational Go-Live Report

**Gerado:** ${report.generated_at}

---

## Resumo executivo

| Dimensão | Estado |
|----------|--------|
| Go-live detectado | ${report.go_live?.go_live_detected ? '✅' : '❌'} |
| Primeiras 24h estáveis | ${report.first_24h?.first_24h_stable ? '✅' : '⏳'} |
| Primeiras 72h estáveis | ${report.first_72h?.first_72h_stable ? '✅' : '⏳'} |
| Produção aceite | ${report.production_accepted ? '✅' : '⏳'} |
| PM2 | ${report.summary?.pm2_health ?? '—'} |

## Summary

\`\`\`json
${JSON.stringify(report.summary ?? {}, null, 2)}
\`\`\`

## Registry

\`\`\`json
${JSON.stringify(reg.latest, null, 2)}
\`\`\`

---

${report.pass ? '**PASS** — Operação contínua aceite para produção.' : '**MONITORING** — Aguardar activação manual e estabilização 24h/72h.'}

*P0E — READ ONLY · sem activação automática.*
`
  );

  console.log(JSON.stringify(verdict, null, 2));
}

main().catch((err) => {
  console.error('[P0E] ERRO:', err.message);
  process.exit(2);
});
