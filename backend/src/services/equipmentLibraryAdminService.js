/**
 * Biblioteca técnica de equipamentos — operações de dados (company-scoped).
 * Usado apenas por rotas com requireRole('admin') + requireCompanyId.
 */
const db = require('../db');
const { isValidUUID } = require('../utils/security');

async function listAssets(companyId) {
  const r = await db.query(
    `
    SELECT a.*, d.name as department_name, pl.name as line_name
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN production_lines pl ON a.line_id = pl.id
    WHERE a.company_id = $1 AND a.active
    ORDER BY a.name
  `,
    [companyId]
  );
  return r.rows;
}

async function getAsset(companyId, id) {
  if (!isValidUUID(id)) return null;
  const r = await db.query(
    `SELECT a.*, d.name as department_name, pl.name as line_name
     FROM assets a
     LEFT JOIN departments d ON a.department_id = d.id
     LEFT JOIN production_lines pl ON a.line_id = pl.id
     WHERE a.id = $2 AND a.company_id = $1 AND a.active`,
    [companyId, id]
  );
  return r.rows[0] || null;
}

async function createAsset(companyId, body) {
  const b = body || {};
  const r = await db.query(
    `
    INSERT INTO assets (company_id, name, code_patrimonial, operational_nickname, asset_category,
      equipment_type, department_id, line_id, process_id, manufacturer, model, serial_number,
      year, installation_date, current_state, operational_status, criticality,
      main_components, power_source, recurrent_failures, frequent_symptoms, associated_risks,
      downtime_impact, technical_responsible_id, notes,
      model_3d_url, manual_pdf_url, model_3d_is_primary)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
    RETURNING *
  `,
    [
      companyId,
      b.name || '',
      b.code_patrimonial,
      b.operational_nickname,
      b.asset_category,
      b.equipment_type,
      b.department_id || null,
      b.line_id || null,
      b.process_id || null,
      b.manufacturer,
      b.model,
      b.serial_number,
      b.year,
      b.installation_date || null,
      b.current_state,
      b.operational_status || 'active',
      b.criticality,
      b.main_components || [],
      b.power_source,
      b.recurrent_failures || [],
      b.frequent_symptoms || [],
      b.associated_risks || [],
      b.downtime_impact,
      b.technical_responsible_id || null,
      b.notes,
      b.model_3d_url || null,
      b.manual_pdf_url || null,
      b.model_3d_is_primary === true
    ]
  );
  return r.rows[0];
}

async function updateAsset(companyId, id, body) {
  if (!isValidUUID(id)) return null;
  const b = body || {};
  const r = await db.query(
    `
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
      model_3d_url = COALESCE($27, model_3d_url),
      manual_pdf_url = COALESCE($28, manual_pdf_url),
      model_3d_is_primary = COALESCE($29, model_3d_is_primary),
      updated_at = now()
    WHERE id = $2 AND company_id = $1
    RETURNING *
  `,
    [
      companyId,
      id,
      b.name,
      b.code_patrimonial,
      b.operational_nickname,
      b.asset_category,
      b.equipment_type,
      b.department_id || null,
      b.line_id || null,
      b.process_id || null,
      b.manufacturer,
      b.model,
      b.serial_number,
      b.year,
      b.installation_date || null,
      b.current_state,
      b.operational_status,
      b.criticality,
      b.main_components,
      b.power_source,
      b.recurrent_failures,
      b.frequent_symptoms,
      b.associated_risks,
      b.downtime_impact,
      b.technical_responsible_id || null,
      b.notes,
      b.model_3d_url,
      b.manual_pdf_url,
      b.model_3d_is_primary
    ]
  );
  return r.rows[0] || null;
}

async function softDeleteAsset(companyId, id) {
  if (!isValidUUID(id)) return false;
  const r = await db.query(
    'UPDATE assets SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
    [id, companyId]
  );
  return r.rows.length > 0;
}

