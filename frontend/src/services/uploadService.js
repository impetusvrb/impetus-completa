/**
 * Serviço partilhado de upload IMPETUS — validação, limites e mensagens ao utilizador.
 */

const MB = 1024 * 1024;

export const UPLOAD_MODULES = Object.freeze({
  DASHBOARD_CHAT: 'dashboard_chat',
  CHAT_INTERNAL: 'chat_internal',
  REGISTRO_INTELIGENTE: 'registro_inteligente',
  CADASTRO_IA: 'cadastrar_com_ia'
});

/** Alinhado a backend/src/config/uploadPolicy.js */
export const MODULE_LIMITS_MB = Object.freeze({
  dashboard_chat: 15,
  dashboard_chat_image: 5,
  chat_internal: 50,
  registro_inteligente: 15,
  cadastrar_com_ia: 15,
  default: 50
});

const EXT = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'],
  document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm']
};

const MIME_PREFIX_OK = ['image/', 'audio/', 'video/'];
const MIME_EXACT = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
]);

function extOf(file) {
  const name = String(file?.name || '');
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function isAllowedFile(file, groups = ['image', 'document', 'audio']) {
  if (!file) return false;
  const ext = extOf(file);
  const mime = String(file.type || '').toLowerCase();
  if (groups.some((g) => EXT[g]?.includes(ext))) return true;
  if (MIME_PREFIX_OK.some((p) => mime.startsWith(p))) return true;
  if (MIME_EXACT.has(mime)) return true;
  return false;
}

/**
 * @param {File} file
 * @param {string} moduleKey
 * @param {{ groups?: string[] }} [opts]
 * @returns {{ ok: true } | { ok: false, message: string, code: string }}
 */
export function validateFileForModule(file, moduleKey = 'default', opts = {}) {
  const groups = opts.groups || ['image', 'document', 'audio'];
  const maxMb = MODULE_LIMITS_MB[moduleKey] ?? MODULE_LIMITS_MB.default;

  if (!file) {
    return { ok: false, message: 'Nenhum arquivo selecionado.', code: 'FILE_MISSING' };
  }

  if (!isAllowedFile(file, groups)) {
    return {
      ok: false,
      message: 'Formato de arquivo não suportado.',
      code: 'INVALID_TYPE'
    };
  }

  if (file.size > maxMb * MB) {
    return {
      ok: false,
      message: `O arquivo excede o tamanho máximo permitido (${maxMb} MB).`,
      code: 'FILE_TOO_LARGE'
    };
  }

  return { ok: true };
}

/**
 * Mensagem amigável — nunca expõe "Request failed with status code 413".
 * @param {unknown} err — erro axios ou nativo
 */
export function formatUploadError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const code = data?.code;

  if (code === 'FILE_TOO_LARGE' || status === 413) {
    return (
      data?.error ||
      `O arquivo excede o tamanho máximo permitido${data?.max_mb ? ` (${data.max_mb} MB)` : ''}.`
    );
  }
  if (code === 'INVALID_TYPE' || status === 415) {
    return data?.error || 'Formato de arquivo não suportado.';
  }
  if (data?.error && typeof data.error === 'string') {
    return data.error;
  }
  if (err?.apiMessage) {
    return err.apiMessage;
  }
  if (status === 404) {
    return 'Serviço de upload temporariamente indisponível. Tente novamente em instantes.';
  }
  if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') {
    return 'Tempo esgotado ao enviar o arquivo. Verifique a conexão e tente novamente.';
  }
  if (err?.code === 'ERR_NETWORK') {
    return 'Sem conexão. Verifique sua internet e tente novamente.';
  }
  return 'Não foi possível enviar o arquivo. Tente novamente.';
}

export function buildFormDataWithFile(fieldName, file, extra = {}) {
  const fd = new FormData();
  fd.append(fieldName, file);
  Object.entries(extra || {}).forEach(([k, v]) => {
    if (v != null) fd.append(k, v);
  });
  return fd;
}

export default {
  UPLOAD_MODULES,
  MODULE_LIMITS_MB,
  validateFileForModule,
  formatUploadError,
  buildFormDataWithFile,
  isAllowedFile
};
