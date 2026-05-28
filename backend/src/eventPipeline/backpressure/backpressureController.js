'use strict';

/**
 * Backpressure WAVE 2 — profundidade global de fila + taxa por tenant.
 * Modo observe (default): regista auditoria, não bloqueia.
 */

const { v4: uuidv4 } = require('uuid');
const {
  isIndustrialBackboneActive,
  isBackpressureEnforcedForTenant,
  globalBackpressureQueueCap,
  industrialBackpressureMode
} = require('../industrialFlags');
const { checkTenantThrottle } = require('../throttling/tenantThrottleService');

let _stats = {
  checks: 0,
  blocked_global: 0,
  blocked_tenant: 0,
  observed_over_cap: 0
};

async function _recordAudit(row) {
  if (!isIndustrialBackboneActive()) return;
  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO industrial_event_backpressure_audit
       (id, company_id, event_name, domain, action, reason, queue_depth, publish_rate, metadata)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [
        uuidv4(),
        row.company_id || null,
        row.event_name || null,
        row.domain || null,
        row.action,
        row.reason,
        row.queue_depth || 0,
        row.publish_rate || 0,
        JSON.stringify(row.metadata || {})
      ]
    );
  } catch (_e) {
    /* non-blocking */
  }
}

async function getGlobalQueueDepth() {
  let memory = 0;
  try {
    const outbox = require('../outbox/industrialOutboxService');
    memory = outbox.getOutboxStats().memory_queue_depth || 0;
  } catch (_e) {}

  let dbPending = 0;
  try {
    const db = require('../../db');
    const { isIndustrialOutboxEnabled } = require('../industrialFlags');
    if (isIndustrialOutboxEnabled()) {
      const r = await db.query(
        `SELECT COUNT(*)::int AS c FROM industrial_event_outbox WHERE status = 'pending'`
      );
      dbPending = r.rows[0]?.c || 0;
    }
  } catch (_e) {}

  return memory + dbPending;
}

/**
 * @param {{ company_id: string, event_name?: string, domain?: string }} ctx
 */
async function checkPublishBackpressure(ctx = {}) {
  _stats.checks += 1;
  const depth = await getGlobalQueueDepth();
  const cap = globalBackpressureQueueCap();
  const tenantThrottle = checkTenantThrottle(ctx.company_id, {
    domain: ctx.domain,
    event_name: ctx.event_name
  });

  const overGlobal = depth >= cap;
  const enforced = isBackpressureEnforcedForTenant(ctx.company_id);

  if (overGlobal) {
    _stats.observed_over_cap += 1;
    await _recordAudit({
      company_id: ctx.company_id,
      event_name: ctx.event_name,
      domain: ctx.domain,
      action: enforced ? 'block' : 'observe',
      reason: 'global_queue_cap',
      queue_depth: depth,
      publish_rate: tenantThrottle.count,
      metadata: { cap, mode: industrialBackpressureMode() }
    });
    if (enforced) {
      _stats.blocked_global += 1;
      return {
        allowed: false,
        reason: 'global_backpressure',
        queue_depth: depth,
        cap,
        tenant: tenantThrottle
      };
    }
  }

  if (!tenantThrottle.allowed && enforced) {
    _stats.blocked_tenant += 1;
    await _recordAudit({
      company_id: ctx.company_id,
      event_name: ctx.event_name,
      domain: ctx.domain,
      action: 'block',
      reason: 'tenant_throttle',
      queue_depth: depth,
      publish_rate: tenantThrottle.count,
      metadata: { limit: tenantThrottle.limit }
    });
    return {
      allowed: false,
      reason: 'tenant_throttled',
      queue_depth: depth,
      tenant: tenantThrottle
    };
  }

  if (!tenantThrottle.allowed && !enforced) {
    return {
      allowed: true,
      queue_depth: depth,
      cap,
      tenant: tenantThrottle,
      observe_only: true,
      pilot_throttle_observe: true
    };
  }

  if (enforced && tenantThrottle.would_throttle) {
    _stats.blocked_tenant += 1;
    await _recordAudit({
      company_id: ctx.company_id,
      event_name: ctx.event_name,
      domain: ctx.domain,
      action: 'block',
      reason: 'tenant_rate_enforce',
      queue_depth: depth,
      publish_rate: tenantThrottle.count,
      metadata: { limit: tenantThrottle.limit }
    });
    return {
      allowed: false,
      reason: 'tenant_throttled',
      queue_depth: depth,
      tenant: tenantThrottle
    };
  }

  if (tenantThrottle.would_throttle) {
    await _recordAudit({
      company_id: ctx.company_id,
      event_name: ctx.event_name,
      domain: ctx.domain,
      action: 'observe',
      reason: 'tenant_would_throttle',
      queue_depth: depth,
      publish_rate: tenantThrottle.count,
      metadata: { limit: tenantThrottle.limit }
    });
  }

  return {
    allowed: true,
    queue_depth: depth,
    cap,
    tenant: tenantThrottle,
    observe_only: !enforced
  };
}

function getBackpressureStats() {
  const { isBackpressureEnforced, backbonePilotTenants } = require('../industrialFlags');
  return {
    ..._stats,
    mode: industrialBackpressureMode(),
    enforced: isBackpressureEnforced(),
    pilot_tenants: backbonePilotTenants(),
    queue_cap: globalBackpressureQueueCap()
  };
}

module.exports = {
  checkPublishBackpressure,
  getGlobalQueueDepth,
  getBackpressureStats
};
