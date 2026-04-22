/**
 * ROTAS ADMIN - BASE ESTRUTURAL DA EMPRESA
 * Central de cadastro mestre para alimentar a Impetus IA
 * Módulos: Dados Empresa, Cargos, Linhas, Ativos, Processos, Produtos,
 *          Indicadores, Falhas/Riscos, Regras Com, Rotinas, Turnos,
 *          Responsáveis, Config IA
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const { requireAuth, requireHierarchy } = require('../../middleware/auth');
const { auditMiddleware } = require('../../middleware/audit');
const { isValidUUID } = require('../../utils/security');

const adminMw = [requireAuth, requireHierarchy(1)];

/** Colunas esperadas por AdminStructural.jsx — consulta dinâmica evita 500 se o PG estiver desatualizado. */
const COMPANY_DATA_COLUMNS = [
  'id',
  'name',
  'trade_name',
  'cnpj',
  'industry_segment',
  'subsegment',
  'address',
  'city',
  'state',
  'country',
  'main_unit',
  'other_units',
  'employee_count',
  'shift_count',
  'operating_hours',
  'operation_type',
  'production_type',
  'products_manufactured',
  'market',
  'company_description',
  'mission',
  'vision',
  'values_text',
  'internal_policy',
  'operation_rules',
  'organizational_culture',
  'strategic_notes',
  'company_policy_text',
  'config',
  'active',
  'created_at',
  'updated_at'
];

async function selectCompanyRowStructural(cid) {
  const colRes = await db.query(
    `
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies'
  `
  );
  const have = new Set(colRes.rows.map((r) => r.column_name));
  const cols = COMPANY_DATA_COLUMNS.filter((c) => have.has(c));
  if (!cols.includes('id')) {
    throw new Error('Coluna id ausente em companies');
  }
  const quoted = cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(', ');
  const r = await db.query(`SELECT ${quoted} FROM companies WHERE id = $1`, [cid]);
  return { row: r.rows[0] || null, have };
}

function companyRowToApiPayload(row, have) {
  const sEmpty = (k) => {
    if (!have.has(k)) return '';
    const v = row[k];
    return v == null ? '' : String(v);
  };
  const nullable = (k) => (have.has(k) ? row[k] ?? null : null);
  return {
    id: row.id,
    name: sEmpty('name'),
    trade_name: sEmpty('trade_name'),
    cnpj: sEmpty('cnpj'),
    industry_segment: sEmpty('industry_segment'),
    subsegment: sEmpty('subsegment'),
    address: sEmpty('address'),
    city: sEmpty('city'),
    state: sEmpty('state'),
    country: sEmpty('country'),
    main_unit: sEmpty('main_unit'),
    other_units: nullable('other_units'),
    employee_count: nullable('employee_count'),
    shift_count: nullable('shift_count'),
    operating_hours: sEmpty('operating_hours'),
    operation_type: sEmpty('operation_type'),
    production_type: sEmpty('production_type'),
    products_manufactured: nullable('products_manufactured'),
    market: sEmpty('market'),
    company_description: sEmpty('company_description'),
    mission: sEmpty('mission'),
    vision: sEmpty('vision'),
    values_text: sEmpty('values_text'),
    internal_policy: sEmpty('internal_policy'),
    operation_rules: sEmpty('operation_rules'),
    organizational_culture: sEmpty('organizational_culture'),
    strategic_notes: sEmpty('strategic_notes'),
    company_policy_text: sEmpty('company_policy_text'),
    config: nullable('config'),
    active: have.has('active') ? row.active !== false : true,
    created_at: nullable('created_at'),
    updated_at: nullable('updated_at')
  };
}

function invalidateStructuralOrgCache(companyId) {
  if (!companyId) return;
  try {
    const { invalidateCompanyCache } = require('../../services/structuralOrgContextService');
    invalidateCompanyCache(companyId);
  } catch (_) {
    /* opcional */
  }
}

function getCompanyId(req) {
  return req.user?.company_id;
}

/** Campos text[] da base estrutural: garante array (evita falha do PG se vier string/objeto). */
function asPgTextArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === 'string') {
    return v.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Para UPDATE com COALESCE: `undefined` preserva coluna; demais valores viram text[]. */
function asPgTextArrayForUpdate(v) {
  if (v === undefined) return null;
  return asPgTextArray(v);
}

// ============================================================================
// 1. DADOS DA EMPRESA
// ============================================================================

router.get('/company-data', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!cid) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const { row, have } = await selectCompanyRowStructural(cid);
    if (!row) return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    res.json({
      ok: true,
      data: companyRowToApiPayload(row, have)
    });
  } catch (err) {
    console.error('[STRUCTURAL_COMPANY_DATA]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar dados da empresa' });
  }
});

router.put('/company-data', ...adminMw, auditMiddleware({ action: 'company_data_updated', entityType: 'structural', severity: 'info' }), async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!cid) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const {
      name,
      trade_name,
      industry_segment,
      cnpj,
      address,
      city,
      state,
      country,
      subsegment,
      main_unit,
      other_units,
      employee_count,
      shift_count,
      operating_hours,
      operation_type,
      production_type,
      products_manufactured,
      market,
      company_description,
      mission,
      vision,
      values_text,
      internal_policy,
      operation_rules,
      organizational_culture,
      strategic_notes
    } = req.body;

    await db.query(`
      UPDATE companies SET
        name = COALESCE($2, name),
        trade_name = COALESCE($3, trade_name),
        industry_segment = COALESCE($4, industry_segment),
        cnpj = COALESCE($5, cnpj),
        address = COALESCE($6, address),
        city = COALESCE($7, city),
        state = COALESCE($8, state),
        country = COALESCE($9, country),
        subsegment = COALESCE($10, subsegment),
        main_unit = COALESCE($11, main_unit),
        other_units = COALESCE($12::jsonb, other_units),
        employee_count = COALESCE($13, employee_count),
        shift_count = COALESCE($14, shift_count),
        operating_hours = COALESCE($15, operating_hours),
        operation_type = COALESCE($16, operation_type),
        production_type = COALESCE($17, production_type),
        products_manufactured = COALESCE($18::text[], products_manufactured),
        market = COALESCE($19, market),
        company_description = COALESCE($20, company_description),
        mission = COALESCE($21, mission),
        vision = COALESCE($22, vision),
        values_text = COALESCE($23, values_text),
        internal_policy = COALESCE($24, internal_policy),
        operation_rules = COALESCE($25, operation_rules),
        organizational_culture = COALESCE($26, organizational_culture),
        strategic_notes = COALESCE($27, strategic_notes),
        updated_at = now()
      WHERE id = $1
    `, [
      cid,
      name,
      trade_name,
      industry_segment,
      cnpj,
      address,
      city,
      state,
      country,
      subsegment,
      main_unit,
      other_units ? (typeof other_units === 'string' ? other_units : JSON.stringify(other_units)) : null,
      employee_count ?? null,
      shift_count ?? null,
      operating_hours,
      operation_type,
      production_type,
      Array.isArray(products_manufactured) ? products_manufactured : null,
      market,
      company_description,
      mission,
      vision,
      values_text,
      internal_policy,
      operation_rules,
      organizational_culture,
      strategic_notes
    ]);

    invalidateStructuralOrgCache(cid);
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_COMPANY_UPDATE]', err);
    res.status(500).json({ ok: false, error: 'Erro ao atualizar dados da empresa' });
  }
});

