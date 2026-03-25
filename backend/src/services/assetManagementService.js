/**
 * IMPETUS — Gestão de Ativos ManuIA
 * Gêmeos: manuia_machines + manuia_sensors | OS: work_orders (título ManuIA-Asset:)
 * Estoque: manuia_spare_parts (migração opcional) | Fallback mock se BD incompleta
 */
const db = require('../db');

const TITLE_PREFIX = 'ManuIA-Asset:';

function mockTwins() {
  return [
    { id: 'DT-001', machineId: 'M1', name: 'Motor WEG W22 15cv', type: 'motor', department: 'Manutenção',
      sensors: { temperature: 72, vibration: 4.2, efficiency: 88, rpm: 1750 }, status: 'warn',
      prediction: { failureProbability: 45, estimatedFailureIn: '18h', faultParts: ['Rolamento 6205'], aiMessage: 'Vibração acima do normal.' },
      history: [68, 69, 70, 71, 72, 72, 71, 70, 71, 72, 73, 72], operatingHours: 12450, lastMaintenance: '2026-02-15' },
    { id: 'DT-002', machineId: 'M2', name: 'Bomba Grundfos CM5', type: 'bomba', department: 'Manutenção',
      sensors: { temperature: 45, vibration: 1.8, efficiency: 95, pressure: 3.2 }, status: 'ok',
      prediction: { failureProbability: 8, estimatedFailureIn: 'OK', faultParts: [], aiMessage: 'Operando normalmente.' },
      history: [44, 45, 45, 46, 45, 45, 44, 45, 45, 45, 46, 45], operatingHours: 8200, lastMaintenance: '2026-01-20' },
    { id: 'DT-003', machineId: 'M3', name: 'Compressor Atlas Copco', type: 'compressor', department: 'Manutenção',
      sensors: { temperature: 85, vibration: 6.1, efficiency: 72 }, status: 'critical',
      prediction: { failureProbability: 78, estimatedFailureIn: '6h', faultParts: ['Válvula de alívio'], aiMessage: 'Temperatura elevada.' },
      history: [78, 80, 82, 84, 85], operatingHours: 15200, lastMaintenance: '2025-12-10' }
  ];
}

function mockStock() {
  return [
    { id: 'S1', code: 'ROL-6205', name: 'Rolamento 6205-2RS', qty: 4, reorderPoint: 6, max: 20, leadTime: 7, consumo90dias: 12 },
    { id: 'S2', code: 'COR-A52', name: 'Correia trapezoidal A52', qty: 2, reorderPoint: 3, max: 15, leadTime: 5, consumo90dias: 6 },
    { id: 'S3', code: 'SEL-M01', name: 'Selo mecânico', qty: 8, reorderPoint: 4, max: 12, leadTime: 10, consumo90dias: 5 },
    { id: 'S4', code: 'FIL-O01', name: 'Filtro de óleo', qty: 1, reorderPoint: 5, max: 10, leadTime: 3, consumo90dias: 8 }
  ];
}

function mockOrdersFallback() {
  return [
    { id: 'OS-001', machineId: 'M3', machineName: 'Compressor Atlas Copco', priority: 'P1', status: 'pending_approval', type: 'Corretiva Urgente', createdBy: 'IA', createdAt: new Date().toISOString() },
    { id: 'OS-002', machineId: 'M1', machineName: 'Motor WEG W22', priority: 'P3', status: 'open', type: 'Preventiva', teamId: 'T1', createdAt: new Date().toISOString() },
    { id: 'OS-003', machineId: 'M2', machineName: 'Bomba Grundfos', priority: 'P4', status: 'open', type: 'Rotina', teamId: 'T2', createdAt: new Date().toISOString() },
    { id: 'OS-004', machineId: 'M2', machineName: 'Bomba Grundfos', priority: 'P3', status: 'pending_approval', type: 'Corretiva programada', createdBy: 'IA', createdAt: new Date().toISOString() }
  ];
}

function inferMachineType(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('bomba')) return 'bomba';
  if (n.includes('compressor')) return 'compressor';
  if (n.includes('painel') || n.includes('quadro')) return 'painel';
  if (n.includes('motor')) return 'motor';
  return 'generico';
}

