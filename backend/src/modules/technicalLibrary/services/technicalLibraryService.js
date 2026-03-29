/**
 * Regras de negócio — Biblioteca Técnica Inteligente
 */
'use strict';

const repo = require('../repositories/technicalLibraryRepository');
const { isValidUUID } = require('../../../utils/security');
const payloadBuilder = require('./payloadBuilderService');
const modelResolver = require('./modelResolverService');

const DOC_TYPES = [
  'manual_tecnico',
  'catalogo',
  'exploded_view',
  'lista_pecas',
  'procedimento',
  'instrucao_manutencao',
  'ficha_tecnica',
  'outro'
];

function computeCompleteness(row) {
  const modelCount = Number(row.model_count) || 0;
  const hasPrimary = !!row.has_primary_model;
  const hasManual = !!row.has_manual_doc;
  const partCount = Number(row.part_count) || 0;
  const kwCount = Number(row.keyword_count) || 0;

  let score = 0;
  if (modelCount > 0) score += hasPrimary ? 35 : 28;
  if (hasManual) score += 25;
  if (partCount > 0) score += 25;
  if (kwCount > 0) score += 15;
  score = Math.min(100, score);

  const badges = [];
  badges.push(modelCount > 0 ? { id: 'model_3d', label: 'Com modelo 3D', variant: 'ok' } : { id: 'no_model', label: 'Sem modelo 3D', variant: 'warn' });
  badges.push(hasManual ? { id: 'manual', label: 'Com manual/doc', variant: 'ok' } : { id: 'no_manual', label: 'Sem manual', variant: 'warn' });
  badges.push(partCount > 0 ? { id: 'parts', label: 'Com peças', variant: 'ok' } : { id: 'no_parts', label: 'Sem peças', variant: 'warn' });

  let statusLabel = 'incompleto';
  if (score >= 85 && modelCount > 0 && hasManual && partCount > 0) statusLabel = 'completo';
  else if (score >= 55) statusLabel = 'parcial';

  badges.push({ id: 'completeness', label: `Completude ${score}%`, variant: statusLabel === 'completo' ? 'ok' : 'neutral' });

  return { completeness_score: score, completeness_status: statusLabel, badges };
}

function enrichEquipmentRow(row) {
  if (!row) return null;
  const { completeness_score, completeness_status, badges } = computeCompleteness(row);
  return {
    ...row,
    completeness_score,
    completeness_status,
    badges
  };
}

async function listEquipments(companyId, query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  const filters = {
    search: (query.search || '').trim() || null,
    category: query.category || null,
    status: query.status || null,
    department_id: query.department_id && isValidUUID(query.department_id) ? query.department_id : null
  };
  const total = await repo.countEquipments(companyId, filters);
  const rows = await repo.findEquipments(companyId, filters, limit, offset);
  return {
    data: rows.map(enrichEquipmentRow),
    pagination: { total, limit, offset }
  };
}

async function getEquipmentDetail(companyId, id) {
  if (!isValidUUID(id)) return null;
  const eq = await repo.findEquipmentById(companyId, id);
  if (!eq) return null;
  const [keywords, models, documents, parts] = await Promise.all([
    repo.listKeywords(companyId, id),
    repo.listModels(companyId, id),
    repo.listDocuments(companyId, id),
    repo.listParts(companyId, id)
  ]);
  const model_count = models.length;
  const has_primary_model = models.some((m) => m.is_primary);
  const has_manual_doc = documents.some((d) =>
    ['manual_tecnico', 'instrucao_manutencao', 'ficha_tecnica'].includes(d.doc_type)
  );
  const part_count = parts.length;
  const keyword_count = keywords.length;
  const summary = enrichEquipmentRow({
    ...eq,
    model_count,
    has_primary_model,
    has_manual_doc,
    part_count,
    keyword_count
  });
  return {
    equipment: summary,
    keywords,
    models,
    documents,
    parts
  };
}

