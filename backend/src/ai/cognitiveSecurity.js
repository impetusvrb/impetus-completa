'use strict';

const MAX_REQUEST_CHARS = parseInt(process.env.COGNITIVE_MAX_REQUEST_CHARS || '32000', 10);
const MAX_IMAGES = parseInt(process.env.COGNITIVE_MAX_IMAGES || '5', 10);
const MAX_IMAGE_BASE64_CHARS = parseInt(process.env.COGNITIVE_MAX_IMAGE_B64 || '8000000', 10);

const INJECTION_PATTERNS = [
  /ignore (all|previous) instructions/gi,
  /system:\s*you are now/gi,
  /<\s*script/gi,
  /\bdelete from\b/gi,
  /\binsert into\b/gi,
  /\bdrop table\b/gi
];

/**
 * Resumo de identidade para RBAC do orquestrador (não substitui requireAuth).
 */
function buildUserScope(user) {
  if (!user) return { id: null, company_id: null, role: null, permissions: [] };
  const p = user.permissions;
  const permissions = Array.isArray(p) ? p : typeof p === 'object' && p ? Object.keys(p).filter((k) => p[k]) : [];
  return {
    id: user.id,
    company_id: user.company_id,
    role: (user.role || '').toString().toLowerCase(),
    department: user.department || user.department_resolved_name || null,
    hierarchy_level: user.hierarchy_level,
    permissions
  };
}

function assertSameCompany(user, companyId) {
  if (!user?.company_id || !companyId) return;
  if (String(user.company_id) !== String(companyId)) {
    const e = new Error('COGNITIVE_SCOPE: company mismatch');
    e.code = 'FORBIDDEN_SCOPE';
    throw e;
  }
}

/**
 * Higienização básica anti-injeção de prompt (camada 1; firewall dedicado pode ser encadeado).
 */
function sanitizeTextInput(text) {
  if (text == null) return '';
  let t = String(text);
  if (t.length > MAX_REQUEST_CHARS) t = t.slice(0, MAX_REQUEST_CHARS);
  for (const re of INJECTION_PATTERNS) {
    t = t.replace(re, '[redacted]');
  }
  return t;
}

function normalizeImageList(images) {
  if (!Array.isArray(images)) return [];
  const out = [];
  for (let i = 0; i < Math.min(images.length, MAX_IMAGES); i++) {
    const item = images[i];
    if (typeof item === 'string') {
      if (item.length > MAX_IMAGE_BASE64_CHARS) continue;
      out.push(item);
    } else if (item && typeof item === 'object' && item.base64) {
      const b = String(item.base64);
      if (b.length > MAX_IMAGE_BASE64_CHARS) continue;
      out.push({
        base64: b,
        mime: item.mimeType || item.mime || 'image/jpeg',
        label: item.label || null
      });
    }
  }
  return out;
}

/**
 * Nível de risco heurístico (industrial) — dispara validação cruzada e HITL.
 */
function assessHeuristicRisk(requestText, dossier) {
  const t = `${requestText || ''} ${JSON.stringify(dossier?.data || {})}`.toLowerCase();
  const critical = [
    'emergência',
    'emergencia',
    'incêndio',
    'incendio',
    'explos',
    'vazamento tóxico',
    'obito',
    'óbito',
    'morte',
    'óleo quente',
    'alto forno',
    'arco elétrico'
  ];
  if (critical.some((k) => t.includes(k))) return 'critical';
  const high = [
    'parada forçada',
    'parada de emergência',
    'energia elétrica',
    'alto risco',
    'travamento de segurança',
    'lockout',
    'tagout',
    'loto',
    'pneumática',
    'queda de carga',
    'soterr'
  ];
  if (high.some((k) => t.includes(k))) return 'high';
  const medium = ['parada', 'falha', 'manutenção', 'quebra', 'anomalia', 'sensor', 'alar'];
  if (medium.some((k) => t.includes(k))) return 'medium';
  return 'low';
}

function shouldRequireCrossValidation(riskLevel, options) {
  if (options?.forceCrossValidation) return true;
  if (options?.forceCrossValidation === false) return false;
  return riskLevel === 'high' || riskLevel === 'critical';
}

function shouldForceHumanValidation(riskLevel) {
  return riskLevel !== 'low';
}

module.exports = {
  MAX_REQUEST_CHARS,
  buildUserScope,
  assertSameCompany,
  sanitizeTextInput,
  normalizeImageList,
  assessHeuristicRisk,
  shouldRequireCrossValidation,
  shouldForceHumanValidation
};
