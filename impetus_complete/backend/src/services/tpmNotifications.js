/**
 * Notificações TPM - envia incidentes aos gestores (Manutenção, Produção, PCM)
 */
const db = require('../db');
const zapi = require('./zapi');

async function getNotifyRecipients(companyId) {
  try {
    let r = await db.query(`
      SELECT id, name, phone, whatsapp_number, email, role FROM users
      WHERE company_id = $1 AND (active IS NULL OR active = true)
        AND (phone IS NOT NULL OR whatsapp_number IS NOT NULL OR role IN ('admin','manager','gerente'))
      LIMIT 10
    `, [companyId]);
    if (r.rows.length > 0) return r.rows;
    r = await db.query(`
      SELECT id, name, phone, role FROM whatsapp_contacts
      WHERE company_id = $1 AND active = true AND phone IS NOT NULL
      LIMIT 5
    `, [companyId]);
    return r.rows || [];
  } catch {
    return [];
  }
}

function formatIncidentSummary(incident) {
  const d = incident.incident_date || '';
  const t = incident.incident_time || '';
  const eq = incident.equipment_code || incident.component_name || '-';
  const total = (incident.losses_before || 0) + (incident.losses_during || 0) + (incident.losses_after || 0);
  return `
📋 *Incidente TPM registrado*

📅 Data: ${d} ${t}
🔧 Equipamento: ${eq}
👤 Manutentor: ${incident.maintainer_name || '-'}
📌 Causa: ${incident.root_cause || '-'}
📉 Perdas: antes ${incident.losses_before || 0} | durante ${incident.losses_during || 0} | após ${incident.losses_after || 0} | *total ${total}*
✅ Ação: ${(incident.corrective_action || '').slice(0, 100)}
👤 Operador: ${incident.operator_name || '-'}
`.trim();
}

async function notifyTpmIncident(companyId, incident) {
  const recipients = await getNotifyRecipients(companyId);
  const msg = formatIncidentSummary(incident);
  for (const rec of recipients) {
    const phone = String(rec.phone || rec.whatsapp_number || '').replace(/\D/g, '');
    if (phone.length >= 10) {
      try {
        await zapi.sendTextMessage(companyId, phone, msg);
      } catch (err) {
        console.warn('[TPM_NOTIFY] WhatsApp falhou para', rec.name, err.message);
      }
    }
  }
  try {
  await db.query(`
    INSERT INTO alerts (company_id, type, severity, title, description, metadata)
    VALUES ($1, 'tpm_incident', 'info', $2, $3, $4)
    `, [
      companyId,
      `TPM: ${incident.equipment_code || 'Equipamento'} - ${incident.incident_date || ''}`,
      formatIncidentSummary(incident),
      JSON.stringify({ tpm_incident_id: incident.id })
    ]);
  } catch (err) {
    console.warn('[TPM_NOTIFY] Alerta não criado:', err.message);
  }
}

module.exports = { notifyTpmIncident, getNotifyRecipients, formatIncidentSummary };
