/**
 * Snapshots operacionais de todo o IMPETUS — filtrados por módulos e permissões do utilizador.
 * Alimenta painel de comando, voz Anam e Claude panel com dados reais (não inventados).
 */
const db = require('../db');
const dashboardAccessService = require('./dashboardAccessService');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const hierarchicalFilter = require('./hierarchicalFilter');
const maintenanceService = require('./dashboardMaintenanceService');
const dashboardKPIs = require('./dashboardKPIs');

/** Domínios do produto → módulos IMPETUS e palavras-chave em PT. */
const DOMAIN_REGISTRY = [
  {
    id: 'telemetria',
    label: 'Telemetria / PLC',
    menuHint: 'Dashboard operacional / equipamentos PLC',
    moduleKeys: ['operational', 'anomaly_detection', 'dashboard'],
    permissions: ['operational.view', 'VIEW_OPERATIONAL', 'VIEW_DASHBOARD'],
    keywords: [/telemetria/, /\bplc\b/, /sensor/, /equipamento/, /coletad/, /anomalia/]
  },
  {
    id: 'manutencao',
    label: 'Manutenção / ManuIA',
    menuHint: 'ManuIA / Manutenção',
    moduleKeys: ['manuia', 'operational', 'dashboard'],
    permissions: ['operational.view', 'VIEW_OPERATIONAL'],
    keywords: [/manuten/, /\bos\b/, /ordem de serv/, /mtbf/, /mttr/, /manuia/]
  },
  {
    id: 'producao',
    label: 'Produção / linhas',
    menuHint: 'Dashboard / módulo Industrial',
    moduleKeys: ['operational', 'dashboard'],
    permissions: ['operational.view', 'VIEW_OPERATIONAL', 'VIEW_DASHBOARD'],
    keywords: [/produ/, /\boee\b/, /linha\s/, /turno/, /fabrica/, /f[aá]brica/]
  },
  {
    id: 'qualidade',
    label: 'Qualidade',
    menuHint: 'Inteligência de Qualidade',
    moduleKeys: ['quality_intelligence', 'operational', 'dashboard'],
    permissions: ['operational.view', 'VIEW_OPERATIONAL'],
    keywords: [/qualidade/, /\bnc\b/, /n[aã]o conform/, /inspe/, /retrabalho/]
  },
  {
    id: 'ambiente',
    label: 'Meio ambiente',
    menuHint: 'Inteligência Ambiental',
    moduleKeys: ['environment_intelligence', 'operational'],
    permissions: ['operational.view', 'VIEW_OPERATIONAL'],
    keywords: [/ambient/, /emis/, /meio ambiente/, /ambiental/]
  },
  {
    id: 'rh',
    label: 'RH / pessoas',
    menuHint: 'Inteligência de RH',
    moduleKeys: ['hr_intelligence', 'operational'],
    permissions: ['operational.view', 'VIEW_OPERATIONAL'],
    keywords: [/\brh\b/, /recursos humanos/, /pessoas/, /colaborador/]
  },
  {
    id: 'proaction',
    label: 'Pró-Ação / propostas',
    menuHint: 'Pró-Ação',
    moduleKeys: ['proaction', 'operational'],
    permissions: ['proaction.view', 'VIEW_PROPOSALS', 'operational.view'],
    keywords: [/pro.?a[cç][aã]o/, /proposta/, /plano de a[cç][aã]o/]
  },
  {
    id: 'chat',
    label: 'Chat Impetus',
    menuHint: 'Chat interno',
    moduleKeys: ['chat', 'operational'],
    permissions: ['chat.view', 'ACCESS_AI_ANALYTICS'],
    keywords: [/chat/, /mensagem/, /conversa interna/]
  },
  {
    id: 'comunicacoes',
    label: 'Comunicações / alertas',
    menuHint: 'Centro de comando / comunicações',
    moduleKeys: ['operational', 'dashboard'],
    permissions: ['VIEW_OPERATIONAL', 'operational.view'],
    keywords: [/comunica/, /alerta/, /prioridade/, /cr[ií]tic/]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    menuHint: 'Dashboard (indicadores financeiros)',
    moduleKeys: ['dashboard'],
    permissions: ['VIEW_FINANCIAL', 'VIEW_STRATEGIC'],
    keywords: [/financeir/, /custo/, /despesa/, /receita/]
  }
];

