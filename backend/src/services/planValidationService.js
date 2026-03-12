/**
 * Validação de limite de instâncias WhatsApp por plano
 * Regra: custom_whatsapp_limit ou max_whatsapp_instances do plano
 */

const db = require('../db');

class PlanLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PlanLimitError';
    this.statusCode = 403;
  }
}

/**
 * Retorna o limite de instâncias WhatsApp para a empresa
 * Prioridade: custom_whatsapp_limit > plano
 */
async function getLimitForCompany(companyId) {
  const r = await db.query(`
    SELECT c.custom_whatsapp_limit, COALESCE(p1.max_whatsapp_instances, p2.max_whatsapp_instances) as max_whatsapp_instances
    FROM companies c
    LEFT JOIN plans p1 ON c.plan_id = p1.id
    LEFT JOIN plans p2 ON c.plan_type = p2.name AND c.plan_id IS NULL
    WHERE c.id = $1
  `, [companyId]);

  if (r.rows.length === 0) return 1;

  const row = r.rows[0];
  if (row.custom_whatsapp_limit != null) {
    return Math.max(0, parseInt(row.custom_whatsapp_limit, 10) || 0);
  }
  const planLimit = row.max_whatsapp_instances ?? 1;
  return Math.max(1, parseInt(planLimit, 10) || 1);
}

/**
 * Conta instâncias ativas da empresa em whatsapp_instances
 */
async function countInstancesForCompany(companyId) {
  const r = await db.query(
    'SELECT COUNT(*)::int as total FROM whatsapp_instances WHERE company_id = $1',
    [companyId]
  );
  return r.rows[0]?.total ?? 0;
}

/**
 * Valida se a empresa pode criar nova instância
 * @throws {PlanLimitError} HTTP 403 quando limite atingido
 */
async function validateCanCreateInstance(companyId) {
  const limit = await getLimitForCompany(companyId);
  const count = await countInstancesForCompany(companyId);

  if (count >= limit) {
    throw new PlanLimitError('Limite de números atingido para o seu plano.');
  }

  return { limit, count };
}

module.exports = {
  getLimitForCompany,
  countInstancesForCompany,
  validateCanCreateInstance,
  PlanLimitError
};
