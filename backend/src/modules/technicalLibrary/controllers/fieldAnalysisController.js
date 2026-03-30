'use strict';

const { v4: uuidv4 } = require('uuid');
const fieldSvc = require('../services/fieldAnalysisService');
const { isValidUUID } = require('../../../utils/security');

function publicBaseUrl(req) {
  const env = process.env.PUBLIC_APP_URL || process.env.VITE_API_URL;
  if (env && /^https?:\/\//i.test(env)) return env.replace(/\/$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host');
  return host ? `${proto}://${host}` : '';
}

function prepareFieldAnalysisDir(baseUpload) {
  const fs = require('fs');
  const path = require('path');
  return function prepareFieldAnalysisDirMw(req, res, next) {
    try {
      if (!req.user || !req.user.company_id) {
        return res.status(401).json({ ok: false, error: 'Não autenticado' });
      }
      const id = uuidv4();
      req.fieldAnalysisId = id;
      req.fieldAnalysisDir = path.join(baseUpload, String(req.user.company_id), 'field-analysis', id);
      fs.mkdirSync(req.fieldAnalysisDir, { recursive: true });
      next();
    } catch (e) {
      console.error('[FIELD_ANALYSIS_DIR]', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  };
}

function fieldStorage(baseUpload) {
  const path = require('path');
  const multer = require('multer');
  return multer.diskStorage({
    destination: (req, _file, cb) => {
      cb(null, req.fieldAnalysisDir || path.join(baseUpload, 'tmp'));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
    }
  });
}

function fieldFileFilter(_req, file, cb) {
  const path = require('path');
  const ext = path.extname(file.originalname || '').toLowerCase();
  const okImg = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  const okVid = ['.mp4', '.webm', '.mov', '.mkv'].includes(ext);
  const m = (file.mimetype || '').toLowerCase();
  if (okImg || m.startsWith('image/')) return cb(null, true);
  if (okVid || m.startsWith('video/')) return cb(null, true);
  cb(new Error('Tipo de arquivo não suportado (imagens: jpg, png, webp; vídeo: mp4, webm, mov)'));
}

function createFieldMulter(baseUpload) {
  const multer = require('multer');
  return multer({
    storage: fieldStorage(baseUpload),
    limits: { fileSize: 120 * 1024 * 1024, files: 15 },
    fileFilter: fieldFileFilter
  });
}

async function postFieldAnalysis(req, res) {
  try {
    const analysisId = req.fieldAnalysisId;
    if (!analysisId) {
      return res.status(500).json({ ok: false, error: 'Diretório de análise não preparado' });
    }
    const f = req.files || {};
    const photos = Array.isArray(f.photos) ? f.photos : f.photos ? [f.photos] : [];
    const videoArr = Array.isArray(f.video) ? f.video : f.video ? [f.video] : [];
    const files = {
      photos,
      video: videoArr
    };
    const data = await fieldSvc.createAndProcess(
      req.user.company_id,
      req.user.id,
      analysisId,
      req.body,
      files,
      publicBaseUrl(req)
    );
    res.status(201).json({ ok: true, data });
  } catch (e) {
    console.error('[FIELD_ANALYSIS_POST]', e);
    let status = e.status || e.statusCode;
    if (!status && e.message && String(e.message).includes('ANTHROPIC')) status = 503;
    if (!status && e.code === 'LIMIT_FILE_SIZE') status = 413;
    if (!status) status = 500;
    res.status(status).json({
      ok: false,
      error: e.message || 'Erro na análise de campo'
    });
  }
}

async function getFieldAnalysis(req, res) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'ID inválido' });
    }
    const data = await fieldSvc.getById(req.user.company_id, req.params.id);
    if (!data) return res.status(404).json({ ok: false, error: 'Análise não encontrada' });
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[FIELD_ANALYSIS_GET]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = {
  prepareFieldAnalysisDir,
  createFieldMulter,
  postFieldAnalysis,
  getFieldAnalysis
};
