/**
 * Biblioteca técnica de equipamentos — EXCLUSIVO role admin + company_id.
 * Cadastro de equipamentos, documentos, peças, uploads; escopo sempre company_id do token.
 */
'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth, requireRole, requireCompanyId } = require('../../middleware/auth');
const { auditMiddleware } = require('../../middleware/audit');
const { isValidUUID } = require('../../utils/security');
const svc = require('../../services/equipmentLibraryAdminService');

const router = express.Router();

const adminOnly = [requireAuth, requireRole('admin'), requireCompanyId];

function cid(req) {
  return req.user.company_id;
}

const uploadRoot = path.join(__dirname, '../../../../uploads/equipment-library');

function ensureUploadDir(companyId) {
  const dir = path.join(uploadRoot, String(companyId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const uploadModel = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      try {
        cb(null, ensureUploadDir(cid(req)));
      } catch (e) {
        cb(e);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.glb';
      const safe = `${req.params.id || 'asset'}-${Date.now()}${ext}`;
      cb(null, safe);
    }
  }),
  limits: { fileSize: 80 * 1024 * 1024 }
});

const uploadPdf = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      try {
        cb(null, ensureUploadDir(cid(req)));
      } catch (e) {
        cb(e);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() === '.pdf' ? '.pdf' : path.extname(file.originalname) || '.pdf';
      cb(null, `manual-${req.params.id || 'asset'}-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 40 * 1024 * 1024 }
});

const uploadCsv = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      try {
        cb(null, ensureUploadDir(cid(req)));
      } catch (e) {
        cb(e);
      }
    },
    filename: (_req, file, cb) => {
      cb(null, `import-${Date.now()}-${file.originalname || 'parts.csv'}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/health', ...adminOnly, (_req, res) => {
  res.json({ ok: true, module: 'equipment-library', access: 'admin_only' });
});

