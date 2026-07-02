'use strict';

const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const uploadPolicy = require('../config/uploadPolicy');
const uploadObservability = require('../services/uploadObservabilityService');

/**
 * @param {object} opts
 * @param {string} opts.module — chave uploadPolicy.MODULE_LIMITS_MB
 * @param {string} opts.destination — pasta absoluta ou relativa a backend/
 * @param {string[]} [opts.allowedGroups] — image | document | audio
 * @param {string} [opts.fieldName='file']
 */
function createUploadMiddleware(opts = {}) {
  const moduleKey = opts.module || 'default';
  const dest = opts.destination || path.join(__dirname, '../../uploads/misc');
  const allowedGroups = opts.allowedGroups || ['image', 'document', 'audio'];
  const fieldName = opts.fieldName || 'file';

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '') || '';
      cb(null, `${uuidv4()}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: uploadPolicy.getMaxBytes(moduleKey) },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const mimeOk = uploadPolicy.isMimeAllowed(file.mimetype, allowedGroups);
      const extOk = uploadPolicy.isExtensionAllowed(ext, allowedGroups);
      if (!mimeOk && !extOk) {
        const err = new Error('Formato de arquivo não suportado.');
        err.code = 'INVALID_TYPE';
        return cb(err);
      }
      cb(null, true);
    }
  });

  return {
    moduleKey,
    fieldName,
    single: upload.single(fieldName),
    array: upload.array(fieldName),
    any: upload.any()
  };
}

function handleUploadError(moduleKey = 'unknown') {
  return (err, req, res, next) => {
    if (!err) return next();

    const user = req.user || null;

    if (err.code === 'LIMIT_FILE_SIZE') {
      const mb = uploadPolicy.userFacingSizeLimitMb(moduleKey);
      uploadObservability.logUploadFailure({
        module: moduleKey,
        user,
        code: 'FILE_TOO_LARGE',
        message: err.message
      });
      return res.status(413).json({
        ok: false,
        error: `O arquivo excede o tamanho máximo permitido (${mb} MB).`,
        code: 'FILE_TOO_LARGE',
        max_mb: mb
      });
    }

    if (err.code === 'INVALID_TYPE') {
      uploadObservability.logUploadFailure({
        module: moduleKey,
        user,
        code: 'INVALID_TYPE',
        message: err.message
      });
      return res.status(415).json({
        ok: false,
        error: err.message || 'Formato de arquivo não suportado.',
        code: 'INVALID_TYPE'
      });
    }

    uploadObservability.logUploadFailure({
      module: moduleKey,
      user,
      code: err.code || 'UPLOAD_FAILED',
      message: err.message
    });

    return res.status(400).json({
      ok: false,
      error: err.message || 'Falha no envio do arquivo.',
      code: err.code || 'UPLOAD_FAILED'
    });
  };
}

module.exports = {
  createUploadMiddleware,
  handleUploadError
};
