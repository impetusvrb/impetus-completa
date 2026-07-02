/**
 * Caminhos de upload — primary IMPETUS_HOME + candidatos legado (compatibilidade retroativa).
 * CERT-ONPREM-DATA-01
 */
const path = require('path');
const fs = require('fs');
const { uploadCandidateDirs } = require('./config/impetusHome');

const UPLOAD_CANDIDATE_DIRS = uploadCandidateDirs();

function existingUploadRoots() {
  return UPLOAD_CANDIDATE_DIRS.filter((d) => {
    try {
      return fs.existsSync(d);
    } catch {
      return false;
    }
  });
}

/**
 * Resolve caminho relativo (ex.: chat/foo.pdf) para ficheiro absoluto dentro de uma raiz de uploads.
 */
function resolveUploadFile(relativePath) {
  const clean = String(relativePath || '')
    .replace(/^\/+/, '')
    .replace(/\0/g, '');
  if (!clean || clean.includes('..')) return null;
  for (const root of UPLOAD_CANDIDATE_DIRS) {
    const abs = path.normalize(path.join(root, clean));
    const normRoot = path.normalize(root);
    if (!abs.startsWith(normRoot)) continue;
    try {
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
    } catch {
      /* continue */
    }
  }
  return null;
}

module.exports = {
  UPLOAD_CANDIDATE_DIRS,
  existingUploadRoots,
  resolveUploadFile,
};
