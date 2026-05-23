/**
 * structuralCadastroModuleResolver — módulos liberados SOMENTE pelo cadastro do cargo.
 * Fonte: company_roles (permissões, temas, flags, escopo, hint) — sem perfil genérico nem inferência por nome.
 */
'use strict';

const registry = require('../contextualModules/moduleRegistry');
const functionalAreaCatalog = require('../config/functionalAreaCatalog');

const STRUCTURAL_TOKEN_TO_MENU_KEYS = Object.freeze({
  dashboard: ['dashboard'],
  operacional: ['operational'],
  operational: ['operational'],
  producao: ['operational'],
  production: ['operational'],
  manutencao: ['manuia'],
  maintenance: ['manuia'],
  manuia: ['manuia'],
  qualidade: ['quality_intelligence'],
  quality: ['quality_intelligence'],
  quality_intelligence: ['quality_intelligence'],
  rh: ['hr_intelligence'],
  hr: ['hr_intelligence'],
  hr_intelligence: ['hr_intelligence'],
  recursos_humanos: ['hr_intelligence'],
  financeiro: ['financial_intelligence'],
  finance: ['financial_intelligence'],
  financial_intelligence: ['financial_intelligence'],
  seguranca: ['safety_intelligence'],
  safety: ['safety_intelligence'],
  safety_intelligence: ['safety_intelligence'],
  ambiental: ['environment_intelligence'],
  environment: ['environment_intelligence'],
  environment_intelligence: ['environment_intelligence'],
  logistica: ['logistics_intelligence'],
  logistics: ['logistics_intelligence'],
  logistics_intelligence: ['logistics_intelligence'],
  auditoria: ['audit'],
  audit: ['audit'],
  admin: ['admin'],
  ia: ['ai', 'chat'],
  ai: ['ai', 'chat'],
  chat: ['chat'],
  biblioteca: ['biblioteca'],
  proacao: ['proaction'],
  proaction: ['proaction'],
  registro: ['registro_inteligente'],
  registro_inteligente: ['registro_inteligente'],
  cadastrar: ['cadastrar_com_ia'],
  cadastrar_com_ia: ['cadastrar_com_ia'],
  estrategico: ['audit', 'anomaly_detection'],
  anomaly_detection: ['anomaly_detection'],
  bi: ['operational', 'anomaly_detection'],
  engenharia: ['operational', 'quality_intelligence'],
  settings: ['settings']
});

const FUNCTIONAL_HINT_TO_MENU_KEYS = Object.freeze({
  production: ['operational'],
  operations: ['operational'],
  maintenance: ['manuia', 'operational'],
  quality: ['quality_intelligence', 'operational'],
  hr: ['hr_intelligence', 'operational'],
  finance: ['financial_intelligence', 'operational', 'anomaly_detection'],
  environmental: ['environment_intelligence'],
  sustainability: ['environment_intelligence'],
  environmental_health_safety: ['safety_intelligence', 'environment_intelligence'],
  logistics: ['logistics_intelligence', 'operational'],
  safety: ['safety_intelligence', 'operational'],
  executive: ['operational', 'audit', 'anomaly_detection', 'hr_intelligence', 'financial_intelligence'],
  governance: ['audit', 'anomaly_detection', 'operational'],
  admin: ['admin', 'audit']
});

const MENU_KEY_LABELS = Object.freeze({
  dashboard: 'Dashboard',
  operational: 'Operacional / centros industriais',
  proaction: 'Pró-Ação',
  registro_inteligente: 'Registro Inteligente',
  cadastrar_com_ia: 'Cadastrar com IA',
  chat: 'Chat',
  ai: 'Impetus IA',
  biblioteca: 'Biblioteca',
  settings: 'Configurações',
  hr_intelligence: 'Inteligência RH',
  quality_intelligence: 'Inteligência Qualidade',
  manuia: 'ManuIA',
  safety_intelligence: 'Segurança / SST',
  environment_intelligence: 'Meio Ambiente',
  logistics_intelligence: 'Logística',
  financial_intelligence: 'Inteligência Financeira',
  audit: 'Auditoria',
  anomaly_detection: 'Detecção de anomalias',
  admin: 'Administração'
});

