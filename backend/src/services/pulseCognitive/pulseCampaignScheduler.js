/**
 * CERT-PULSE-03 FASE 2 — Scheduler inteligente de pulse_campaigns.
 */
'use strict';

const db = require('../../db');
const pulseService = require('../pulseService');
const pulseObs = require('./pulseCognitiveObservability');
const pulseAudit = require('./pulseCognitiveAudit');

const FREQUENCY_MS = {
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  quarterly: 90 * 24 * 60 * 60 * 1000,
  annual: 365 * 24 * 60 * 60 * 1000
};

function computeNextRun(frequency, fromDate = new Date()) {
  const ms = FREQUENCY_MS[String(frequency || 'monthly').toLowerCase()] || FREQUENCY_MS.monthly;
  return new Date(fromDate.getTime() + ms);
}

async function runDueCampaigns() {
  if (process.env.IMPETUS_PULSE_SCHEDULER === 'off') {
    return { skipped: true, reason: 'scheduler_disabled' };
  }

  const traceId = pulseAudit.newTraceId();
  const started = Date.now();
  let processed = 0;
  let created = 0;
  const errors = [];

  try {
    const due = await db.query(
      `
      SELECT c.*, s.pulse_enabled
      FROM pulse_campaigns c
      INNER JOIN pulse_company_settings s ON s.company_id = c.company_id
      WHERE c.is_active = true
        AND s.pulse_enabled = true
        AND (c.next_run_at IS NULL OR c.next_run_at <= now())
      ORDER BY c.next_run_at ASC NULLS FIRST
      LIMIT 20
    `
    );

    for (const camp of due.rows || []) {
      const companyId = camp.company_id;
      try {
        const openCount = await db.query(
          `SELECT COUNT(*)::int AS c FROM pulse_evaluations WHERE company_id = $1 AND status = 'pending_user'`,
          [companyId]
        );
        if ((openCount.rows[0]?.c || 0) > 500) {
          errors.push({ campaign_id: camp.id, error: 'too_many_pending_evaluations' });
          continue;
        }

        const nextRun = computeNextRun(camp.frequency, new Date());
        const claim = await db.query(
          `
          UPDATE pulse_campaigns SET
            last_run_at = now(),
            next_run_at = $1
          WHERE id = $2 AND company_id = $3 AND is_active = true
            AND (next_run_at IS NULL OR next_run_at <= now())
          RETURNING id
        `,
          [nextRun.toISOString(), camp.id, companyId]
        );
        if (!claim.rows?.length) continue;

        const result = await pulseService.triggerCampaignForUsers(companyId, [], {
          all_eligible: true,
          target_roles: camp.target_roles || undefined
        });

        created += result.created || 0;
        processed++;

        await pulseAudit.logPulseCognitiveAction({
          companyId,
          traceId,
          eventType: 'campaign_scheduled',
          eventSource: 'pulse_scheduler',
          action: 'scheduler_campaign_executed',
          indicesRecalculated: [],
          payload: {
            campaign_id: camp.id,
            title: camp.title,
            created: result.created,
            next_run_at: nextRun.toISOString()
          },
          processingMs: Date.now() - started
        });
      } catch (err) {
        errors.push({ campaign_id: camp.id, error: err?.message || String(err) });
        pulseObs.schedulerFailure();
      }
    }

    if (processed > 0) pulseObs.schedulerRun();

    return {
      ok: true,
      trace_id: traceId,
      campaigns_processed: processed,
      evaluations_created: created,
      errors,
      duration_ms: Date.now() - started
    };
  } catch (err) {
    pulseObs.schedulerFailure();
    return { ok: false, error: err?.message || String(err), trace_id: traceId };
  }
}

module.exports = { runDueCampaigns, computeNextRun, FREQUENCY_MS };
