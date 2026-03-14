/**
 * IMPETUS - Produção em tempo real
 * KPIs: produção do turno, meta, eficiência, perdas
 * Fontes: MES/ERP (push), PLC (via adapters), registro manual
 */
const db = require('../db');

/**
 * Registra/atualiza produção do turno
 */
async function recordShift(companyId, data) {
  const lineId = data.line_identifier || data.line_id || 'default';
  const lineName = data.line_name || data.line || null;
  const shiftDate = data.shift_date ? new Date(data.shift_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const shiftCode = data.shift_code || data.turno || 'A';
  const produced = parseFloat(data.produced_qty ?? data.produced ?? 0);
  const target = parseFloat(data.target_qty ?? data.target ?? 0);
  const good = parseFloat(data.good_qty ?? data.good ?? produced);
  const scrap = parseFloat(data.scrap_qty ?? data.scrap ?? 0);
  const source = data.source || 'manual';
  const sourceRef = data.source_ref || null;

  await db.query(`
    INSERT INTO production_shift_data (company_id, line_identifier, line_name, shift_date, shift_code, produced_qty, target_qty, good_qty, scrap_qty, efficiency_pct, source, source_ref)
    VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (company_id, line_identifier, shift_date, shift_code) DO UPDATE SET
      produced_qty = EXCLUDED.produced_qty, target_qty = EXCLUDED.target_qty,
      good_qty = EXCLUDED.good_qty, scrap_qty = EXCLUDED.scrap_qty,
      efficiency_pct = CASE WHEN EXCLUDED.target_qty > 0 THEN (EXCLUDED.produced_qty / EXCLUDED.target_qty * 100) ELSE production_shift_data.efficiency_pct END,
      source = EXCLUDED.source, source_ref = EXCLUDED.source_ref, updated_at = now()
  `, [
    companyId, lineId, lineName, shiftDate, shiftCode,
    produced, target, good, scrap,
    target > 0 ? (produced / target * 100) : null,
    source, sourceRef
  ]);

  return { line_identifier: lineId, shift_date: shiftDate, shift_code: shiftCode };
}

/**
 * Busca dados de produção por período
 */
async function getShiftData(companyId, { date, line_identifier } = {}) {
  const shiftDate = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  let where = 'company_id = $1 AND shift_date = $2';
  const params = [companyId, shiftDate];
  if (line_identifier) {
    where += ' AND line_identifier = $3';
    params.push(line_identifier);
  }

  const r = await db.query(`
    SELECT line_identifier, line_name, shift_date, shift_code, produced_qty, target_qty, good_qty, scrap_qty, efficiency_pct, source
    FROM production_shift_data WHERE ${where} ORDER BY line_identifier, shift_code
  `, params);
  return r.rows || [];
}

/**
 * KPIs de produção para dashboard (turno atual, linhas)
 */
async function getShiftKPIs(companyId) {
  const today = new Date().toISOString().slice(0, 10);

  const r = await db.query(`
    SELECT line_identifier, line_name, shift_code, produced_qty, target_qty, efficiency_pct
    FROM production_shift_data
    WHERE company_id = $1 AND shift_date = $2
    ORDER BY line_identifier
  `, [companyId, today]);

  const rows = r.rows || [];
  const totalProduced = rows.reduce((s, x) => s + parseFloat(x.produced_qty || 0), 0);
  const totalTarget = rows.reduce((s, x) => s + parseFloat(x.target_qty || 0), 0);

  return {
    lines: rows,
    total_produced: totalProduced,
    total_target: totalTarget,
    efficiency: totalTarget > 0 ? Math.round((totalProduced / totalTarget) * 100) : null
  };
}

module.exports = {
  recordShift,
  getShiftData,
  getShiftKPIs
};
