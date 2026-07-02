/**
 * CERT-PULSE-03 FASE 7 — Timeline cognitiva organizacional unificada.
 */
'use strict';

const db = require('../../db');

function parseJson(v) {
  if (v == null) return v;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch (_) {
    return v;
  }
}

async function buildCognitiveTimeline(companyId, opts = {}) {
  const limit = Math.min(parseInt(opts.limit, 10) || 80, 200);
  const days = parseInt(opts.days, 10) || 90;
  const events = [];

  try {
    const ev = await db.query(
      `
      SELECT id, event_type, event_source, user_id, created_at, payload
      FROM pulse_cognitive_events
      WHERE company_id = $1 AND created_at >= now() - ($2::int || ' days')::interval
      ORDER BY created_at DESC LIMIT $3
    `,
      [companyId, days, limit]
    );
    for (const row of ev.rows || []) {
      events.push({
        kind: 'human_event',
        ts: row.created_at,
        title: row.event_type,
        source: row.event_source,
        user_id: row.user_id,
        payload: parseJson(row.payload)
      });
    }
  } catch (_) {}

  try {
    const pe = await db.query(
      `
      SELECT id, user_id, status, self_completed_at, supervisor_completed_at, campaign_id
      FROM pulse_evaluations
      WHERE company_id = $1 AND created_at >= now() - ($2::int || ' days')::interval
      ORDER BY created_at DESC LIMIT 30
    `,
      [companyId, days]
    );
    for (const row of pe.rows || []) {
      if (row.self_completed_at) {
        events.push({
          kind: 'pulse_campaign',
          ts: row.self_completed_at,
          title: 'Autoavaliação Pulse concluída',
          status: row.status,
          evaluation_id: row.id
        });
      }
      if (row.supervisor_completed_at) {
        events.push({
          kind: 'pulse_supervisor',
          ts: row.supervisor_completed_at,
          title: 'Percepção do líder registrada',
          evaluation_id: row.id
        });
      }
    }
  } catch (_) {}

  try {
    const camp = await db.query(
      `
      SELECT id, title, last_run_at, next_run_at, frequency
      FROM pulse_campaigns
      WHERE company_id = $1 AND last_run_at IS NOT NULL
      ORDER BY last_run_at DESC LIMIT 15
    `,
      [companyId]
    );
    for (const row of camp.rows || []) {
      events.push({
        kind: 'scheduler',
        ts: row.last_run_at,
        title: `Campanha executada: ${row.title || 'Pulse'}`,
        frequency: row.frequency,
        next_run_at: row.next_run_at
      });
    }
  } catch (_) {}

  try {
    const hist = await db.query(
      `
      SELECT recorded_at, pulse_index, organizational_state, user_id
      FROM pulse_cognitive_index_history
      WHERE company_id = $1 AND recorded_at >= now() - ($2::int || ' days')::interval
      ORDER BY recorded_at DESC LIMIT 40
    `,
      [companyId, days]
    );
    for (const row of hist.rows || []) {
      events.push({
        kind: 'pulse_index',
        ts: row.recorded_at,
        title: `Pulse Index atualizado: ${row.pulse_index}`,
        state: row.organizational_state,
        user_id: row.user_id
      });
    }
  } catch (_) {}

  events.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return {
    ok: true,
    company_id: companyId,
    events: events.slice(0, limit),
    governance: { assistive_only: true, human_in_the_loop: true }
  };
}

module.exports = { buildCognitiveTimeline };