async function createEquipment(companyId, userId, body) {
  const b = body || {};
  if (!b.name || typeof b.name !== 'string' || !b.name.trim()) {
    const err = new Error('Nome do equipamento é obrigatório');
    err.statusCode = 400;
    throw err;
  }
  let st = (b.status || 'ativo').toString().toLowerCase().replace(/[\s-]+/g, '_');
  if (!['ativo', 'inativo', 'em_revisao'].includes(st)) st = 'ativo';
  const row = await repo.insertEquipment({
    company_id: companyId,
    internal_machine_code: b.internal_machine_code,
    manuia_machine_id: b.manuia_machine_id,
    name: b.name.trim(),
    manufacturer: b.manufacturer,
    model: b.model,
    serial_number: b.serial_number,
    year: b.year,
    category: b.category,
    subcategory: b.subcategory,
    department_id: b.department_id,
    location: b.location,
    technical_description: b.technical_description,
    status: st,
    notes: b.notes,
    ia_processing_meta: b.ia_processing_meta || {}
  });
  await repo.insertAudit(companyId, userId, row.id, 'equipment_created', 'equipment', row.id, { name: row.name });
  return row;
}

async function updateEquipment(companyId, userId, id, body) {
  if (!isValidUUID(id)) return null;
  const existing = await repo.findEquipmentById(companyId, id);
  if (!existing) return null;
  const b = body || {};
  let nextStatus = b.status !== undefined ? b.status : existing.status;
  if (b.status !== undefined) {
    const raw = String(b.status).toLowerCase().replace(/[\s-]+/g, '_');
    nextStatus = ['ativo', 'inativo', 'em_revisao'].includes(raw) ? raw : existing.status;
  }
  const row = await repo.updateEquipment(companyId, id, {
    internal_machine_code: b.internal_machine_code !== undefined ? b.internal_machine_code : existing.internal_machine_code,
    manuia_machine_id: b.manuia_machine_id !== undefined ? b.manuia_machine_id : existing.manuia_machine_id,
    name: b.name !== undefined ? b.name : existing.name,
    manufacturer: b.manufacturer !== undefined ? b.manufacturer : existing.manufacturer,
    model: b.model !== undefined ? b.model : existing.model,
    serial_number: b.serial_number !== undefined ? b.serial_number : existing.serial_number,
    year: b.year !== undefined ? b.year : existing.year,
    category: b.category !== undefined ? b.category : existing.category,
    subcategory: b.subcategory !== undefined ? b.subcategory : existing.subcategory,
    department_id: b.department_id !== undefined ? b.department_id : existing.department_id,
    location: b.location !== undefined ? b.location : existing.location,
    technical_description: b.technical_description !== undefined ? b.technical_description : existing.technical_description,
    status: nextStatus,
    notes: b.notes !== undefined ? b.notes : existing.notes,
    ia_processing_meta: b.ia_processing_meta !== undefined ? b.ia_processing_meta : existing.ia_processing_meta
  });
  if (row) await repo.insertAudit(companyId, userId, id, 'equipment_updated', 'equipment', id, {});
  return row;
}

async function deleteEquipment(companyId, userId, id) {
  if (!isValidUUID(id)) return false;
  const ok = await repo.softDeleteEquipment(companyId, id);
  if (ok) await repo.insertAudit(companyId, userId, id, 'equipment_deleted', 'equipment', id, {});
  return ok;
}

async function addKeywords(companyId, userId, equipmentId, items) {
  if (!isValidUUID(equipmentId)) return [];
  const eq = await repo.findEquipmentById(companyId, equipmentId);
  if (!eq) return null;
  const list = Array.isArray(items) ? items : items?.keywords;
  if (!Array.isArray(list)) {
    const err = new Error('Lista de keywords inválida');
    err.statusCode = 400;
    throw err;
  }
  const out = [];
  for (const it of list) {
    const kw = typeof it === 'string' ? it : it?.keyword || it?.text;
    const kt = typeof it === 'object' && it ? it.keyword_type || it.type : 'generic';
    if (!kw || typeof kw !== 'string' || !kw.trim()) continue;
    try {
      const row = await repo.insertKeyword(companyId, equipmentId, kw.trim().slice(0, 500), (kt || 'generic').slice(0, 64));
      out.push(row);
    } catch (e) {
      if (String(e.message).includes('unique') || String(e.message).includes('duplicate')) continue;
      throw e;
    }
  }
  await repo.insertAudit(companyId, userId, equipmentId, 'keywords_added', 'keywords', equipmentId, { count: out.length });
  return out;
}

