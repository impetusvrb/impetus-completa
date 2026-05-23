'use strict';

/**
 * Catálogo canónico de áreas funcionais (dashboard / IA / contextual engine).
 * Fonte única para inferência, validação Zod e opções do formulário admin.
 */

function normKey(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/** @typedef {{ id: string, label: string, aliases: string[], axis: string, dashboard_area?: string }} FunctionalAreaEntry */

/** Áreas com perfil de dashboard dedicado (ROLE_AREA_TO_PROFILE). */
const DASHBOARD_PROFILE_AREAS = new Set([
  'production', 'maintenance', 'quality', 'operations', 'pcp', 'hr', 'finance', 'admin',
  'environmental', 'sustainability', 'environmental_health_safety', 'logistics', 'safety',
  'utilities', 'industrial', 'laboratory', 'esg', 'governance', 'compliance', 'executive'
]);

const FUNCTIONAL_AREA_ENTRIES = Object.freeze([
  { id: 'production', label: 'Produção', axis: 'production', aliases: ['producao', 'produção', 'linha', 'fabrica', 'fábrica'] },
  { id: 'operations', label: 'Operações', axis: 'operations', aliases: ['operacoes', 'operações', 'operacional', 'operacao'] },
  { id: 'maintenance', label: 'Manutenção', axis: 'maintenance', aliases: ['manutencao', 'manutenção', 'pcm', 'mecanica'] },
  { id: 'quality', label: 'Qualidade', axis: 'quality', aliases: ['qualidade', 'qc', 'qa', 'inspecao'] },
  {
    id: 'environmental',
    label: 'Meio Ambiente',
    axis: 'environmental',
    aliases: [
      'meio_ambiente', 'meio ambiente', 'ambiental', 'environment', 'environmental',
      'gestao_ambiental', 'gestão_ambiental', 'departamento_ambiental'
    ]
  },
  {
    id: 'sustainability',
    label: 'Sustentabilidade',
    axis: 'sustainability',
    aliases: ['sustentabilidade', 'sustentabilidade_corporativa', 'corporate_sustainability']
  },
  {
    id: 'environmental_health_safety',
    label: 'EHS',
    axis: 'environmental_health_safety',
    aliases: ['ehs', 'meio_ambiente_e_saude', 'saude_seguranca_meio_ambiente', 'hsse']
  },
  {
    id: 'safety',
    label: 'Segurança do Trabalho',
    axis: 'safety',
    aliases: ['seguranca', 'segurança', 'seguranca_do_trabalho', 'sst', 'sso', 'sms', 'saude_seguranca']
  },
  { id: 'hr', label: 'Recursos Humanos', axis: 'hr', aliases: ['rh', 'recursos_humanos', 'gestao_de_pessoas', 'people'] },
  { id: 'hr', label: 'Departamento Pessoal', axis: 'hr', aliases: ['departamento_pessoal', 'dp', 'pessoal'] },
  { id: 'finance', label: 'Finanças', axis: 'finance', aliases: ['financas', 'financeiro', 'tesouraria'] },
  { id: 'finance', label: 'Controladoria', axis: 'finance', aliases: ['controladoria', 'contabilidade', 'contabil'] },
  { id: 'procurement', label: 'Compras', axis: 'operations', aliases: ['compras', 'suprimentos_compras'] },
  { id: 'supply', label: 'Suprimentos', axis: 'logistics', aliases: ['suprimentos', 'supply_chain'] },
  { id: 'inventory', label: 'Almoxarifado', axis: 'logistics', aliases: ['almoxarifado', 'almox', 'estoque'] },
  { id: 'logistics', label: 'Logística', axis: 'logistics', aliases: ['logistica', 'logística', 'tms', 'wms', 'expedicao'] },
  { id: 'pcp', label: 'PCP', axis: 'pcp', aliases: ['planejamento', 'planejamento_controle_producao', 'mpp', 'mrp'] },
  { id: 'engineering', label: 'Engenharia', axis: 'industrial', aliases: ['engenharia', 'engenheiro'] },
  { id: 'process_engineering', label: 'Processos', axis: 'industrial', aliases: ['processos', 'engenharia_processos'] },
  { id: 'utilities', label: 'Utilidades', axis: 'utilities', aliases: ['utilidades', 'utilities', 'utility', 'vapor', 'ar_comprimido'] },
  { id: 'facilities', label: 'Facilities', axis: 'facilities', aliases: ['facilities', 'predial', 'infraestrutura'] },
  { id: 'it', label: 'TI', axis: 'admin', aliases: ['ti', 'tecnologia_da_informacao', 'tecnologia', 'informatica', 'sistemas'] },
  { id: 'admin', label: 'Administrativo', axis: 'admin', aliases: ['administrativo', 'administracao', 'administração'] },
  { id: 'legal', label: 'Jurídico', axis: 'governance', aliases: ['juridico', 'jurídico', 'legal'] },
  { id: 'commercial', label: 'Comercial', axis: 'operations', aliases: ['comercial', 'vendas', 'sales'] },
  { id: 'customer_service', label: 'Atendimento', axis: 'operations', aliases: ['atendimento', 'sac', 'customer_success'] },
  { id: 'projects', label: 'Projetos', axis: 'operations', aliases: ['projetos', 'pmo'] },
  { id: 'innovation', label: 'Inovação', axis: 'industrial', aliases: ['inovacao', 'inovação', 'p&d', 'pd'] },
  { id: 'governance', label: 'Governança', axis: 'governance', aliases: ['governanca', 'governança'] },
  { id: 'compliance', label: 'Compliance', axis: 'compliance', aliases: ['compliance', 'conformidade', 'regulatorio'] },
  { id: 'audit', label: 'Auditoria', axis: 'governance', aliases: ['auditoria', 'auditor', 'audit'] },
  { id: 'executive', label: 'Diretoria', axis: 'executive', aliases: ['diretoria', 'executivo', 'executiva', 'c_level', 'presidencia'] },
  { id: 'industrial', label: 'Industrial', axis: 'industrial', aliases: ['industrial', 'industria', 'indústria'] },
  { id: 'energy', label: 'Energia', axis: 'utilities', aliases: ['energia', 'energy', 'eletrica', 'geracao'] },
  { id: 'fleet', label: 'Frotas', axis: 'logistics', aliases: ['frotas', 'fleet', 'transportes'] },
  { id: 'assets', label: 'Patrimônio', axis: 'finance', aliases: ['patrimonio', 'patrimônio', 'ativos'] },
  { id: 'laboratory', label: 'Laboratório', axis: 'laboratory', aliases: ['laboratorio', 'laboratório', 'lab', 'analises'] },
  { id: 'r_and_d', label: 'Pesquisa e Desenvolvimento', axis: 'industrial', aliases: ['pesquisa_e_desenvolvimento', 'pesquisa', 'desenvolvimento', 'r&d'] },
  { id: 'esg', label: 'ESG', axis: 'esg', aliases: ['esg', 'asg', 'ambiental_social_governanca'] }
]);

const ALIAS_TO_ID = new Map();
const ID_TO_ENTRY = new Map();

for (const entry of FUNCTIONAL_AREA_ENTRIES) {
  if (!ID_TO_ENTRY.has(entry.id)) {
    ID_TO_ENTRY.set(entry.id, { ...entry, aliases: [...entry.aliases] });
  } else {
    const existing = ID_TO_ENTRY.get(entry.id);
    existing.aliases.push(...entry.aliases);
  }
  ALIAS_TO_ID.set(normKey(entry.id), entry.id);
  for (const a of entry.aliases) {
    ALIAS_TO_ID.set(normKey(a), entry.id);
  }
  ALIAS_TO_ID.set(normKey(entry.label), entry.id);
}

/** IDs válidos para persistência / Zod */
const FUNCTIONAL_AREA_IDS = Object.freeze([...ID_TO_ENTRY.keys()]);

function resolveIdFromText(text) {
  const t = normKey(text);
  if (!t) return null;
  if (ALIAS_TO_ID.has(t)) return ALIAS_TO_ID.get(t);
  const compact = t.replace(/_/g, '');
  for (const [alias, id] of ALIAS_TO_ID) {
    const a = alias.replace(/_/g, '');
    if (a.length >= 4 && (compact.includes(a) || t.includes(alias))) return id;
  }
  return null;
}

function getLabel(id) {
  return ID_TO_ENTRY.get(id)?.label || id;
}

function getAxis(id) {
  return ID_TO_ENTRY.get(id)?.axis || id;
}

function listForAdminSelect() {
  const seen = new Set();
  const out = [];
  for (const entry of ID_TO_ENTRY.values()) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push({ value: entry.id, label: entry.label, axis: entry.axis });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

function isKnownId(id) {
  return ID_TO_ENTRY.has(String(id || '').trim());
}

/** Texto indica contexto ambiental / sustentabilidade (bloqueia inferência QUALITY genérica). */
function hasEnvironmentalSemanticSignal(text) {
  const t = normKey(text);
  if (!t) return false;
  const flat = t.replace(/_/g, ' ');
  if (
    /(meio ambiente|ambiental|environmental|sustentabil|esg|ehs|emissao|residuo|efluente|carbono|utilities|utilidades|licenca ambiental)/.test(
      flat
    )
  ) {
    return true;
  }
  // ETA/ETE só como palavra inteira (evita falso positivo em "diretamente", "gestão", etc.)
  return /(?:^|\s)(eta|ete)(?:\s|$)/.test(flat);
}

module.exports = {
  FUNCTIONAL_AREA_ENTRIES,
  FUNCTIONAL_AREA_IDS,
  DASHBOARD_PROFILE_AREAS,
  normKey,
  resolveIdFromText,
  getLabel,
  getAxis,
  listForAdminSelect,
  isKnownId,
  hasEnvironmentalSemanticSignal
};
