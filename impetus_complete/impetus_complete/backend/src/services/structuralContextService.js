/**
 * CONTEXTO ESTRUTURAL DA EMPRESA PARA A IA
 * Busca dados da Base Estrutural (Admin) para enriquecer o contexto da Impetus IA
 * Tabelas: companies (campos extras), company_roles, production_lines, assets,
 *          company_processes, company_products, kpi_indicators, failure_risks,
 *          shifts, area_responsibles, ai_intelligence_config
 */
const db = require('../db');

async function safeQuery(sql, params = []) {
  try {
    const r = await db.query(sql, params);
    return r.rows || [];
  } catch (err) {
    if (err.message?.includes('does not exist') || err.message?.includes('column')) return [];
    console.warn('[STRUCTURAL_CONTEXT]', err.message);
    return [];
  }
}

/**
 * Busca dados estendidos da empresa (campos da Base Estrutural)
 */
async function getCompanyExtendedData(companyId) {
  try {
    const r = await db.query(`
      SELECT name, trade_name, cnpj, industry_segment, subsegment, address, city, state, country,
        main_unit, other_units, employee_count, shift_count, operating_hours,
        operation_type, production_type, products_manufactured, market,
        company_description, mission, vision, values_text, internal_policy,
        operation_rules, organizational_culture, strategic_notes, company_policy_text
      FROM companies WHERE id = $1
    `, [companyId]);
    return r.rows[0] || null;
  } catch (err) {
    return null;
  }
}

/**
 * Monta bloco de texto com contexto estrutural para a IA
 * @param {string} companyId
 * @param {object} opts - { maxLength } para limitar tamanho
 * @returns {string}
 */
