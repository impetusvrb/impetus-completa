/**
 * Serviço do Formulário TPM - Pró-Ação
 * Gerencia sessões conversacionais e persistência de incidentes
 */
const db = require('../db');

const STEPS = [
  'date', 'time', 'equipment', 'maintainer', 'root_cause', 'frequency',
  'failing_part', 'corrective_action', 'losses_before', 'losses_during', 'losses_after',
  'operator_name', 'observation', 'confirm'
];

function getShiftFromTime(hour, minute = 0) {
  const h = parseInt(hour, 10) || 0;
  const m = parseInt(minute, 10) || 0;
  const total = h * 60 + m;
  if (total >= 6 * 60 && total < 14 * 60) return 1;
  if (total >= 14 * 60 && total < 22 * 60) return 2;
  return 3;
}

async function createSession(companyId, operatorPhone, communicationId = null) {
  const r = await db.query(`
    INSERT INTO tpm_form_sessions (company_id, operator_phone, communication_id, current_step, status)
    VALUES ($1, $2, $3, 'date', 'in_progress')
    RETURNING *
  `, [companyId, operatorPhone, communicationId]);
  return r.rows[0];
}

async function getActiveSession(companyId, operatorPhone) {
  const r = await db.query(`
    SELECT * FROM tpm_form_sessions
    WHERE company_id = $1 AND operator_phone = $2 AND status = 'in_progress'
    ORDER BY updated_at DESC LIMIT 1
  `, [companyId, operatorPhone]);
  return r.rows[0] || null;
}

async function updateStep(sessionId, step, data) {
  const session = await db.query('SELECT collected_data FROM tpm_form_sessions WHERE id = $1', [sessionId]);
  if (session.rows.length === 0) return null;
  const collected = { ...(session.rows[0].collected_data || {}), ...data };
  const r = await db.query(`
    UPDATE tpm_form_sessions
    SET current_step = $1, collected_data = $2, updated_at = now()
    WHERE id = $3
    RETURNING *
  `, [step, collected, sessionId]);
  return r.rows[0];
}

async function saveIncident(session) {
  const d = session.collected_data || {};
  const lossesBefore = parseInt(d.losses_before, 10) || 0;
  const lossesDuring = parseInt(d.losses_during, 10) || 0;
  const lossesAfter = parseInt(d.losses_after, 10) || 0;
  const total = lossesBefore + lossesDuring + lossesAfter;

  let shiftNumber = null;
  if (d.incident_time) {
    const [h, m] = String(d.incident_time).split(/[:\s]/).map(x => parseInt(x, 10) || 0);
    shiftNumber = getShiftFromTime(h, m);
  }

  const incidentDate = d.incident_date || new Date().toISOString().slice(0, 10);

  const r = await db.query(`
    INSERT INTO tpm_incidents (
      company_id, communication_id, operator_phone, incident_date, incident_time,
      equipment_code, component_name, maintainer_name, root_cause, frequency_observation,
      failing_part, corrective_action, losses_before, losses_during, losses_after,
      operator_name, observation, shift_number
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *
  `, [
    session.company_id, session.communication_id, session.operator_phone,
    d.incident_date || null, d.incident_time || null,
    d.equipment_code || null, d.component_name || null,
    d.maintainer_name || null, d.root_cause || null, d.frequency_observation || null,
    d.failing_part || null, d.corrective_action || null,
    lossesBefore, lossesDuring, lossesAfter,
    d.operator_name || null, d.observation || null, shiftNumber
  ]);

  const incident = r.rows[0];

  if (shiftNumber && incidentDate) {
    try {
      await db.query(`
        INSERT INTO tpm_shift_totals (company_id, shift_date, shift_number, total_losses, incident_count)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (company_id, shift_date, shift_number)
        DO UPDATE SET total_losses = tpm_shift_totals.total_losses + EXCLUDED.total_losses,
                      incident_count = tpm_shift_totals.incident_count + 1
      `, [session.company_id, incidentDate, shiftNumber, total]);
    } catch (e) {
      console.warn('[TPM] shift_totals update:', e.message);
    }
  }

  await db.query(`
    UPDATE tpm_form_sessions SET status = 'completed', incident_id = $1, updated_at = now() WHERE id = $2
  `, [incident.id, session.id]);

  return incident;
}

async function listIncidents(companyId, opts = {}) {
  const { from, to, limit = 50 } = opts;
  let sql = 'SELECT * FROM tpm_incidents WHERE company_id = $1';
  const params = [companyId];
  let i = 2;
  if (from) { sql += ` AND incident_date >= $${i}`; params.push(from); i++; }
  if (to) { sql += ` AND incident_date <= $${i}`; params.push(to); i++; }
  sql += ` ORDER BY incident_date DESC, incident_time DESC NULLS LAST LIMIT $${i}`;
  params.push(limit);
  const r = await db.query(sql, params);
  return r.rows;
}

async function getShiftTotals(companyId, from, to) {
  const r = await db.query(`
    SELECT * FROM tpm_shift_totals
    WHERE company_id = $1 AND shift_date >= $2 AND shift_date <= $3
    ORDER BY shift_date DESC, shift_number
  `, [companyId, from || '1900-01-01', to || '2100-12-31']);
  return r.rows;
}

module.exports = {
  STEPS,
  createSession,
  getActiveSession,
  updateStep,
  saveIncident,
  listIncidents,
  getShiftTotals,
  getShiftFromTime
};
