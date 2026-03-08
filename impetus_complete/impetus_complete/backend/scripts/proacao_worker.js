#!/usr/bin/env node
/**
 * Worker Pró-Ação - Avalia regras e cria alerts
 * Uso: node -r dotenv/config scripts/proacao_worker.js
 * Cron: a cada hora: 0 * * * * cd /path/backend && node -r dotenv/config scripts/proacao_worker.js
 */
require('dotenv').config();
const db = require('../src/db');

async function runRule(rule) {
  const def = rule.definition || {};
  const type = def.type || 'proposal_pending_days';
  const companyId = rule.company_id;

  if (type === 'proposal_pending_days') {
    const days = def.days ?? 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const params = companyId ? [companyId, cutoff] : [cutoff];
    const sql = companyId
      ? `SELECT id, reporter_name, proposed_solution, created_at FROM proposals 
         WHERE company_id = $1 AND status = 'submitted' AND created_at < $2`
      : `SELECT id, reporter_name, proposed_solution, created_at FROM proposals 
         WHERE status = 'submitted' AND created_at < $1`;
    const r = await db.query(sql, params);
    for (const row of r.rows || []) {
      const title = def.title || `Proposta pendente há mais de ${days} dias`;
      const desc = def.description || `Proposta de ${row.reporter_name || 'N/A'} aguardando avaliação. ID: ${row.id}`;
      await createAlertIfNotExists(companyId, 'proposal_pending', def.severity || 'warning', title, desc, row.id);
    }
  }

  if (type === 'proposals_high_urgency') {
    const r = await db.query(
      companyId
        ? `SELECT id, reporter_name, urgency, proposed_solution FROM proposals 
           WHERE company_id = $1 AND status = 'submitted' AND urgency <= 2`
        : `SELECT id, reporter_name, urgency, proposed_solution FROM proposals 
           WHERE status = 'submitted' AND urgency <= 2`,
      companyId ? [companyId] : []
    );
    for (const row of r.rows || []) {
      const title = def.title || 'Proposta de alta urgência pendente';
      const desc = def.description || `Urgência ${row.urgency}. ${row.reporter_name || ''}: ${(row.proposed_solution || '').slice(0, 100)}`;
      await createAlertIfNotExists(companyId, 'proposal_urgency', def.severity || 'high', title, desc, row.id);
    }
  }

  if (type === 'tpm_shift_high_losses' && companyId) {
    try {
      const minLosses = def.min_losses ?? 50;
      const r = await db.query(
      `SELECT * FROM tpm_shift_totals WHERE company_id = $1 AND total_losses >= $2`,
      [companyId, minLosses]
    );
    for (const row of r.rows || []) {
      const key = `${companyId}-tpm_shift-${row.shift_date}-${row.shift_number}`;
      await createAlertIfNotExists(companyId, 'tpm_shift_high_losses', def.severity || 'warning',
        def.title || `TPM: Perdas altas no turno ${row.shift_number} (${row.shift_date})`,
        `Total: ${row.total_losses} perdas em ${row.incident_count} incidente(s)`, null, { rule_key: key, shift_date: row.shift_date, shift_number: row.shift_number });
    }
    } catch (e) {
      if (!e.message?.includes('does not exist')) throw e;
    }
  }

  if (type === 'tpm_component_repeated' && companyId) {
    try {
      const minCount = def.min_count ?? 3;
      const days = def.days ?? 7;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const r = await db.query(`
      SELECT equipment_code, component_name, COUNT(*) as cnt
      FROM tpm_incidents
      WHERE company_id = $1 AND incident_date >= $2 AND (equipment_code IS NOT NULL OR component_name IS NOT NULL)
      GROUP BY equipment_code, component_name HAVING COUNT(*) >= $3
    `, [companyId, cutoff, minCount]);
    for (const row of r.rows || []) {
      const eq = [row.equipment_code, row.component_name].filter(Boolean).join(' - ') || 'Equipamento';
      const key = `${companyId}-tpm_component-${eq}-${days}d`;
      await createAlertIfNotExists(companyId, 'tpm_component_repeated', def.severity || 'warning',
        def.title || `TPM: ${eq} com ${row.cnt} incidentes em ${days} dias`,
        `Verificar padrão de falhas.`, null, { rule_key: key });
    }
    } catch (e) {
      if (!e.message?.includes('does not exist')) throw e;
    }
  }
}

async function createAlertIfNotExists(companyId, type, severity, title, description, relatedProposal, metadata = null) {
  const key = metadata?.rule_key || `${companyId || 'global'}-${type}-${relatedProposal}`;
  const r = await db.query(
    `SELECT id FROM alerts WHERE metadata->>'rule_key' = $1 AND resolved = false LIMIT 1`,
    [key]
  );
  if (r.rows.length > 0) return;
  await db.query(
    `INSERT INTO alerts (company_id, type, severity, title, description, related_proposal, metadata) 
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [companyId, type, severity, title, description, relatedProposal, JSON.stringify(metadata || { rule_key: key })]
  );
}

async function main() {
  console.log(`[PROACAO_WORKER] Iniciando ${new Date().toISOString()}`);
  try {
    const r = await db.query(
      'SELECT id, company_id, name, definition FROM proacao_rules WHERE enabled = true'
    );
    for (const rule of r.rows || []) {
      try {
        await runRule(rule);
      } catch (err) {
        console.warn(`[PROACAO_WORKER] Regra ${rule.name}:`, err.message);
      }
    }
    console.log(`[PROACAO_WORKER] Concluído. Regras avaliadas: ${r.rows?.length || 0}`);
  } catch (err) {
    console.error('[PROACAO_WORKER]', err);
  }
  process.exit(0);
}

main();
