'use strict';

/**
 * Logs estruturados de upload — sem conteúdo do ficheiro.
 */

function _base(meta = {}) {
  return {
    ts: new Date().toISOString(),
    ...meta
  };
}

function _fileMeta(file) {
  if (!file) return {};
  return {
    mime: file.mimetype || null,
    size_bytes: typeof file.size === 'number' ? file.size : null,
    original_name: file.originalname ? String(file.originalname).slice(0, 200) : null
  };
}

function logUploadStart({ module, user, file, extra }) {
  try {
    console.info(
      '[UPLOAD_START]',
      JSON.stringify(
        _base({
          event: 'UPLOAD_START',
          module: module || 'unknown',
          user_id: user?.id || null,
          company_id: user?.company_id || null,
          ..._fileMeta(file),
          ...(extra && typeof extra === 'object' ? extra : {})
        })
      )
    );
  } catch (_e) {
    /* noop */
  }
}

function logUploadSuccess({ module, user, file, extra }) {
  try {
    console.info(
      '[UPLOAD_SUCCESS]',
      JSON.stringify(
        _base({
          event: 'UPLOAD_SUCCESS',
          module: module || 'unknown',
          user_id: user?.id || null,
          company_id: user?.company_id || null,
          ..._fileMeta(file),
          ...(extra && typeof extra === 'object' ? extra : {})
        })
      )
    );
  } catch (_e) {
    /* noop */
  }
}

function logUploadFailure({ module, user, file, code, message, extra }) {
  const event =
    code === 'FILE_TOO_LARGE' || code === 'LIMIT_FILE_SIZE'
      ? 'UPLOAD_FILE_TOO_LARGE'
      : code === 'INVALID_TYPE'
        ? 'UPLOAD_INVALID_TYPE'
        : 'UPLOAD_FAILURE';
  try {
    console.warn(
      `[${event}]`,
      JSON.stringify(
        _base({
          event,
          module: module || 'unknown',
          user_id: user?.id || null,
          company_id: user?.company_id || null,
          code: code || null,
          message: message ? String(message).slice(0, 300) : null,
          ..._fileMeta(file),
          ...(extra && typeof extra === 'object' ? extra : {})
        })
      )
    );
  } catch (_e) {
    /* noop */
  }
}

module.exports = {
  logUploadStart,
  logUploadSuccess,
  logUploadFailure
};
