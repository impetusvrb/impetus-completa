'use strict';

/**
 * Destinos canónicos de upload — derivados de IMPETUS_HOME / UPLOADS_DIR.
 * CERT-ONPREM-DATA-01
 */

const path = require('path');
const fs = require('fs');
const { uploadSubdir, uploadsDir } = require('./impetusHome');

function ensureUploadDir(...segments) {
  const dir = uploadSubdir(...segments);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = {
  root: uploadsDir,
  misc: () => ensureUploadDir('misc'),
  chat: () => ensureUploadDir('chat'),
  chatMultimodal: () => ensureUploadDir('chat-multimodal'),
  roleVerification: () => ensureUploadDir('role-verification'),
  registroInteligente: () => ensureUploadDir('registro-inteligente'),
  cadastrarIa: () => ensureUploadDir('cadastrar-ia'),
  appCommunications: () => ensureUploadDir('app-communications'),
  technicalLibrary: () => ensureUploadDir('technical-library'),
  equipmentLibrary: (companyId) =>
    ensureUploadDir('equipment-library', String(companyId || 'default')),
  equipmentLibrary3d: (companyId) =>
    ensureUploadDir('equipment-library', String(companyId || 'default'), '3d'),
  join: (...segments) => path.join(uploadsDir(), ...segments),
  ensureUploadDir,
};
