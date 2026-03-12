<<<<<<< HEAD
        await messagingAdapter.sendMessage(companyId, phone, msg);
=======
/**
 * Notificações TPM - envia incidentes aos gestores (Manutenção, Produção, PCM)
 */
const db = require('../db');

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
    if (r.rows.length > 0) return r.rows;

    // Fallback: contatos em Configurações (config.whatsapp_contacts)
    const configRow = await db.query(`
      SELECT config->'whatsapp_contacts' as contacts FROM companies WHERE id = $1
    `, [companyId]);
    const contacts = configRow.rows[0]?.contacts;
    if (Array.isArray(contacts) && contacts.length > 0) {
      return contacts
        .filter(c => c && (c.phone || '').replace(/\D/g, '').length >= 10)
        .map(c => ({ id: c.id, name: c.name || 'Contato', phone: c.phone, whatsapp_number: c.phone }))
        .slice(0, 10);
    }

    return [];
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
        await require('./appImpetusService').sendMessage(companyId, phone, msg, { originatedFrom: 'tpm' });
>>>>>>> bf61ff5e943abb5f09916447f9bfbb52acf338de
      } catch (err) {
        console.warn('[TPM_NOTIFY] Envio falhou para', rec.name, err.message);
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
