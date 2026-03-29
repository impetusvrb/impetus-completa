/**
 * Acesso a dados — Biblioteca Técnica Inteligente (multi-tenant por company_id)
 */
'use strict';

const db = require('../../../db');

const MANUAL_DOC_TYPES = ['manual_tecnico', 'instrucao_manutencao', 'ficha_tecnica'];

async function countEquipments(companyId, filters) {
  const { search, category, status, department_id } = filters;
  const params = [companyId];
  let p = 2;
  let where = 'e.company_id = $1 AND e.active = true';
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (e.name ILIKE $${p} OR e.manufacturer ILIKE $${p} OR e.model ILIKE $${p} OR e.internal_machine_code ILIKE $${p})`;
    p++;
  }
  if (category) {
    params.push(category);
    where += ` AND e.category = $${p++}`;
  }
  if (status) {
    params.push(status);
    where += ` AND e.status = $${p++}`;
  }
  if (department_id) {
    params.push(department_id);
    where += ` AND e.department_id = $${p++}`;
  }
  const r = await db.query(`SELECT COUNT(*)::int AS c FROM technical_library_equipments e WHERE ${where}`, params);
  return r.rows[0]?.c || 0;
}

async function findEquipments(companyId, filters, limit, offset) {
  const { search, category, status, department_id } = filters;
  const params = [companyId];
  let p = 2;
  let where = 'e.company_id = $1 AND e.active = true';
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (e.name ILIKE $${p} OR e.manufacturer ILIKE $${p} OR e.model ILIKE $${p} OR e.internal_machine_code ILIKE $${p})`;
    p++;
  }
  if (category) {
    params.push(category);
    where += ` AND e.category = $${p++}`;
  }
  if (status) {
    params.push(status);
    where += ` AND e.status = $${p++}`;
  }
  if (department_id) {
    params.push(department_id);
    where += ` AND e.department_id = $${p++}`;
  }
  params.push(limit, offset);
  const limIdx = p++;
  const offIdx = p;

  const sql = `
    SELECT e.*,
      COALESCE(m.cnt, 0)::int AS model_count,
      COALESCE(m.has_primary, false) AS has_primary_model,
      COALESCE(d.has_manual, false) AS has_manual_doc,
      COALESCE(pt.part_count, 0)::int AS part_count,
      COALESCE(kw.kw_count, 0)::int AS keyword_count
    FROM technical_library_equipments e
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt,
             bool_or(is_primary) AS has_primary
      FROM technical_library_models tm
      WHERE tm.company_id = e.company_id AND tm.equipment_id = e.id
    ) m ON true
    LEFT JOIN LATERAL (
      SELECT EXISTS (
        SELECT 1 FROM technical_library_documents td
        WHERE td.company_id = e.company_id AND td.equipment_id = e.id
          AND td.doc_type IN ('manual_tecnico', 'instrucao_manutencao', 'ficha_tecnica')
      ) AS has_manual
    ) d ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS part_count FROM technical_library_parts tp
      WHERE tp.company_id = e.company_id AND tp.equipment_id = e.id
    ) pt ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS kw_count FROM technical_library_keywords tk
      WHERE tk.company_id = e.company_id AND tk.equipment_id = e.id
    ) kw ON true
    WHERE ${where}
    ORDER BY e.updated_at DESC
    LIMIT $${limIdx} OFFSET $${offIdx}
  `;
  const r = await db.query(sql, params);
  return r.rows;
}

async function findEquipmentById(companyId, id) {
  const r = await db.query(
    `SELECT * FROM technical_library_equipments WHERE company_id = $1 AND id = $2 AND active = true`,
    [companyId, id]
  );
  return r.rows[0] || null;
}

async function findEquipmentByInternalMachineCode(companyId, code) {
  if (!code) return null;
  const r = await db.query(
    `SELECT * FROM technical_library_equipments WHERE company_id = $1 AND internal_machine_code = $2 AND active = true LIMIT 1`,
    [companyId, code]
  );
  return r.rows[0] || null;
}

/**
 * Melhor correspondência para texto livre (nome, código, fabricante, modelo, keywords).
 * Usado pelo ModelResolver / pesquisa ManuIA — prioriza código interno e nome exato.
 */
