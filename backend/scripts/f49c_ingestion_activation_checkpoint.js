'use strict';

/**
 * F49-C — IOE Continuous Ingestion Activation Checkpoint (script operador)
 * READ ONLY · nao altera env · nao reinicia PM2 · nao activa workers
 *
 * Uso:
 *   node backend/scripts/f49c_ingestion_activation_checkpoint.js
 *   node backend/scripts/f49c_ingestion_activation_checkpoint.js --window 60
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const checkpoint = require('../src/services/audit/ioeContinuousIngestionCheckpointService');

function parseArgs(argv) {
  const out = { window: 30, writeDoc: true };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--window' && argv[i + 1]) {
      out.window = parseInt(argv[++i], 10) || 30;
    }
    if (argv[i] === '--no-doc') out.writeDoc = false;
  }
  return out;
}

function renderMarkdown(report) {
  const c = report.criteria;
  const req = report.required_flags;
  const lines = [
    '# F49-C — IOE Continuous Ingestion Activation Checkpoint',
    '',
    `**Gerado:** ${report.generated_at}`,
    '**Modo:** READ ONLY · CHECKPOINT ONLY · sem activação automática',
    '',
    '## Contexto (F49-B)',
    '',
    'A auditoria F49-B concluiu que a pausa de IOE é **controlada** (`worker_stopped`), não falha operacional.',
    'Este checkpoint garante que, antes de piloto permanente ou observação contínua, os workers',
    'não permaneçam desactivados por configuração de certificação.',
    '',
    '> **Nota:** variáveis efectivas usam prefixo `IMPETUS_` (ex.: `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED`).',
    '',
    '## Estado actual',
    '',
    '```json',
    JSON.stringify({
      continuous_ingestion_enabled: req.continuous_ingestion_enabled,
      outbox_worker_enabled: req.outbox_worker_enabled,
      event_pipeline_boot_ok: req.event_pipeline_boot_ok,
      continuous_ingestion_ready: c.continuous_ingestion_ready,
      event_pipeline_operational: c.event_pipeline_operational
    }, null, 2),
    '```',
    '',
    '## Checklist pré-deploy / pós-activação',
    '',
    '| # | Item | Fase | Estado |',
    '|---|------|------|--------|'
  ];

  for (const item of report.checklist) {
    lines.push(`| ${item.id} | ${item.label} | ${item.phase} | ${item.passed ? 'PASS' : 'FAIL'} |`);
  }

  lines.push(
    '',
    '## Critério F49-C',
    '',
    '```json',
    JSON.stringify({
      continuous_ingestion_ready: c.continuous_ingestion_ready,
      event_pipeline_operational: c.event_pipeline_operational
    }, null, 2),
    '```',
    '',
    '## Bloqueio actual',
    '',
    report.verdict.activation_blocked_reason
      ? `\`${report.verdict.activation_blocked_reason}\``
      : '_Nenhum — checkpoint aprovado._',
    '',
    '## Passos do operador (manual)',
    '',
    ...report.operator_instructions.steps.map((s) => `- ${s}`),
    '',
    '---',
    '',
    '*F49-C — checkpoint read-only. Nenhuma alteração operacional executada.*',
    ''
  );

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);

  let report;
  try {
    report = await checkpoint.generateActivationCheckpoint({
      db,
      observationWindowMinutes: args.window
    });
  } finally {
    try { await db.pool.end(); } catch { /* ignore */ }
  }

  console.log(JSON.stringify({
    layer: report.layer,
    required_flags: report.required_flags,
    criteria: report.criteria,
    checklist: report.checklist,
    verdict: report.verdict,
    operator_action_required: report.operator_action_required
  }, null, 2));

  if (args.writeDoc) {
    const docPath = path.join(__dirname, '../docs/F49_IOE_CONTINUOUS_INGESTION_ACTIVATION_CHECKPOINT.md');
    fs.writeFileSync(docPath, renderMarkdown(report), 'utf8');
    console.error(`[F49-C] Relatório: ${docPath}`);
  }

  const ready = report.criteria.continuous_ingestion_ready;
  process.exit(ready ? 0 : 1);
}

main().catch((e) => {
  console.error('[F49-C] ERRO:', e.message);
  process.exit(2);
});
