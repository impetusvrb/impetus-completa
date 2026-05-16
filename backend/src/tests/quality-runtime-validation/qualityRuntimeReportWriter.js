'use strict';

const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '../../../docs/quality-runtime-validation/reports');

function ensureDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function writeReport(filename, body) {
  ensureDir();
  fs.writeFileSync(path.join(REPORT_DIR, filename), body, 'utf8');
}

function mdSection(title, lines) {
  return `## ${title}\n\n${lines.filter(Boolean).join('\n')}\n\n`;
}

/**
 * @param {{ phases: object, score: number, checklist: object, timestamp: string }} bundle
 */
function writeAllReports(bundle) {
  const ts = bundle.timestamp || new Date().toISOString();

  writeReport(
    '01-runtime-validation-report.md',
    [
      '# Runtime Validation Report — Quality Industrial (Shadow)',
      '',
      `**Timestamp:** ${ts}`,
      '',
      mdSection('Fase 1 — Shadow runtime', bundle.phases.f1?.lines || []),
      mdSection('Resumo', [`- Casos: ${bundle.phases.f1?.passed || 0}/${bundle.phases.f1?.total || 0}`])
    ].join('\n')
  );

  writeReport(
    '02-replay-idempotency-report.md',
    [
      '# Replay & Idempotency Report',
      '',
      `**Timestamp:** ${ts}`,
      '',
      mdSection('Fase 2 — Workflow / idempotência', bundle.phases.f2?.lines || []),
      mdSection('Fase 3 — Event backbone', bundle.phases.f3?.lines || [])
    ].join('\n')
  );

  writeReport(
    '03-workflow-stability-report.md',
    ['# Workflow Stability Report', '', `**Timestamp:** ${ts}`, '', ...(bundle.phases.f2?.lines || [])].join('\n')
  );

  writeReport(
    '04-frontend-stability-report.md',
    ['# Frontend Stability Report', '', `**Timestamp:** ${ts}`, '', ...(bundle.phases.f5?.lines || [])].join('\n')
  );

  writeReport(
    '05-governance-integrity-report.md',
    [
      '# Governance Integrity Report',
      '',
      `**Timestamp:** ${ts}`,
      '',
      ...(bundle.phases.f7?.lines || []),
      '',
      mdSection('Fase 6 — Explainability (estrutura)', bundle.phases.f6?.lines || [])
    ].join('\n')
  );

  writeReport(
    '06-cognitive-runtime-safety-report.md',
    [
      '# Cognitive Runtime Safety Report',
      '',
      `**Timestamp:** ${ts}`,
      '',
      ...(bundle.phases.f4?.lines || []),
      '',
      '---',
      '',
      'Cognitive load operacional (Fase 1): ver restrições de explainability e densidade no Runtime Validation Report.'
    ].join('\n')
  );

  writeReport(
    '07-enterprise-readiness-score.md',
    [
      '# Enterprise Readiness Score',
      '',
      `**Timestamp:** ${ts}`,
      '',
      `## Pontuação agregada: **${bundle.score}** / 100`,
      '',
      'Critério: média ponderada das fases executadas (shadow).',
      '',
      ...(bundle.readinessDetail || [])
    ].join('\n')
  );

  const checklistLines = (bundle.checklist?.items || [])
    .map((i) => `- [${i.done ? 'x' : ' '}] ${i.label}`)
    .join('\n');

  writeReport(
    '08-production-activation-checklist.md',
    [
      '# Production Activation Checklist — Quality Universal Runtime',
      '',
      `**Timestamp:** ${ts}`,
      '',
      checklistLines,
      '',
      '---',
      '',
      `Readiness score: **${bundle.score}** / 100`
    ].join('\n')
  );

  return REPORT_DIR;
}

module.exports = {
  writeAllReports,
  REPORT_DIR
};
