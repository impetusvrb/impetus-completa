'use strict';

/**
 * zOperationalRoleNormalizationRuntime — Normalização Semântica Enterprise
 *
 * Runtime centralizado que normaliza cargos, aliases, departamentos,
 * funções e authority scopes para domain authorities canónicos.
 *
 * Objectivo: qualquer variação linguística de um cargo converge para
 * o domain authority correcto, eliminando ambiguidades entre layers.
 *
 * Invariantes:
 *   - Additive-only: nunca remove mapeamentos existentes
 *   - Rollback-safe: desactivável via flag sem efeitos colaterais
 *   - Tenant-agnostic: normalização é semântica, não organizacional
 *   - Preserva Motor A + Engine V2 + SZ1–SZ5
 */

const DOMAIN_AUTHORITY = Object.freeze({
  QUALITY: 'QUALITY_DOMAIN_AUTHORITY',
  SAFETY: 'SAFETY_DOMAIN_AUTHORITY',
  ENVIRONMENT: 'ENVIRONMENT_DOMAIN_AUTHORITY',
  LOGISTICS: 'LOGISTICS_DOMAIN_AUTHORITY',
  MAINTENANCE: 'MAINTENANCE_DOMAIN_AUTHORITY',
  PRODUCTION: 'PRODUCTION_DOMAIN_AUTHORITY',
  HR: 'HR_DOMAIN_AUTHORITY',
  FINANCE: 'FINANCE_DOMAIN_AUTHORITY',
  EXECUTIVE: 'EXECUTIVE_DOMAIN_AUTHORITY',
  ADMIN: 'ADMIN_DOMAIN_AUTHORITY',
  ENGINEERING: 'ENGINEERING_DOMAIN_AUTHORITY',
  GOVERNANCE: 'GOVERNANCE_DOMAIN_AUTHORITY'
});

const DOMAIN_TO_MODULE_KEYS = Object.freeze({
  QUALITY_DOMAIN_AUTHORITY: ['quality_intelligence', 'operational'],
  SAFETY_DOMAIN_AUTHORITY: ['safety_intelligence', 'operational'],
  ENVIRONMENT_DOMAIN_AUTHORITY: ['environment_intelligence', 'operational'],
  LOGISTICS_DOMAIN_AUTHORITY: ['logistics_intelligence', 'operational'],
  MAINTENANCE_DOMAIN_AUTHORITY: ['manuia', 'operational'],
  PRODUCTION_DOMAIN_AUTHORITY: ['operational'],
  HR_DOMAIN_AUTHORITY: ['hr_intelligence', 'operational'],
  FINANCE_DOMAIN_AUTHORITY: ['financial_intelligence', 'operational', 'anomaly_detection'],
  EXECUTIVE_DOMAIN_AUTHORITY: ['operational', 'audit', 'anomaly_detection', 'hr_intelligence', 'financial_intelligence'],
  ADMIN_DOMAIN_AUTHORITY: ['admin', 'audit'],
  ENGINEERING_DOMAIN_AUTHORITY: ['operational', 'quality_intelligence'],
  GOVERNANCE_DOMAIN_AUTHORITY: ['audit', 'anomaly_detection', 'operational']
});

const HIERARCHY_NORMALIZATION = Object.freeze({
  ceo: 'ceo',
  presidente: 'ceo',
  president: 'ceo',
  diretor: 'diretor',
  director: 'diretor',
  directora: 'diretor',
  diretora: 'diretor',
  gerente: 'gerente',
  manager: 'gerente',
  coordenador: 'coordenador',
  coordinator: 'coordenador',
  coordinador: 'coordenador',
  coordenadora: 'coordenador',
  supervisor: 'supervisor',
  encarregado: 'supervisor',
  lider: 'supervisor',
  líder: 'supervisor',
  analista: 'colaborador',
  tecnico: 'colaborador',
  técnico: 'colaborador',
  inspetor: 'colaborador',
  operador: 'colaborador',
  colaborador: 'colaborador',
  assistente: 'colaborador',
  auxiliar: 'colaborador'
});

const HIERARCHY_TO_LEVEL = Object.freeze({
  ceo: 0,
  diretor: 1,
  gerente: 2,
  coordenador: 3,
  supervisor: 4,
  colaborador: 5
});

function _norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Patterns de domain — ordenados por especificidade (mais longo primeiro).
 * Cada entry: [regex, domain_authority]
 */
const DOMAIN_PATTERNS = [
  // Quality
  [/\b(qualidade|quality|sgq|controle\s+de\s+qualidade|quality\s+control|qa\b|qc\b|inspecao|inspection)\b/, DOMAIN_AUTHORITY.QUALITY],
  // Safety
  [/\b(seguranca|safety|sst|sso|sms|saude\s+e\s+seguranca|health\s+and\s+safety|ehs)\b/, DOMAIN_AUTHORITY.SAFETY],
  // Environment — prefixos como sustentabil*, residuo*, efluente*, emissao* não exigem \b final
  [/\b(meio\s+ambiente|ambiental|environment\w*|sustentabil\w*|esg|residuo\w*|efluente\w*|emiss[aã]o\w*)/, DOMAIN_AUTHORITY.ENVIRONMENT],
  // Logistics — prefixo logist* cobre logística, logístico, logistics
  [/\b(logist\w*|almoxarifado|almox\w*|expedicao|supply\s+chain|wms|tms|estoque)/, DOMAIN_AUTHORITY.LOGISTICS],
  // Maintenance
  [/\b(manutencao|maintenance|pcm|mecanica|eletrica|preditiva|preventiva|corretiva)\b/, DOMAIN_AUTHORITY.MAINTENANCE],
  // HR
  [/\b(recursos\s+humanos|rh\b|human\s+resources|hr\b|gestao\s+de\s+pessoas|people|departamento\s+pessoal)/, DOMAIN_AUTHORITY.HR],
  // Finance — prefixo financeir* cobre financeiro, financeira
  [/\b(financeir\w*|finance\b|controladoria|contabil\w*|tesouraria|custo\w*|orcament\w*)/, DOMAIN_AUTHORITY.FINANCE],
  // Production
  [/\b(producao|production|linha\s+de\s+producao|fabrica\b|chao\s+de\s+fabrica|turno)\b/, DOMAIN_AUTHORITY.PRODUCTION],
  // Engineering
  [/\b(engenharia|engineering|processos?\s+industriai?s?)/, DOMAIN_AUTHORITY.ENGINEERING],
  // Governance / Audit
  [/\b(governanca|governance|compliance|auditoria|audit\w*|juridico|legal)\b/, DOMAIN_AUTHORITY.GOVERNANCE],
  // Executive
  [/\b(diretoria|executiv\w*|presidencia|c[\s_-]?level|c[\s_-]?suite|board)\b/, DOMAIN_AUTHORITY.EXECUTIVE],
  // Admin
  [/\b(administra\w*|admin\b|ti\b|tecnologia\s+da\s+informacao|sistemas)\b/, DOMAIN_AUTHORITY.ADMIN]
];

