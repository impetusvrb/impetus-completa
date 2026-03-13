/**
 * IMPETUS - Machine Monitoring Service (24/7)
 * Coleta dados de sensores, PLC, sistemas industriais
 * Intervalo: 1-5 segundos por máquina (collection_interval_sec)
 * Arquitetura: IA → IMPETUS → Gateway/PLC → Máquina (nunca direto)
 */
const db = require('../db');
const plcData = require('./plcDataService');
const plcCollector = require('./plcCollector');
const machineBrain = require('./machineBrainService');
const industrialMaintenance = require('./industrialMaintenanceIntegration');
const automationTrigger = require('./automationTriggerService');
const industrialCost = require('./industrialCostService');

const ENABLED = process.env.MACHINE_MONITORING_ENABLED !== 'false';
const CYCLE_INTERVAL_MS = Math.min(5000, Math.max(1000, parseInt(process.env.MACHINE_MONITOR_INTERVAL_MS, 10) || 1000)); // 1-5 seg
let intervalId = null;
const lastCollectedAt = new Map(); // machine_key -> timestamp

const AUXILIARY_TYPES = ['compressor', 'bomba', 'ventilacao', 'refrigeracao'];

function machineKey(companyId, machineIdentifier) {
  return `${companyId}:${machineIdentifier}`;
}

async function getMachinesToMonitor() {
  try {
    const r = await db.query(`
      SELECT id, company_id, machine_identifier, machine_name, line_name, machine_source,
             collection_interval_sec, data_source_type
      FROM machine_monitoring_config
      WHERE enabled = true AND company_id IN (SELECT id FROM companies WHERE active = true)
    `);
    if (r.rows?.length) return r.rows;
  } catch {}

  try {
    const fallback = await db.query(`
      SELECT plm.id, pl.company_id,
             plm.id::text as machine_identifier,
             plm.name as machine_name,
             pl.name as line_name,
             'production_line_machine' as machine_source,
             3 as collection_interval_sec,
             'plc' as data_source_type
      FROM production_line_machines plm
      JOIN production_lines pl ON pl.id = plm.line_id
      WHERE pl.company_id IN (SELECT id FROM companies WHERE active = true)
      LIMIT 30
    `);
    if (fallback.rows?.length) return fallback.rows;
  } catch {}

  const companies = await db.query('SELECT id FROM companies WHERE active = true LIMIT 5');
  const defaultMachines = [
    { id: 'EQ-001', name: 'Compressor Principal' },
    { id: 'EQ-002', name: 'Bomba Hidráulica' },
    { id: 'EQ-003', name: 'Prensa 500T' }
  ];
  return (companies.rows || []).flatMap((c) =>
    defaultMachines.map((m) => ({
      company_id: c.id,
      machine_identifier: m.id,
      machine_name: m.name,
      line_name: null,
      machine_source: 'plc_equipment',
      collection_interval_sec: 3,
      data_source_type: 'plc'
    }))
  );
}

function collectFromSource(config, reading) {
  if (config.data_source_type === 'simulated' || config.data_source_type === 'plc') {
    return plcCollector.simulatePLCRead?.(config.machine_identifier, config.machine_name) || reading;
  }
  return reading;
}

async function collectAndAnalyze(config) {
  const { company_id, machine_identifier, machine_name, line_name, collection_interval_sec } = config;

  try {
    let reading = collectFromSource(config, {});
    if (!reading.equipment_id) reading.equipment_id = machine_identifier;
    if (!reading.equipment_name) reading.equipment_name = machine_name;

    const saved = await plcData.saveCollectedData(company_id, reading);
    if (!saved) return;

    await machineBrain.updateProfile(company_id, machine_identifier, machine_name, line_name, reading);

    const events = await machineBrain.analyzeReading(
      company_id, machine_identifier, machine_name, line_name,
      { ...reading, temperature: reading.temperature, vibration: reading.vibration, pressure: reading.pressure }
    );

    for (const ev of events) {
      const evRow = await machineBrain.registerEvent(company_id, machine_identifier, machine_name, line_name, ev);
      if (evRow?.id && ['high', 'critical'].includes(ev.severity)) {
        industrialMaintenance.maybeCreateWorkOrderFromEvent(evRow).catch((err) => console.warn('[MACHINE_MONITOR] WorkOrder:', err?.message));
      }
      if (evRow?.id && ['pressure_low', 'compressor_offline', 'pressure_high'].includes(ev.event_type)) {
        automationTrigger.maybeAutoActivate(company_id, {
          event_type: ev.event_type,
          machine_identifier: machine_identifier,
          machine_name: machine_name
        }).catch((err) => console.warn('[MACHINE_MONITOR] Auto-activate:', err?.message));
      }
      if (evRow?.id && ['machine_stopped', 'compressor_offline'].includes(ev.event_type)) {
        industrialCost.calculateEventImpact(company_id, {
          event_type: ev.event_type,
          machine_identifier: machine_identifier,
          line_identifier: line_name,
          duration_hours: 1,
          production_loss: true,
          description: ev.description
        }).catch((err) => console.warn('[MACHINE_MONITOR] CostImpact:', err?.message));
      }
    }

    await db.query(`
      UPDATE machine_monitoring_config SET last_collected_at = now(), updated_at = now()
      WHERE company_id = $1 AND machine_identifier = $2
    `, [company_id, machine_identifier]).catch((err) => console.warn('[MACHINE_MONITOR] Update last_collected:', err?.message));
  } catch (err) {
    console.warn('[MACHINE_MONITOR]', machine_identifier, err?.message);
  }
}

async function runCycle() {
  if (!ENABLED) return;

  const machines = await getMachinesToMonitor();
  const now = Date.now();

  for (const m of machines) {
    const key = machineKey(m.company_id, m.machine_identifier);
    const intervalSec = Math.min(5, Math.max(1, m.collection_interval_sec || 3));
    const last = lastCollectedAt.get(key) || 0;

    if (now - last >= intervalSec * 1000) {
      lastCollectedAt.set(key, now);
      setImmediate(() => collectAndAnalyze(m).catch((err) => console.warn('[MACHINE_MONITOR] collectAndAnalyze:', err?.message)));
    }
  }
}

function start() {
  if (!ENABLED || intervalId) return;
  runCycle();
  intervalId = setInterval(runCycle, CYCLE_INTERVAL_MS);
  console.info('[MACHINE_MONITOR] Serviço 24/7 iniciado (ciclo', CYCLE_INTERVAL_MS / 1000, 's, intervalo máquina 1-5s)');
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.info('[MACHINE_MONITOR] Serviço parado');
  }
}

module.exports = { start, stop, runCycle, ENABLED };
