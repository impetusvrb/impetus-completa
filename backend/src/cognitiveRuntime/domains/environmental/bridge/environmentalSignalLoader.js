'use strict';

const db = require('../../../../db');
const { runEnvironmentGovernancePack } = require('../../../../domains/environment/governance/environmentGovernanceOrchestrator');
const { aggregateEnvironmentalTelemetry } = require('../telemetry/sustainabilitySignalAggregator');

async function loadEnvironmentalTenantSignals(user = {}, ctx = {}) {
  if (ctx.mock_signals) return ctx.mock_signals;

  const companyId = user?.company_id || ctx.tenant_id;
  if (!companyId) {
    return { ok: false, reason: 'missing_company_id', telemetry_readiness: 'unavailable', raw: {} };
  }

  try {
    const [licenses, incidents, proposalsEnv] = await Promise.all([
      loadLicensesProxy(companyId),
      countEnvironmentalIncidents(companyId),
      countEnvironmentalProposals(companyId)
    ]);

    const govInput = {
      licenses,
      obligations: licenses.filter((l) => l.days_to_expire != null && l.days_to_expire <= 30).map((l) => ({
        id: l.id,
        status: 'due_soon',
        title: l.name
      })),
      audits: [],
      findings: [],
      waste_tonnes: proposalsEnv.waste_proxy,
      water_m3: null,
      energy_kwh: null,
      esg_score: proposalsEnv.esg_proxy,
      emissions_tco2e: proposalsEnv.emissions_proxy
    };

    const gov = runEnvironmentGovernancePack({ body: govInput });
    const telemetry = await aggregateEnvironmentalTelemetry(companyId, govInput);

    const compliance = gov.compliance?.licensing || {};
    const esg = gov.esg || {};
    const carbon = gov.carbon || {};
    const readiness =
      licenses.length > 0 || proposalsEnv.has_data
        ? telemetry.stale_telemetry
          ? 'degraded'
          : 'ready'
        : 'empty';

    return {
      ok: true,
      company_id: companyId,
      loaded_at: new Date().toISOString(),
      telemetry_readiness: readiness,
      signal_degradation: telemetry.stale_telemetry ? 'stale_environmental' : readiness === 'empty' ? 'no_feed' : 'none',
      operational: {
        emissions_tco2e: carbon.inventory?.total_tco2e ?? proposalsEnv.emissions_proxy ?? null,
        waste_tonnes: gov.sustainability?.waste_footprint?.tonnes ?? proposalsEnv.waste_proxy ?? 0,
        esg_score: esg.esg_score ?? proposalsEnv.esg_proxy ?? null,
        licenses_total: compliance.total ?? licenses.length,
        licenses_expiring: compliance.expiring_count ?? 0,
        regulatory_alerts: gov.compliance?.alerts?.alert_count ?? 0,
        audit_open: gov.compliance?.audit?.audits_open ?? 0,
        incidents_open: incidents,
        compliance_risk_score: Math.min(100, (compliance.expiring_count ?? 0) * 15 + incidents * 10),
        sustainability_maturity: gov.sustainability?.maturity?.maturity_score ?? null,
        water_proxy: gov.energy?.water_m3 ?? null,
        energy_proxy: gov.energy?.energy_kwh ?? null
      },
      governance_pack: gov,
      telemetry,
      raw: { licenses, incidents, proposalsEnv }
    };
  } catch (err) {
    return {
      ok: false,
      reason: 'signal_load_error',
      telemetry_readiness: 'error',
      error_message: err.message,
      operational: {},
      raw: {}
    };
  }
}

async function loadLicensesProxy(companyId) {
  try {
    const r = await db.query(
      `SELECT id, name, expires_at,
        EXTRACT(DAY FROM (expires_at::timestamp - now()))::int AS days_to_expire
       FROM environmental_licenses WHERE company_id = $1 AND active = true
       ORDER BY expires_at ASC LIMIT 50`,
      [companyId]
    );
    return (r.rows || []).map((row) => ({
      id: row.id,
      name: row.name || 'licença',
      days_to_expire: row.days_to_expire
    }));
  } catch (_) {
    return [];
  }
}

async function countEnvironmentalIncidents(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM proposals
       WHERE company_id = $1 AND status IN ('open','pending','in_review')
       AND (category ILIKE '%ambient%' OR title ILIKE '%ambient%' OR description ILIKE '%ambient%')`,
      [companyId]
    );
    return r.rows[0]?.c || 0;
  } catch (_) {
    return 0;
  }
}

async function countEnvironmentalProposals(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS total FROM proposals WHERE company_id = $1`,
      [companyId]
    );
    const total = r.rows[0]?.total || 0;
    return {
      has_data: total > 0,
      waste_proxy: total > 0 ? Math.min(50, total * 0.5) : 0,
      emissions_proxy: total > 0 ? Math.min(500, total * 2) : null,
      esg_proxy: total > 5 ? 72 : total > 0 ? 65 : null
    };
  } catch (_) {
    return { has_data: false, waste_proxy: 0, emissions_proxy: null, esg_proxy: null };
  }
}

module.exports = { loadEnvironmentalTenantSignals };
