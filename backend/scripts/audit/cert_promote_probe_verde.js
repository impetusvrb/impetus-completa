#!/usr/bin/env node
'use strict';

/**
 * IECP — Promove telas AMARELO com probe API válido (2xx/401/403) para VERDE.
 * Uso: npm run cert:promote-probe-verde
 */

const fs = require('fs');
const path = require('path');

const MATRIX_PATH = path.join(__dirname, '../../docs/FUNCTIONAL_MATRIX.json');
const REPO = path.resolve(__dirname, '..', '..', '..');
const STATIC_ONLY = new Set([]);

function loadMatrix() {
  return JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
}

function saveMatrix(m) {
  fs.writeFileSync(MATRIX_PATH, JSON.stringify(m, null, 2));
}

function probeFileForRow(row) {
  if (row.evidence) {
    const p = path.join(REPO, row.evidence.replace(/^backend\//, ''), 'probe_report.json');
    if (fs.existsSync(p)) return p;
  }
  const fallback = path.join(
    REPO,
    'backend/docs/evidence/screens',
    row.module,
    row.screen,
    'probe_report.json'
  );
  return fs.existsSync(fallback) ? fallback : null;
}

function probeOk(row) {
  const probeFile = probeFileForRow(row);
  if (!probeFile) return false;
  try {
    const probe = JSON.parse(fs.readFileSync(probeFile, 'utf8'));
    const results = probe.probeResults || probe.results || [];
    const codes = results.map((r) => r.status).filter((n) => typeof n === 'number');
    if (!codes.length) return probe.ok === true || probe.pass === true;
    return codes.some((c) => (c >= 200 && c < 300) || c === 403 || c === 401);
  } catch {
    return false;
  }
}

function main() {
  const m = loadMatrix();
  let promoted = 0;
  let skipped = 0;

  for (const row of m.rows || []) {
    if (row.status !== 'AMARELO') continue;
    if (STATIC_ONLY.has(row.route)) {
      skipped++;
      continue;
    }
    if (probeOk(row)) {
      row.status = 'VERDE';
      row.promotedAt = new Date().toISOString();
      row.promotionReason = 'probe_api_ok';
      promoted++;
    }
  }

  const dist = {};
  for (const row of m.rows || []) {
    dist[row.status] = (dist[row.status] || 0) + 1;
  }
  m.stats = m.stats || {};
  m.stats.statusDist = dist;
  m.stats.screenCount = m.rows?.length || 0;
  m.generatedAt = new Date().toISOString();

  saveMatrix(m);
  console.log(JSON.stringify({ promoted, skipped, statusDist: dist }, null, 2));
}

main();