async function buildStructuralContext(companyId, opts = {}) {
  if (!companyId) return '';
  const maxLength = opts.maxLength || 8000;
  const parts = [];

  const c = await getCompanyExtendedData(companyId);
  if (c) {
    const companyLines = [];
    if (c.name) companyLines.push(`Nome: ${c.name}`);
    if (c.trade_name) companyLines.push(`Nome fantasia: ${c.trade_name}`);
    if (c.industry_segment) companyLines.push(`Segmento: ${c.industry_segment}`);
    if (c.subsegment) companyLines.push(`Subsegmento: ${c.subsegment}`);
    if (c.main_unit) companyLines.push(`Unidade principal: ${c.main_unit}`);
    if (c.employee_count) companyLines.push(`Funcionários: ~${c.employee_count}`);
    if (c.shift_count) companyLines.push(`Turnos: ${c.shift_count}`);
    if (c.operating_hours) companyLines.push(`Horário: ${c.operating_hours}`);
    if (c.operation_type) companyLines.push(`Tipo operação: ${c.operation_type}`);
    if (c.production_type) companyLines.push(`Tipo produção: ${c.production_type}`);
    if (c.market) companyLines.push(`Mercado: ${c.market}`);
    if (c.company_description) companyLines.push(`Descrição: ${c.company_description.slice(0, 500)}`);
    if (c.mission) companyLines.push(`Missão: ${c.mission.slice(0, 300)}`);
    if (c.vision) companyLines.push(`Visão: ${c.vision.slice(0, 300)}`);
    if (c.values_text) companyLines.push(`Valores: ${c.values_text.slice(0, 300)}`);
    if (c.organizational_culture) companyLines.push(`Cultura: ${c.organizational_culture.slice(0, 300)}`);
    if (companyLines.length > 0) {
      parts.push(`### Dados da empresa\n${companyLines.join('\n')}`);
    }
  }

  const [roles, lines, assets, processes, products, indicators, failureRisks, shifts, responsibles, aiConfig] = await Promise.all([
    safeQuery('SELECT name, hierarchy_level, work_area, escalation_role FROM company_roles WHERE company_id = $1 AND active ORDER BY hierarchy_level', [companyId]),
    safeQuery('SELECT name, code, main_bottleneck, criticality_level FROM production_lines WHERE company_id = $1 AND active', [companyId]),
    safeQuery('SELECT name, code_patrimonial, operational_nickname, criticality, recurrent_failures FROM assets WHERE company_id = $1 AND active ORDER BY name LIMIT 30', [companyId]),
    safeQuery('SELECT name, category, objective FROM company_processes WHERE company_id = $1 AND active ORDER BY name LIMIT 20', [companyId]),
    safeQuery('SELECT name, code, category FROM company_products WHERE company_id = $1 AND active ORDER BY name LIMIT 20', [companyId]),
    safeQuery('SELECT name, target_value, unit, criticality_level FROM kpi_indicators WHERE company_id = $1 AND active ORDER BY name LIMIT 15', [companyId]),
    safeQuery('SELECT name, failure_type, criticality_level, operational_impact FROM failure_risks WHERE company_id = $1 AND active ORDER BY criticality_level LIMIT 15', [companyId]),
    safeQuery('SELECT name, start_time, end_time FROM shifts WHERE company_id = $1 AND active ORDER BY start_time NULLS LAST', [companyId]),
    safeQuery('SELECT area_name, main_responsible_id, responsible_themes FROM area_responsibles WHERE company_id = $1 AND active', [companyId]),
    safeQuery('SELECT config_key, internal_terms, internal_acronyms, critical_words FROM ai_intelligence_config WHERE company_id = $1 AND active', [companyId])
  ]);

  if (roles.length > 0) {
    const roleList = roles.map(r => `- ${r.name}${r.hierarchy_level != null ? ` (nível ${r.hierarchy_level})` : ''}${r.work_area ? ` - ${r.work_area}` : ''}`).join('\n');
    parts.push(`### Cargos e estrutura hierárquica\n${roleList}`);
  }

  if (lines.length > 0) {
    const lineList = lines.map(l => `- ${l.name}${l.code ? ` (${l.code})` : ''}${l.main_bottleneck ? ` | Gargalo: ${l.main_bottleneck}` : ''}${l.criticality_level ? ` | Crítico: ${l.criticality_level}` : ''}`).join('\n');
    parts.push(`### Linhas de produção\n${lineList}`);
  }

  if (assets.length > 0) {
    const assetList = assets.slice(0, 20).map(a => `- ${a.name}${a.operational_nickname ? ` ("${a.operational_nickname}")` : ''}${a.code_patrimonial ? ` [${a.code_patrimonial}]` : ''}${a.criticality ? ` - ${a.criticality}` : ''}`).join('\n');
    parts.push(`### Máquinas e ativos\n${assetList}`);
  }

  if (processes.length > 0) {
    const procList = processes.map(p => `- ${p.name}${p.category ? ` (${p.category})` : ''}${p.objective ? `: ${p.objective.slice(0, 80)}` : ''}`).join('\n');
    parts.push(`### Processos\n${procList}`);
  }

  if (products.length > 0) {
    const prodList = products.map(p => `- ${p.name}${p.code ? ` [${p.code}]` : ''}${p.category ? ` (${p.category})` : ''}`).join('\n');
    parts.push(`### Produtos\n${prodList}`);
  }

  if (indicators.length > 0) {
    const indList = indicators.map(i => `- ${i.name}: meta ${i.target_value || '-'} ${i.unit || ''}`).join('\n');
    parts.push(`### Indicadores e metas\n${indList}`);
  }

  if (failureRisks.length > 0) {
    const riskList = failureRisks.map(f => `- ${f.name} (${f.failure_type || '-'}) - ${f.criticality_level || 'N/A'}`).join('\n');
    parts.push(`### Falhas e riscos conhecidos\n${riskList}`);
  }

  if (shifts.length > 0) {
    const shiftList = shifts.map(s => `- ${s.name}: ${s.start_time || '-'} às ${s.end_time || '-'}`).join('\n');
    parts.push(`### Turnos\n${shiftList}`);
  }

  if (responsibles.length > 0) {
    const respList = responsibles.map(r => `- ${r.area_name}${r.responsible_themes?.length ? `: ${r.responsible_themes.slice(0, 3).join(', ')}` : ''}`).join('\n');
    parts.push(`### Responsáveis por área\n${respList}`);
  }

  if (aiConfig.length > 0) {
    const terms = [];
    aiConfig.forEach(c => {
      if (c.internal_terms?.length) terms.push(...c.internal_terms);
      if (c.internal_acronyms?.length) terms.push(...c.internal_acronyms.map(a => `${a} (sigla)`));
      if (c.critical_words?.length) terms.push(...c.critical_words.map(w => `${w} (crítico)`));
    });
    if (terms.length > 0) {
      const unique = [...new Set(terms)];
      parts.push(`### Termos internos, siglas e palavras críticas\n${unique.slice(0, 30).join(', ')}`);
    }
  }

  if (parts.length === 0) return '';

  const full = '\n## Base estrutural da empresa (cadastro admin)\n' + parts.join('\n\n');
  return full.length > maxLength ? full.slice(0, maxLength) + '...' : full;
}

/**
 * Versão compacta para memória (onboarding) - max 2000 chars
 */
async function buildStructuralSummary(companyId) {
  return buildStructuralContext(companyId, { maxLength: 2000 });
}

module.exports = {
  getCompanyExtendedData,
  buildStructuralContext,
  buildStructuralSummary
};