async function listKnowledgeDocuments(companyId) {
  const r = await db.query(
    `
    SELECT kd.*, d.name AS department_name, pl.name AS line_name
    FROM company_knowledge_documents kd
    LEFT JOIN departments d ON kd.department_id = d.id
    LEFT JOIN production_lines pl ON kd.line_id = pl.id
    WHERE kd.company_id = $1 AND kd.active
    ORDER BY kd.title
  `,
    [companyId]
  );
  return r.rows;
}

async function createKnowledgeDocument(companyId, body) {
  const b = body || {};
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
      companyId,
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
  return r.rows[0];
}

async function updateKnowledgeDocument(companyId, id, body) {
  if (!isValidUUID(id)) return null;
  const b = body || {};
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
      companyId,
      id,
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
  return r.rows[0] || null;
}

async function softDeleteKnowledgeDocument(companyId, id) {
  if (!isValidUUID(id)) return false;
  const r = await db.query(
    'UPDATE company_knowledge_documents SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING id',
    [id, companyId]
  );
  return r.rows.length > 0;
}

async function listSpareParts(companyId) {
  try {
    const r = await db.query(
      `SELECT * FROM manuia_spare_parts WHERE company_id = $1 ORDER BY name`,
      [companyId]
    );
    return r.rows;
  } catch (e) {
    if (String(e.message || '').includes('manuia_spare_parts')) return [];
    throw e;
  }
}