// ============================================================================
// 2. CARGOS E ESTRUTURA HIERÁRQUICA
// ============================================================================

router.get('/roles', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(`
      SELECT r.*, s.name as direct_superior_name
      FROM company_roles r
      LEFT JOIN company_roles s ON r.direct_superior_role_id = s.id
      WHERE r.company_id = $1 AND r.active ORDER BY r.hierarchy_level NULLS LAST, r.name
    `, [cid]);
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_ROLES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar cargos' });
  }
});

router.post('/roles', ...adminMw, auditMiddleware({ action: 'role_created', entityType: 'structural', severity: 'info' }), async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!cid) {
      return res.status(400).json({ ok: false, error: 'Empresa não identificada para o usuário. Associe o usuário a uma empresa.' });
    }
    const b = req.body;
    let superiorId = b.direct_superior_role_id || null;
    if (superiorId && !isValidUUID(String(superiorId))) {
      return res.status(400).json({ ok: false, error: 'ID do cargo "superior direto" é inválido.' });
    }
    const hint = b.dashboard_functional_hint != null && String(b.dashboard_functional_hint).trim() !== ''
      ? String(b.dashboard_functional_hint).trim().slice(0, 32)
      : null;
    const r = await db.query(`
      INSERT INTO company_roles (company_id, name, description, hierarchy_level, work_area,
        main_responsibilities, critical_responsibilities, recommended_permissions,
        sectors_involved, leadership_type, communication_profile, direct_superior_role_id,
        expected_subordinates, decision_level, visible_themes, hidden_themes, escalation_role,
        operation_role, approval_role, notes, dashboard_functional_hint)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `, [
      cid, b.name || '', b.description, b.hierarchy_level, b.work_area,
      asPgTextArray(b.main_responsibilities), asPgTextArray(b.critical_responsibilities), asPgTextArray(b.recommended_permissions),
      asPgTextArray(b.sectors_involved), b.leadership_type, b.communication_profile, superiorId,
      asPgTextArray(b.expected_subordinates), b.decision_level, asPgTextArray(b.visible_themes), asPgTextArray(b.hidden_themes),
      b.escalation_role, b.operation_role, b.approval_role, b.notes, hint
    ]);
    invalidateStructuralOrgCache(cid);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_ROLE_CREATE]', err);
    if (err.code === '23503') {
      return res.status(400).json({
        ok: false,
        error: 'Referência inválida: o cargo "superior direto" não existe ou não pertence à sua empresa.'
      });
    }
    if (err.code === '23502') {
      return res.status(400).json({ ok: false, error: 'Dados obrigatórios ausentes (empresa ou nome do cargo).' });
    }
    if (err.code === '42P01') {
      return res.status(500).json({
        ok: false,
        error: 'Tabela de cargos não encontrada no banco. Execute a migração da base estrutural no servidor.'
      });
    }
    res.status(500).json({ ok: false, error: 'Erro ao criar cargo' });
  }
});

