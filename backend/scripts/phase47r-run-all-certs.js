#!/usr/bin/env node
'use strict';
/** Orquestrador 47-R — executa suítes 39–47 e grava JSON agregado (stdout limpo). */
const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPTS = [
  { id: '39', file: 'phase39-grounding-revalidation.js', key: 'pass' },
  { id: '40', file: 'phase40-plc-intelligence-certification.js' },
  { id: '41', file: 'phase41-trend-certification.js' },
  { id: '42', file: 'phase42-anomaly-certification.js' },
  { id: '43', file: 'phase43-correlation-certification.js' },
  { id: '44', file: 'phase44-event-certification.js' },
  { id: '45', file: 'phase45-pattern-certification.js' },
  { id: '46', file: 'phase46-explanation-certification.js' },
  { id: '47', file: 'phase47-priority-certification.js' }
];

function parseJson(stdout) {
  const s = String(stdout || '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  return null;
}

const results = [];
for (const spec of SCRIPTS) {
  const scriptPath = path.join(__dirname, spec.file);
  const r = spawnSync(process.execPath, [scriptPath], {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    timeout: 600000
  });
  const body = parseJson(r.stdout);
  let certified = false;
  let passed = 0;
  let failed = 0;
  let total = 0;
  if (body) {
    if (spec.key === 'pass' && body.summary) {
      passed = body.summary.pass ?? 0;
      total = body.summary.total ?? 0;
      failed = total - passed;
      certified = passed === total && total > 0;
    } else if (body.certified != null) {
      certified = body.certified === true;
      passed = body.summary?.passed ?? 0;
      failed = body.summary?.failed ?? 0;
      total = body.summary?.total ?? 0;
    }
  }
  results.push({
    phase: spec.id,
    script: spec.file,
    exit_code: r.status,
    certified,
    passed,
    failed,
    total,
    parse_ok: body != null,
    stderr_tail: String(r.stderr || '').slice(-400)
  });
}

const allPass = results.every((x) => x.exit_code === 0 && x.certified);
const out = {
  generated_at: new Date().toISOString(),
  all_certified: allPass,
  results
};
console.log(JSON.stringify(out, null, 2));
process.exit(allPass ? 0 : 1);
