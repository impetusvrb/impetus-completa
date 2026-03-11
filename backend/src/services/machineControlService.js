/**
 * IMPETUS - Controle de Equipamentos com Segurança
 * Modos: monitor | assisted | automatic
 * SEGURANÇA: apenas equipamentos auxiliares (compressor, bomba, ventilação, refrigeração)
 * NUNCA: prensa, torno, máquinas perigosas
 */
const db = require('../db');

const FORBIDDEN_TYPES = ['prensa', 'torno', 'fresadora', 'mandriladora', 'guilhotina', 'dobradeira'];
const AUXILIARY_KEYS = ['compressor', 'bomba', 'ventilacao', 'refrigeracao'];

async function getAutomationConfig(companyId) {
  const r = await db.query(`
    SELECT automation_mode, allowed_roles FROM industrial_automation_config
    WHERE company_id = $1
  `, [companyId]);
  return r.rows?.[0] || { automation_mode: 'monitor', allowed_roles: ['diretor', 'gerente', 'coordenador'] };
}

function isEquipmentAllowedForControl(equipmentType) {
  if (!equipmentType) return false;
  const low = String(equipmentType).toLowerCase();
  if (FORBIDDEN_TYPES.some((t) => low.includes(t))) return false;
  return AUXILIARY_KEYS.some((k) => low.includes(k));
}

async function canUserEnableAutomation(companyId, userId) {
  const r = await db.query(`
    SELECT u.role FROM users u
    WHERE u.id = $1 AND u.company_id = $2 AND u.active = true
  `, [userId, companyId]);
  const role = (r.rows?.[0]?.role || '').toLowerCase();
  const cfg = await getAutomationConfig(companyId);
  return (cfg.allowed_roles || []).some((r) => r.toLowerCase() === role);
}

async function requestCommand(companyId, userId, machineId, machineName, equipmentType, commandType, commandValue) {
  const cfg = await getAutomationConfig(companyId);

  if (cfg.automation_mode === 'monitor') {
    return { ok: false, error: 'Sistema em modo monitoramento. Apenas observação.', suggestion: true };
  }

  if (!isEquipmentAllowedForControl(equipmentType || machineName)) {
    return { ok: false, error: 'Equipamento não permitido para controle automático. Apenas auxiliares: compressor, bomba, ventilação, refrigeração.' };
  }

  const canEnable = await canUserEnableAutomation(companyId, userId);
  if (!canEnable && cfg.automation_mode === 'automatic') {
    return { ok: false, error: 'Sem permissão para controle automático.' };
  }

  let executed = false;
  let executionResponse = null;

  if (cfg.automation_mode === 'assisted') {
    return {
      ok: true,
      suggestion: true,
      message: `Sugestão: ${commandType} em ${machineName}. Execute manualmente no equipamento.`,
      command_logged: true
    };
  }

  if (cfg.automation_mode === 'automatic') {
    try {
      executionResponse = await executeCommand(companyId, machineId, commandType, commandValue);
      executed = !!executionResponse?.ok;
    } catch (e) {
      executionResponse = { ok: false, error: e?.message };
    }
  }

  await db.query(`
    INSERT INTO machine_control_commands (company_id, machine_identifier, machine_name, command_type, command_value, executed, execution_response, requested_by, requested_mode, executed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    companyId, machineId, machineName, commandType, commandValue,
    executed, JSON.stringify(executionResponse), userId, cfg.automation_mode,
    executed ? new Date().toISOString() : null
  ]);

  return {
    ok: true,
    executed,
    execution_response: executionResponse,
    message: executed ? 'Comando executado.' : 'Comando registrado. Execute no equipamento.'
  };
}

async function executeCommand(companyId, machineId, commandType, commandValue) {
  const config = await db.query(`
    SELECT data_source_config FROM machine_monitoring_config
    WHERE company_id = $1 AND machine_identifier = $2
  `, [companyId, machineId]);

  const cfg = config.rows?.[0]?.data_source_config || {};
  const gatewayUrl = cfg.gateway_url || cfg.plc_endpoint;
  const apiKey = cfg.api_key;

  if (!gatewayUrl) {
    return { ok: false, error: 'Gateway/PLC não configurado. Configure data_source_config na máquina.' };
  }

  try {
    const axios = require('axios');
    const res = await axios.post(
      `${gatewayUrl}/command`,
      { machine_id: machineId, command: commandType, value: commandValue },
      { timeout: 5000, headers: apiKey ? { 'X-API-Key': apiKey } : {} }
    );
    return { ok: true, response: res?.data };
  } catch (err) {
    return { ok: false, error: err?.message || 'Falha ao comunicar com gateway.' };
  }
}

async function setAutomationMode(companyId, userId, mode) {
  if (!['monitor', 'assisted', 'automatic'].includes(mode)) {
    return { ok: false, error: 'Modo inválido.' };
  }
  const can = await canUserEnableAutomation(companyId, userId);
  if (!can) return { ok: false, error: 'Sem permissão. Apenas Diretor, Gerente ou Engenharia.' };

  await db.query(`
    INSERT INTO industrial_automation_config (company_id, automation_mode, allowed_roles, enabled_by, enabled_at)
    VALUES ($1, $2, '{diretor,gerente,coordenador}', $3, now())
    ON CONFLICT (company_id) DO UPDATE SET
      automation_mode = $2, enabled_by = $3, enabled_at = now(), updated_at = now()
  `, [companyId, mode, userId]);
  return { ok: true };
}

module.exports = {
  getAutomationConfig,
  requestCommand,
  setAutomationMode,
  isEquipmentAllowedForControl
};