const MODULE_LABELS = {
  dashboard: 'Dashboard',
  operational: 'Operacional',
  proaction: 'Pró-Ação',
  chat: 'Chat',
  biblioteca: 'Biblioteca',
  ai: 'IA',
  manuia: 'ManuIA',
  quality_intelligence: 'Qualidade',
  environment_intelligence: 'Ambiente',
  hr_intelligence: 'RH',
  anomaly_detection: 'Detecção de anomalias',
  raw_material_lots: 'Lotes matéria-prima',
  admin: 'Administração',
  audit: 'Auditoria',
  settings: 'Configurações',
  registro_inteligente: 'Registro inteligente',
  cadastrar_com_ia: 'Cadastrar com IA'
};

function normText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hasPerm(user, codes) {
  const perms = new Set(dashboardAccessService.getEffectivePermissions(user));
  if (perms.has('*')) return true;
  return codes.some((c) => perms.has(c));
}

function userCanAccessDomain(user, domain) {
  const allowed = new Set(dashboardAccessService.getAllowedModules(user));
  const moduleOk = domain.moduleKeys.some((k) => allowed.has(k));
  const permOk = hasPerm(user, domain.permissions || []);
  return moduleOk || permOk;
}

/**
 * @param {object} user
 * @returns {{ key: string, label: string }[]}
 */
function getSoftwareCatalogForUser(user) {
  const allowed = dashboardAccessService.getAllowedModules(user);
  return allowed.map((key) => ({
    key,
    label: MODULE_LABELS[key] || key.replace(/_/g, ' ')
  }));
}

/**
 * @param {string} queryText
 * @param {object} user
 * @returns {string[]} domain ids
 */
function inferDomainsFromText(queryText, user) {
  const n = normText(queryText);
  if (!n.trim()) return [];
  const matched = [];
  for (const d of DOMAIN_REGISTRY) {
    if (!userCanAccessDomain(user, d)) continue;
    if (d.keywords.some((re) => re.test(n))) matched.push(d.id);
  }
  if (!matched.length && /como est[aá]|mostra|exibe|painel|resumo|situa[cç][aã]o|status/.test(n)) {
    for (const d of DOMAIN_REGISTRY) {
      if (userCanAccessDomain(user, d)) matched.push(d.id);
    }
    return matched.slice(0, 3);
  }
  return matched;
}