router.get('/references', ...adminOnly, async (req, res) => {
  try {
    const data = await svc.getReferences(cid(req));
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[EQ_LIB_REFERENCES]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/assets', ...adminOnly, async (req, res) => {
  try {
    const data = await svc.listAssets(cid(req));
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[EQ_LIB_ASSETS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/assets/:id', ...adminOnly, async (req, res) => {
  try {
    const row = await svc.getAsset(cid(req), req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'Ativo não encontrado' });
    res.json({ ok: true, data: row });
  } catch (err) {
    console.error('[EQ_LIB_ASSET_GET]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post(
  '/assets',
  ...adminOnly,
  auditMiddleware({ action: 'equipment_library_asset_created', entityType: 'equipment_library', severity: 'info' }),
  async (req, res) => {
    try {
      const row = await svc.createAsset(cid(req), req.body);
      res.status(201).json({ ok: true, data: row });
    } catch (err) {
      console.error('[EQ_LIB_ASSET_CREATE]', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

router.put('/assets/:id', ...adminOnly, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const row = await svc.updateAsset(cid(req), req.params.id, req.body);
    if (!row) return res.status(404).json({ ok: false, error: 'Ativo não encontrado' });
    res.json({ ok: true, data: row });
  } catch (err) {
    console.error('[EQ_LIB_ASSET_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/assets/:id', ...adminOnly, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const ok = await svc.softDeleteAsset(cid(req), req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Ativo não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[EQ_LIB_ASSET_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/assets/:id/model-3d', ...adminOnly, uploadModel.single('file'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'Arquivo obrigatório (field: file)' });
    const rel = `/uploads/equipment-library/${cid(req)}/${req.file.filename}`;
    const row = await svc.updateAsset(cid(req), req.params.id, { model_3d_url: rel, model_3d_is_primary: req.body?.is_primary === true || req.body?.is_primary === 'true' });
    if (!row) return res.status(404).json({ ok: false, error: 'Ativo não encontrado' });
    res.json({ ok: true, data: row, url: rel });
  } catch (err) {
    console.error('[EQ_LIB_MODEL3D]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/assets/:id/manual-pdf', ...adminOnly, uploadPdf.single('file'), async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'Arquivo obrigatório (field: file)' });
    const rel = `/uploads/equipment-library/${cid(req)}/${req.file.filename}`;
    const row = await svc.updateAsset(cid(req), req.params.id, { manual_pdf_url: rel });
    if (!row) return res.status(404).json({ ok: false, error: 'Ativo não encontrado' });
    res.json({ ok: true, data: row, url: rel });
  } catch (err) {
    console.error('[EQ_LIB_MANUAL_PDF]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/knowledge-documents', ...adminOnly, async (req, res) => {
  try {
    const data = await svc.listKnowledgeDocuments(cid(req));
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[EQ_LIB_KD_LIST]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post(
  '/knowledge-documents',
  ...adminOnly,
  auditMiddleware({ action: 'equipment_library_knowledge_created', entityType: 'equipment_library', severity: 'info' }),
  async (req, res) => {
    try {
      const row = await svc.createKnowledgeDocument(cid(req), req.body);
      res.status(201).json({ ok: true, data: row });
    } catch (err) {
      console.error('[EQ_LIB_KD_CREATE]', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

router.put('/knowledge-documents/:id', ...adminOnly, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const row = await svc.updateKnowledgeDocument(cid(req), req.params.id, req.body);
    if (!row) return res.status(404).json({ ok: false, error: 'Documento não encontrado' });
    res.json({ ok: true, data: row });
  } catch (err) {
    console.error('[EQ_LIB_KD_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/knowledge-documents/:id', ...adminOnly, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const ok = await svc.softDeleteKnowledgeDocument(cid(req), req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Documento não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[EQ_LIB_KD_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/spare-parts', ...adminOnly, async (req, res) => {
  try {
    const data = await svc.listSpareParts(cid(req));
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[EQ_LIB_PARTS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/spare-parts', ...adminOnly, async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.code || !b.name) return res.status(400).json({ ok: false, error: 'code e name obrigatórios' });
    const row = await svc.upsertSparePart(cid(req), b);
    res.status(201).json({ ok: true, data: row });
  } catch (err) {
    console.error('[EQ_LIB_PARTS_UPSERT]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch('/spare-parts/:id/keywords', ...adminOnly, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const row = await svc.updateSparePartKeywords(cid(req), req.params.id, req.body?.keywords);
    if (!row) return res.status(404).json({ ok: false, error: 'Peça não encontrada' });
    res.json({ ok: true, data: row });
  } catch (err) {
    console.error('[EQ_LIB_PARTS_KW]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch('/spare-parts/:id/validate-ai', ...adminOnly, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const row = await svc.validateSparePartSuggestion(cid(req), req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: 'Peça não encontrada' });
    res.json({ ok: true, data: row });
  } catch (err) {
    console.error('[EQ_LIB_PARTS_VALIDATE]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

function parsePartsCsvBuffer(buf) {
  const text = buf.toString('utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 1) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const ic = (name) => header.findIndex((h) => h === name || h.includes(name));
  const idxCode = ic('code') >= 0 ? ic('code') : 0;
  const idxName = ic('name') >= 0 ? ic('name') : 1;
  const idxQty = ic('qty') >= 0 ? ic('qty') : (ic('quantidade') >= 0 ? ic('quantidade') : -1);
  const idxReorder = ic('reorder') >= 0 ? ic('reorder') : (ic('ponto') >= 0 ? ic('ponto') : -1);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (!cols[idxCode] && !cols[0]) continue;
    rows.push({
      code: cols[idxCode] || cols[0],
      name: cols[idxName] || cols[1] || cols[0],
      qty: idxQty >= 0 ? parseFloat(cols[idxQty]) || 0 : 0,
      reorder_point: idxReorder >= 0 ? parseFloat(cols[idxReorder]) || 0 : 0
    });
  }
  return rows;
}

router.post('/spare-parts/import-csv', ...adminOnly, uploadCsv.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) return res.status(400).json({ ok: false, error: 'CSV obrigatório (field: file)' });
    const buf = fs.readFileSync(req.file.path);
    try {
      fs.unlinkSync(req.file.path);
    } catch (_) {}
    const parsed = parsePartsCsvBuffer(buf);
    const companyId = cid(req);
    const imported = [];
    for (const row of parsed) {
      if (!row.code || !row.name) continue;
      const r = await svc.upsertSparePart(companyId, row);
      imported.push(r);
    }
    res.json({ ok: true, count: imported.length, data: imported });
  } catch (err) {
    console.error('[EQ_LIB_CSV]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