router.put('/roles/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!cid) {
      return res.status(400).json({ ok: false, error: 'Empresa não identificada para o usuário.' });
    }
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    let superiorIdPut = b.direct_superior_role_id;
    if (superiorIdPut && !isValidUUID(String(superiorIdPut))) {
      return res.status(400).json({ ok: false, error: 'ID do cargo "superior direto" é inválido.' });
    }
    const hintUpdate = Object.prototype.hasOwnProperty.call(b, 'dashboard_functional_hint')
      ? ', dashboard_functional_hint = NULLIF(TRIM($22::text), \'\')'
      : '';
    const paramsPut = [
      cid, req.params.id, b.name, b.description, b.hierarchy_level, b.work_area,
      asPgTextArrayForUpdate(b.main_responsibilities), asPgTextArrayForUpdate(b.critical_responsibilities), asPgTextArrayForUpdate(b.recommended_permissions),
      asPgTextArrayForUpdate(b.sectors_involved), b.leadership_type, b.communication_profile,
      superiorIdPut, asPgTextArrayForUpdate(b.expected_subordinates), b.decision_level,
      asPgTextArrayForUpdate(b.visible_themes), asPgTextArrayForUpdate(b.hidden_themes), b.escalation_role, b.operation_role,
      b.approval_role, b.notes
    ];
    if (hintUpdate) {
      const hv = b.dashboard_functional_hint;
      paramsPut.push(hv == null ? '' : String(hv));
    }
    const r = await db.query(`
      UPDATE company_roles SET
        name = COALESCE($3, name), description = COALESCE($4, description),
        hierarchy_level = COALESCE($5, hierarchy_level), work_area = COALESCE($6, work_area),
        main_responsibilities = COALESCE($7, main_responsibilities),
        critical_responsibilities = COALESCE($8, critical_responsibilities),
        recommended_permissions = COALESCE($9, recommended_permissions),
        sectors_involved = COALESCE($10, sectors_involved),
        leadership_type = COALESCE($11, leadership_type),
        communication_profile = COALESCE($12, communication_profile),
        direct_superior_role_id = COALESCE($13, direct_superior_role_id),
        expected_subordinates = COALESCE($14, expected_subordinates),
        decision_level = COALESCE($15, decision_level),
        visible_themes = COALESCE($16, visible_themes),
        hidden_themes = COALESCE($17, hidden_themes),
        escalation_role = COALESCE($18, escalation_role),
        operation_role = COALESCE($19, operation_role),
        approval_role = COALESCE($20, approval_role),
        notes = COALESCE($21, notes)${hintUpdate}, updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, paramsPut);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Cargo não encontrado' });
    invalidateStructuralOrgCache(cid);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_ROLE_UPDATE]', err);
    if (err.code === '23503') {
      return res.status(400).json({
        ok: false,
        error: 'Referência inválida: o cargo "superior direto" não existe ou não pertence à sua empresa.'
      });
    }
    res.status(500).json({ ok: false, error: 'Erro ao atualizar cargo' });
  }
});

router.delete('/roles/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE company_roles SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Cargo não encontrado' });
    invalidateStructuralOrgCache(cid);
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_ROLE_DELETE]', err);
    res.status(500).json({ ok: false, error: 'Erro ao remover cargo' });
  }
});

// ============================================================================
// 3. LINHAS DE PRODUÇÃO
// ============================================================================

router.get('/production-lines', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(`
      SELECT pl.*, d.name as department_name, u.name as responsible_name
      FROM production_lines pl
      LEFT JOIN departments d ON pl.department_id = d.id
      LEFT JOIN users u ON pl.responsible_id = u.id
      WHERE pl.company_id = $1 AND pl.active
      ORDER BY pl.name
    `, [cid]);
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_LINES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar linhas' });
  }
});

router.get('/production-lines/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const pl = await db.query(`
      SELECT pl.*, d.name as department_name, u.name as responsible_name
      FROM production_lines pl
      LEFT JOIN departments d ON pl.department_id = d.id
      LEFT JOIN users u ON pl.responsible_id = u.id
      WHERE pl.id = $1 AND pl.company_id = $2
    `, [req.params.id, cid]);
    if (pl.rows.length === 0) return res.status(404).json({ ok: false, error: 'Linha não encontrada' });
    const machines = await db.query(`
      SELECT * FROM production_line_machines WHERE line_id = $1 ORDER BY flow_order NULLS LAST, name
    `, [req.params.id]);
    res.json({ ok: true, data: { ...pl.rows[0], machines: machines.rows } });
  } catch (err) {
    console.error('[STRUCTURAL_LINE_GET]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar linha' });
  }
});

router.post('/production-lines', ...adminMw, auditMiddleware({ action: 'production_line_created', entityType: 'structural', severity: 'info' }), async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO production_lines (company_id, name, code, department_id, unit_plant,
        process_type, productive_capacity, status, responsible_id, description,
        main_bottleneck, critical_point, operation_time, criticality_level, operational_notes,
        main_product_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      cid, b.name || '', b.code, b.department_id || null, b.unit_plant,
      b.process_type, b.productive_capacity, b.status || 'active', b.responsible_id || null,
      b.description, b.main_bottleneck, b.critical_point, b.operation_time,
      b.criticality_level, b.operational_notes, b.main_product_id || null
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_LINE_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/production-lines/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE production_lines SET
        name = COALESCE($3, name), code = COALESCE($4, code), department_id = $5,
        unit_plant = COALESCE($6, unit_plant), process_type = COALESCE($7, process_type),
        productive_capacity = COALESCE($8, productive_capacity), status = COALESCE($9, status),
        responsible_id = $10, description = COALESCE($11, description),
        main_bottleneck = COALESCE($12, main_bottleneck),
        critical_point = COALESCE($13, critical_point),
        operation_time = COALESCE($14, operation_time),
        criticality_level = COALESCE($15, criticality_level),
        operational_notes = COALESCE($16, operational_notes),
        main_product_id = $17, updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [
      cid, req.params.id, b.name, b.code, b.department_id || null, b.unit_plant,
      b.process_type, b.productive_capacity, b.status, b.responsible_id || null,
      b.description, b.main_bottleneck, b.critical_point, b.operation_time,
      b.criticality_level, b.operational_notes, b.main_product_id || null
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Linha não encontrada' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_LINE_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/production-lines/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE production_lines SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Linha não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_LINE_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Máquinas da linha
router.post('/production-lines/:id/machines', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const chk = await db.query('SELECT id FROM production_lines WHERE id = $1 AND company_id = $2', [req.params.id, cid]);
    if (chk.rows.length === 0) return res.status(404).json({ ok: false, error: 'Linha não encontrada' });
    const b = req.body;
    const r = await db.query(`
      INSERT INTO production_line_machines (line_id, name, nickname, code_tag, function_in_process,
        machine_type, manufacturer, model, serial_number, year, status, criticality,
        flow_order, department_id, common_failures, downtime_impact, technical_notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      req.params.id, b.name || '', b.nickname, b.code_tag, b.function_in_process,
      b.machine_type, b.manufacturer, b.model, b.serial_number, b.year,
      b.status || 'active', b.criticality, b.flow_order, b.department_id || null,
      b.common_failures || [], b.downtime_impact, b.technical_notes
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_LINE_MACHINE_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/production-lines/:lineId/machines/:machineId', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const { lineId, machineId } = req.params;
    if (!isValidUUID(lineId) || !isValidUUID(machineId)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const chk = await db.query('SELECT id FROM production_lines WHERE id = $1 AND company_id = $2', [lineId, cid]);
    if (chk.rows.length === 0) return res.status(404).json({ ok: false, error: 'Linha não encontrada' });
    const b = req.body;
    const r = await db.query(`
      UPDATE production_line_machines SET
        name = COALESCE($2, name), nickname = COALESCE($3, nickname), code_tag = COALESCE($4, code_tag),
        function_in_process = COALESCE($5, function_in_process),
        machine_type = COALESCE($6, machine_type), manufacturer = COALESCE($7, manufacturer),
        model = COALESCE($8, model), serial_number = COALESCE($9, serial_number),
        year = COALESCE($10, year), status = COALESCE($11, status),
        criticality = COALESCE($12, criticality), flow_order = COALESCE($13, flow_order),
        department_id = $14, common_failures = COALESCE($15, common_failures),
        downtime_impact = COALESCE($16, downtime_impact), technical_notes = COALESCE($17, technical_notes),
        updated_at = now()
      WHERE id = $18 AND line_id = $1
      RETURNING *
    `, [
      lineId, b.name, b.nickname, b.code_tag, b.function_in_process, b.machine_type,
      b.manufacturer, b.model, b.serial_number, b.year, b.status, b.criticality,
      b.flow_order, b.department_id || null, b.common_failures, b.downtime_impact,
      b.technical_notes, machineId
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Máquina não encontrada' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_LINE_MACHINE_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/production-lines/:lineId/machines/:machineId', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const { lineId, machineId } = req.params;
    if (!isValidUUID(lineId) || !isValidUUID(machineId)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const chk = await db.query('SELECT id FROM production_lines WHERE id = $1 AND company_id = $2', [lineId, cid]);
    if (chk.rows.length === 0) return res.status(404).json({ ok: false, error: 'Linha não encontrada' });
    await db.query('DELETE FROM production_line_machines WHERE id = $1 AND line_id = $2', [machineId, lineId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_LINE_MACHINE_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 4. ATIVOS / MÁQUINAS
// ============================================================================

router.get('/assets', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(`
      SELECT a.*, d.name as department_name, pl.name as line_name
      FROM assets a
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN production_lines pl ON a.line_id = pl.id
      WHERE a.company_id = $1 AND a.active
      ORDER BY a.name
    `, [cid]);
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_ASSETS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar ativos' });
  }
});

router.post('/assets', ...adminMw, auditMiddleware({ action: 'asset_created', entityType: 'structural', severity: 'info' }), async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO assets (company_id, name, code_patrimonial, operational_nickname, asset_category,
        equipment_type, department_id, line_id, process_id, manufacturer, model, serial_number,
        year, installation_date, current_state, operational_status, criticality,
        main_components, power_source, recurrent_failures, frequent_symptoms, associated_risks,
        downtime_impact, technical_responsible_id, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *
    `, [
      cid, b.name || '', b.code_patrimonial, b.operational_nickname, b.asset_category,
      b.equipment_type, b.department_id || null, b.line_id || null, b.process_id || null,
      b.manufacturer, b.model, b.serial_number, b.year, b.installation_date || null,
      b.current_state, b.operational_status || 'active', b.criticality,
      b.main_components || [], b.power_source, b.recurrent_failures || [],
      b.frequent_symptoms || [], b.associated_risks || [], b.downtime_impact,
      b.technical_responsible_id || null, b.notes
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_ASSET_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/assets/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE assets SET
        name = COALESCE($3, name), code_patrimonial = COALESCE($4, code_patrimonial),
        operational_nickname = COALESCE($5, operational_nickname),
        asset_category = COALESCE($6, asset_category), equipment_type = COALESCE($7, equipment_type),
        department_id = $8, line_id = $9, process_id = $10,
        manufacturer = COALESCE($11, manufacturer), model = COALESCE($12, model),
        serial_number = COALESCE($13, serial_number), year = COALESCE($14, year),
        installation_date = $15, current_state = COALESCE($16, current_state),
        operational_status = COALESCE($17, operational_status),
        criticality = COALESCE($18, criticality),
        main_components = COALESCE($19, main_components),
        power_source = COALESCE($20, power_source),
        recurrent_failures = COALESCE($21, recurrent_failures),
        frequent_symptoms = COALESCE($22, frequent_symptoms),
        associated_risks = COALESCE($23, associated_risks),
        downtime_impact = COALESCE($24, downtime_impact),
        technical_responsible_id = $25, notes = COALESCE($26, notes),
        updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [
      cid, req.params.id, b.name, b.code_patrimonial, b.operational_nickname,
      b.asset_category, b.equipment_type, b.department_id || null, b.line_id || null,
      b.process_id || null, b.manufacturer, b.model, b.serial_number, b.year,
      b.installation_date || null, b.current_state, b.operational_status,
      b.criticality, b.main_components, b.power_source, b.recurrent_failures,
      b.frequent_symptoms, b.associated_risks, b.downtime_impact,
      b.technical_responsible_id || null, b.notes
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Ativo não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_ASSET_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/assets/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE assets SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Ativo não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_ASSET_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 5. PROCESSOS
// ============================================================================

router.get('/processes', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(`
      SELECT cp.*, d.name as responsible_area_name
      FROM company_processes cp
      LEFT JOIN departments d ON cp.responsible_area_id = d.id
      WHERE cp.company_id = $1 AND cp.active
      ORDER BY cp.name
    `, [cid]);
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_PROCESSES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar processos' });
  }
});

router.post('/processes', ...adminMw, auditMiddleware({ action: 'process_created', entityType: 'structural', severity: 'info' }), async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO company_processes (company_id, name, category, objective, responsible_area_id,
        involved_sectors, process_steps, process_inputs, process_outputs, responsibles,
        process_indicators, process_risks, critical_points, frequency,
        related_procedures, dependencies, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      cid, b.name || '', b.category, b.objective, b.responsible_area_id || null,
      b.involved_sectors || [], b.process_steps || null, b.process_inputs || [],
      b.process_outputs || [], b.responsibles || [], b.process_indicators || [],
      b.process_risks || [], b.critical_points || [], b.frequency,
      b.related_procedures || [], b.dependencies || [], b.notes
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_PROCESS_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/processes/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE company_processes SET
        name = COALESCE($3, name), category = COALESCE($4, category),
        objective = COALESCE($5, objective), responsible_area_id = $6,
        involved_sectors = COALESCE($7, involved_sectors),
        process_steps = COALESCE($8, process_steps),
        process_inputs = COALESCE($9, process_inputs),
        process_outputs = COALESCE($10, process_outputs),
        responsibles = COALESCE($11, responsibles),
        process_indicators = COALESCE($12, process_indicators),
        process_risks = COALESCE($13, process_risks),
        critical_points = COALESCE($14, critical_points),
        frequency = COALESCE($15, frequency),
        related_procedures = COALESCE($16, related_procedures),
        dependencies = COALESCE($17, dependencies),
        notes = COALESCE($18, notes), updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [
      cid, req.params.id, b.name, b.category, b.objective, b.responsible_area_id || null,
      b.involved_sectors, b.process_steps, b.process_inputs, b.process_outputs,
      b.responsibles, b.process_indicators, b.process_risks, b.critical_points,
      b.frequency, b.related_procedures, b.dependencies, b.notes
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Processo não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_PROCESS_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/processes/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE company_processes SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Processo não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_PROCESS_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 6. PRODUTOS
// ============================================================================

router.get('/products', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(`
      SELECT p.*, pl.name as line_name, d.name as department_name
      FROM company_products p
      LEFT JOIN production_lines pl ON p.line_id = pl.id
      LEFT JOIN departments d ON p.main_department_id = d.id
      WHERE p.company_id = $1 AND p.active
      ORDER BY p.name
    `, [cid]);
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_PRODUCTS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar produtos' });
  }
});

router.post('/products', ...adminMw, auditMiddleware({ action: 'product_created', entityType: 'structural', severity: 'info' }), async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO company_products (company_id, name, code, category, description,
        line_id, main_department_id, process_id, packaging, quality_standards,
        critical_requirements, important_specs, associated_risks, avg_production_time,
        related_procedures, technical_notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      cid, b.name || '', b.code, b.category, b.description,
      b.line_id || null, b.main_department_id || null, b.process_id || null,
      b.packaging, b.quality_standards || [], b.critical_requirements || [],
      b.important_specs || [], b.associated_risks || [], b.avg_production_time,
      b.related_procedures || [], b.technical_notes
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_PRODUCT_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/products/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE company_products SET
        name = COALESCE($3, name), code = COALESCE($4, code), category = COALESCE($5, category),
        description = COALESCE($6, description), line_id = $7, main_department_id = $8,
        process_id = $9, packaging = COALESCE($10, packaging),
        quality_standards = COALESCE($11, quality_standards),
        critical_requirements = COALESCE($12, critical_requirements),
        important_specs = COALESCE($13, important_specs),
        associated_risks = COALESCE($14, associated_risks),
        avg_production_time = COALESCE($15, avg_production_time),
        related_procedures = COALESCE($16, related_procedures),
        technical_notes = COALESCE($17, technical_notes),
        updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [
      cid, req.params.id, b.name, b.code, b.category, b.description,
      b.line_id || null, b.main_department_id || null, b.process_id || null,
      b.packaging, b.quality_standards, b.critical_requirements,
      b.important_specs, b.associated_risks, b.avg_production_time,
      b.related_procedures, b.technical_notes
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Produto não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_PRODUCT_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/products/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE company_products SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Produto não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_PRODUCT_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 8. METAS E INDICADORES
// ============================================================================

router.get('/indicators', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(`
      SELECT ki.*, d.name as department_name, pl.name as line_name
      FROM kpi_indicators ki
      LEFT JOIN departments d ON ki.department_id = d.id
      LEFT JOIN production_lines pl ON ki.line_id = pl.id
      WHERE ki.company_id = $1 AND ki.active
      ORDER BY ki.name
    `, [cid]);
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_INDICATORS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar indicadores' });
  }
});

router.post('/indicators', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO kpi_indicators (company_id, name, indicator_type, department_id, line_id,
        process_id, target_value, min_acceptable, max_acceptable, attention_range,
        critical_range, measurement_frequency, unit, responsible_id,
        deviation_action, strategic_weight, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      cid, b.name || '', b.indicator_type, b.department_id || null, b.line_id || null,
      b.process_id || null, b.target_value, b.min_acceptable, b.max_acceptable,
      b.attention_range, b.critical_range, b.measurement_frequency, b.unit,
      b.responsible_id || null, b.deviation_action, b.strategic_weight || null, b.notes
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_INDICATOR_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/indicators/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE kpi_indicators SET
        name = COALESCE($3, name), indicator_type = COALESCE($4, indicator_type),
        department_id = $5, line_id = $6, process_id = $7,
        target_value = COALESCE($8, target_value), min_acceptable = $9, max_acceptable = $10,
        attention_range = COALESCE($11, attention_range),
        critical_range = COALESCE($12, critical_range),
        measurement_frequency = COALESCE($13, measurement_frequency),
        unit = COALESCE($14, unit), responsible_id = $15,
        deviation_action = COALESCE($16, deviation_action),
        strategic_weight = $17, notes = COALESCE($18, notes),
        updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [
      cid, req.params.id, b.name, b.indicator_type, b.department_id || null,
      b.line_id || null, b.process_id || null, b.target_value, b.min_acceptable,
      b.max_acceptable, b.attention_range, b.critical_range, b.measurement_frequency,
      b.unit, b.responsible_id || null, b.deviation_action, b.strategic_weight, b.notes
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Indicador não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_INDICATOR_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/indicators/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE kpi_indicators SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Indicador não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_INDICATOR_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 9. FALHAS E RISCOS
// ============================================================================

router.get('/failure-risks', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(`
      SELECT fr.*, d.name as department_name, pl.name as line_name
      FROM failure_risks fr
      LEFT JOIN departments d ON fr.department_id = d.id
      LEFT JOIN production_lines pl ON fr.line_id = pl.id
      WHERE fr.company_id = $1 AND fr.active
      ORDER BY fr.criticality_level, fr.name
    `, [cid]);
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_FAILURE_RISKS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar falhas e riscos' });
  }
});

router.post('/failure-risks', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO failure_risks (company_id, name, failure_type, risk_category,
        department_id, line_id, asset_id, process_id, possible_causes, common_symptoms,
        operational_impact, quality_impact, safety_impact, productivity_impact,
        criticality_level, expected_frequency, default_response_plan,
        default_responsible_id, suggested_escalation, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      cid, b.name || '', b.failure_type, b.risk_category,
      b.department_id || null, b.line_id || null, b.asset_id || null, b.process_id || null,
      b.possible_causes || [], b.common_symptoms || [],
      b.operational_impact, b.quality_impact, b.safety_impact, b.productivity_impact,
      b.criticality_level, b.expected_frequency, b.default_response_plan,
      b.default_responsible_id || null, b.suggested_escalation, b.notes
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_FAILURE_RISK_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/failure-risks/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE failure_risks SET
        name = COALESCE($3, name), failure_type = COALESCE($4, failure_type),
        risk_category = COALESCE($5, risk_category),
        department_id = $6, line_id = $7, asset_id = $8, process_id = $9,
        possible_causes = COALESCE($10, possible_causes),
        common_symptoms = COALESCE($11, common_symptoms),
        operational_impact = COALESCE($12, operational_impact),
        quality_impact = COALESCE($13, quality_impact),
        safety_impact = COALESCE($14, safety_impact),
        productivity_impact = COALESCE($15, productivity_impact),
        criticality_level = COALESCE($16, criticality_level),
        expected_frequency = COALESCE($17, expected_frequency),
        default_response_plan = COALESCE($18, default_response_plan),
        default_responsible_id = $19, suggested_escalation = COALESCE($20, suggested_escalation),
        notes = COALESCE($21, notes), updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [
      cid, req.params.id, b.name, b.failure_type, b.risk_category,
      b.department_id || null, b.line_id || null, b.asset_id || null, b.process_id || null,
      b.possible_causes, b.common_symptoms, b.operational_impact, b.quality_impact,
      b.safety_impact, b.productivity_impact, b.criticality_level, b.expected_frequency,
      b.default_response_plan, b.default_responsible_id || null, b.suggested_escalation, b.notes
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Falha/Risco não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_FAILURE_RISK_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/failure-risks/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE failure_risks SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Falha/Risco não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_FAILURE_RISK_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 10. REGRAS DE COMUNICAÇÃO
// ============================================================================

router.get('/communication-rules', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(
      'SELECT * FROM communication_rules WHERE company_id = $1 AND active ORDER BY subject_type',
      [cid]
    );
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_COM_RULES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar regras de comunicação' });
  }
});

router.post('/communication-rules', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO communication_rules (company_id, subject_type, priority_level,
        profile_can_view, profile_must_notify, profile_must_approve, profile_must_act,
        notification_hours, preferred_channel, escalation_rules,
        max_response_time, max_resolution_time, confidentiality_level,
        sensitive_topic, language_by_profile, communication_flow, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      cid, b.subject_type || '', b.priority_level,
      b.profile_can_view || [], b.profile_must_notify || [], b.profile_must_approve || [],
      b.profile_must_act || [], b.notification_hours, b.preferred_channel,
      b.escalation_rules ? JSON.stringify(b.escalation_rules) : null,
      b.max_response_time, b.max_resolution_time, b.confidentiality_level,
      !!b.sensitive_topic, b.language_by_profile ? JSON.stringify(b.language_by_profile) : null,
      b.communication_flow, b.notes
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_COM_RULE_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/communication-rules/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE communication_rules SET
        subject_type = COALESCE($3, subject_type), priority_level = COALESCE($4, priority_level),
        profile_can_view = COALESCE($5, profile_can_view),
        profile_must_notify = COALESCE($6, profile_must_notify),
        profile_must_approve = COALESCE($7, profile_must_approve),
        profile_must_act = COALESCE($8, profile_must_act),
        notification_hours = COALESCE($9, notification_hours),
        preferred_channel = COALESCE($10, preferred_channel),
        escalation_rules = COALESCE($11::jsonb, escalation_rules),
        max_response_time = COALESCE($12, max_response_time),
        max_resolution_time = COALESCE($13, max_resolution_time),
        confidentiality_level = COALESCE($14, confidentiality_level),
        sensitive_topic = COALESCE($15, sensitive_topic),
        language_by_profile = COALESCE($16::jsonb, language_by_profile),
        communication_flow = COALESCE($17, communication_flow),
        notes = COALESCE($18, notes), updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [
      cid, req.params.id, b.subject_type, b.priority_level,
      b.profile_can_view, b.profile_must_notify, b.profile_must_approve, b.profile_must_act,
      b.notification_hours, b.preferred_channel,
      b.escalation_rules ? JSON.stringify(b.escalation_rules) : null,
      b.max_response_time, b.max_resolution_time, b.confidentiality_level,
      b.sensitive_topic, b.language_by_profile ? JSON.stringify(b.language_by_profile) : null,
      b.communication_flow, b.notes
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Regra não encontrada' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_COM_RULE_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/communication-rules/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE communication_rules SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Regra não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_COM_RULE_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 11. ROTINAS E CHECKLISTS
// ============================================================================

router.get('/routines', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(`
      SELECT rt.*, d.name as department_name, pl.name as line_name, u.name as responsible_name
      FROM routines rt
      LEFT JOIN departments d ON rt.department_id = d.id
      LEFT JOIN production_lines pl ON rt.line_id = pl.id
      LEFT JOIN users u ON rt.responsible_id = u.id
      WHERE rt.company_id = $1 AND rt.active
      ORDER BY rt.name
    `, [cid]);
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_ROUTINES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar rotinas' });
  }
});

router.post('/routines', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO routines (company_id, name, routine_type, department_id, line_id, asset_id,
        frequency, expected_time, responsible_id, checklist_id, verification_items,
        conformity_criteria, related_procedures, non_conformity_action, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      cid, b.name || '', b.routine_type, b.department_id || null, b.line_id || null, b.asset_id || null,
      b.frequency, b.expected_time, b.responsible_id || null, b.checklist_id || null,
      b.verification_items ? JSON.stringify(b.verification_items) : null,
      b.conformity_criteria || [], b.related_procedures || [],
      b.non_conformity_action, b.notes
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_ROUTINE_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/routines/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE routines SET
        name = COALESCE($3, name), routine_type = COALESCE($4, routine_type),
        department_id = $5, line_id = $6, asset_id = $7,
        frequency = COALESCE($8, frequency), expected_time = COALESCE($9, expected_time),
        responsible_id = $10, checklist_id = $11,
        verification_items = COALESCE($12::jsonb, verification_items),
        conformity_criteria = COALESCE($13, conformity_criteria),
        related_procedures = COALESCE($14, related_procedures),
        non_conformity_action = COALESCE($15, non_conformity_action),
        notes = COALESCE($16, notes), updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [
      cid, req.params.id, b.name, b.routine_type, b.department_id || null,
      b.line_id || null, b.asset_id || null, b.frequency, b.expected_time,
      b.responsible_id || null, b.checklist_id || null,
      b.verification_items ? JSON.stringify(b.verification_items) : null,
      b.conformity_criteria, b.related_procedures, b.non_conformity_action, b.notes
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Rotina não encontrada' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_ROUTINE_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/routines/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE routines SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Rotina não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_ROUTINE_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Checklists
router.get('/checklists', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(
      'SELECT * FROM checklist_templates WHERE company_id = $1 ORDER BY name',
      [cid]
    );
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_CHECKLISTS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar checklists' });
  }
});

router.post('/checklists', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO checklist_templates (company_id, name, description, items, department_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [cid, b.name || '', b.description, b.items ? JSON.stringify(b.items) : null, b.department_id || null]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_CHECKLIST_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/checklists/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE checklist_templates SET
        name = COALESCE($3, name), description = COALESCE($4, description),
        items = COALESCE($5::jsonb, items), department_id = $6, updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [cid, req.params.id, b.name, b.description, b.items ? JSON.stringify(b.items) : null, b.department_id || null]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Checklist não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_CHECKLIST_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/checklists/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query('DELETE FROM checklist_templates WHERE id = $1 AND company_id = $2 RETURNING id', [req.params.id, cid]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Checklist não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_CHECKLIST_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 12. TURNOS
// ============================================================================

router.get('/shifts', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(
      'SELECT * FROM shifts WHERE company_id = $1 AND active ORDER BY start_time NULLS LAST',
      [cid]
    );
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_SHIFTS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar turnos' });
  }
});

router.post('/shifts', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO shifts (company_id, name, start_time, end_time, active_departments,
        active_lines, main_teams, shift_responsibles, shift_leader_id,
        operational_notes, shift_routines, common_risks, special_rules)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      cid, b.name || '', b.start_time || null, b.end_time || null,
      b.active_departments || [], b.active_lines || [], b.main_teams || [],
      b.shift_responsibles || [], b.shift_leader_id || null,
      b.operational_notes, b.shift_routines || [], b.common_risks || [], b.special_rules
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_SHIFT_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/shifts/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE shifts SET
        name = COALESCE($3, name), start_time = $4, end_time = $5,
        active_departments = COALESCE($6, active_departments),
        active_lines = COALESCE($7, active_lines),
        main_teams = COALESCE($8, main_teams),
        shift_responsibles = COALESCE($9, shift_responsibles),
        shift_leader_id = $10,
        operational_notes = COALESCE($11, operational_notes),
        shift_routines = COALESCE($12, shift_routines),
        common_risks = COALESCE($13, common_risks),
        special_rules = COALESCE($14, special_rules),
        updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [
      cid, req.params.id, b.name, b.start_time || null, b.end_time || null,
      b.active_departments, b.active_lines, b.main_teams, b.shift_responsibles,
      b.shift_leader_id || null, b.operational_notes, b.shift_routines, b.common_risks, b.special_rules
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Turno não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_SHIFT_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/shifts/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE shifts SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Turno não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_SHIFT_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 13. RESPONSÁVEIS POR ÁREA
// ============================================================================

router.get('/area-responsibles', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(`
      SELECT ar.*, u1.name as main_responsible_name, u2.name as substitute_name
      FROM area_responsibles ar
      LEFT JOIN users u1 ON ar.main_responsible_id = u1.id
      LEFT JOIN users u2 ON ar.substitute_responsible_id = u2.id
      WHERE ar.company_id = $1 AND ar.active
      ORDER BY ar.area_name
    `, [cid]);
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_AREA_RESP]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar responsáveis' });
  }
});

router.post('/area-responsibles', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO area_responsibles (company_id, area_name, area_type, main_responsible_id,
        substitute_responsible_id, supervisor_id, manager_id, director_id,
        responsible_themes, responsible_assets, responsible_lines, responsible_processes,
        contact_rules, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      cid, b.area_name || '', b.area_type, b.main_responsible_id || null,
      b.substitute_responsible_id || null, b.supervisor_id || null, b.manager_id || null,
      b.director_id || null, b.responsible_themes || [], b.responsible_assets || [],
      b.responsible_lines || [], b.responsible_processes || [],
      b.contact_rules, b.notes
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_AREA_RESP_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/area-responsibles/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE area_responsibles SET
        area_name = COALESCE($3, area_name), area_type = COALESCE($4, area_type),
        main_responsible_id = $5, substitute_responsible_id = $6,
        supervisor_id = $7, manager_id = $8, director_id = $9,
        responsible_themes = COALESCE($10, responsible_themes),
        responsible_assets = COALESCE($11, responsible_assets),
        responsible_lines = COALESCE($12, responsible_lines),
        responsible_processes = COALESCE($13, responsible_processes),
        contact_rules = COALESCE($14, contact_rules),
        notes = COALESCE($15, notes), updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [
      cid, req.params.id, b.area_name, b.area_type,
      b.main_responsible_id || null, b.substitute_responsible_id || null,
      b.supervisor_id || null, b.manager_id || null, b.director_id || null,
      b.responsible_themes, b.responsible_assets, b.responsible_lines,
      b.responsible_processes, b.contact_rules, b.notes
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Responsável não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_AREA_RESP_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/area-responsibles/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE area_responsibles SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Responsável não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_AREA_RESP_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 14. CONFIGURAÇÕES DE INTELIGÊNCIA IA
// ============================================================================

router.get('/ai-config', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(
      'SELECT * FROM ai_intelligence_config WHERE company_id = $1 AND active ORDER BY config_key',
      [cid]
    );
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_AI_CONFIG]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar configurações IA' });
  }
});

router.post('/ai-config', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(`
      INSERT INTO ai_intelligence_config (company_id, config_key, config_type,
        internal_terms, machine_nicknames, internal_acronyms, critical_words,
        sensitive_words, confidential_themes, priority_themes, forbidden_per_profile,
        response_rules_per_profile, language_preference, auto_alert_rules,
        monitoring_triggers, escalation_contexts, discrete_response_contexts,
        immediate_response_contexts, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      cid, b.config_key || 'default', b.config_type,
      b.internal_terms || [], b.machine_nicknames ? JSON.stringify(b.machine_nicknames) : null,
      b.internal_acronyms || [], b.critical_words || [], b.sensitive_words || [],
      b.confidential_themes || [], b.priority_themes || [],
      b.forbidden_per_profile ? JSON.stringify(b.forbidden_per_profile) : null,
      b.response_rules_per_profile ? JSON.stringify(b.response_rules_per_profile) : null,
      b.language_preference,
      b.auto_alert_rules ? JSON.stringify(b.auto_alert_rules) : null,
      b.monitoring_triggers ? JSON.stringify(b.monitoring_triggers) : null,
      b.escalation_contexts || [], b.discrete_response_contexts || [],
      b.immediate_response_contexts || [], b.notes
    ]);
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_AI_CONFIG_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/ai-config/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(`
      UPDATE ai_intelligence_config SET
        config_key = COALESCE($3, config_key), config_type = COALESCE($4, config_type),
        internal_terms = COALESCE($5, internal_terms),
        machine_nicknames = COALESCE($6::jsonb, machine_nicknames),
        internal_acronyms = COALESCE($7, internal_acronyms),
        critical_words = COALESCE($8, critical_words),
        sensitive_words = COALESCE($9, sensitive_words),
        confidential_themes = COALESCE($10, confidential_themes),
        priority_themes = COALESCE($11, priority_themes),
        forbidden_per_profile = COALESCE($12::jsonb, forbidden_per_profile),
        response_rules_per_profile = COALESCE($13::jsonb, response_rules_per_profile),
        language_preference = COALESCE($14, language_preference),
        auto_alert_rules = COALESCE($15::jsonb, auto_alert_rules),
        monitoring_triggers = COALESCE($16::jsonb, monitoring_triggers),
        escalation_contexts = COALESCE($17, escalation_contexts),
        discrete_response_contexts = COALESCE($18, discrete_response_contexts),
        immediate_response_contexts = COALESCE($19, immediate_response_contexts),
        notes = COALESCE($20, notes), updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `, [
      cid, req.params.id, b.config_key, b.config_type,
      b.internal_terms, b.machine_nicknames ? JSON.stringify(b.machine_nicknames) : null,
      b.internal_acronyms, b.critical_words, b.sensitive_words,
      b.confidential_themes, b.priority_themes,
      b.forbidden_per_profile ? JSON.stringify(b.forbidden_per_profile) : null,
      b.response_rules_per_profile ? JSON.stringify(b.response_rules_per_profile) : null,
      b.language_preference,
      b.auto_alert_rules ? JSON.stringify(b.auto_alert_rules) : null,
      b.monitoring_triggers ? JSON.stringify(b.monitoring_triggers) : null,
      b.escalation_contexts, b.discrete_response_contexts, b.immediate_response_contexts, b.notes
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Configuração não encontrada' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_AI_CONFIG_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/ai-config/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE ai_intelligence_config SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Configuração não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_AI_CONFIG_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 7b. BASE DE CONHECIMENTO (metadados — complementa a Biblioteca de Arquivos)
// ============================================================================

router.get('/knowledge-documents', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(
      `
      SELECT kd.*, d.name AS department_name, pl.name AS line_name
      FROM company_knowledge_documents kd
      LEFT JOIN departments d ON kd.department_id = d.id
      LEFT JOIN production_lines pl ON kd.line_id = pl.id
      WHERE kd.company_id = $1 AND kd.active
      ORDER BY kd.title
    `,
      [cid]
    );
    res.json({ ok: true, data: r.rows });
  } catch (err) {
    console.error('[STRUCTURAL_KNOWLEDGE_LIST]', err);
    res.status(500).json({ ok: false, error: 'Erro ao listar documentos de conhecimento' });
  }
});

router.post('/knowledge-documents', ...adminMw, auditMiddleware({ action: 'knowledge_doc_created', entityType: 'structural', severity: 'info' }), async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const b = req.body;
    const r = await db.query(
      `
      INSERT INTO company_knowledge_documents (
        company_id, title, doc_type, category, summary,
        department_id, line_id, asset_id, process_id, product_id,
        version, valid_until, responsible_id, keywords,
        confidentiality_level, allowed_audience, external_url, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `,
      [
        cid,
        b.title || '',
        b.doc_type || null,
        b.category || null,
        b.summary || null,
        b.department_id || null,
        b.line_id || null,
        b.asset_id || null,
        b.process_id || null,
        b.product_id || null,
        b.version || null,
        b.valid_until || null,
        b.responsible_id || null,
        b.keywords || [],
        b.confidentiality_level || null,
        b.allowed_audience || [],
        b.external_url || null,
        b.notes || null
      ]
    );
    res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_KNOWLEDGE_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/knowledge-documents/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const b = req.body;
    const r = await db.query(
      `
      UPDATE company_knowledge_documents SET
        title = COALESCE($3, title),
        doc_type = COALESCE($4, doc_type),
        category = COALESCE($5, category),
        summary = COALESCE($6, summary),
        department_id = $7,
        line_id = $8,
        asset_id = $9,
        process_id = $10,
        product_id = $11,
        version = COALESCE($12, version),
        valid_until = $13,
        responsible_id = $14,
        keywords = COALESCE($15, keywords),
        confidentiality_level = COALESCE($16, confidentiality_level),
        allowed_audience = COALESCE($17, allowed_audience),
        external_url = COALESCE($18, external_url),
        notes = COALESCE($19, notes),
        updated_at = now()
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `,
      [
        cid,
        req.params.id,
        b.title,
        b.doc_type,
        b.category,
        b.summary,
        b.department_id || null,
        b.line_id || null,
        b.asset_id || null,
        b.process_id || null,
        b.product_id || null,
        b.version,
        b.valid_until || null,
        b.responsible_id || null,
        b.keywords,
        b.confidentiality_level,
        b.allowed_audience,
        b.external_url,
        b.notes
      ]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Documento não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[STRUCTURAL_KNOWLEDGE_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/knowledge-documents/:id', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(
      'UPDATE company_knowledge_documents SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, cid]
    );
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Documento não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[STRUCTURAL_KNOWLEDGE_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// REFERÊNCIAS (para dropdowns nos formulários)
// ============================================================================

router.get('/references', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const [depts, lines, processes, products, assets, users, roles, shifts, checklists] = await Promise.all([
      db.query('SELECT id, name FROM departments WHERE company_id = $1 AND active ORDER BY name', [cid]),
      db.query('SELECT id, name, code FROM production_lines WHERE company_id = $1 AND active ORDER BY name', [cid]),
      db.query('SELECT id, name FROM company_processes WHERE company_id = $1 AND active ORDER BY name', [cid]),
      db.query('SELECT id, name, code FROM company_products WHERE company_id = $1 AND active ORDER BY name', [cid]),
      db.query('SELECT id, name, code_patrimonial FROM assets WHERE company_id = $1 AND active ORDER BY name', [cid]),
      db.query('SELECT id, name, role FROM users WHERE company_id = $1 AND active AND deleted_at IS NULL ORDER BY name', [cid]),
      db.query('SELECT id, name FROM company_roles WHERE company_id = $1 AND active ORDER BY hierarchy_level, name', [cid]),
      db.query('SELECT id, name FROM shifts WHERE company_id = $1 AND active ORDER BY start_time NULLS LAST', [cid]),
      db.query('SELECT id, name FROM checklist_templates WHERE company_id = $1 ORDER BY name', [cid])
    ]);
    res.json({
      ok: true,
      data: {
        departments: depts.rows,
        productionLines: lines.rows,
        processes: processes.rows,
        products: products.rows,
        assets: assets.rows,
        users: users.rows,
        roles: roles.rows,
        shifts: shifts.rows,
        checklists: checklists.rows
      }
    });
  } catch (err) {
    console.error('[STRUCTURAL_REFERENCES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar referências' });
  }
});

module.exports = router;
