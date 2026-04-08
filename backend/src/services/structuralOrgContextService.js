/**
 * Contexto da Base Estrutural para IA e dashboards
 * - Resumo de empresa (companies) e cargo formal (company_roles) por utilizador
 * - Governança: não injetar notas internas, temas ocultos nem campos claramente sensíveis nos prompts
 */
const db = require('../db');

const CACHE_TTL_MS = parseInt(process.env.STRUCTURAL_CONTEXT_CACHE_TTL_MS, 10) || 120000;
const cache = new Map();

function cacheGet(key) {
  const e = cache.get(key);
  if (!e || Date.now() > e.exp) return null;
  return e.val;
}

function cacheSet(key, val) {
  cache.set(key, { exp: Date.now() + CACHE_TTL_MS, val });
}

function truncate(s, n) {
  const t = (s == null ? '' : String(s)).trim();
  if (!t) return '';
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function formatLines(arr, maxLines, lineMax) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => truncate(String(x), lineMax))
    .filter(Boolean)
    .slice(0, maxLines);
}

async function loadCompanySnapshot(companyId) {
  const key = `co:${companyId}`;
  const hit = cacheGet(key);
  if (hit !== null) return hit;

  try {
    const r = await db.query(
      `SELECT name, trade_name, industry_segment, subsegment, company_description,
              mission, vision, values_text, market, operation_type, production_type,
              organizational_culture
       FROM companies WHERE id = $1`,
      [companyId]
    );
    const row = r.rows?.[0] || null;
    cacheSet(key, row);
    return row;
  } catch (err) {
    console.warn('[STRUCTURAL_ORG_CTX] company:', err.message);
    return null;
  }
}

async function loadRoleRow(companyId, roleId) {
  if (!roleId) return null;
  const key = `ro:${companyId}:${roleId}`;
  const hit = cacheGet(key);
  if (hit !== null) return hit;

  try {
    const r = await db.query(
      `SELECT id, name, description, hierarchy_level, work_area,
              main_responsibilities, critical_responsibilities, recommended_permissions,
              sectors_involved, leadership_type, communication_profile, decision_level,
              visible_themes, escalation_role, operation_role, approval_role, active
       FROM company_roles
       WHERE id = $1 AND company_id = $2 AND active = true`,
      [roleId, companyId]
    );
    const row = r.rows?.[0] || null;
    if (row) cacheSet(key, row);
    return row;
  } catch (err) {
    console.warn('[STRUCTURAL_ORG_CTX] role:', err.message);
    return null;
  }
}

/**
 * Bloco de texto do cargo para prompts (sem notes/hidden_themes)
 */
function buildRolePromptBlock(role) {
  if (!role) return '';
  const lines = [];
  lines.push(`- Cargo cadastrado: ${truncate(role.name, 200)}`);
  if (role.work_area) lines.push(`- Área de atuação: ${truncate(role.work_area, 220)}`);
  if (role.description) lines.push(`- Descrição: ${truncate(role.description, 520)}`);
  const main = formatLines(role.main_responsibilities, 10, 200);
  if (main.length) lines.push(`- Responsabilidades principais:\n${main.map((m) => `  • ${m}`).join('\n')}`);
  const crit = formatLines(role.critical_responsibilities, 6, 180);
  if (crit.length) lines.push(`- Responsabilidades críticas:\n${crit.map((m) => `  • ${m}`).join('\n')}`);
  if (role.decision_level) lines.push(`- Nível de decisão: ${truncate(role.decision_level, 220)}`);
  if (role.leadership_type) lines.push(`- Tipo de liderança: ${truncate(role.leadership_type, 140)}`);
  const vis = formatLines(role.visible_themes, 12, 140);
  if (vis.length) lines.push(`- Temas de interesse / visibilidade: ${vis.join('; ')}`);
  if (role.operation_role) lines.push(`- Papel na operação: ${truncate(role.operation_role, 360)}`);
  if (role.approval_role) lines.push(`- Papel em aprovações: ${truncate(role.approval_role, 280)}`);
  if (role.escalation_role) lines.push(`- Papel na escalada: ${truncate(role.escalation_role, 280)}`);
  return lines.join('\n');
}