function normalizeKeywords(k) {
  if (k == null) return null;
  if (Array.isArray(k)) return k.map((s) => String(s).trim()).filter(Boolean);
  return String(k)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function upsertSparePart(companyId, row) {
  const kw = normalizeKeywords(row.keywords);
  const r = await db.query(
    `
    INSERT INTO manuia_spare_parts (company_id, code, name, qty, reorder_point, max_qty, lead_time_days, asset_id, suggested_by_ai, keywords)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (company_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      qty = COALESCE(EXCLUDED.qty, manuia_spare_parts.qty),
      reorder_point = COALESCE(EXCLUDED.reorder_point, manuia_spare_parts.reorder_point),
      max_qty = COALESCE(EXCLUDED.max_qty, manuia_spare_parts.max_qty),
      lead_time_days = COALESCE(EXCLUDED.lead_time_days, manuia_spare_parts.lead_time_days),
      asset_id = COALESCE(EXCLUDED.asset_id, manuia_spare_parts.asset_id),
      keywords = COALESCE(EXCLUDED.keywords, manuia_spare_parts.keywords),
      updated_at = now()
    RETURNING *
  `,
    [
      companyId,
      row.code,
      row.name,
      row.qty ?? 0,
      row.reorder_point ?? 0,
      row.max_qty ?? 20,
      row.lead_time_days ?? 7,
      row.asset_id || null,
      row.suggested_by_ai === true,
      kw
    ]
  );
  return r.rows[0];
}

async function updateSparePartKeywords(companyId, id, keywords) {
  if (!isValidUUID(id)) return null;
  const kw = normalizeKeywords(keywords);
  const r = await db.query(
    `UPDATE manuia_spare_parts SET keywords = $3, updated_at = now() WHERE id = $2 AND company_id = $1 RETURNING *`,
    [companyId, id, kw]
  );
  return r.rows[0] || null;
}

async function validateSparePartSuggestion(companyId, id) {
  if (!isValidUUID(id)) return null;
  const r = await db.query(
    `
    UPDATE manuia_spare_parts SET validated_at = now(), suggested_by_ai = false, updated_at = now()
    WHERE id = $1 AND company_id = $2
    RETURNING *
  `,
    [id, companyId]
  );
  return r.rows[0] || null;
}

async function getReferences(companyId) {
  const [depts, lines, assets] = await Promise.all([
    db.query('SELECT id, name FROM departments WHERE company_id = $1 AND active ORDER BY name', [companyId]),
    db.query('SELECT id, name, code FROM production_lines WHERE company_id = $1 AND active ORDER BY name', [companyId]),
    db.query('SELECT id, name, code_patrimonial FROM assets WHERE company_id = $1 AND active ORDER BY name', [companyId])
  ]);
  return {
    departments: depts.rows,
    productionLines: lines.rows,
    assets: assets.rows
  };
}

async function listTechnical3dModels(companyId, filters = {}) {
  const assetId = filters.asset_id;
  const sparePartId = filters.spare_part_id;
  let sql = `
    SELECT m.*,
      a.name AS asset_name,
      a.code_patrimonial AS asset_code,
      p.code AS spare_part_code,
      p.name AS spare_part_name
    FROM equipment_technical_3d_models m
    LEFT JOIN assets a ON a.id = m.asset_id
    LEFT JOIN manuia_spare_parts p ON p.id = m.spare_part_id
    WHERE m.company_id = $1 AND m.active = true`;
  const params = [companyId];
  let n = 2;
  if (assetId && isValidUUID(assetId)) {
    sql += ` AND m.asset_id = $${n}`;
    params.push(assetId);
    n += 1;
  }
  if (sparePartId && isValidUUID(sparePartId)) {
    sql += ` AND m.spare_part_id = $${n}`;
    params.push(sparePartId);
  }
  sql += ' ORDER BY m.created_at DESC';
  const r = await db.query(sql, params);
  return r.rows;
}

async function nextTechnical3dVersionSeq(companyId, assetId, sparePartId) {
  if (assetId) {
    const r = await db.query(
      `SELECT COALESCE(MAX(version_seq), 0) + 1 AS n FROM equipment_technical_3d_models
       WHERE company_id = $1 AND asset_id = $2 AND active`,
      [companyId, assetId]
    );
    return Number(r.rows[0].n) || 1;
  }
  const r = await db.query(
    `SELECT COALESCE(MAX(version_seq), 0) + 1 AS n FROM equipment_technical_3d_models
     WHERE company_id = $1 AND spare_part_id = $2 AND active`,
    [companyId, sparePartId]
  );
  return Number(r.rows[0].n) || 1;
}

async function refreshAssetModel3dFromCatalog(companyId, assetId) {
  if (!isValidUUID(assetId)) return;
  const r = await db.query(
    `SELECT storage_path FROM equipment_technical_3d_models
     WHERE company_id = $1 AND asset_id = $2 AND active
     ORDER BY is_primary DESC, version_seq DESC, created_at DESC
     LIMIT 1`,
    [companyId, assetId]
  );
  const url = r.rows[0]?.storage_path || null;
  await db.query(
    `UPDATE assets SET model_3d_url = $2, model_3d_is_primary = $3, updated_at = now()
     WHERE id = $1 AND company_id = $4`,
    [assetId, url, !!url, companyId]
  );
}

async function applyPrimaryForAssetModel(companyId, assetId, modelId, storagePath) {
  await db.query(
    `UPDATE equipment_technical_3d_models SET is_primary = false, updated_at = now()
     WHERE company_id = $1 AND asset_id = $2 AND id <> $3 AND active`,
    [companyId, assetId, modelId]
  );
  await db.query(
    `UPDATE equipment_technical_3d_models SET is_primary = true, updated_at = now()
     WHERE id = $1 AND company_id = $2`,
    [modelId, companyId]
  );
  await db.query(
    `UPDATE assets SET model_3d_url = $2, model_3d_is_primary = true, updated_at = now()
     WHERE id = $1 AND company_id = $3`,
    [assetId, storagePath, companyId]
  );
}

async function createTechnical3dModel(companyId, body) {
  const b = body || {};
  const hasAsset = b.asset_id && isValidUUID(b.asset_id);
  const hasPart = b.spare_part_id && isValidUUID(b.spare_part_id);
  if ((hasAsset && hasPart) || (!hasAsset && !hasPart)) {
    throw new Error('Informe asset_id ou spare_part_id (apenas um)');
  }
  if (hasAsset) {
    const a = await db.query(
      'SELECT id FROM assets WHERE id = $1 AND company_id = $2 AND active',
      [b.asset_id, companyId]
    );
    if (!a.rows[0]) throw new Error('Equipamento não encontrado');
  }
  if (hasPart) {
    const p = await db.query('SELECT id FROM manuia_spare_parts WHERE id = $1 AND company_id = $2', [
      b.spare_part_id,
      companyId
    ]);
    if (!p.rows[0]) throw new Error('Peça não encontrada');
  }
  const versionSeq = await nextTechnical3dVersionSeq(
    companyId,
    hasAsset ? b.asset_id : null,
    hasPart ? b.spare_part_id : null
  );
  const isPrimary = b.is_primary === true || b.is_primary === 'true';
  const r = await db.query(
    `
    INSERT INTO equipment_technical_3d_models (
      company_id, asset_id, spare_part_id, storage_path, original_filename, format,
      version_label, version_seq, is_primary, notes, file_size
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `,
    [
      companyId,
      hasAsset ? b.asset_id : null,
      hasPart ? b.spare_part_id : null,
      b.storage_path,
      b.original_filename,
      b.format,
      b.version_label || null,
      versionSeq,
      isPrimary,
      b.notes || null,
      b.file_size != null ? Number(b.file_size) : null
    ]
  );
  const row = r.rows[0];
  if (isPrimary && hasAsset) {
    await applyPrimaryForAssetModel(companyId, b.asset_id, row.id, b.storage_path);
  }
  return row;
}

async function getTechnical3dModel(companyId, id) {
  if (!isValidUUID(id)) return null;
  const r = await db.query(
    `SELECT * FROM equipment_technical_3d_models WHERE id = $1 AND company_id = $2 AND active`,
    [id, companyId]
  );
  return r.rows[0] || null;
}

async function updateTechnical3dModel(companyId, id, body) {
  if (!isValidUUID(id)) return null;
  const cur = await getTechnical3dModel(companyId, id);
  if (!cur) return null;
  const b = body || {};
  const versionLabel = b.version_label !== undefined ? b.version_label : cur.version_label;
  const notes = b.notes !== undefined ? b.notes : cur.notes;
  let isPrimary = cur.is_primary;
  if (b.is_primary === true || b.is_primary === 'true') isPrimary = true;
  if (b.is_primary === false || b.is_primary === 'false') isPrimary = false;

  await db.query(
    `UPDATE equipment_technical_3d_models SET
      version_label = $2,
      notes = $3,
      is_primary = $4,
      updated_at = now()
     WHERE id = $1 AND company_id = $5`,
    [id, versionLabel, notes, isPrimary, companyId]
  );

  if (cur.asset_id) {
    if (isPrimary) {
      await applyPrimaryForAssetModel(companyId, cur.asset_id, id, cur.storage_path);
    } else {
      await refreshAssetModel3dFromCatalog(companyId, cur.asset_id);
    }
  }
  return getTechnical3dModel(companyId, id);
}

async function softDeleteTechnical3dModel(companyId, id) {
  if (!isValidUUID(id)) return null;
  const cur = await getTechnical3dModel(companyId, id);
  if (!cur) return null;
  await db.query(
    `UPDATE equipment_technical_3d_models SET active = false, updated_at = now()
     WHERE id = $1 AND company_id = $2`,
    [id, companyId]
  );
  if (cur.asset_id) {
    await refreshAssetModel3dFromCatalog(companyId, cur.asset_id);
  }
  return cur;
}

module.exports = {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  softDeleteAsset,
  listKnowledgeDocuments,
  createKnowledgeDocument,
  updateKnowledgeDocument,
  softDeleteKnowledgeDocument,
  listSpareParts,
  upsertSparePart,
  updateSparePartKeywords,
  validateSparePartSuggestion,
  getReferences,
  normalizeKeywords,
  listTechnical3dModels,
  createTechnical3dModel,
  getTechnical3dModel,
  updateTechnical3dModel,
  softDeleteTechnical3dModel
};
