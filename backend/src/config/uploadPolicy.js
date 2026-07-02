'use strict';

/**
 * Política canónica de upload IMPETUS — limites e MIME por módulo.
 * Fonte única para multer, validação e mensagens ao utilizador.
 */

const MB = 1024 * 1024;

const DEFAULT_MAX_MB = parseInt(process.env.IMPETUS_UPLOAD_MAX_MB || '50', 10);

const MODULE_LIMITS_MB = Object.freeze({
  dashboard_chat: parseInt(process.env.IMPETUS_CHAT_UPLOAD_MAX_MB || '15', 10),
  dashboard_chat_image: parseInt(process.env.IMPETUS_CHAT_IMAGE_MAX_MB || '5', 10),
  chat_internal: parseInt(process.env.IMPETUS_CHAT_INTERNAL_MAX_MB || '50', 10),
  registro_inteligente: parseInt(process.env.IMPETUS_REGISTRO_UPLOAD_MAX_MB || '15', 10),
  cadastrar_com_ia: parseInt(process.env.IMPETUS_CADASTRO_IA_UPLOAD_MAX_MB || '15', 10),
  technical_library: parseInt(process.env.IMPETUS_TECH_LIB_UPLOAD_MAX_MB || '120', 10),
  default: DEFAULT_MAX_MB
});

const EXT_GROUPS = Object.freeze({
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'],
  document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm'],
  video: ['.mp4', '.webm', '.mov']
});

const MIME_GROUPS = Object.freeze({
  image: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/webm', 'audio/x-m4a']
});

function getMaxBytes(moduleKey = 'default') {
  const mb = MODULE_LIMITS_MB[moduleKey] ?? MODULE_LIMITS_MB.default;
  return Math.max(1, mb) * MB;
}

function allAllowedExtensions() {
  return [...EXT_GROUPS.image, ...EXT_GROUPS.document, ...EXT_GROUPS.audio];
}

function isExtensionAllowed(ext, groups = ['image', 'document', 'audio']) {
  const normalized = String(ext || '').toLowerCase();
  if (!normalized.startsWith('.')) return false;
  return groups.some((g) => (EXT_GROUPS[g] || []).includes(normalized));
}

function isMimeAllowed(mime, groups = ['image', 'document', 'audio']) {
  const m = String(mime || '').toLowerCase().split(';')[0].trim();
  if (!m) return false;
  if (m === 'application/octet-stream') return true;
  return groups.some((g) => (MIME_GROUPS[g] || []).includes(m));
}

function userFacingSizeLimitMb(moduleKey = 'default') {
  return MODULE_LIMITS_MB[moduleKey] ?? MODULE_LIMITS_MB.default;
}

module.exports = {
  MB,
  MODULE_LIMITS_MB,
  EXT_GROUPS,
  MIME_GROUPS,
  getMaxBytes,
  allAllowedExtensions,
  isExtensionAllowed,
  isMimeAllowed,
  userFacingSizeLimitMb
};
