/**
 * Snapshot operacional positivo para Impetus Pulse (cruza dados reais com percepção).
 * Foco em acertos e volume — não penaliza com "erros" nas perguntas dinâmicas da IA.
 */
const db = require('../db');

/**
 * @param {string} companyId
 * @param {string} userId
 * @param {number} days
 * @returns {Promise<object>}
 */
async function buildOperationalSnapshot(companyId, userId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const webTag = `web:${userId}`;

  let tpmCount = 0;
  let proposalsCount = 0;
  let intelligentRegCount = 0;

  try {
    const tpm = await db.query(
      `
      SELECT COUNT(*)::int AS c FROM tpm_incidents
      WHERE company_id = $1
        AND incident_date >= $2::date
        AND (
          operator_phone = $3
          OR operator_phone LIKE $4
        )
    `,
      [companyId, since, webTag, `%${userId}%`]
    );
    tpmCount = tpm.rows?.[0]?.c ?? 0;
  } catch (_) {
    tpmCount = 0;
  }

  try {
    const pr = await db.query(
      `
      SELECT COUNT(*)::int AS c FROM proposals
      WHERE company_id = $1
        AND reporter_id = $2
        AND (created_at IS NULL OR created_at >= ($3::date)::timestamptz)
    `,
      [companyId, userId, since]
    );
    proposalsCount = pr.rows?.[0]?.c ?? 0;
  } catch (_) {
    proposalsCount = 0;
  }

  try {
    const ir = await db.query(
      `
      SELECT COUNT(*)::int AS c FROM intelligent_registrations
      WHERE company_id = $1
        AND user_id = $2
        AND created_at >= ($3::date)::timestamptz
    `,
      [companyId, userId, since]
    );
    intelligentRegCount = ir.rows?.[0]?.c ?? 0;
  } catch (_) {
    intelligentRegCount = 0;
  }

  return {
    period_days: days,
    since,
    tpm_incidents_recorded: tpmCount,
    proacao_proposals_submitted: proposalsCount,
    intelligent_registrations: intelligentRegCount,
    hints: {
      agility_signal: tpmCount > 0 ? 'Registros TPM ativos no período.' : null,
      improvement_signal: proposalsCount > 0 ? 'Contribuições no Pró-Ação registradas.' : null,
      digital_signal: intelligentRegCount > 0 ? 'Uso de cadastro inteligente / registros.' : null
    }
  };
}

module.exports = { buildOperationalSnapshot };