async function removeKeyword(companyId, userId, keywordId) {
  if (!isValidUUID(keywordId)) return false;
  const kw = await repo.findKeywordById(companyId, keywordId);
  if (!kw) return false;
  const ok = await repo.deleteKeyword(companyId, keywordId);
  if (ok) await repo.insertAudit(companyId, userId, kw.equipment_id, 'keyword_deleted', 'keyword', keywordId, {});
  return ok;
}

function extToFormat(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['glb', 'gltf', 'fbx', 'obj'].includes(ext)) return ext;
  return ext || 'unknown';
}

const ALLOWED_MODEL_EXT = new Set(['glb', 'gltf', 'fbx', 'obj']);

async function addModelFromUpload(companyId, userId, equipmentId, file, body, publicBaseUrl) {
  if (!isValidUUID(equipmentId)) return null;
  const eq = await repo.findEquipmentById(companyId, equipmentId);
  if (!eq) return null;
  const ext = extToFormat(file.originalname);
  if (!ALLOWED_MODEL_EXT.has(ext)) {
    const err = new Error('Formato de modelo não suportado (use .glb, .gltf, .fbx, .obj)');
    err.statusCode = 400;
    throw err;
  }
  const rel = `/uploads/technical-library/${companyId}/${equipmentId}/models/${file.filename}`;
  const models = await repo.listModels(companyId, equipmentId);
  const isFirst = models.length === 0;
  const wantPrimary = body?.is_primary === true || body?.is_primary === 'true' || isFirst;

  const row = await repo.insertModel(companyId, {
    equipment_id: equipmentId,
    file_name: file.originalname,
    format: ext,
    file_url: rel,
    file_size: file.size,
    version: body?.version || null,
    default_scale: body?.default_scale != null ? Number(body.default_scale) : 1,
    rotation_x: body?.rotation_x != null ? Number(body.rotation_x) : 0,
    rotation_y: body?.rotation_y != null ? Number(body.rotation_y) : 0,
    rotation_z: body?.rotation_z != null ? Number(body.rotation_z) : 0,
    position_x: body?.position_x != null ? Number(body.position_x) : null,
    position_y: body?.position_y != null ? Number(body.position_y) : null,
    position_z: body?.position_z != null ? Number(body.position_z) : null,
    notes: body?.notes || null,
    is_primary: false,
    preview_url: body?.preview_url || null,
    unity_metadata: typeof body?.unity_metadata === 'object' ? body.unity_metadata : {}
  });

  if (wantPrimary && row) {
    await repo.setModelPrimary(companyId, row.id);
  }
  await repo.insertAudit(companyId, userId, equipmentId, 'model_uploaded', 'model', row.id, { file_url: rel });
  return { ...row, absolute_url: publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, '')}${rel}` : rel };
}

async function patchModel(companyId, userId, modelId, body) {
  if (!isValidUUID(modelId)) return null;
  const m = await repo.findModelById(companyId, modelId);
  if (!m) return null;
  const row = await repo.updateModel(companyId, modelId, body || {});
  if (row) await repo.insertAudit(companyId, userId, m.equipment_id, 'model_updated', 'model', modelId, {});
  return row;
}

async function setPrimaryModel(companyId, userId, modelId) {
  if (!isValidUUID(modelId)) return null;
  const row = await repo.setModelPrimary(companyId, modelId);
  if (row) await repo.insertAudit(companyId, userId, row.equipment_id, 'model_set_primary', 'model', modelId, {});
  return row;
}

async function deleteModel(companyId, userId, modelId) {
  if (!isValidUUID(modelId)) return false;
  const m = await repo.findModelById(companyId, modelId);
  if (!m) return false;
  const ok = await repo.deleteModel(companyId, modelId);
  if (ok) await repo.insertAudit(companyId, userId, m.equipment_id, 'model_deleted', 'model', modelId, {});
  return ok;
}

async function addDocumentFromUpload(companyId, userId, equipmentId, file, body) {
  if (!isValidUUID(equipmentId)) return null;
  const eq = await repo.findEquipmentById(companyId, equipmentId);
  if (!eq) return null;
  const docType = (body?.doc_type || 'outro').toLowerCase();
  if (!DOC_TYPES.includes(docType)) {
    const err = new Error(`doc_type inválido. Use: ${DOC_TYPES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  const rel = `/uploads/technical-library/${companyId}/${equipmentId}/documents/${file.filename}`;
  const row = await repo.insertDocument(companyId, {
    equipment_id: equipmentId,
    doc_type: docType,
    file_name: file.originalname,
    file_url: rel,
    file_size: file.size,
    language: body?.language || null,
    version: body?.version || null,
    notes: body?.notes || null
  });
  await repo.insertAudit(companyId, userId, equipmentId, 'document_uploaded', 'document', row.id, { doc_type: docType });
  return row;
}

