/**
 * CERT-PULSE-02 FASE 5 — Índices agregados (equipe, setor, turno, supervisor, departamento, empresa).
 */
'use strict';

const db = require('../../db');
const { detectScopePatterns } = require('./patternDetection');
const { buildStateRecord } = require('./stateEngine');

async function loadMemberIndices(companyId) {
  try {
    const r = await db.query(
      `
      SELECT pci.*, u.department, u.department_id, u.supervisor_id,
        u.pulse_shift_code, u.pulse_team_label, u.name AS user_name
      FROM pulse_cognitive_index pci
      LEFT JOIN users u ON u.id = pci.user_id
      WHERE pci.company_id = $1
    `,
      [companyId]
    );
    return r.rows || [];
  } catch (_) {
    return [];
  }
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const k = keyFn(row);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

function rowToMemberShape(row) {
  let patterns = [];
  try {
    patterns = Array.isArray(row.correlations)
      ? row.correlations.filter((c) => c._pattern).map((c) => c._pattern)
      : [];
  } catch (_) {
    patterns = [];
  }
  const dims =
    typeof row.dimensions === 'string' ? JSON.parse(row.dimensions) : row.dimensions || {};
  return {
    pulse_index: parseFloat(row.pulse_index),
    dimensions: dims,
    patterns
  };
}

async function upsertAggregate(companyId, scopeType, scopeKey, scopeLabel, pack) {
  try {
    await db.query(
      `
      INSERT INTO pulse_cognitive_aggregate_index (
        company_id, scope_type, scope_key, scope_label, pulse_index, member_count,
        dimensions, organizational_state, patterns, confidence, computed_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
      ON CONFLICT (company_id, scope_type, scope_key) DO UPDATE SET
        scope_label = EXCLUDED.scope_label,
        pulse_index = EXCLUDED.pulse_index,
        member_count = EXCLUDED.member_count,
        dimensions = EXCLUDED.dimensions,
        organizational_state = EXCLUDED.organizational_state,
        patterns = EXCLUDED.patterns,
        confidence = EXCLUDED.confidence,
        computed_at = now(),
        updated_at = now()
    `,
      [
        companyId,
        scopeType,
        scopeKey,
        scopeLabel,
        pack.pulse_index,
        pack.member_count || 0,
        JSON.stringify(pack.dimensions || {}),
        pack.organizational_state,
        JSON.stringify(pack.patterns || []),
        pack.confidence || 0.5
      ]
    );

    const stateRec = buildStateRecord(
      companyId,
      scopeType,
      scopeKey,
      scopeLabel,
      { pulse_index: pack.pulse_index, dimensions: pack.dimensions, confidence: pack.confidence },
      { patterns: pack.patterns }
    );
    await db.query(
      `
      INSERT INTO pulse_cognitive_state (
        company_id, scope_type, scope_key, scope_label, state_code, state_label,
        inference, confidence, evidence, inferred_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
      ON CONFLICT (company_id, scope_type, scope_key) DO UPDATE SET
        scope_label = EXCLUDED.scope_label,
        state_code = EXCLUDED.state_code,
        state_label = EXCLUDED.state_label,
        inference = EXCLUDED.inference,
        confidence = EXCLUDED.confidence,
        evidence = EXCLUDED.evidence,
        updated_at = now()
    `,
      [
        companyId,
        scopeType,
        scopeKey,
        scopeLabel,
        stateRec.state_code,
        stateRec.state_label,
        JSON.stringify(stateRec.inference),
        stateRec.confidence,
        JSON.stringify(stateRec.evidence)
      ]
    );
  } catch (err) {
    console.warn('[pulseCognitive][aggregate]', err?.message || err);
  }
}

/**
 * Recalcula todos os índices agregados da empresa.
 */
async function recomputeAggregates(companyId) {
  const rows = await loadMemberIndices(companyId);
  if (!rows.length) return { updated: 0 };

  const scopes = [
    { type: 'department', fn: (r) => (r.department ? `dept:${r.department}` : null), label: (r) => r.department },
    { type: 'shift', fn: (r) => (r.pulse_shift_code ? `shift:${r.pulse_shift_code}` : null), label: (r) => r.pulse_shift_code },
    { type: 'team', fn: (r) => (r.pulse_team_label ? `team:${r.pulse_team_label}` : null), label: (r) => r.pulse_team_label },
    {
      type: 'supervisor',
      fn: (r) => (r.supervisor_id ? `sup:${r.supervisor_id}` : null),
      label: (r) => `Supervisor ${String(r.supervisor_id).slice(0, 8)}`
    }
  ];

  let updated = 0;

  const allMembers = rows.map(rowToMemberShape);
  const companyPack = detectScopePatterns(allMembers, 'Empresa');
  companyPack.member_count = rows.length;
  await upsertAggregate(companyId, 'company', 'all', 'Empresa', companyPack);
  updated++;

  for (const scope of scopes) {
    const groups = groupBy(rows, scope.fn);
    for (const [key, groupRows] of groups) {
      const members = groupRows.map(rowToMemberShape);
      const label = scope.label(groupRows[0]) || key;
      const pack = detectScopePatterns(members, label);
      pack.member_count = groupRows.length;
      await upsertAggregate(companyId, scope.type, key, label, pack);
      updated++;
    }
  }

  return { updated };
}

module.exports = { recomputeAggregates, loadMemberIndices };