function _normToken(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function _expandPortugueseCadastroText(raw) {
  const t = String(raw || '').toLowerCase();
  if (!t.trim()) return [];
  const keys = new Set();
  if (/estrat|corporat|executiv|governanc|auditoria|risco|consolidad/.test(t)) {
    keys.add('audit');
    keys.add('anomaly_detection');
    keys.add('operational');
  }
  if (/financeir|custo|rentabil|controladoria/.test(t)) {
    keys.add('financial_intelligence');
    keys.add('operational');
    keys.add('anomaly_detection');
  }
  if (/\brh\b|pessoas|colaborador|clima|humano|recursos/.test(t)) {
    keys.add('hr_intelligence');
    keys.add('operational');
  }
  if (/manuten|pcm|equipamento/.test(t)) {
    keys.add('manuia');
    keys.add('operational');
  }
  if (/qualidade|inspec|laboratorio/.test(t)) {
    keys.add('quality_intelligence');
    keys.add('operational');
  }
  if (/seguranc|sst|ehs/.test(t)) {
    keys.add('safety_intelligence');
    keys.add('operational');
  }
  if (/ambient|esg|sustentab/.test(t)) {
    keys.add('environment_intelligence');
    keys.add('operational');
  }
  if (/logist|almox|exped/.test(t)) {
    keys.add('logistics_intelligence');
    keys.add('operational');
  }
  if (/operacion|industrial|produc/.test(t)) {
    keys.add('operational');
  }
  if (/biblioteca|document/.test(t)) keys.add('biblioteca');
  if (/\bia\b|inteligencia artificial|assistente/.test(t)) {
    keys.add('ai');
    keys.add('chat');
  }
  return [...keys];
}

function _expandToken(token) {
  const t = _normToken(token);
  if (!t) return [];
  const direct = STRUCTURAL_TOKEN_TO_MENU_KEYS[t];
  if (direct) return direct;
  const partial = [];
  for (const [key, mods] of Object.entries(STRUCTURAL_TOKEN_TO_MENU_KEYS)) {
    if (t.includes(key) || key.includes(t)) partial.push(...mods);
  }
  const fromPt = _expandPortugueseCadastroText(token);
  return [...new Set([...partial, ...fromPt])];
}

/**
 * Avalia se o cadastro do cargo está completo para liberar módulos contextuais.
 */
function assessCadastroCompleteness(roleRow) {
  const missing = [];
  if (!roleRow?.department_id) missing.push('department_id');
  if (!roleRow?.sector_id) missing.push('sector_id');
  const hasAuth =
    (Array.isArray(roleRow?.recommended_permissions) && roleRow.recommended_permissions.length > 0) ||
    (Array.isArray(roleRow?.visible_themes) && roleRow.visible_themes.length > 0) ||
    roleRow?.access_strategic_data === true ||
    roleRow?.access_financial_data === true ||
    roleRow?.access_hr_data === true ||
    roleRow?.access_critical_indicators === true ||
    (roleRow?.dashboard_functional_hint && FUNCTIONAL_HINT_TO_MENU_KEYS[roleRow.dashboard_functional_hint]) ||
    ['estrategico', 'corporativo', 'operacional', 'tatico'].includes(_normToken(roleRow?.operational_scope));
  if (!hasAuth) missing.push('governanca_modulos');
  return {
    structural_complete: missing.length === 0,
    missing_fields: missing,
    message:
      missing.length === 0
        ? null
        : 'Complete departamento, setor e governança de módulos no cadastro do cargo.'
  };
}

/**
 * Resolve menu_keys autorizados exclusivamente a partir do registo do cargo.
 * @param {object|null} roleRow — linha company_roles (enriquecida ou não)
 * @returns {string[]}
 */
function resolveAuthorizedMenuKeysFromCadastro(roleRow) {
  const keys = new Set();
  if (!roleRow) return [];

  const hint = roleRow.dashboard_functional_hint
    ? functionalAreaCatalog.resolveIdFromText(roleRow.dashboard_functional_hint) ||
      _normToken(roleRow.dashboard_functional_hint)
    : null;
  if (hint && FUNCTIONAL_HINT_TO_MENU_KEYS[hint]) {
    for (const k of FUNCTIONAL_HINT_TO_MENU_KEYS[hint]) keys.add(k);
  }

  for (const list of [roleRow.recommended_permissions, roleRow.visible_themes, roleRow.approval_domains]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      for (const k of _expandToken(item)) keys.add(k);
    }
  }

  if (roleRow.access_strategic_data === true) {
    keys.add('audit');
    keys.add('anomaly_detection');
    keys.add('operational');
  }
  if (roleRow.access_financial_data === true) {
    keys.add('financial_intelligence');
    keys.add('operational');
    keys.add('anomaly_detection');
  }
  if (keys.has('financial_intelligence') && !keys.has('operational')) {
    keys.add('operational');
  }
  if (roleRow.access_hr_data === true) {
    keys.add('hr_intelligence');
    keys.add('operational');
  }
  if (roleRow.access_critical_indicators === true) {
    keys.add('operational');
    keys.add('anomaly_detection');
  }

  const opScope = _normToken(roleRow.operational_scope);
  if (opScope === 'estrategico' || opScope === 'corporativo') {
    keys.add('audit');
    keys.add('anomaly_detection');
  }
  if (opScope === 'operacional' || opScope === 'tatico') {
    keys.add('operational');
  }

  return [...keys];
}

function resolveBlockedMenuKeysFromCadastro(roleRow) {
  const blocked = new Set();
  if (!Array.isArray(roleRow?.hidden_themes)) return [];
  for (const item of roleRow.hidden_themes) {
    for (const k of _expandToken(item)) blocked.add(k);
  }
  return [...blocked];
}

function buildModulePreview(roleRow) {
  const completeness = assessCadastroCompleteness(roleRow);
  const authorized = resolveAuthorizedMenuKeysFromCadastro(roleRow);
  const blocked = new Set(resolveBlockedMenuKeysFromCadastro(roleRow));
  const contextual = authorized.filter((k) => !blocked.has(k));
  const modules = contextual.map((menu_key) => ({
    menu_key,
    label: MENU_KEY_LABELS[menu_key] || menu_key,
    source: 'cadastro_cargo'
  }));
  return {
    ...completeness,
    authorized_menu_keys: contextual,
    blocked_menu_keys: [...blocked],
    modules,
    cadastro_fiel: true
  };
}

function labelForMenuKey(key) {
  return MENU_KEY_LABELS[key] || registry.getModulesByMenuKey(key)?.[0]?.label || key;
}

module.exports = {
  resolveAuthorizedMenuKeysFromCadastro,
  resolveBlockedMenuKeysFromCadastro,
  assessCadastroCompleteness,
  buildModulePreview,
  labelForMenuKey,
  FUNCTIONAL_HINT_TO_MENU_KEYS,
  STRUCTURAL_TOKEN_TO_MENU_KEYS
};
