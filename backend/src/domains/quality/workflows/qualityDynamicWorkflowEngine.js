'use strict';

const db = require('../../../db');
const { pool } = db;
const { v4: uuidv4 } = require('uuid');
const flags = require('../runtime/qualityModuleFlags');
const { publishQualityIndustrialEvent } = require('../events/qualityEventPublisher');
const { appendQualityAuditEntry } = require('../audit/qualityImmutableAuditService');
const obsFlags = require('../../../observability/observabilityFlags');

function _safeObsRecord(name, value, labels) {
  try {
    const obs = require('../../../services/operational/enterpriseObservabilityRuntime');
    obs.recordMetric(name, value, labels);
  } catch (_e) {}
}

function _trace(name, attrs, fn) {
  let trace = null;
  try {
    const obs = require('../../../services/operational/enterpriseObservabilityRuntime');
    if (obsFlags.isWorkflowObservabilityEnabled() || obsFlags.isWorkflowTracingEnabled()) {
      trace = obs.startTrace(name, attrs);
    }
  } catch (_e) {}
  const done = (status) => {
    if (trace?.traceId) {
      try {
        const obs = require('../../../services/operational/enterpriseObservabilityRuntime');
        obs.endTrace(trace.traceId, status);
      } catch (_e) {}
    }
  };
  return { trace, done };
}

async function resolveWorkflowDefinition(companyId, workflowKey) {
  const cid = String(companyId);
  const r = await db.query(
    `SELECT id, definition FROM impetus_quality_workflow_definition
     WHERE active = true AND workflow_key = $1 AND (company_id IS NULL OR company_id = $2)
     ORDER BY company_id NULLS LAST
     LIMIT 1`,
    [workflowKey, cid]
  );
  if (!r.rows[0]) return null;
  return { id: r.rows[0].id, definition: r.rows[0].definition };
}

async function createWorkflowInstance(companyId, workflowKey, ctx = {}) {
  const def = await resolveWorkflowDefinition(companyId, workflowKey);
  if (!def) throw new Error('createWorkflowInstance: definição não encontrada');

  const correlationId = ctx.correlation_id || uuidv4();
  const idem = ctx.idempotency_key || `wf:${workflowKey}:${correlationId}`;
  const initial = def.definition.initial_state || 'initial';
  const id = uuidv4();

  const ins = await db.query(
    `INSERT INTO impetus_quality_workflow_instance
      (id, company_id, workflow_def_id, current_state, context, correlation_id, trace_id, idempotency_key)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)
     ON CONFLICT (company_id, idempotency_key) DO UPDATE SET updated_at = now()
     RETURNING *`,
    [
      id,
      companyId,
      def.id,
      initial,
      JSON.stringify(ctx.context || {}),
      correlationId,
      ctx.trace_id || correlationId,
      idem
    ]
  );

  return { instance: ins.rows[0], definition: def };
}

async function transitionWorkflowInstance(companyId, instanceId, action, ctx = {}) {
  const { trace, done } = _trace(
    'quality.workflow.transition',
    { company_id: companyId, instance_id: instanceId, action },
    null
  );

  const client = await pool.connect();
  let inst;
  let current;
  let next;
  let eventName;

  try {
    await client.query('BEGIN');
    const instRes = await client.query(
      'SELECT * FROM impetus_quality_workflow_instance WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [instanceId, companyId]
    );
    inst = instRes.rows[0];
    if (!inst) {
      await client.query('ROLLBACK');
      done('error');
      throw new Error('transitionWorkflowInstance: instância inexistente');
    }

    const defRes = await client.query(
      'SELECT definition FROM impetus_quality_workflow_definition WHERE id = $1',
      [inst.workflow_def_id]
    );
    const def = defRes.rows[0]?.definition || {};
    const states = def.states || {};
    current = inst.current_state;
    next = states[current]?.transitions?.[action];
    if (!next) {
      await client.query('ROLLBACK');
      done('error');
      throw new Error(`transitionWorkflowInstance: transição inválida (${current} / ${action})`);
    }

    const eventMap = def.events || {};
    eventName = eventMap[action];

    await client.query(
      `UPDATE impetus_quality_workflow_instance
       SET current_state = $1, context = context || $2::jsonb, updated_at = now()
       WHERE id = $3 AND company_id = $4`,
      [next, JSON.stringify(ctx.patch || {}), instanceId, companyId]
    );

    await client.query('COMMIT');
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (_r) {
      /* ignore */
    }
    done('error');
    throw e;
  } finally {
    client.release();
  }

  const shadow = flags.isQualityUniversalShadowMode();

  try {
    await appendQualityAuditEntry(companyId, {
      event_type: 'quality.workflow.transition',
      correlation_id: inst.correlation_id,
      workflow_id: String(instanceId),
      origin_layer: ctx.origin_layer || 'operational',
      payload: {
        from: current,
        action,
        to: next,
        shadow_mode: shadow
      }
    });

    _safeObsRecord('impetus_quality_workflow_transition_total', 1, {
      tenant: companyId,
      action
    });

    if (eventName) {
      await publishQualityIndustrialEvent(
        {
          event_name: eventName,
          company_id: companyId,
          correlation_id: inst.correlation_id,
          causation_id: ctx.causation_id || instanceId,
          trace_id: inst.trace_id || inst.correlation_id,
          workflow_id: String(instanceId),
          idempotency_key: `quality_wf:${instanceId}:${current}:${action}:${next}`,
          payload: {
            shadow_mode: shadow,
            previous_state: current,
            new_state: next,
            action,
            context: ctx.payload || {}
          }
        },
        {
          origin_layer: ctx.origin_layer || 'operational',
          intended_audience: ctx.intended_audience || 'supervisor',
          user_id: ctx.user_id
        }
      );
    }

    done('ok');
    return { ok: true, state: next, event_emitted: eventName || null, shadow };
  } catch (e) {
    done('error');
    throw e;
  }
}

module.exports = {
  resolveWorkflowDefinition,
  createWorkflowInstance,
  transitionWorkflowInstance
};
