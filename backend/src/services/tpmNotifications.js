'use strict';

/**
 * Notificações TPM — incidentes aos gestores (Manutenção, Produção, PCM).
 *
 * Integração defensiva (produção): falhas de BD ou de envio nunca propagam excepção.
 *
 * INSERT em `alerts`: só com TPM_NOTIFICATIONS_PERSIST_ALERT=true (ou 1) após DBA confirmar schema.
 * Checklist (não executado daqui): ver documentação no repositório / runbook DBA.
 */

const db = require('../db');

/** @returns {boolean} */
function shouldPersistAlertRow() {
  const v = String(process.env.TPM_NOTIFICATIONS_PERSIST_ALERT || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * @param {string} companyId
 * @returns {Promise<object[]>}
 */
async function getNotifyRecipients(companyId) {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid) {
    return [];
  }

  try {
    let r;
    try {
      r = await db.query(
        `
      SELECT id, name, phone, whatsapp_number, email, role FROM users
      WHERE company_id = $1 AND (active IS NULL OR active = true)
        AND (phone IS NOT NULL OR whatsapp_number IS NOT NULL OR role IN ('admin','manager','gerente'))
      LIMIT 10
    `,
        [cid]
      );
      if (r.rows && r.rows.length > 0) return r.rows;
    } catch (err) {
      console.warn('[TPM_NOTIFY][RECIPIENTS_USERS]', err && err.message ? err.message : err);
    }

    try {
      r = await db.query(
        `
      SELECT id, name, phone, role FROM whatsapp_contacts
      WHERE company_id = $1 AND active = true AND phone IS NOT NULL
      LIMIT 5
    `,
        [cid]
      );
      if (r.rows && r.rows.length > 0) return r.rows;
    } catch (err) {
      console.warn('[TPM_NOTIFY][RECIPIENTS_WHATSAPP_CONTACTS]', err && err.message ? err.message : err);
    }

    try {
      const configRow = await db.query(
        `
      SELECT config->'whatsapp_contacts' as contacts FROM companies WHERE id = $1
    `,
        [cid]
      );
      const contacts = configRow.rows[0]?.contacts;
      if (Array.isArray(contacts) && contacts.length > 0) {
        return contacts
          .filter((c) => c && (c.phone || '').replace(/\D/g, '').length >= 10)
          .map((c) => ({
            id: c.id,
            name: c.name || 'Contato',
            phone: c.phone,
            whatsapp_number: c.phone
          }))
          .slice(0, 10);
      }
    } catch (err) {
      console.warn('[TPM_NOTIFY][RECIPIENTS_COMPANY_CONFIG]', err && err.message ? err.message : err);
    }
  } catch (err) {
    console.warn('[TPM_NOTIFY][RECIPIENTS_OUTER]', err && err.message ? err.message : err);
  }

  return [];
}

function formatIncidentSummary(incident) {
  const d = incident.incident_date || '';
  const t = incident.incident_time || '';
  const eq = incident.equipment_code || incident.component_name || '-';
  const total =
    (incident.losses_before || 0) + (incident.losses_during || 0) + (incident.losses_after || 0);
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

/**
 * Persiste linha em `alerts` apenas se TPM_NOTIFICATIONS_PERSIST_ALERT estiver activo.
 * Schema esperado (validar com DBA): company_id, type, severity, title, description, metadata
 *
 * @param {string} companyId
 * @param {object} incident
 * @param {string} msg
 */
async function maybePersistAlertRow(companyId, incident, msg) {
  if (!shouldPersistAlertRow()) {
    return;
  }
  try {
    await db.query(
      `
      INSERT INTO alerts (company_id, type, severity, title, description, metadata)
      VALUES ($1, 'tpm_incident', 'info', $2, $3, $4)
    `,
      [
        companyId,
        `TPM: ${incident.equipment_code || 'Equipamento'} - ${incident.incident_date || ''}`,
        msg,
        JSON.stringify({ tpm_incident_id: incident.id })
      ]
    );
  } catch (err) {
    console.warn('[TPM_ALERT_INSERT_FAILED]', err && err.message ? err.message : err);
  }
}

/**
 * @param {string} companyId
 * @param {object} incident
 */
async function notifyTpmIncident(companyId, incident) {
  try {
    if (!incident || typeof incident !== 'object') {
      return;
    }
    const cid = companyId != null ? String(companyId).trim() : '';
    if (!cid) {
      return;
    }

    const recipients = await getNotifyRecipients(cid);
    const msg = formatIncidentSummary(incident);

    let appImpetusService;
    try {
      appImpetusService = require('./appImpetusService');
    } catch (err) {
      console.warn('[TPM_NOTIFY][LOAD_APP_IMPETUS]', err && err.message ? err.message : err);
      await maybePersistAlertRow(cid, incident, msg);
      return;
    }

    for (const rec of recipients) {
      const phone = String(rec.phone || rec.whatsapp_number || '').replace(/\D/g, '');
      if (phone.length >= 10) {
        try {
          await appImpetusService.sendMessage(cid, phone, msg, { originatedFrom: 'tpm' });
        } catch (err) {
          console.warn('[TPM_NOTIFY] Envio falhou para', rec.name, err && err.message ? err.message : err);
        }
      }
    }

    await maybePersistAlertRow(cid, incident, msg);
  } catch (err) {
    console.warn('[TPM_NOTIFY][FATAL]', err && err.message ? err.message : err);
  }
}

module.exports = { notifyTpmIncident, getNotifyRecipients, formatIncidentSummary };
