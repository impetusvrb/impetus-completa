/**
 * Biblioteca Técnica Inteligente — Central técnica de ativos 3D (ManuIA)
 * POST/PUT/PATCH/DELETE: admin + company_id
 */
'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth, requireRole, requireCompanyId } = require('../middleware/auth');
const ctrl = require('../modules/technicalLibrary/controllers/technicalLibraryController');

const router = express.Router();

const adminCompany = [requireAuth, requireRole('admin'), requireCompanyId];

function cid(req) {
  return req.user.company_id;
}

const baseUpload = path.join(__dirname, '../../../uploads/technical-library');

function ensureDir(companyId, equipmentId, sub) {
  const dir = path.join(baseUpload, String(companyId), String(equipmentId), sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const modelStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      cb(null, ensureDir(cid(req), req.params.id, 'models'));
    } catch (e) {
      cb(e);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.glb';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`);
  }
});

const docStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      cb(null, ensureDir(cid(req), req.params.id, 'documents'));
    } catch (e) {
      cb(e);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`);
  }
});

const csvStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const dir = path.join(baseUpload, String(cid(req)), '_import');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (e) {
      cb(e);
    }
  },
  filename: (_req, file, cb) => {
    cb(null, `import-${Date.now()}-${file.originalname || 'data.csv'}`);
  }
});

function modelFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (['glb', 'gltf', 'fbx', 'obj'].includes(ext)) return cb(null, true);
  cb(new Error('Apenas .glb, .gltf, .fbx ou .obj'));
}

function docFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx'].includes(ext)) return cb(null, true);
  cb(new Error('Tipo de documento não suportado'));
}

const uploadModel = multer({
  storage: modelStorage,
  limits: { fileSize: 120 * 1024 * 1024 },
  fileFilter: modelFilter
});

const uploadDoc = multer({
  storage: docStorage,
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: docFilter
});

const uploadCsv = multer({
  storage: csvStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext === '.csv' || file.mimetype === 'text/csv') return cb(null, true);
    cb(new Error('Envie um arquivo .csv'));
  }
});

router.get('/health', ...adminCompany, (_req, res) => {
  res.json({ ok: true, module: 'technical-library-inteligente', version: 1 });
});

router.get('/audit', ...adminCompany, ctrl.listAudit);

router.post('/import/csv', ...adminCompany, uploadCsv.single('file'), ctrl.importCsv);
router.post('/resolve/test', ...adminCompany, ctrl.testResolve);

router.get('/equipments', ...adminCompany, ctrl.listEquipments);
router.post('/equipments', ...adminCompany, ctrl.createEquipment);
router.get('/equipments/:id', ...adminCompany, ctrl.getEquipment);
router.put('/equipments/:id', ...adminCompany, ctrl.updateEquipment);
router.delete('/equipments/:id', ...adminCompany, ctrl.deleteEquipment);

router.post('/equipments/:id/keywords', ...adminCompany, ctrl.postKeywords);
router.post('/equipments/:id/models', ...adminCompany, uploadModel.single('file'), ctrl.postModel);
router.post('/equipments/:id/documents', ...adminCompany, uploadDoc.single('file'), ctrl.postDocument);
router.post('/equipments/:id/parts', ...adminCompany, ctrl.postPart);

router.post('/equipments/:id/build-unity-payload', ...adminCompany, ctrl.buildUnity);
router.post('/equipments/:id/build-procedural-payload', ...adminCompany, ctrl.buildProcedural);

router.patch('/models/:id/set-primary', ...adminCompany, ctrl.setPrimaryModel);
router.patch('/models/:id', ...adminCompany, ctrl.patchModel);
router.delete('/models/:id', ...adminCompany, ctrl.deleteModel);

router.delete('/documents/:id', ...adminCompany, ctrl.deleteDocument);

router.delete('/keywords/:id', ...adminCompany, ctrl.deleteKeyword);

router.put('/parts/:id', ...adminCompany, ctrl.putPart);
router.delete('/parts/:id', ...adminCompany, ctrl.deletePart);

module.exports = router;