function buildCompanyPromptBlock(c) {
  if (!c) return '';
  const lines = [];
  const displayName = c.trade_name || c.name;
  if (displayName) lines.push(`- Razão / fantasia: ${truncate(displayName, 200)}`);
  if (c.industry_segment) lines.push(`- Segmento: ${truncate(c.industry_segment, 140)}`);
  if (c.subsegment) lines.push(`- Subsegmento: ${truncate(c.subsegment, 120)}`);
  if (c.mission) lines.push(`- Missão: ${truncate(c.mission, 450)}`);
  if (c.vision) lines.push(`- Visão: ${truncate(c.vision, 450)}`);
  if (c.company_description) lines.push(`- Descrição institucional: ${truncate(c.company_description, 650)}`);
  if (c.values_text) lines.push(`- Valores: ${truncate(c.values_text, 420)}`);
  if (c.market) lines.push(`- Mercado: ${truncate(c.market, 220)}`);
  if (c.operation_type) lines.push(`- Tipo de operação: ${truncate(c.operation_type, 180)}`);
  if (c.production_type) lines.push(`- Tipo de produção: ${truncate(c.production_type, 160)}`);
  if (c.organizational_culture) lines.push(`- Cultura organizacional: ${truncate(c.organizational_culture, 380)}`);
  return lines.join('\n');
}

/**
 * Ordem de enriquecimento relativamente a política/POPs/onboarding: depois da política formal,
 * como pano de fundo organizacional (não substitui company_policy_text).
 */
async function getDocumentContextAppend(companyId, user) {
  if (!companyId || !user) return '';
  const company = await loadCompanySnapshot(companyId);
  const role = user.company_role_id ? await loadRoleRow(companyId, user.company_role_id) : null;

  const parts = [];
  const cBlock = buildCompanyPromptBlock(company);
  if (cBlock) {
    parts.push(`## Contexto institucional (Base Estrutural — empresa)\n${cBlock}`);
  }
  if (role) {
    parts.push(`## Contexto do cargo formal (Base Estrutural — ligado ao utilizador)\n${buildRolePromptBlock(role)}`);
  } else if (user.company_role_id) {
    parts.push(
      '## Cargo formal\n- O utilizador possui referência a cargo estrutural, mas o registo não está disponível ou está inativo.'
    );
  }

  if (!parts.length) return '';
  return `\n\n${parts.join('\n\n')}\n`;
}

/**
 * Bloco para chat (identidade + organograma descritivo)
 */
async function getChatStructuralBlock(user) {
  const companyId = user?.company_id;
  if (!companyId) return '';

  const company = await loadCompanySnapshot(companyId);
  const role = user.company_role_id ? await loadRoleRow(companyId, user.company_role_id) : null;

  const chunks = [];
  const cBlock = buildCompanyPromptBlock(company);
  if (cBlock) {
    chunks.push(`### Empresa (cadastro mestre)\n${cBlock}`);
  }
  if (role) {
    chunks.push(`### Cargo formal associado ao utilizador\n${buildRolePromptBlock(role)}`);
  }

  if (!chunks.length) return '';
  return `\n## Organização descrita na Base Estrutural\nUse estes dados para alinhar linguagem e prioridades ao contexto institucional. Não contradiga políticas e POPs já fornecidos.\n${chunks.join('\n\n')}`;
}

/**
 * Sufixo curto para instruções de insights (evita tokens excessivos)
 */
async function getInsightsInstructionSuffix(user) {
  const companyId = user?.company_id;
  if (!companyId) return '';

  const role = user.company_role_id ? await loadRoleRow(companyId, user.company_role_id) : null;
  if (!role) return '';

  const bits = [];
  if (role.name) bits.push(`cargo: ${truncate(role.name, 80)}`);
  const themes = formatLines(role.visible_themes, 4, 80);
  if (themes.length) bits.push(`temas: ${themes.join(', ')}`);
  if (role.work_area) bits.push(`área: ${truncate(role.work_area, 100)}`);

  return bits.join(' | ');
}

/**
 * Valida se company_role_id pertence à empresa e está ativo
 */
async function assertCompanyRoleBelongsToCompany(companyId, roleId) {
  if (!roleId) return null;
  const r = await db.query(
    `SELECT id FROM company_roles WHERE id = $1 AND company_id = $2 AND active = true`,
    [roleId, companyId]
  );
  return r.rows?.[0]?.id || null;
}

function invalidateCompanyCache(companyId) {
  if (!companyId) return;
  for (const k of [...cache.keys()]) {
    if (k === `co:${companyId}` || k.startsWith(`ro:${companyId}:`)) cache.delete(k);
  }
}

module.exports = {
  getDocumentContextAppend,
  getChatStructuralBlock,
  getInsightsInstructionSuffix,
  assertCompanyRoleBelongsToCompany,
  invalidateCompanyCache,
  loadCompanySnapshot,
  loadRoleRow
};
