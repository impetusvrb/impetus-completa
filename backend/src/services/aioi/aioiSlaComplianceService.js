'use strict';

/**
 * AIOI-P3.3 — SLA Compliance Service
 *
 * Observação de conformidade SLA — zero automação, zero execução.
 * Spec: backend/docs/AIOI_SLA_COMPLIANCE_SPECIFICATION.md
 */

const db = require('../../db');
const pilotFlags = require('./aioiPilotFlags');

const LAYER = 'AIOI_SLA_COMPLIANCE';

async function _querySlaCompliance(tenantIds) {
  if (!tenantIds.length) {
    return {
      sla_total: 0,
      sla_on_track: 0,
      sla_at_risk: 0,
      sla_breached: 0,
      priority_distribution: {},
      breach_distribution: {}
    };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);

    const summaryResult = await client.query(
      `SELECT
         COUNT(*) AS sla_total,
         COUNT(*) FILTER (WHERE breach_state = 'on_track' OR breach_state = 'ON_TRACK') AS sla_on_track,
         COUNT(*) FILTER (WHERE breach_state = 'at_risk' OR breach_state = 'AT_RISK') AS sla_at_risk,
         COUNT(*) FILTER (WHERE breach_state = 'breached' OR breach_state = 'BREACHED') AS sla_breached
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])
         AND status NOT IN ('resolved', 'closed', 'rejected')`,
      [tenantIds]
    );

    const priorityResult = await client.query(
      `SELECT priority_band, COUNT(*) AS cnt
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])
         AND status NOT IN ('resolved', 'closed', 'rejected')
       GROUP BY priority_band`,
      [tenantIds]
    );

    const breachResult = await client.query(
      `SELECT breach_state, COUNT(*) AS cnt
       FROM industrial_operational_events
       WHERE company_id = ANY($1::uuid[])
         AND status NOT IN ('resolved', 'closed', 'rejected')
       GROUP BY breach_state`,
      [tenantIds]
    );

    await client.query('COMMIT');

    const summary = summaryResult.rows[0] || {};
    const slaTotal = parseInt(summary.sla_total || '0', 10);
    const slaOnTrack = parseInt(summary.sla_on_track || '0', 10);
    const slaAtRisk = parseInt(summary.sla_at_risk || '0', 10);
    const slaBreached = parseInt(summary.sla_breached || '0', 10);

    const priorityDistribution = {};
    for (const row of priorityResult.rows || []) {
      priorityDistribution[row.priority_band || 'unknown'] = parseInt(row.cnt || '0', 10);
    }

    const breachDistribution = {};
    for (const row of breachResult.rows || []) {
      breachDistribution[row.breach_state || 'unknown'] = parseInt(row.cnt || '0', 10);
    }

    const slaComplianceRate = slaTotal > 0
      ? Math.round((slaOnTrack / slaTotal) * 10000) / 100
      : 100;

    return {
      sla_total:            slaTotal,
      sla_on_track:         slaOnTrack,
      sla_at_risk:          slaAtRisk,
      sla_breached:         slaBreached,
      sla_compliance_rate:  slaComplianceRate,
      priority_distribution: priorityDistribution,
      breach_distribution:  breachDistribution
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${LAYER}] Erro SLA compliance`, { error: err.message });
    return {
      sla_total: 0,
      sla_on_track: 0,
      sla_at_risk: 0,
      sla_breached: 0,
      sla_compliance_rate: 100,
      priority_distribution: {},
      breach_distribution: {}
    };
  } finally {
    client.release();
  }
}

/**
 * Snapshot de conformidade SLA para pilot tenants.
 * @returns {Promise<object>}
 */
async function getSlaComplianceSnapshot() {
  const tenants = pilotFlags.getPilotTenants();
  const compliance = await _querySlaCompliance(tenants);

  return {
    ok: true,
    pilot_tenant_count: tenants.length,
    ...compliance,
    captured_at: new Date().toISOString()
  };
}

/**
 * Conformidade SLA scoped por tenant (RLS via set_config).
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function getSlaComplianceForTenant(companyId) {
  if (!companyId) {
    return { ok: false, error: 'companyId obrigatório' };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_company_id', $1, true)`, [String(companyId)]);
    await client.query(`SELECT set_config('app.bypass_rls', 'false', true)`);

    const result = await client.query(
      `SELECT
         COUNT(*) AS sla_total,
         COUNT(*) FILTER (WHERE breach_state IN ('on_track', 'ON_TRACK')) AS sla_on_track,
         COUNT(*) FILTER (WHERE breach_state IN ('at_risk', 'AT_RISK')) AS sla_at_risk,
         COUNT(*) FILTER (WHERE breach_state IN ('breached', 'BREACHED')) AS sla_breached
       FROM industrial_operational_events
       WHERE company_id = $1::uuid
         AND status NOT IN ('resolved', 'closed', 'rejected')`,
      [companyId]
    );

    await client.query('COMMIT');

    const row = result.rows[0] || {};
    const slaTotal = parseInt(row.sla_total || '0', 10);
    const slaOnTrack = parseInt(row.sla_on_track || '0', 10);

    return {
      ok: true,
      company_id: companyId,
      sla_total:           slaTotal,
      sla_on_track:        slaOnTrack,
      sla_at_risk:         parseInt(row.sla_at_risk || '0', 10),
      sla_breached:        parseInt(row.sla_breached || '0', 10),
      sla_compliance_rate: slaTotal > 0
        ? Math.round((slaOnTrack / slaTotal) * 10000) / 100
        : 100,
      captured_at: new Date().toISOString()
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    return { ok: false, error: err.message };
  } finally {
    client.release();
  }
}

module.exports = {
  getSlaComplianceSnapshot,
  getSlaComplianceForTenant,
  LAYER
};
