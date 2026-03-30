/**
 * HTTP — Biblioteca Técnica Inteligente
 */
'use strict';

const svc = require('../services/technicalLibraryService');
const unityVisualizationPayload = require('../services/unityVisualizationPayloadService');
const { isValidUUID } = require('../../../utils/security');

function publicBaseUrl(req) {
  const env = process.env.PUBLIC_APP_URL || process.env.VITE_API_URL;
  if (env && /^https?:\/\//i.test(env)) return env.replace(/\/$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host');
  return host ? `${proto}://${host}` : '';
}

async function listEquipments(req, res) {
  try {
    const data = await svc.listEquipments(req.user.company_id, req.query);
    res.json({ ok: true, ...data });
  } catch (e) {
    console.error('[TL_LIST]', e);
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
}

async function getEquipment(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const data = await svc.getEquipmentDetail(req.user.company_id, req.params.id);
    if (!data) return res.status(404).json({ ok: false, error: 'Equipamento não encontrado' });
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[TL_GET]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function createEquipment(req, res) {
  try {
    const row = await svc.createEquipment(req.user.company_id, req.user.id, req.body);
    res.status(201).json({ ok: true, data: row });
  } catch (e) {
    console.error('[TL_CREATE]', e);
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
}

async function updateEquipment(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const row = await svc.updateEquipment(req.user.company_id, req.user.id, req.params.id, req.body);
    if (!row) return res.status(404).json({ ok: false, error: 'Equipamento não encontrado' });
    res.json({ ok: true, data: row });
  } catch (e) {
    console.error('[TL_UPDATE]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function deleteEquipment(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const ok = await svc.deleteEquipment(req.user.company_id, req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Equipamento não encontrado' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[TL_DELETE]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function postKeywords(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const data = await svc.addKeywords(req.user.company_id, req.user.id, req.params.id, req.body);
    if (data === null) return res.status(404).json({ ok: false, error: 'Equipamento não encontrado' });
    res.status(201).json({ ok: true, data });
  } catch (e) {
    console.error('[TL_KW]', e);
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
}

async function deleteKeyword(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const ok = await svc.removeKeyword(req.user.company_id, req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Palavra-chave não encontrada' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[TL_KW_DEL]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function postModel(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'Arquivo obrigatório (field: file)' });
    const row = await svc.addModelFromUpload(
      req.user.company_id,
      req.user.id,
      req.params.id,
      req.file,
      req.body,
      publicBaseUrl(req)
    );
    if (!row) return res.status(404).json({ ok: false, error: 'Equipamento não encontrado' });
    res.status(201).json({ ok: true, data: row });
  } catch (e) {
    console.error('[TL_MODEL]', e);
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
}

async function patchModel(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const row = await svc.patchModel(req.user.company_id, req.user.id, req.params.id, req.body);
    if (!row) return res.status(404).json({ ok: false, error: 'Modelo não encontrado' });
    res.json({ ok: true, data: row });
  } catch (e) {
    console.error('[TL_MODEL_PATCH]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function setPrimaryModel(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const row = await svc.setPrimaryModel(req.user.company_id, req.user.id, req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'Modelo não encontrado' });
    res.json({ ok: true, data: row });
  } catch (e) {
    console.error('[TL_MODEL_PRIMARY]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function deleteModel(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const ok = await svc.deleteModel(req.user.company_id, req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Modelo não encontrado' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[TL_MODEL_DEL]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function postDocument(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'Arquivo obrigatório (field: file)' });
    const row = await svc.addDocumentFromUpload(req.user.company_id, req.user.id, req.params.id, req.file, req.body);
    if (!row) return res.status(404).json({ ok: false, error: 'Equipamento não encontrado' });
    res.status(201).json({ ok: true, data: row });
  } catch (e) {
    console.error('[TL_DOC]', e);
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
}

async function deleteDocument(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const ok = await svc.deleteDocument(req.user.company_id, req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Documento não encontrado' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[TL_DOC_DEL]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function postPart(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const row = await svc.createPart(req.user.company_id, req.user.id, req.params.id, req.body);
    if (!row) return res.status(404).json({ ok: false, error: 'Equipamento não encontrado' });
    res.status(201).json({ ok: true, data: row });
  } catch (e) {
    console.error('[TL_PART]', e);
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
}

async function putPart(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const row = await svc.updatePart(req.user.company_id, req.user.id, req.params.id, req.body);
    if (!row) return res.status(404).json({ ok: false, error: 'Peça não encontrada' });
    res.json({ ok: true, data: row });
  } catch (e) {
    console.error('[TL_PART_PUT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function deletePart(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const ok = await svc.deletePart(req.user.company_id, req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Peça não encontrada' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[TL_PART_DEL]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function importCsv(req, res) {
  try {
    if (!req.file || !req.file.path) return res.status(400).json({ ok: false, error: 'CSV obrigatório (field: file)' });
    const fs = require('fs');
    const buf = fs.readFileSync(req.file.path);
    try {
      fs.unlinkSync(req.file.path);
    } catch (_) {}
    const result = await svc.importEquipmentsCsv(req.user.company_id, req.user.id, buf);
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[TL_IMPORT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function buildUnity(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const payload = await svc.buildUnityPayload(req.user.company_id, req.params.id, publicBaseUrl(req));
    if (!payload) return res.status(404).json({ ok: false, error: 'Equipamento não encontrado' });
    res.json({ ok: true, data: payload });
  } catch (e) {
    console.error('[TL_UNITY]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function buildProcedural(req, res) {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const payload = await svc.buildProceduralPayload(req.user.company_id, req.params.id);
    if (!payload) return res.status(404).json({ ok: false, error: 'Equipamento não encontrado' });
    res.json({ ok: true, data: payload });
  } catch (e) {
    console.error('[TL_PROC]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function testResolve(req, res) {
  try {
    const data = await svc.testResolve(req.user.company_id, req.body, publicBaseUrl(req));
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[TL_RESOLVE]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

async function listAudit(req, res) {
  try {
    const data = await svc.listAudit(req.user.company_id, req.query);
    res.json({ ok: true, ...data });
  } catch (e) {
    console.error('[TL_AUDIT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST body: { source: 'alarm'|'ai', alarm?: {...}, ai?: {...}, context?: {...} }
 * Payload visual unificado para Unity (contrato modelId, renderMode, labels, overlayData, fallbackLevel).
 */
async function buildUnityVisualPayload(req, res) {
  try {
    const b = req.body || {};
    const src = String(b.source || '').toLowerCase();
    if (src === 'alarm') {
      const data = await unityVisualizationPayload.buildFromAlarmIntegration(
        req.user.company_id,
        b.alarm || b,
        publicBaseUrl(req)
      );
      return res.json({ ok: true, data });
    }
    if (src === 'ai') {
      const data = await unityVisualizationPayload.buildFromAiAnalysisResult(
        req.user.company_id,
        b.ai || {},
        b.context || {},
        publicBaseUrl(req)
      );
      return res.json({ ok: true, data });
    }
    return res.status(400).json({
      ok: false,
      error: 'Informe source: "alarm" ou "ai" (e o objeto correspondente).'
    });
  } catch (e) {
    console.error('[TL_UNITY_VISUAL]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = {
  listEquipments,
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  postKeywords,
  deleteKeyword,
  postModel,
  patchModel,
  setPrimaryModel,
  deleteModel,
  postDocument,
  deleteDocument,
  postPart,
  putPart,
  deletePart,
  importCsv,
  buildUnity,
  buildProcedural,
  testResolve,
  listAudit,
  buildUnityVisualPayload
};
