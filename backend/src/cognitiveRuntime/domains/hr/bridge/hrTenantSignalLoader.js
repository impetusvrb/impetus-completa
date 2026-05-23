'use strict';

const db = require('../../../../db');
const hrIntelligence = require('../../../../services/hrIntelligenceService');

async function loadHrTenantSignals(user = {}, ctx = {}) {
  if (ctx.mock_signals) return ctx.mock_signals;

  const companyId = user?.company_id || ctx.tenant_id;
  if (!companyId) return { ok: false, reason: 'missing_company_id', raw: {} };

  try {
    const [indicators, dash, pulseCount, openAlerts, activeUsers] = await Promise.all([
      hrIntelligence.getIndicators(companyId, 30).catch(() => null),
      hrIntelligence.getDashboardForUser(companyId, user).catch(() => null),
      countPulseEvaluations(companyId),
      countOpenHrAlerts(companyId),
      countActiveUsers(companyId)
    ]);

    const ind = indicators || {};
    const absenceIndex = Number(ind.absence_index) || 0;
    const delayIndex = Number(ind.delay_index) || 0;
    const presence = Number(ind.presence_compliance) || 100;
    const fatigue = Number(ind.fatigue_risk_index) || 0;

    return {
      ok: true,
      company_id: companyId,
      loaded_at: new Date().toISOString(),
      operational: {
        absence_index: absenceIndex,
        delay_index: delayIndex,
        presence_compliance: presence,
        fatigue_risk: fatigue,
        pulse_evaluations: pulseCount,
        hr_alerts_open: openAlerts,
        active_headcount: activeUsers,
        turnover_risk_proxy: Math.min(100, Math.round(absenceIndex * 2 + fatigue * 0.5)),
        training_overdue_proxy: openAlerts,
        open_positions_proxy: Math.max(0, Math.round(openAlerts * 0.4)),
        retention_risk_score: Math.min(100, Math.round(100 - presence + absenceIndex))
      },
      raw: {
        indicators: ind,
        dashboard_summary: dash?.summary || {},
        alerts_count: (dash?.alerts || []).length,
        sector_breakdown: deriveSectorBreakdown(dash?.records || [])
      },
      data_sources: ['hr_intelligence_service', 'pulse_evaluations', 'hr_alerts', 'time_clock_records']
    };
  } catch (err) {
    return {
      ok: false,
      reason: err?.message || 'hr_signal_load_error',
      operational: {},
      raw: {}
    };
  }
}

async function countPulseEvaluations(companyId) {
  try {
    const r = await db.query(`SELECT COUNT(*)::int AS c FROM pulse_evaluations WHERE company_id = $1`, [companyId]);
    return parseInt(r.rows[0]?.c || 0, 10);
  } catch (_) {
    return 0;
  }
}

async function countOpenHrAlerts(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM hr_alerts WHERE company_id = $1 AND COALESCE(acknowledged, false) = false`,
      [companyId]
    );
    return parseInt(r.rows[0]?.c || 0, 10);
  } catch (_) {
    return 0;
  }
}

async function countActiveUsers(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM users WHERE company_id = $1 AND COALESCE(active, true) = true`,
      [companyId]
    );
    return parseInt(r.rows[0]?.c || 0, 10);
  } catch (_) {
    return 0;
  }
}

function deriveSectorBreakdown(records = []) {
  const map = {};
  for (const r of records) {
    const dept = r.department || r.user_name || 'geral';
    map[dept] = (map[dept] || 0) + 1;
  }
  return Object.entries(map)
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

module.exports = { loadHrTenantSignals };
