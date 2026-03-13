/**
 * IMPETUS - Protocolo IA de Controle e Segurança de Máquinas
 * Prioridade: 1) Segurança humana 2) Integridade do equipamento 3) Continuidade 4) Automação
 *
 * - Registro de intervenção humana → bloqueia automação imediatamente
 * - Liberação do equipamento → automação volta a operar
 * - Instruções de segurança para técnicos
 */
const db = require('../db');

/** Passos de segurança obrigatórios antes da manutenção (NR-12 / procedimentos industriais) */
const SAFETY_INSTRUCTIONS = [
  { step: 1, title: 'Desligar o equipamento', desc: 'Interromper o ciclo operacional e parar a máquina de forma segura.' },
  { step: 2, title: 'Desligar a chave geral de energia', desc: 'Cortar a alimentação elétrica na chave principal.' },
  { step: 3, title: 'Isolar a fonte de alimentação', desc: 'Usar bloqueio e etiquetagem (LOTOTO) para garantir que ninguém religue.' },
  { step: 4, title: 'Confirmar ausência de pressão ou energia', desc: 'Verificar que não há energia residual (elétrica, hidráulica, pneumática).' },
  { step: 5, title: 'Sinalizar que a máquina está em manutenção', desc: 'Colocar placa ou aviso visível: "EM MANUTENÇÃO - NÃO LIGAR".' }
];

/**
 * Verifica se o equipamento está sob intervenção humana ativa
 * @returns {Promise<boolean>}
 */
async function isEquipmentUnderIntervention(companyId, machineIdentifier) {
  try {
    const r = await db.query(`
      SELECT id FROM machine_human_interventions
      WHERE company_id = $1 AND machine_identifier = $2 AND status = 'active'
      LIMIT 1
    `, [companyId, machineIdentifier]);
    return (r.rows?.length || 0) > 0;
  } catch (err) {
    if (!err.message?.includes('does not exist')) console.warn('[MACHINE_SAFETY] isEquipmentUnderIntervention:', err?.message);
    /* FAIL-SAFE: em dúvida, considerar equipamento em intervenção → bloqueia automação */
    return true;
  }
}

/**
 * Registra intervenção humana: técnico vai realizar manutenção
 * A partir deste momento: automação da IA é bloqueada naquele equipamento
 */
async function registerIntervention(companyId, machineIdentifier, machineName, userId, userName, interventionType = 'manutencao') {
  const validTypes = ['manutencao', 'manutencao_mecanica', 'manutencao_eletrica', 'calibracao', 'inspecao', 'ajuste', 'outro'];
  const type = validTypes.includes(interventionType) ? interventionType : 'manutencao';

  const r = await db.query(`
    INSERT INTO machine_human_interventions
      (company_id, machine_identifier, machine_name, registered_by, technician_name, intervention_type, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'active')
    RETURNING id, machine_identifier, machine_name, technician_name, intervention_type, registered_at, status
  `, [companyId, machineIdentifier, machineName || machineIdentifier, userId, userName || null, type]);

  return r.rows?.[0];
}

/**
 * Confirma que os passos de segurança foram seguidos
 */
async function confirmSafetySteps(companyId, interventionId, userId) {
  await db.query(`
    UPDATE machine_human_interventions SET
      safety_steps_confirmed = true,
      safety_confirmed_at = now(),
      updated_at = now()
    WHERE id = $1 AND company_id = $2 AND status = 'active'
  `, [interventionId, companyId]);
  return { ok: true };
}

/**
 * Libera o equipamento após conclusão da manutenção
 * A automação da IA volta a operar normalmente
 */
async function releaseEquipment(companyId, machineIdentifier, userId, userName) {
  const r = await db.query(`
    UPDATE machine_human_interventions SET
      status = 'released',
      released_at = now(),
      released_by = $3,
      updated_at = now()
    WHERE company_id = $1 AND machine_identifier = $2 AND status = 'active'
    RETURNING id, machine_identifier, machine_name, technician_name, released_at
  `, [companyId, machineIdentifier, userId]);

  return r.rows?.[0];
}

/**
 * Registra quando a automação foi bloqueada por intervenção humana
 */
async function logAutomationBlocked(companyId, machineIdentifier, machineName, interventionId, responsibleName, context = {}) {
  try {
    await db.query(`
      INSERT INTO machine_automation_block_log
        (company_id, machine_identifier, machine_name, intervention_id, responsible_name, reason, command_type, command_value, context, triggered_by)
      VALUES ($1, $2, $3, $4, $5, 'intervencao_humana', $6, $7, $8, $9)
    `, [
      companyId, machineIdentifier, machineName || machineIdentifier,
      interventionId, responsibleName,
      context.command_type || null, context.command_value || null,
      JSON.stringify(context), context.triggered_by || 'automation'
    ]);
  } catch (err) {
    if (!err.message?.includes('does not exist')) console.warn('[MACHINE_SAFETY] logAutomationBlocked:', err?.message);
  }
}

/**
 * Lista intervenções ativas (equipamentos bloqueados para automação)
 */
async function listActiveInterventions(companyId) {
  try {
    const r = await db.query(`
      SELECT mhi.id, mhi.machine_identifier, mhi.machine_name, mhi.technician_name, mhi.intervention_type,
             mhi.registered_at, mhi.safety_steps_confirmed, mhi.safety_confirmed_at,
             u.name as registered_by_name
      FROM machine_human_interventions mhi
      LEFT JOIN users u ON u.id = mhi.registered_by
      WHERE mhi.company_id = $1 AND mhi.status = 'active'
      ORDER BY mhi.registered_at DESC
    `, [companyId]);
    return r.rows || [];
  } catch (err) {
    if (!err.message?.includes('does not exist')) console.warn('[MACHINE_SAFETY] listActiveInterventions:', err?.message);
    return [];
  }
}

/**
 * Histórico de intervenções (últimas 50)
 */
async function listInterventionHistory(companyId, machineIdentifier = null, limit = 50) {
  try {
    let sql = `
      SELECT mhi.id, mhi.machine_identifier, mhi.machine_name, mhi.technician_name, mhi.intervention_type,
             mhi.status, mhi.registered_at, mhi.released_at, mhi.safety_steps_confirmed,
             u1.name as registered_by_name, u2.name as released_by_name
      FROM machine_human_interventions mhi
      LEFT JOIN users u1 ON u1.id = mhi.registered_by
      LEFT JOIN users u2 ON u2.id = mhi.released_by
      WHERE mhi.company_id = $1
    `;
    const params = [companyId];
    if (machineIdentifier) {
      params.push(machineIdentifier);
      sql += ` AND mhi.machine_identifier = $${params.length}`;
    }
    params.push(Math.min(100, limit || 50));
    sql += ` ORDER BY mhi.registered_at DESC LIMIT $${params.length}`;

    const r = await db.query(sql, params);
    return r.rows || [];
  } catch (err) {
    if (!err.message?.includes('does not exist')) console.warn('[MACHINE_SAFETY] listInterventionHistory:', err?.message);
    return [];
  }
}

/**
 * Retorna as instruções de segurança para exibir ao técnico
 */
function getSafetyInstructions() {
  return SAFETY_INSTRUCTIONS;
}

module.exports = {
  isEquipmentUnderIntervention,
  registerIntervention,
  confirmSafetySteps,
  releaseEquipment,
  logAutomationBlocked,
  listActiveInterventions,
  listInterventionHistory,
  getSafetyInstructions,
  SAFETY_INSTRUCTIONS
};