async function deleteDocument(companyId, userId, documentId) {
  if (!isValidUUID(documentId)) return false;
  const d = await repo.findDocumentById(companyId, documentId);
  if (!d) return false;
  const ok = await repo.deleteDocument(companyId, documentId);
  if (ok) await repo.insertAudit(companyId, userId, d.equipment_id, 'document_deleted', 'document', documentId, {});
  return ok;
}

async function createPart(companyId, userId, equipmentId, body) {
  if (!isValidUUID(equipmentId)) return null;
  const eq = await repo.findEquipmentById(companyId, equipmentId);
  if (!eq) return null;
  if (!body?.part_code || !body?.name) {
    const err = new Error('part_code e name são obrigatórios');
    err.statusCode = 400;
    throw err;
  }
  const row = await repo.insertPart(companyId, {
    equipment_id: equipmentId,
    part_code: String(body.part_code).trim(),
    name: String(body.name).trim(),
    technical_name: body.technical_name,
    subsystem: body.subsystem,
    description: body.description,
    reference_position: body.reference_position,
    estimated_dimension: body.estimated_dimension,
    criticality: body.criticality,
    default_status: body.default_status,
    notes: body.notes,
    created_by_ai: body.created_by_ai,
    validated_by_admin: body.validated_by_admin
  });
  await repo.insertAudit(companyId, userId, equipmentId, 'part_created', 'part', row.id, {});
  return row;
}

async function updatePart(companyId, userId, partId, body) {
  if (!isValidUUID(partId)) return null;
  const p = await repo.findPartById(companyId, partId);
  if (!p) return null;
  const row = await repo.updatePart(companyId, partId, body || {});
  if (row) await repo.insertAudit(companyId, userId, p.equipment_id, 'part_updated', 'part', partId, {});
  return row;
}

async function deletePart(companyId, userId, partId) {
  if (!isValidUUID(partId)) return false;
  const p = await repo.findPartById(companyId, partId);
  if (!p) return false;
  const ok = await repo.deletePart(companyId, partId);
  if (ok) await repo.insertAudit(companyId, userId, p.equipment_id, 'part_deleted', 'part', partId, {});
  return ok;
}

function parseCsvLines(buf) {
  const text = buf.toString('utf8');
  return text.split(/\r?\n/).filter((l) => l.trim());
}