async function fetchPlcTelemetry(companyId) {
  try {
    const [eq, anom] = await Promise.all([
      db.query(
        `SELECT COUNT(DISTINCT equipment_id)::int AS c FROM plc_collected_data
         WHERE company_id = $1 AND equipment_id IS NOT NULL AND collected_at > now() - INTERVAL '24 hours'`,
        [companyId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM plc_analysis
         WHERE company_id = $1 AND created_at > now() - INTERVAL '24 hours'
           AND severity IN ('alta', 'high', 'critical', 'critica')`,
        [companyId]
      )
    ]);
    return {
      ok: true,
      rows: [
        ['Equipamentos com leitura (24h)', String(eq.rows[0]?.c ?? 0)],
        ['Anomalias PLC (24h)', String(anom.rows[0]?.c ?? 0)]
      ],
      metrics: [
        { name: 'Equipamentos ativos', value: Number(eq.rows[0]?.c ?? 0) },
        { name: 'Anomalias', value: Number(anom.rows[0]?.c ?? 0) }
      ]
    };
  } catch (e) {
    return { ok: false, error: e?.message, rows: [], metrics: [] };
  }
}

async function fetchMaintenanceSnapshot(user) {
  try {
    const cards = await maintenanceService.getCards(user);
    if (!cards || typeof cards !== 'object') {
      return { ok: true, rows: [['Estado', 'Sem dados de manutenção no escopo']], metrics: [] };
    }
    const rows = Object.entries(cards).map(([k, v]) => [k.replace(/_/g, ' '), String(v ?? '—')]);
    const metrics = rows.slice(0, 8).map(([name, val]) => ({
      name: String(name).slice(0, 28),
      value: parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0
    }));
    return { ok: true, rows, metrics };
  } catch (e) {
    return { ok: false, error: e?.message, rows: [], metrics: [] };
  }
}

async function fetchProposalsSnapshot(user, scope) {
  try {
    const filter = hierarchicalFilter.buildProposalsFilter(scope, user.company_id);
    const r = await db.query(
      `SELECT status, COUNT(*)::int AS c FROM proposals p WHERE ${filter.whereClause} GROUP BY status`,
      filter.params
    );
    const rows = (r.rows || []).map((row) => [String(row.status || '—'), String(row.c)]);
    const metrics = rows.map(([name, val]) => ({ name, value: Number(val) || 0 }));
    return { ok: true, rows: rows.length ? rows : [['Propostas', '0']], metrics };
  } catch (e) {
    return { ok: false, error: e?.message, rows: [], metrics: [] };
  }
}

async function fetchChatSnapshot(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM chat_messages m
       JOIN chat_conversations c ON c.id = m.conversation_id
       WHERE c.company_id = $1 AND m.created_at > now() - INTERVAL '48 hours'`,
      [companyId]
    );
    const total = Number(r.rows[0]?.c ?? 0);
    return {
      ok: true,
      rows: [['Mensagens (48h)', String(total)]],
      metrics: [{ name: 'Mensagens 48h', value: total }]
    };
  } catch (e) {
    return { ok: false, error: e?.message, rows: [], metrics: [] };
  }
}

async function fetchCommunicationsSnapshot(user, scope) {
  try {
    const filter = hierarchicalFilter.buildCommunicationsFilter(scope, user.company_id);
    const r = await db.query(
      `SELECT COALESCE(priority, 'normal') AS pr, COUNT(*)::int AS c FROM communications c
       WHERE ${filter.whereClause} GROUP BY COALESCE(priority, 'normal')`,
      filter.params
    );
    const rows = (r.rows || []).map((row) => [String(row.pr), String(row.c)]);
    return {
      ok: true,
      rows: rows.length ? rows : [['Abertas', '0']],
      metrics: rows.map(([name, val]) => ({ name, value: Number(val) || 0 }))
    };
  } catch (e) {
    return { ok: false, error: e?.message, rows: [], metrics: [] };
  }
}

async function fetchDomainSnapshot(user, domainId, scope) {
  const domain = DOMAIN_REGISTRY.find((d) => d.id === domainId);
  if (!domain) return null;
  if (!userCanAccessDomain(user, domain)) {
    return {
      domainId,
      label: domain.label,
      permitted: false,
      denialReason: `O seu perfil não tem acesso ao módulo «${domain.label}».`
    };
  }

  const companyId = user.company_id;
  let data = { ok: false, rows: [], metrics: [] };

  if (domainId === 'telemetria') data = await fetchPlcTelemetry(companyId);
  else if (domainId === 'manutencao') data = await fetchMaintenanceSnapshot(user);
  else if (domainId === 'proaction') data = await fetchProposalsSnapshot(user, scope);
  else if (domainId === 'chat') data = await fetchChatSnapshot(companyId);
  else if (domainId === 'comunicacoes') data = await fetchCommunicationsSnapshot(user, scope);
  else if (['producao', 'qualidade', 'ambiente', 'rh', 'financeiro'].includes(domainId)) {
    const summary = await dashboardKPIs.getDashboardSummary(user).catch(() => null);
    const rows = [
      ['Alertas críticos', String(summary?.alerts?.critical ?? '—')],
      ['Interações (7d)', String(summary?.operational_interactions?.total ?? '—')],
      ['Propostas abertas', String(summary?.proposals?.total ?? '—')],
      ['Insights IA (7d)', String(summary?.ai_insights?.total ?? '—')]
    ];
    data = {
      ok: true,
      rows,
      metrics: rows.map(([name, val]) => ({
        name,
        value: parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0
      }))
    };
  }

  return {
    domainId,
    label: domain.label,
    menuHint: domain.menuHint,
    permitted: true,
    ok: data.ok,
    rows: data.rows || [],
    metrics: data.metrics || [],
    error: data.error || null
  };
}

/**
 * @param {object} user
 * @param {string} queryText
 * @param {{ maxDomains?: number }} [opts]
 */
async function buildSnapshotsForQuery(user, queryText, opts = {}) {
  const maxDomains = opts.maxDomains ?? 5;
  const scope = await hierarchicalFilter.resolveHierarchyScope(user).catch(() => null);
  const domainIds = inferDomainsFromText(queryText, user).slice(0, maxDomains);

  if (!domainIds.length && normText(queryText).length >= 4) {
    if (userCanAccessDomain(user, DOMAIN_REGISTRY[0])) domainIds.push('telemetria');
    if (userCanAccessDomain(user, DOMAIN_REGISTRY.find((d) => d.id === 'manutencao'))) {
      domainIds.push('manutencao');
    }
  }

  const snapshots = [];
  for (const id of domainIds) {
    const snap = await fetchDomainSnapshot(user, id, scope);
    if (snap) snapshots.push(snap);
  }
  return {
    catalog: getSoftwareCatalogForUser(user),
    domains_requested: domainIds,
    snapshots,
    fetched_at: new Date().toISOString()
  };
}

function formatCatalogBlock(catalog) {
  if (!catalog?.length) return 'Módulos IMPETUS autorizados: nenhum listado.';
  return `Módulos IMPETUS autorizados para este utilizador:\n${catalog
    .map((m) => `- ${m.label} (${m.key})`)
    .join('\n')}`;
}

function formatSnapshotsBlock(bundle) {
  const lines = [];
  if (!bundle?.snapshots?.length) {
    return 'Snapshot de módulos: nenhum domínio correspondente ao pedido (use KPIs gerais).';
  }
  for (const s of bundle.snapshots) {
    if (!s.permitted) {
      lines.push(`### ${s.label}\nAcesso negado: ${s.denialReason}`);
      continue;
    }
    lines.push(`### ${s.label} (${s.menuHint || ''})`);
    if (!s.ok && s.error) lines.push(`Dados indisponíveis: ${s.error}`);
    for (const [a, b] of s.rows || []) {
      lines.push(`- ${a}: ${b}`);
    }
  }
  return lines.join('\n');
}

function formatForAIPrompt(bundle) {
  return [
    formatCatalogBlock(bundle?.catalog),
    '',
    'DADOS POR MÓDULO (pedido actual — use estes números no painel; não invente):',
    formatSnapshotsBlock(bundle)
  ].join('\n');
}

/** Mapeia domínios inferidos para ids de dataset do smartPanel. */
function domainsToDatasetIds(domainIds) {
  const out = new Set();
  for (const id of domainIds || []) {
    if (id === 'telemetria') {
      out.add('telemetria');
      out.add('plc');
    } else if (id === 'manutencao') out.add('manutencao', 'maintenance');
    else if (id === 'proaction') out.add('proaction', 'proposals');
    else if (id === 'chat') out.add('chat');
    else if (id === 'comunicacoes') out.add('comunicacoes', 'alerts');
    else out.add(id);
    out.add('summary');
  }
  return [...out];
}

module.exports = {
  DOMAIN_REGISTRY,
  getSoftwareCatalogForUser,
  inferDomainsFromText,
  buildSnapshotsForQuery,
  formatForAIPrompt,
  formatCatalogBlock,
  formatSnapshotsBlock,
  domainsToDatasetIds,
  userCanAccessDomain
};
