        await messagingAdapter.sendMessage(companyId, phone, msg);
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
