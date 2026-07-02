/**
 * CERT-PULSE-05 FASE 4 — Timeline organizacional consolidada (somente leitura).
 * Não executa cálculos novos — agrega fontes existentes.
 */
'use strict';

const db = require('../../../db');
const { buildCognitiveTimeline } = require('../timelineService');

function parseJson(v) {
  if (v == null) return v;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch (_) {
    return v;
  }
}

async function buildConsolidatedOrganizationalTimeline(companyId, opts = {}) {
  const base = await buildCognitiveTimeline(companyId, opts);
  const events = [...(base.events || [])];
  const days = parseInt(opts.days, 10) || 180;
  const limit = Math.min(parseInt(opts.limit, 10) || 120, 250);

  try {
    const org = await db.query(
      `
      SELECT id, user_id, event_type, created_at, payload
      FROM pulse_cognitive_events
      WHERE company_id = $1 AND created_at >= now() - ($2::int || ' days')::interval
        AND event_type IN ('role_changed','sector_changed','hierarchy_changed')
      ORDER BY created_at DESC LIMIT 40
    `,
      [companyId, days]
    );
    for (const row of org.rows || []) {
      events.push({
        kind: 'org_change',
        ts: row.created_at,
        title: `Mudança organizacional: ${row.event_type}`,
        user_id: row.user_id,
        payload: parseJson(row.payload),
        read_only: true
      });
    }
  } catch (_) {}

  try {
    const train = await db.query(
      `
      SELECT id, user_id, event_type, created_at, payload
      FROM pulse_cognitive_events
      WHERE company_id = $1 AND created_at >= now() - ($2::int || ' days')::interval
        AND event_type IN ('training_completed','recognition')
      ORDER BY created_at DESC LIMIT 30
    `,
      [companyId, days]
    );
    for (const row of train.rows || []) {
      events.push({
        kind: row.event_type === 'recognition' ? 'recognition' : 'training',
        ts: row.created_at,
        title: row.event_type === 'recognition' ? 'Reconhecimento registrado' : 'Treinamento concluído',
        user_id: row.user_id,
        read_only: true
      });
    }
  } catch (_) {}

  try {
    const mem = await db.query(
      `
      SELECT id, scope_label, human_validated, recorded_at, outcome_delta_percent, human_actions
      FROM pulse_organizational_memory
      WHERE company_id = $1 AND recorded_at >= now() - ($2::int || ' days')::interval
      ORDER BY recorded_at DESC LIMIT 25
    `,
      [companyId, days]
    );
    for (const row of mem.rows || []) {
      const actions = parseJson(row.human_actions) || [];
      events.push({
        kind: 'organizational_memory',
        ts: row.recorded_at,
        title: row.human_validated
          ? `Decisão humana documentada${row.scope_label ? `: ${row.scope_label}` : ''}`
          : 'Snapshot cognitivo histórico',
        outcome_delta_percent: row.outcome_delta_percent,
        actions_count: actions.length,
        read_only: true
      });
    }
  } catch (_) {}

  try {
    const val = await db.query(
      `
      SELECT v.created_at, v.validation_status, i.title
      FROM pulse_cognitive_insight_validation v
      JOIN pulse_cognitive_insights i ON i.id = v.insight_id
      WHERE v.company_id = $1 AND v.created_at >= now() - ($2::int || ' days')::interval
      ORDER BY v.created_at DESC LIMIT 20
    `,
      [companyId, days]
    );
    for (const row of val.rows || []) {
      events.push({
        kind: 'hitl_validation',
        ts: row.created_at,
        title: `Validação RH: ${row.title} (${row.validation_status})`,
        read_only: true
      });
    }
  } catch (_) {}

  events.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return {
    ok: true,
    framework: 'consolidated_organizational_timeline',
    cert: 'CERT-PULSE-05',
    company_id: companyId,
    events: events.slice(0, limit),
    read_only: true,
    no_new_calculations: true,
    governance: { assistive_only: true, human_in_the_loop: true }
  };
}

module.exports = { buildConsolidatedOrganizationalTimeline };