/**
 * Resolve o domain authority a partir de texto livre (cargo, departamento, etc.)
 * @param {string} text
 * @returns {string|null} DOMAIN_AUTHORITY value ou null
 */
function resolveDomainFromText(text) {
  const t = _norm(text);
  if (!t) return null;
  for (const [pattern, domain] of DOMAIN_PATTERNS) {
    if (pattern.test(t)) return domain;
  }
  return null;
}

/**
 * Normaliza o role hierárquico para o canónico PT.
 * @param {string} role
 * @returns {string} normalized role (PT canónico)
 */
function normalizeHierarchyRole(role) {
  const r = _norm(role).replace(/\s+/g, '');
  return HIERARCHY_NORMALIZATION[r] || role;
}

/**
 * Resolve hierarchy_level a partir de role normalizado.
 */
function resolveHierarchyLevel(role) {
  const norm = normalizeHierarchyRole(role);
  return HIERARCHY_TO_LEVEL[norm] ?? 5;
}

/**
 * Extrai o role hierárquico do nome composto de um cargo.
 * Ex.: "Gerente de Qualidade" → "gerente"
 */
function extractHierarchyFromCargoName(cargoName) {
  const t = _norm(cargoName);
  const hierarchyWords = Object.keys(HIERARCHY_NORMALIZATION);
  for (const word of hierarchyWords) {
    if (t.startsWith(word + ' ') || t === word) {
      return HIERARCHY_NORMALIZATION[word];
    }
  }
  const parts = t.split(/\s+/);
  for (const part of parts) {
    if (HIERARCHY_NORMALIZATION[part]) {
      return HIERARCHY_NORMALIZATION[part];
    }
  }
  return null;
}

/**
 * Resolve identidade normalizada completa a partir de dados do user/cargo.
 * @param {object} params
 * @returns {object} normalized identity
 */
function resolveNormalizedIdentity(params = {}) {
  const { role, cargo_name, department, job_title, functional_area } = params;

  const normalizedRole = normalizeHierarchyRole(role || '');
  const hierarchyLevel = resolveHierarchyLevel(role || '');

  const textSources = [cargo_name, job_title, department, functional_area].filter(Boolean);
  const aggregatedText = textSources.join(' ');

  const domainAuthority = resolveDomainFromText(aggregatedText);

  const hierarchyFromCargo = cargo_name ? extractHierarchyFromCargoName(cargo_name) : null;
  const effectiveRole = hierarchyFromCargo || normalizedRole;
  const effectiveLevel = HIERARCHY_TO_LEVEL[effectiveRole] ?? hierarchyLevel;

  const moduleKeys = domainAuthority ? (DOMAIN_TO_MODULE_KEYS[domainAuthority] || []) : [];

  return {
    normalized_role: effectiveRole,
    hierarchy_level: effectiveLevel,
    domain_authority: domainAuthority,
    domain_module_keys: moduleKeys,
    role_source: hierarchyFromCargo ? 'cargo_name_extraction' : 'role_field',
    domain_source: textSources.length > 0 ? 'aggregated_text' : 'none',
    normalization_runtime: 'zOperationalRoleNormalizationRuntime',
    normalized_at: new Date().toISOString()
  };
}

/**
 * Verifica se um domínio é authority para determinado módulo.
 */
function isDomainAuthorityForModule(domainAuth, menuKey) {
  const keys = DOMAIN_TO_MODULE_KEYS[domainAuth];
  return Array.isArray(keys) && keys.includes(menuKey);
}

/**
 * Lista todos os domínios que autorizam um dado módulo.
 */
function getDomainsForModule(menuKey) {
  const domains = [];
  for (const [domain, keys] of Object.entries(DOMAIN_TO_MODULE_KEYS)) {
    if (keys.includes(menuKey)) domains.push(domain);
  }
  return domains;
}

function isEnabled() {
  const v = String(process.env.IMPETUS_Z_ROLE_NORMALIZATION || 'true').toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off';
}

module.exports = {
  DOMAIN_AUTHORITY,
  DOMAIN_TO_MODULE_KEYS,
  HIERARCHY_NORMALIZATION,
  HIERARCHY_TO_LEVEL,
  resolveDomainFromText,
  normalizeHierarchyRole,
  resolveHierarchyLevel,
  extractHierarchyFromCargoName,
  resolveNormalizedIdentity,
  isDomainAuthorityForModule,
  getDomainsForModule,
  isEnabled
};