function sensorRollup(sensors) {
  const out = { temperature: null, vibration: null, efficiency: null, pressure: null, rpm: null };
  let worst = 'ok';
  const faultParts = [];
  const aiParts = [];

  for (const s of sensors || []) {
    const v = s.last_value != null ? Number(s.last_value) : null;
    const type = (s.sensor_type || '').toLowerCase();
    if (type === 'temperature' && v != null) out.temperature = v;
    if (type === 'vibration' && v != null) out.vibration = v;
    if (type === 'pressure' && v != null) out.pressure = v;
    if (type === 'rpm' && v != null) out.rpm = v;

    if (v != null && s.critical_threshold != null && v >= Number(s.critical_threshold)) {
      worst = 'critical';
      faultParts.push(s.sensor_name || s.sensor_code);
      aiParts.push(`${s.sensor_name || s.sensor_code} em zona crítica`);
    } else if (v != null && s.warning_threshold != null && v >= Number(s.warning_threshold)) {
      if (worst !== 'critical') worst = 'warn';
      const label = s.sensor_name || s.sensor_code;
      if (!faultParts.includes(label)) faultParts.push(label);
    }
  }

  if (out.temperature == null) out.temperature = worst === 'critical' ? 82 : worst === 'warn' ? 58 : 42;
  if (out.vibration == null) out.vibration = worst === 'critical' ? 5.5 : worst === 'warn' ? 3.2 : 1.5;
  out.efficiency = worst === 'critical' ? 68 : worst === 'warn' ? 82 : 94;

  const failureProbability = worst === 'critical' ? 78 : worst === 'warn' ? 42 : 12;
  const prediction = {
    failureProbability,
    estimatedFailureIn: worst === 'critical' ? '6–24h' : worst === 'warn' ? '3–7 dias' : 'OK',
    faultParts: faultParts.slice(0, 6),
    aiMessage: aiParts.length ? aiParts.join('; ') : 'Sensores dentro dos parâmetros.'
  };

  const history = Array.from({ length: 12 }, (_, i) =>
    Math.round((out.temperature || 40) + Math.sin(i / 2) * 3));

  return { sensors: out, status: worst, prediction, history };
}

function extractMachineIdFromDescription(description) {
  const desc = description || '';
  const tag = 'MANUIA_MACHINE_ID:';
  const idx = desc.indexOf(tag);
  if (idx < 0) return null;
  const rest = desc.slice(idx + tag.length).trim().split(/\s|\n/)[0];
  return rest || null;
}

function woPriorityToP(priority) {
  const p = (priority || 'normal').toLowerCase();
  if (p === 'critical') return 'P1';
  if (p === 'urgent') return 'P2';
  if (p === 'high') return 'P3';
  return 'P4';
}

function pToWoPriority(p) {
  if (p === 'P1') return 'critical';
  if (p === 'P2') return 'urgent';
  if (p === 'P3') return 'high';
  return 'normal';
}

function mapWoRow(row) {
  const pending = row.status === 'waiting_support';
  const createdByIa = (row.description || '').includes('"createdBy":"IA"');
  return {
    id: String(row.id),
    machineId: extractMachineIdFromDescription(row.description),
    machineName: row.machine_name || row.title,
    priority: woPriorityToP(row.priority),
    status: pending ? 'pending_approval' : row.status,
    type: row.type || 'Corretiva',
    teamId: extractTeam(row.description),
    createdBy: createdByIa ? 'IA' : 'manual',
    createdAt: row.created_at
  };
}

function extractTeam(description) {
  const m = (description || '').match(/TEAM:([^\s\n]+)/);
  return m ? m[1] : null;
}

async function listTwinsFromDb(companyId) {
  const mRes = await db.query(
    `SELECT m.id, m.code, m.name, m.metadata
     FROM manuia_machines m
     WHERE m.company_id = $1 AND m.active = true
     ORDER BY m.name`,
    [companyId]
  );
  const twins = [];
  for (const m of mRes.rows || []) {
    let sensors = [];
    try {
      const sRes = await db.query(
        `SELECT sensor_code, sensor_name, sensor_type, unit, last_value, last_read_at,
                warning_threshold, critical_threshold
         FROM manuia_sensors WHERE company_id = $1 AND machine_id = $2 AND active = true`,
        [companyId, m.id]
      );
      sensors = sRes.rows || [];
    } catch (_) {
      sensors = [];
    }
    const roll = sensorRollup(sensors);
    const meta = m.metadata && typeof m.metadata === 'object' ? m.metadata : {};
    const type = meta.machineType || inferMachineType(m.name);
    const twinId = `DT-${String(m.id).replace(/-/g, '').slice(0, 12)}`;
    twins.push({
      id: twinId,
      machineId: String(m.id),
      name: m.name,
      type,
      department: 'Manutenção',
      sensors: roll.sensors,
      status: roll.status,
      prediction: roll.prediction,
      history: roll.history,
      operatingHours: meta.operatingHours != null ? Number(meta.operatingHours) : 0,
      lastMaintenance: meta.lastMaintenance || null
    });
  }
  return twins;
}

async function listOrdersFromDb(companyId) {
  const r = await db.query(
    `SELECT id, title, description, type, machine_name, priority, status, assigned_to, created_at
     FROM work_orders
     WHERE company_id = $1 AND title LIKE $2
     ORDER BY created_at DESC
     LIMIT 100`,
    [companyId, `${TITLE_PREFIX}%`]
  );
  return (r.rows || []).map(mapWoRow);
}

