'use strict';

/**
 * OPS-002 — Configuração piloto WMS-004 (BASELINE-SUPPLY-v2.0).
 * Alteração operacional only — sem código-fonte.
 */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '../../..');

const FE_PILOT_FLAGS = Object.freeze({
  VITE_IMPETUS_LOGISTICS_ENABLED: 'true',
  VITE_IMPETUS_LOGISTICS_MENU: 'true',
  VITE_IMPETUS_LOGISTICS_WORKSPACE: 'true',
  VITE_IMPETUS_LOGISTICS_CC: 'true'
});

/** Backend mirror + API gate (WMS-006 controlled activation pattern) */
const BE_PILOT_FLAGS = Object.freeze({
  IMPETUS_LOGISTICS_ENABLED: 'true',
  IMPETUS_LOGISTICS_MENU: 'true',
  IMPETUS_LOGISTICS_WORKSPACE: 'true',
  IMPETUS_LOGISTICS_CC: 'true',
  IMPETUS_WMS_API_ENABLED: 'true'
});

const MARKER_START = '# ─── OPS-002 — WMS-004 Pilot Rollout (BASELINE-SUPPLY-v2.0) ───';
const MARKER_END = '# ─── END OPS-002 WMS-004 Pilot ───';

function _parseEnv(content) {
  const map = {};
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    map[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return map;
}

function _upsertBlock(filePath, flags, markerStart, markerEnd) {
  const abs = path.join(REPO, filePath);
  let content = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
  const startIdx = content.indexOf(markerStart);
  const endIdx = content.indexOf(markerEnd);

  const blockLines = [markerStart];
  for (const [k, v] of Object.entries(flags)) {
    blockLines.push(`${k}=${v}`);
  }
  blockLines.push(markerEnd);
  const block = `${blockLines.join('\n')}\n`;

  if (startIdx >= 0 && endIdx > startIdx) {
    content = content.slice(0, startIdx) + block + content.slice(endIdx + markerEnd.length);
  } else {
    if (content.length && !content.endsWith('\n')) content += '\n';
    content += `\n${block}`;
  }

  fs.writeFileSync(abs, content, 'utf8');
  return _parseEnv(content);
}

function applyPilotRolloutConfig() {
  const fePath = 'frontend/.env.production';
  const bePath = 'backend/.env';

  const feBefore = fs.existsSync(path.join(REPO, fePath))
    ? _parseEnv(fs.readFileSync(path.join(REPO, fePath), 'utf8'))
    : {};
  const beBefore = fs.existsSync(path.join(REPO, bePath))
    ? _parseEnv(fs.readFileSync(path.join(REPO, bePath), 'utf8'))
    : {};

  const feAfter = _upsertBlock(fePath, FE_PILOT_FLAGS, MARKER_START, MARKER_END);
  const beAfter = _upsertBlock(
    bePath,
    BE_PILOT_FLAGS,
    '# ─── OPS-002 — WMS-004 Pilot Rollout (backend) ───',
    '# ─── END OPS-002 WMS backend ───'
  );

  const inc048 = beAfter.IMPETUS_INC048_ENABLED;
  if (inc048 === 'true' || inc048 === '1') {
    throw new Error('IMPETUS_INC048_ENABLED must remain false for OPS-002');
  }

  const snapshot = {
    applied_at: new Date().toISOString(),
    delivery: 'OPS-002',
    baseline: 'BASELINE-SUPPLY-v2.0',
    frontend_flags: FE_PILOT_FLAGS,
    backend_flags: BE_PILOT_FLAGS,
    inc048_enabled: false,
    fe_before: Object.fromEntries(Object.keys(FE_PILOT_FLAGS).map((k) => [k, feBefore[k] ?? '(absent)'])),
    be_before: {
      inc048: beBefore.IMPETUS_INC048_ENABLED ?? '(absent)',
      wms_api: beBefore.IMPETUS_WMS_API_ENABLED ?? '(absent)'
    }
  };

  const snapPath = path.join(REPO, 'backend/docs/evidence/OPS-002-PILOT-CONFIG-SNAPSHOT.json');
  fs.mkdirSync(path.dirname(snapPath), { recursive: true });
  fs.writeFileSync(snapPath, JSON.stringify(snapshot, null, 2), 'utf8');

  return Object.freeze({ ok: true, snapshot, fe_after: feAfter, be_after: beAfter });
}

function removePilotRolloutConfig() {
  for (const [filePath, start, end] of [
    ['frontend/.env.production', MARKER_START, MARKER_END],
    ['backend/.env', '# ─── OPS-002 — WMS-004 Pilot Rollout (backend) ───', '# ─── END OPS-002 WMS backend ───']
  ]) {
    const abs = path.join(REPO, filePath);
    if (!fs.existsSync(abs)) continue;
    let content = fs.readFileSync(abs, 'utf8');
    const startIdx = content.indexOf(start);
    const endIdx = content.indexOf(end);
    if (startIdx >= 0 && endIdx > startIdx) {
      content = content.slice(0, startIdx) + content.slice(endIdx + end.length);
      fs.writeFileSync(abs, content.replace(/\n{3,}/g, '\n\n'), 'utf8');
    }
  }
  return { ok: true, rolled_back: true };
}

module.exports = {
  FE_PILOT_FLAGS,
  BE_PILOT_FLAGS,
  applyPilotRolloutConfig,
  removePilotRolloutConfig
};

if (require.main === module) {
  const r = applyPilotRolloutConfig();
  console.log('OPS-002 pilot config applied.');
  console.log(JSON.stringify(r.snapshot, null, 2));
}