async function importEquipmentsCsv(companyId, userId, buf) {
  const lines = parseCsvLines(buf);
  if (lines.length < 2) {
    return { created: [], errors: [{ row: 1, message: 'CSV vazio ou sem cabeçalho' }] };
  }
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const col = (name) => {
    const i = header.findIndex((h) => h === name || h.replace(/\s/g, '_') === name);
    return i;
  };
  const idx = {
    name: col('name') >= 0 ? col('name') : col('nome'),
    internal_machine_code: col('internal_machine_code') >= 0 ? col('internal_machine_code') : col('machine_id'),
    manufacturer: col('manufacturer') >= 0 ? col('manufacturer') : col('fabricante'),
    model: col('model') >= 0 ? col('model') : col('modelo'),
    category: col('category') >= 0 ? col('category') : col('categoria'),
    serial_number: col('serial_number') >= 0 ? col('serial_number') : col('serie'),
    year: col('year') >= 0 ? col('year') : col('ano'),
    status: col('status') >= 0 ? col('status') : -1,
    location: col('location') >= 0 ? col('location') : col('localizacao')
  };
  const created = [];
  const errors = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r].split(',').map((c) => c.trim());
    try {
      const name = idx.name >= 0 ? cols[idx.name] : cols[0];
      if (!name) {
        errors.push({ row: r + 1, message: 'Nome ausente' });
        continue;
      }
      let st = 'ativo';
      if (idx.status >= 0 && cols[idx.status]) {
        const raw = String(cols[idx.status]).toLowerCase().replace(/[\s-]+/g, '_');
        if (['ativo', 'inativo', 'em_revisao'].includes(raw)) st = raw;
      }
      const row = await repo.insertEquipment({
        company_id: companyId,
        internal_machine_code: idx.internal_machine_code >= 0 ? cols[idx.internal_machine_code] || null : null,
        manuia_machine_id: null,
        name,
        manufacturer: idx.manufacturer >= 0 ? cols[idx.manufacturer] || null : null,
        model: idx.model >= 0 ? cols[idx.model] || null : null,
        serial_number: idx.serial_number >= 0 ? cols[idx.serial_number] || null : null,
        year: idx.year >= 0 && cols[idx.year] ? parseInt(cols[idx.year], 10) : null,
        category: idx.category >= 0 ? cols[idx.category] || null : null,
        subcategory: null,
        department_id: null,
        location: idx.location >= 0 ? cols[idx.location] || null : null,
        technical_description: null,
        status: st,
        notes: null,
        ia_processing_meta: {}
      });
      created.push(row);
    } catch (e) {
      errors.push({ row: r + 1, message: e.message || String(e) });
    }
  }
  await repo.insertAudit(companyId, userId, null, 'import_csv', 'import', null, {
    created_count: created.length,
    error_count: errors.length
  });
  return { created, errors };
}

async function buildUnityPayload(companyId, equipmentId, publicBaseUrl) {
  const detail = await getEquipmentDetail(companyId, equipmentId);
  if (!detail) return null;
  return payloadBuilder.buildUnityPayload(detail, publicBaseUrl);
}

async function buildProceduralPayload(companyId, equipmentId) {
  const detail = await getEquipmentDetail(companyId, equipmentId);
  if (!detail) return null;
  return payloadBuilder.buildProceduralPayload(detail);
}

async function testResolve(companyId, body, publicBaseUrl) {
  return modelResolver.resolve(companyId, body || {}, publicBaseUrl);
}

async function listAudit(companyId, query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  const equipmentId = query.equipment_id && isValidUUID(query.equipment_id) ? query.equipment_id : null;
  const rows = await repo.listAuditLogs(companyId, equipmentId, limit, offset);
  return { data: rows };
}

module.exports = {
  DOC_TYPES,
  listEquipments,
  getEquipmentDetail,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  addKeywords,
  removeKeyword,
  addModelFromUpload,
  patchModel,
  setPrimaryModel,
  deleteModel,
  addDocumentFromUpload,
  deleteDocument,
  createPart,
  updatePart,
  deletePart,
  importEquipmentsCsv,
  buildUnityPayload,
  buildProceduralPayload,
  testResolve,
  listAudit,
  enrichEquipmentRow,
  computeCompleteness
};