async function listStockFromDb(companyId) {
  const r = await db.query(
    `SELECT id, code, name, qty, reorder_point, max_qty, lead_time_days, consumo_90d
     FROM manuia_spare_parts WHERE company_id = $1 ORDER BY code`,
    [companyId]
  );
  return (r.rows || []).map((row) => ({
    id: String(row.id),
    code: row.code,
    name: row.name,
    qty: Number(row.qty),
    reorderPoint: Number(row.reorder_point),
    max: Number(row.max_qty),
    leadTime: row.lead_time_days,
    consumo90dias: Number(row.consumo_90d)
  }));
}

async function hasOpenCriticalWo(companyId, machineId) {
  const r = await db.query(
    `SELECT id FROM work_orders
     WHERE company_id = $1 AND title LIKE $2 AND priority = 'critical'
       AND status IN ('open','in_progress','waiting_parts','waiting_support')
       AND description LIKE $3`,
    [companyId, `${TITLE_PREFIX}%`, `%MANUIA_MACHINE_ID:${machineId}%`]
  );
  return (r.rows || []).length > 0;
}

async function ensureAutoOsForCriticalTwins(companyId, twins) {
  for (const t of twins) {
    if (t.status !== 'critical') continue;
    const open = await hasOpenCriticalWo(companyId, t.machineId);
    if (open) continue;
    const title = `${TITLE_PREFIX} ${t.name} — alerta crítico`;
    const description = `Ordem gerada automaticamente (gêmeo digital).\nMANUIA_MACHINE_ID:${t.machineId}\n{"createdBy":"IA"}`;
    try {
      await db.query(
        `INSERT INTO work_orders (company_id, title, description, type, machine_name, priority, status)
         VALUES ($1, $2, $3, 'predictive', $4, 'critical', 'waiting_support')`,
        [companyId, title.slice(0, 200), description, t.name]
      );
    } catch (e) {
      console.warn('[ASSET_MGMT_AUTO_WO]', e?.message);
    }
  }
}

async function getTwins(companyId) {
  try {
    const twins = await listTwinsFromDb(companyId);
    if (!twins.length) return mockTwins();
    await ensureAutoOsForCriticalTwins(companyId, twins);
    return twins;
  } catch (e) {
    if (String(e.message || '').includes('does not exist')) return mockTwins();
    console.warn('[ASSET_TWINS]', e?.message);
    return mockTwins();
  }
}

async function getStock(companyId) {
  try {
    const items = await listStockFromDb(companyId);
    return items.length ? items : mockStock();
  } catch (e) {
    if (String(e.message || '').includes('does not exist')) return mockStock();
    return mockStock();
  }
}

async function getOrders(companyId) {
  try {
    return await listOrdersFromDb(companyId);
  } catch (e) {
    if (String(e.message || '').includes('does not exist')) return mockOrdersFallback();
    return mockOrdersFallback();
  }
}

async function approveOrder(companyId, orderId) {
  await db.query(
    `UPDATE work_orders SET status = 'open', updated_at = now()
     WHERE id = $1 AND company_id = $2 AND title LIKE $3`,
    [orderId, companyId, `${TITLE_PREFIX}%`]
  );
}

async function reassignOrder(companyId, orderId, teamId) {
  const note = teamId ? `\nTEAM:${teamId}` : '';
  await db.query(
    `UPDATE work_orders SET description = COALESCE(description,'') || $3, updated_at = now()
     WHERE id = $1 AND company_id = $2 AND title LIKE $4`,
    [orderId, companyId, note, `${TITLE_PREFIX}%`]
  );
}

async function createOrder(companyId, userId, body) {
  const {
    machineId,
    machineName,
    priority = 'P3',
    type = 'Corretiva',
    status: reqStatus
  } = body || {};
  const woPri = pToWoPriority(priority);
  const st = ['P1', 'P2'].includes(priority) ? 'waiting_support' : 'open';
  const finalStatus = reqStatus === 'pending_approval' ? 'waiting_support' : st;
  const typeMap = { Corretiva: 'corrective', 'Corretiva Urgente': 'corrective', Preventiva: 'preventive', Rotina: 'inspection' };
  const woType = typeMap[type] || 'corrective';
  const desc = `MANUIA_MACHINE_ID:${machineId || 'unknown'}\n{"createdBy":"manual"}`;
  const r = await db.query(
    `INSERT INTO work_orders (company_id, title, description, type, machine_name, priority, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      companyId,
      `${TITLE_PREFIX} ${(machineName || 'Equipamento').slice(0, 160)}`,
      desc,
      woType,
      machineName || null,
      woPri,
      finalStatus,
      userId || null
    ]
  );
  return r.rows?.[0]?.id;
}

async function updateReorderPoint(companyId, itemId, reorderPoint) {
  await db.query(
    `UPDATE manuia_spare_parts SET reorder_point = $3, updated_at = now()
     WHERE id = $1 AND company_id = $2`,
    [itemId, companyId, reorderPoint]
  );
}

module.exports = {
  getTwins,
  getStock,
  getOrders,
  approveOrder,
  reassignOrder,
  createOrder,
  updateReorderPoint,
  TITLE_PREFIX
};
