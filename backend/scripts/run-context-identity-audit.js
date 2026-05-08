#!/usr/bin/env node
'use strict';

/**
 * IMPETUS — Script `run-context-identity-audit`
 *
 * Executa a CONTEXT_IDENTITY_AUDIT contra o BD de produção e imprime o
 * relatório em JSON (NDJSON-friendly) para `stdout`. Pode ser redirigido
 * para ficheiro ou ingerido por um agregador (Datadog, ELK).
 *
 * Uso:
 *   node scripts/run-context-identity-audit.js
 *   node scripts/run-context-identity-audit.js --company=<uuid>
 *   node scripts/run-context-identity-audit.js --limit=200 --format=summary
 *   node scripts/run-context-identity-audit.js --format=json > audit.json
 */

const path = require('path');
const audit = require(path.join(__dirname, '..', 'src', 'dashboardEngineV2', 'audit', 'contextIdentityAudit'));

function _arg(name, fallback) {
  const prefix = `--${name}=`;
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(prefix)) return a.slice(prefix.length);
  }
  return fallback;
}

async function main() {
  const limit = Number(_arg('limit', '1000')) || 1000;
  const company = _arg('company', null);
  const format = _arg('format', 'summary');

  let db = null;
  try {
    db = require(path.join(__dirname, '..', 'src', 'db'));
  } catch (err) {
    console.error('[CONTEXT_IDENTITY_AUDIT] backend/src/db indisponível:', err.message);
    process.exit(2);
  }

  let report;
  try {
    report = await audit.auditFromDatabase(db, { limit, company_id: company });
  } catch (err) {
    console.error('[CONTEXT_IDENTITY_AUDIT] falha:', err.message);
    process.exit(3);
  }

  if (format === 'json') {
    process.stdout.write(JSON.stringify(report, null, 2));
    process.stdout.write('\n');
    process.exit(0);
  }

  // formato sumário — humano
  const out = [];
  out.push(`# CONTEXT_IDENTITY_AUDIT — ${report.generated_at}`);
  out.push(`Utilizadores analisados: ${report.total_users}`);
  out.push(`Total de achados: ${report.total_findings}`);
  out.push('');
  out.push('## Por severidade');
  for (const sev of Object.keys(report.by_severity)) {
    out.push(`  ${sev.padEnd(8)} ${report.by_severity[sev]}`);
  }
  out.push('');
  out.push('## Por tipo');
  for (const kind of Object.keys(report.by_kind)) {
    out.push(`  ${kind.padEnd(28)} ${report.by_kind[kind]}`);
  }
  out.push('');
  out.push('## Top 20 achados (high+medium)');
  const filtered = report.findings.filter((f) => f.severity === 'high' || f.severity === 'medium').slice(0, 20);
  for (const f of filtered) {
    out.push(`  - [${f.severity.toUpperCase()}] ${f.kind} | user=${f.user_id} | ${f.detail}`);
  }
  console.log(out.join('\n'));
  // Exit 1 se houver achados high (sinaliza CI/CD)
  process.exit((report.by_severity.high || 0) > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[CONTEXT_IDENTITY_AUDIT] erro inesperado:', err);
  process.exit(4);
});
