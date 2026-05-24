'use strict';

const crypto = require('crypto');

function _id(prefix) {
  return `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
}

function generateSyntheticOperationalEvents(user = {}, payload = {}, opts = {}) {
  const count = Math.min(opts.count || 12, 24);
  const base = Date.now();
  const companyId = user?.company_id;
  const events = [];
  const types = [
    { type: 'nc_opened', domain: 'quality', ctx: 'NC aberta — desvio processo inspeção', conf: 0.88 },
    { type: 'capa_assigned', domain: 'quality', ctx: 'CAPA atribuída — causa raiz em análise', conf: 0.85 },
    { type: 'supervision_delay', domain: 'quality', ctx: 'Atraso supervisão lote — fila inspeção', conf: 0.8 },
    { type: 'maintenance_work_order', domain: 'maintenance', ctx: 'Ordem manutenção preventiva programada', conf: 0.82 },
    { type: 'production_downtime', domain: 'production', ctx: 'Paragem linha — correlacionar qualidade', conf: 0.79 },
    { type: 'shift_handover', domain: 'production', ctx: 'Passagem turno — backlog comunicado', conf: 0.76 },
    { type: 'risk_elevated', domain: 'quality', ctx: 'Risco elevado — recorrência desvio', conf: 0.84 },
    { type: 'inspection_queue', domain: 'quality', ctx: 'Fila inspeção — densidade operacional', conf: 0.77 }
  ];

  for (let i = 0; i < count; i++) {
    const t = types[i % types.length];
    const created = new Date(base - i * 3600000).toISOString();
    const prevId = events.length ? events[events.length - 1].event_id : null;
    events.push({
      event_id: _id('syn'),
      domain: t.domain,
      source_runtime: 'synthetic_operational',
      event_type: t.type,
      operational_context: t.ctx,
      causal_chain: [
        { step: 'synthetic_seed', source: 'event_density_engine', at: created },
        ...(prevId ? [{ step: 'follows', related_event_id: prevId, at: created }] : [])
      ],
      related_events: prevId ? [prevId] : [],
      confidence_score: t.conf,
      historical_similarity: i > 2 ? 0.65 : null,
      recurrence_detected: i >= 4 && t.type === 'nc_opened',
      verification_state: 'synthetic',
      created_at: created,
      company_id: companyId
    });
  }

  return {
    events,
    synthetic_count: events.length,
    coherent_timeline: true,
    intersectorial: true
  };
}

module.exports = { generateSyntheticOperationalEvents };
