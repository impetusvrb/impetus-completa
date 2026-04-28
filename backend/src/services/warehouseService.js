/**
 * IMPETUS - Serviço de Almoxarifado Inteligente
 * Registro automático de movimentações e integração com processos (produção, manutenção, OS)
 * Permite que outros módulos registrem consumo/entrada de materiais
 */
const db = require('../db');

/**
 * Registra uma movimentação de estoque e atualiza o saldo
 * @param {Object} opts
 * @param {string} opts.companyId - UUID da empresa
 * @param {string} opts.materialId - UUID do material
 * @param {string} opts.movementType - 'entrada' | 'saida' | 'consumo_producao' | 'consumo_manutencao' | 'ajuste'
 * @param {number} opts.quantity - Quantidade (sempre positiva; o sign é definido pelo tipo)
 * @param {string} [opts.userId] - UUID do usuário que executou
 * @param {string} [opts.locationId] - UUID da localização
 * @param {string} [opts.workOrderId] - UUID da ordem de serviço (consumo_manutencao)
 * @param {string} [opts.processId] - UUID do processo (consumo_producao)
 * @param {string} [opts.productionLineId] - UUID da linha de produção
 * @param {string} [opts.assetId] - UUID do ativo/equipamento
 * @param {string} [opts.referenceType] - Tipo genérico de referência
 * @param {string} [opts.referenceId] - ID genérico
 * @param {string} [opts.notes] - Observações
 * @param {string} [opts.documentRef] - Referência de documento
 * @returns {Promise<Object|null>} Movimentação criada ou null em caso de erro
 */
async function recordMovement(opts) {
  if (!opts?.companyId || !opts?.materialId || !opts?.movementType || !opts?.quantity || opts.quantity <= 0) {
    return null;
  }
  const validTypes = ['entrada', 'saida', 'consumo_producao', 'consumo_manutencao', 'ajuste'];
  if (!validTypes.includes(opts.movementType)) return null;

  try {
    const sign = opts.movementType === 'entrada' ? 1 : -1;
    const qty = opts.quantity * sign;

    const r = await db.query(`
      INSERT INTO warehouse_movements (company_id, material_id, movement_type, quantity, location_id, reference_type, reference_id, work_order_id, process_id, production_line_id, asset_id, user_id, notes, document_ref)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      opts.companyId, opts.materialId, opts.movementType, opts.quantity,
      opts.locationId || null, opts.referenceType || null, opts.referenceId || null,
      opts.workOrderId || null, opts.processId || null, opts.productionLineId || null, opts.assetId || null,
      opts.userId || null, opts.notes || null, opts.documentRef || null
    ]);

    await db.query(`
      INSERT INTO warehouse_balances (company_id, material_id, quantity, last_movement_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      ON CONFLICT (company_id, material_id) DO UPDATE SET
        quantity = warehouse_balances.quantity + $3,
        last_movement_at = now(),
        updated_at = now()
    `, [opts.companyId, opts.materialId, qty]);

    return r.rows[0];
  } catch (err) {
    console.error('[WAREHOUSE_SERVICE] recordMovement:', err.message);
    return null;
  }
}

/**
 * Obtém saldo atual de um material
 * @param {string} companyId
 * @param {string} materialId
 * @returns {Promise<number>}
 */
async function getBalance(companyId, materialId) {
  try {
    const r = await db.query(`
      SELECT quantity FROM warehouse_balances
      WHERE company_id = $1 AND material_id = $2
    `, [companyId, materialId]);
    return parseFloat(r.rows[0]?.quantity || 0, 10);
  } catch (err) {
    console.warn('[warehouseService][get_balance]', err?.message ?? err);
    return 0;
  }
}

/**
 * Obtém parâmetros de estoque da empresa (para IA e alertas)
 * @param {string} companyId
 * @returns {Promise<Object>}
 */
async function getParams(companyId) {
  try {
    const r = await db.query(`SELECT * FROM warehouse_params WHERE company_id = $1`, [companyId]);
    const p = r.rows[0];
    return p ? {
      min_safety_stock_pct: parseFloat(p.min_safety_stock_pct || 20, 10),
      critical_level_pct: parseFloat(p.critical_level_pct || 10, 10),
      replenishment_alert_days: parseInt(p.replenishment_alert_days || 7, 10),
      consumption_analysis_frequency: p.consumption_analysis_frequency || 'daily'
    } : {
      min_safety_stock_pct: 20,
      critical_level_pct: 10,
      replenishment_alert_days: 7,
      consumption_analysis_frequency: 'daily'
    };
  } catch (err) {
    console.warn('[warehouseService][get_params]', err?.message ?? err);
    return { min_safety_stock_pct: 20, critical_level_pct: 10, replenishment_alert_days: 7, consumption_analysis_frequency: 'daily' };
  }
}

/**
 * Lista materiais abaixo do estoque mínimo (para alertas)
 * @param {string} companyId
 * @returns {Promise<Array>}
 */
async function getMaterialsBelowMinStock(companyId) {
  try {
    const r = await db.query(`
      SELECT m.id, m.name, m.code, m.unit, m.min_stock, m.ideal_stock,
        COALESCE(b.quantity, 0) as current_quantity
      FROM warehouse_materials m
      LEFT JOIN warehouse_balances b ON b.material_id = m.id AND b.company_id = m.company_id
      WHERE m.company_id = $1 AND m.active AND m.min_stock > 0
        AND COALESCE(b.quantity, 0) < m.min_stock
      ORDER BY b.quantity ASC NULLS FIRST
    `, [companyId]);
    return r.rows || [];
  } catch (err) {
    console.error('[WAREHOUSE_SERVICE] getMaterialsBelowMinStock:', err.message);
    return [];
  }
}

/**
 * Registra consumo a partir de lista de peças/materiais (integração com manutenção/produção)
 * Chamar quando technical_interventions.parts_replaced ou similar incluir material_id
 * @param {Object} opts
 * @param {string} opts.companyId - UUID da empresa
 * @param {string} [opts.userId] - UUID do usuário
 * @param {Array<{material_id: string, quantity: number}>} opts.parts - Lista com material_id e quantidade
 * @param {string} [opts.movementType] - 'consumo_manutencao' | 'consumo_producao' (default: consumo_manutencao)
 * @param {string} [opts.workOrderId] - UUID da OS
 * @param {string} [opts.assetId] - UUID do ativo
 * @param {string} [opts.processId] - UUID do processo
 * @param {string} [opts.productionLineId] - UUID da linha
 * @param {string} [opts.notes] - Observações
 * @returns {Promise<Object[]>} Movimentações criadas
 */
async function recordConsumptionFromParts(opts) {
  if (!opts?.companyId || !Array.isArray(opts.parts) || opts.parts.length === 0) return [];
  const movementType = opts.movementType || 'consumo_manutencao';
  const validTypes = ['consumo_manutencao', 'consumo_producao'];
  if (!validTypes.includes(movementType)) return [];

  const results = [];
  for (const p of opts.parts) {
    if (!p?.material_id || !p?.quantity || p.quantity <= 0) continue;
    const m = await recordMovement({
      companyId: opts.companyId,
      materialId: p.material_id,
      movementType,
      quantity: p.quantity,
      userId: opts.userId,
      workOrderId: opts.workOrderId,
      assetId: opts.assetId,
      processId: opts.processId,
      productionLineId: opts.productionLineId,
      notes: opts.notes
    });
    if (m) results.push(m);
  }
  return results;
}

module.exports = {
  recordMovement,
  recordConsumptionFromParts,
  getBalance,
  getParams,
  getMaterialsBelowMinStock
};
