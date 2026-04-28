/**
 * IMPETUS - Disparador de Automação por IA
 * Liga/desliga equipamentos automaticamente quando detecta situações operacionais:
 * - Queda de pressão → ligar compressor disponível
 * - Falha de sistema, proteção de equipamentos
 *
 * REGRA: Automação SOMENTE quando NÃO há intervenção humana no equipamento.
 * Prioridade: segurança humana > integridade equipamento > continuidade > automação
 */
const db = require('../db');
const machineControl = require('./machineControlService');
const machineSafety = require('./machineSafetyService');

/** Eventos que podem disparar automação (mapeamento evento → ação sugerida) */
const AUTOMATION_TRIGGERS = {
  pressure_low: { action: 'turn_on', equipment_pattern: 'compressor', reason: 'Queda de pressão detectada' },
  compressor_offline: { action: 'turn_on', equipment_pattern: 'compressor', reason: 'Compressor offline - acionar reserva' },
  pressure_high: { action: 'turn_off', equipment_pattern: 'compressor', reason: 'Pressão alta - desligar compressor auxiliar' }
};

/**
 * Tenta acionar equipamento automaticamente quando evento operacional exige
 * @param {string} companyId
 * @param {Object} event - { event_type, machine_identifier, machine_name }
 * @returns {{ ok: boolean, executed?: boolean, error?: string, skipped?: string }}
 */
async function maybeAutoActivate(companyId, event) {
  const trigger = AUTOMATION_TRIGGERS[event.event_type];
  if (!trigger) return { ok: false, skipped: 'evento_sem_automação' };

  const cfg = await db.query(`
    SELECT automation_mode FROM industrial_automation_config WHERE company_id = $1
  `, [companyId]);
  const mode = cfg.rows?.[0]?.automation_mode || 'monitor';
  if (mode !== 'automatic') return { ok: false, skipped: 'modo_nao_automatico' };

  const machines = await getCandidateMachines(companyId, trigger.equipment_pattern);
  if (!machines?.length) return { ok: false, skipped: 'nenhum_equipamento_auxiliar' };

  for (const m of machines) {
    const underIntervention = await machineSafety.isEquipmentUnderIntervention(companyId, m.machine_identifier);
    if (underIntervention) continue;

    const equipType = (m.machine_name || m.machine_identifier || '').toLowerCase();
    if (!machineControl.isEquipmentAllowedForControl(equipType)) continue;

    const commandType = trigger.action === 'turn_on' ? 'start' : 'stop';
    const commandValue = trigger.action === 'turn_on' ? '1' : '0';

    const result = await machineControl.requestCommand(
      companyId,
      null,
      m.machine_identifier,
      m.machine_name,
      equipType,
      commandType,
      commandValue,
      'automation'
    );

    if (result.ok && result.executed) {
      return { ok: true, executed: true, machine: m.machine_name, reason: trigger.reason };
    }
    if (result.intervention) {
      return { ok: false, skipped: 'intervencao_humana', error: result.error };
    }
  }

  return { ok: false, skipped: 'todos_bloqueados_ou_indisponiveis' };
}

/** Lista máquinas candidatas (ex: compressores) para automação */
async function getCandidateMachines(companyId, pattern) {
  try {
    const r = await db.query(`
      SELECT machine_identifier, machine_name, line_name
      FROM machine_monitoring_config
      WHERE company_id = $1 AND enabled = true
        AND (LOWER(machine_name) LIKE $2 OR LOWER(machine_identifier) LIKE $2)
    `, [companyId, `%${pattern}%`]);
    if (r.rows?.length) return r.rows;

    const fallback = await db.query(`
      SELECT plm.id::text as machine_identifier, plm.name as machine_name, pl.name as line_name
      FROM production_line_machines plm
      JOIN production_lines pl ON pl.id = plm.line_id
      WHERE pl.company_id = $1
        AND (LOWER(plm.name) LIKE $2 OR LOWER(plm.id::text) LIKE $2)
      LIMIT 10
    `, [companyId, `%${pattern}%`]);
    return fallback.rows || [];
  } catch (err) {
    console.warn('[automationTriggerService][candidate_machines]', err?.message ?? err);
    return [];
  }
}

module.exports = {
  maybeAutoActivate,
  AUTOMATION_TRIGGERS
};