async function findBestEquipmentMatchForLibrarySearch(companyId, rawQuery) {
  const q = (rawQuery || '').trim();
  if (!q || q.length < 2) return null;
  const safe = q.replace(/[%_\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safe) return null;
  const like = `%${safe}%`;
  try {
    const r = await db.query(
      `
      SELECT e.*,
        CASE
          WHEN e.internal_machine_code IS NOT NULL AND lower(btrim(e.internal_machine_code)) = lower(btrim($2::text)) THEN 0
          WHEN lower(btrim(e.name)) = lower(btrim($2::text)) THEN 1
          WHEN e.internal_machine_code ILIKE $3 THEN 2
          WHEN e.name ILIKE $3 THEN 3
          WHEN e.manufacturer ILIKE $3 OR e.model ILIKE $3 THEN 4
          ELSE 5
        END AS match_rank
      FROM technical_library_equipments e
      WHERE e.company_id = $1 AND e.active = true
      AND (
        e.internal_machine_code ILIKE $3
        OR e.name ILIKE $3
        OR e.manufacturer ILIKE $3
        OR e.model ILIKE $3
        OR EXISTS (
          SELECT 1 FROM technical_library_keywords k
          WHERE k.equipment_id = e.id AND k.company_id = e.company_id AND k.keyword ILIKE $3
        )
      )
      ORDER BY match_rank ASC, e.updated_at DESC
      LIMIT 1
      `,
      [companyId, q, like]
    );
    return r.rows[0] || null;
  } catch (e) {
    if (String(e.message || '').includes('technical_library') || String(e.message || '').includes('does not exist')) {
      return null;
    }
    throw e;
  }
}

async function insertEquipment(row) {
  const r = await db.query(
    `INSERT INTO technical_library_equipments (
      company_id, internal_machine_code, manuia_machine_id, name, manufacturer, model, serial_number, year,
      category, subcategory, department_id, location, technical_description, status, notes, ia_processing_meta
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING *`,
    [
      row.company_id,
      row.internal_machine_code || null,
      row.manuia_machine_id || null,
      row.name,
      row.manufacturer || null,
      row.model || null,
      row.serial_number || null,
      row.year ?? null,
      row.category || null,
      row.subcategory || null,
      row.department_id || null,
      row.location || null,
      row.technical_description || null,
      row.status || 'ativo',
      row.notes || null,
      row.ia_processing_meta || {}
    ]
  );
  return r.rows[0];
}

async function updateEquipment(companyId, id, row) {
  const r = await db.query(
    `UPDATE technical_library_equipments SET
      internal_machine_code = COALESCE($3, internal_machine_code),
      manuia_machine_id = $4,
      name = COALESCE($5, name),
      manufacturer = COALESCE($6, manufacturer),
      model = COALESCE($7, model),
      serial_number = COALESCE($8, serial_number),
      year = $9,
      category = COALESCE($10, category),
      subcategory = COALESCE($11, subcategory),
      department_id = $12,
      location = COALESCE($13, location),
      technical_description = COALESCE($14, technical_description),
      status = COALESCE($15, status),
      notes = COALESCE($16, notes),
      ia_processing_meta = COALESCE($17, ia_processing_meta),
      updated_at = now()
    WHERE company_id = $1 AND id = $2 AND active = true
    RETURNING *`,
    [
      companyId,
      id,
      row.internal_machine_code,
      row.manuia_machine_id,
      row.name,
      row.manufacturer,
      row.model,
      row.serial_number,
      row.year ?? null,
      row.category,
      row.subcategory,
      row.department_id || null,
      row.location,
      row.technical_description,
      row.status,
      row.notes,
      row.ia_processing_meta
    ]
  );
  return r.rows[0] || null;
}

async function softDeleteEquipment(companyId, id) {
  const r = await db.query(
    `UPDATE technical_library_equipments SET active = false, updated_at = now() WHERE company_id = $1 AND id = $2 RETURNING id`,
    [companyId, id]
  );
  return r.rows.length > 0;
}

async function listKeywords(companyId, equipmentId) {
  const r = await db.query(
    `SELECT * FROM technical_library_keywords WHERE company_id = $1 AND equipment_id = $2 ORDER BY created_at`,
    [companyId, equipmentId]
  );
  return r.rows;
}

async function insertKeyword(companyId, equipmentId, keyword, keywordType) {
  const r = await db.query(
    `INSERT INTO technical_library_keywords (company_id, equipment_id, keyword, keyword_type)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [companyId, equipmentId, keyword, keywordType || 'generic']
  );
  return r.rows[0];
}

async function findKeywordById(companyId, keywordId) {
  const r = await db.query(
    `SELECT * FROM technical_library_keywords WHERE company_id = $1 AND id = $2`,
    [companyId, keywordId]
  );
  return r.rows[0] || null;
}

async function deleteKeyword(companyId, keywordId) {
  const r = await db.query(
    `DELETE FROM technical_library_keywords WHERE company_id = $1 AND id = $2 RETURNING id`,
    [companyId, keywordId]
  );
  return r.rows.length > 0;
}

async function listModels(companyId, equipmentId) {
  const r = await db.query(
    `SELECT * FROM technical_library_models WHERE company_id = $1 AND equipment_id = $2 ORDER BY is_primary DESC, created_at`,
    [companyId, equipmentId]
  );
  return r.rows;
}

async function findModelById(companyId, modelId) {
  const r = await db.query(
    `SELECT * FROM technical_library_models WHERE company_id = $1 AND id = $2`,
    [companyId, modelId]
  );
  return r.rows[0] || null;
}

async function insertModel(companyId, row) {
  const r = await db.query(
    `INSERT INTO technical_library_models (
      company_id, equipment_id, file_name, format, file_url, file_size, version,
      default_scale, rotation_x, rotation_y, rotation_z, position_x, position_y, position_z,
      notes, is_primary, preview_url, unity_metadata
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING *`,
    [
      companyId,
      row.equipment_id,
      row.file_name,
      row.format,
      row.file_url,
      row.file_size ?? null,
      row.version || null,
      row.default_scale ?? 1,
      row.rotation_x ?? 0,
      row.rotation_y ?? 0,
      row.rotation_z ?? 0,
      row.position_x ?? null,
      row.position_y ?? null,
      row.position_z ?? null,
      row.notes || null,
      !!row.is_primary,
      row.preview_url || null,
      row.unity_metadata || {}
    ]
  );
  return r.rows[0];
}

async function updateModel(companyId, modelId, row) {
  const r = await db.query(
    `UPDATE technical_library_models SET
      file_name = COALESCE($3, file_name),
      default_scale = COALESCE($4, default_scale),
      rotation_x = COALESCE($5, rotation_x),
      rotation_y = COALESCE($6, rotation_y),
      rotation_z = COALESCE($7, rotation_z),
      position_x = $8, position_y = $9, position_z = $10,
      notes = COALESCE($11, notes),
      preview_url = COALESCE($12, preview_url),
      unity_metadata = COALESCE($13, unity_metadata)
    WHERE company_id = $1 AND id = $2
    RETURNING *`,
    [
      companyId,
      modelId,
      row.file_name,
      row.default_scale,
      row.rotation_x,
      row.rotation_y,
      row.rotation_z,
      row.position_x,
      row.position_y,
      row.position_z,
      row.notes,
      row.preview_url,
      row.unity_metadata
    ]
  );
  return r.rows[0] || null;
}

async function clearPrimaryForEquipment(client, companyId, equipmentId) {
  await client.query(
    `UPDATE technical_library_models SET is_primary = false WHERE company_id = $1 AND equipment_id = $2`,
    [companyId, equipmentId]
  );
}

async function setModelPrimary(companyId, modelId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const m = await client.query(
      `SELECT equipment_id FROM technical_library_models WHERE company_id = $1 AND id = $2`,
      [companyId, modelId]
    );
    if (!m.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const equipmentId = m.rows[0].equipment_id;
    await clearPrimaryForEquipment(client, companyId, equipmentId);
    const u = await client.query(
      `UPDATE technical_library_models SET is_primary = true WHERE company_id = $1 AND id = $2 RETURNING *`,
      [companyId, modelId]
    );
    await client.query('COMMIT');
    return u.rows[0] || null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function deleteModel(companyId, modelId) {
  const r = await db.query(
    `DELETE FROM technical_library_models WHERE company_id = $1 AND id = $2 RETURNING id`,
    [companyId, modelId]
  );
  return r.rows.length > 0;
}

async function listDocuments(companyId, equipmentId) {
  const r = await db.query(
    `SELECT * FROM technical_library_documents WHERE company_id = $1 AND equipment_id = $2 ORDER BY created_at DESC`,
    [companyId, equipmentId]
  );
  return r.rows;
}

async function insertDocument(companyId, row) {
  const r = await db.query(
    `INSERT INTO technical_library_documents (
      company_id, equipment_id, doc_type, file_name, file_url, file_size, language, version, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      companyId,
      row.equipment_id,
      row.doc_type,
      row.file_name,
      row.file_url,
      row.file_size ?? null,
      row.language || null,
      row.version || null,
      row.notes || null
    ]
  );
  return r.rows[0];
}

async function findDocumentById(companyId, documentId) {
  const r = await db.query(
    `SELECT * FROM technical_library_documents WHERE company_id = $1 AND id = $2`,
    [companyId, documentId]
  );
  return r.rows[0] || null;
}

async function deleteDocument(companyId, documentId) {
  const r = await db.query(
    `DELETE FROM technical_library_documents WHERE company_id = $1 AND id = $2 RETURNING id`,
    [companyId, documentId]
  );
  return r.rows.length > 0;
}

async function listParts(companyId, equipmentId) {
  const r = await db.query(
    `SELECT * FROM technical_library_parts WHERE company_id = $1 AND equipment_id = $2 ORDER BY part_code`,
    [companyId, equipmentId]
  );
  return r.rows;
}

async function findPartById(companyId, partId) {
  const r = await db.query(
    `SELECT * FROM technical_library_parts WHERE company_id = $1 AND id = $2`,
    [companyId, partId]
  );
  return r.rows[0] || null;
}

async function insertPart(companyId, row) {
  const r = await db.query(
    `INSERT INTO technical_library_parts (
      company_id, equipment_id, part_code, name, technical_name, subsystem, description,
      reference_position, estimated_dimension, criticality, default_status, notes,
      created_by_ai, validated_by_admin
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      companyId,
      row.equipment_id,
      row.part_code,
      row.name,
      row.technical_name || null,
      row.subsystem || null,
      row.description || null,
      row.reference_position || null,
      row.estimated_dimension || null,
      row.criticality || 'media',
      row.default_status || null,
      row.notes || null,
      !!row.created_by_ai,
      !!row.validated_by_admin
    ]
  );
  return r.rows[0];
}

async function updatePart(companyId, partId, row) {
  const r = await db.query(
    `UPDATE technical_library_parts SET
      part_code = COALESCE($3, part_code),
      name = COALESCE($4, name),
      technical_name = COALESCE($5, technical_name),
      subsystem = COALESCE($6, subsystem),
      description = COALESCE($7, description),
      reference_position = COALESCE($8, reference_position),
      estimated_dimension = COALESCE($9, estimated_dimension),
      criticality = COALESCE($10, criticality),
      default_status = COALESCE($11, default_status),
      notes = COALESCE($12, notes),
      created_by_ai = COALESCE($13, created_by_ai),
      validated_by_admin = COALESCE($14, validated_by_admin),
      updated_at = now()
    WHERE company_id = $1 AND id = $2
    RETURNING *`,
    [
      companyId,
      partId,
      row.part_code,
      row.name,
      row.technical_name,
      row.subsystem,
      row.description,
      row.reference_position,
      row.estimated_dimension,
      row.criticality,
      row.default_status,
      row.notes,
      row.created_by_ai,
      row.validated_by_admin
    ]
  );
  return r.rows[0] || null;
}

async function deletePart(companyId, partId) {
  const r = await db.query(
    `DELETE FROM technical_library_parts WHERE company_id = $1 AND id = $2 RETURNING id`,
    [companyId, partId]
  );
  return r.rows.length > 0;
}

async function insertAudit(companyId, userId, equipmentId, action, entityType, entityId, payload) {
  await db.query(
    `INSERT INTO technical_library_audit_logs (company_id, user_id, equipment_id, action, entity_type, entity_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [companyId, userId || null, equipmentId || null, action, entityType || null, entityId || null, payload || null]
  );
}

async function listAuditLogs(companyId, equipmentId, limit, offset) {
  const r = await db.query(
    `SELECT * FROM technical_library_audit_logs
     WHERE company_id = $1 AND ($2::uuid IS NULL OR equipment_id = $2)
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [companyId, equipmentId || null, limit, offset]
  );
  return r.rows;
}

module.exports = {
  MANUAL_DOC_TYPES,
  countEquipments,
  findEquipments,
  findEquipmentById,
  findEquipmentByInternalMachineCode,
  findBestEquipmentMatchForLibrarySearch,
  insertEquipment,
  updateEquipment,
  softDeleteEquipment,
  listKeywords,
  insertKeyword,
  findKeywordById,
  deleteKeyword,
  listModels,
  findModelById,
  insertModel,
  updateModel,
  setModelPrimary,
  deleteModel,
  listDocuments,
  insertDocument,
  findDocumentById,
  deleteDocument,
  listParts,
  findPartById,
  insertPart,
  updatePart,
  deletePart,
  insertAudit,
  listAuditLogs
};
