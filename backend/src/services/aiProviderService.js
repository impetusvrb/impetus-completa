'use strict';

/**
 * Transparência de fornecedores de IA (Nexus IA / governança).
 * Metadados técnicos e privacidade — aditivo ao billing existente.
 */

const db = require('../db');
const aiHealth = require('./aiIntegrationsHealthService');

const CACHE_TTL_MS = 60000;
const companyConfigCache = new Map();

/** Catálogo estático (DPA / retenção / região típica). URLs oficiais dos fornecedores. */
const PROVIDER_CATALOG = {
  openai: {
    key: 'openai',
    display_name: 'OpenAI',
    logo_hint: 'openai',
    default_region_note: 'EUA e regiões da API OpenAI (conforme contrato Enterprise/API)',
    retention_policy_pt:
      'Política de retenção e eliminação conforme OpenAI API Data Usage Policies; dados de API não usados para treinar modelos por defeito nas contas empresariais elegíveis.',
    dpa_url: 'https://openai.com/policies/data-processing-addendum',
    privacy_url: 'https://openai.com/policies/privacy-policy',
    compliance_badge_pt: 'Zero Data Training Policy — dados de API não utilizados para treinar os seus modelos (conforme produto e contrato).',
    active_for_nexus_categories: ['chat']
  },
  anthropic: {
    key: 'anthropic',
    display_name: 'Anthropic',
    logo_hint: 'anthropic',
    default_region_note: 'EUA (infraestrutura Anthropic / parceiros conforme serviço)',
    retention_policy_pt:
      'Retenção limitada ao processamento do pedido e políticas comerciais Anthropic; consulte DPA.',
    dpa_url: 'https://www.anthropic.com/legal/commercial-terms',
    privacy_url: 'https://www.anthropic.com/legal/privacy',
    compliance_badge_pt: 'Política comercial Anthropic — sem utilização dos seus conteúdos para treino nos termos do acordo aplicável.',
    active_for_nexus_categories: ['reports']
  },
  google_vertex: {
    key: 'google_vertex',
    display_name: 'Google Cloud (Vertex AI / Gemini)',
    logo_hint: 'google',
    default_region_note: 'Configurável (Vertex AI location); típico global ou UE conforme projeto',
    retention_policy_pt:
      'Google Cloud Data Processing Terms e configurações de retenção do projeto; dados processados conforme região e produto.',
    dpa_url: 'https://cloud.google.com/terms/data-processing-addendum',
    privacy_url: 'https://policies.google.com/privacy',
    compliance_badge_pt: 'Google Cloud — subprocessamento sob DPA; sem treino com dados do cliente quando configurado para processamento sem retenção prolongada (ver documentação do produto).',
    active_for_nexus_categories: ['supervision']
  },
  akool: {
    key: 'akool',
    display_name: 'Akool',
    logo_hint: 'akool',
    default_region_note: 'Conforme infraestrutura Akool / região do serviço contratado',
    retention_policy_pt: 'Consulte política de privacidade e termos Akool para retenção de mídia.',
    dpa_url: 'https://akool.com/privacy',
    privacy_url: 'https://akool.com/privacy',
    compliance_badge_pt: 'Fornecedor de avatar/vídeo — ver política de privacidade do fornecedor.',
    active_for_nexus_categories: ['chat']
  }
};

const CATEGORY_KEYS = ['chat', 'supervision', 'reports'];

function envModelChat() {
  return (process.env.IMPETUS_CHAT_MODEL || 'gpt-4o-mini').trim();
}

function envModelSupervision() {
  return (process.env.GEMINI_MODEL || process.env.GEMINI_SUPERVISOR_MODEL || 'gemini-2.5-flash').trim();
}

function envModelReports() {
  return (process.env.CLAUDE_MODEL || process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-latest').trim();
}

function defaultCompanyConfigRow() {
  return {
    chat_provider: 'openai',
    chat_model: envModelChat(),
    supervision_provider: 'google_vertex',
    supervision_model: envModelSupervision(),
    reports_provider: 'anthropic',
    reports_model: envModelReports()
  };
}

async function fetchCompanyModelConfigRow(companyId) {
  if (!companyId) return { ...defaultCompanyConfigRow(), from_db: false };
  try {
    const r = await db.query(
      `SELECT * FROM nexus_ai_company_model_config WHERE company_id = $1`,
      [companyId]
    );
    if (!r.rows[0]) {
      return { ...defaultCompanyConfigRow(), from_db: false };
    }
    const row = r.rows[0];
    const base = defaultCompanyConfigRow();
    return {
      chat_provider: row.chat_provider || base.chat_provider,
      chat_model: row.chat_model || base.chat_model,
      supervision_provider: row.supervision_provider || base.supervision_provider,
      supervision_model: row.supervision_model || base.supervision_model,
      reports_provider: row.reports_provider || base.reports_provider,
      reports_model: row.reports_model || base.reports_model,
      updated_at: row.updated_at,
      updated_by_impetus_admin_id: row.updated_by_impetus_admin_id,
      from_db: true
    };
  } catch (e) {
    if (String(e.message || '').includes('nexus_ai_company_model_config')) {
      return { ...defaultCompanyConfigRow(), from_db: false };
    }
    throw e;
  }
}

async function getCompanyModelConfig(companyId) {
  const now = Date.now();
  const hit = companyConfigCache.get(companyId);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.data;
  const data = await fetchCompanyModelConfigRow(companyId);
  companyConfigCache.set(companyId, { at: now, data });
  return data;
}

function invalidateCompanyConfigCache(companyId) {
  if (companyId) companyConfigCache.delete(companyId);
  else companyConfigCache.clear();
}

function resolveProviderMeta(providerKey) {
  const k = String(providerKey || '').toLowerCase();
  if (k === 'google' || k === 'gemini' || k === 'vertex') return PROVIDER_CATALOG.google_vertex;
  if (k === 'openai') return PROVIDER_CATALOG.openai;
  if (k === 'anthropic' || k === 'claude') return PROVIDER_CATALOG.anthropic;
  if (k === 'akool') return PROVIDER_CATALOG.akool;
  return PROVIDER_CATALOG.openai;
}

/** Presença de credenciais no ambiente (não implica API a responder). */
function integrationUp(providerKey) {
  return aiHealth.credentialsConfigured(providerKey);
}

function categoryFromModuleName(moduleName) {
  const m = String(moduleName || '').toLowerCase();
  if (m.includes('cognitive') || m.includes('council') || m.includes('claude')) return 'reports';
  if (m.includes('gemini') || m.includes('supervisor') || m.includes('perception')) return 'supervision';
  return 'chat';
}

/**
 * Enriquece model_info gravado na caixa-preta (aditivo, não substitui campos existentes).
 */
async function enrichModelInfoForTrace(companyId, modelInfo, moduleName) {
  const base = modelInfo && typeof modelInfo === 'object' ? { ...modelInfo } : {};
  const cfg = await getCompanyModelConfig(companyId);
  const cat = categoryFromModuleName(moduleName);
  let pk = cfg.chat_provider;
  let model = cfg.chat_model;
  if (cat === 'supervision') {
    pk = cfg.supervision_provider;
    model = cfg.supervision_model;
  } else if (cat === 'reports') {
    pk = cfg.reports_provider;
    model = cfg.reports_model;
  }
  const meta = resolveProviderMeta(pk);
  const health = await aiHealth.getAiIntegrationsHealth();
  const live = aiHealth.isLiveUp(meta.key, health);
  base.supplier_transparency = {
    category_resolved: cat,
    provider_key: meta.key,
    provider_display: meta.display_name,
    model_resolved: model,
    region_note: meta.default_region_note,
    retention_policy_pt: meta.retention_policy_pt,
    dpa_url: meta.dpa_url,
    privacy_url: meta.privacy_url,
    compliance_badge_pt: meta.compliance_badge_pt,
    integration_configured: integrationUp(meta.key),
    integration_reachable: live,
    integrations_health_probed_at: health.probed_at,
    integrations_health_from_cache: !!health.from_cache,
    generated_at: new Date().toISOString()
  };
  if (Array.isArray(base.stages) || Array.isArray(base.models_touched)) {
    base.supplier_transparency.subprocessors_in_trace = collectSubprocessorsFromModelInfo(base);
  }
  return base;
}

function collectSubprocessorsFromModelInfo(mi) {
  const out = [];
  const add = (key) => {
    const m = resolveProviderMeta(key);
    if (!out.find((x) => x.provider_key === m.key)) {
      out.push({
        provider_key: m.key,
        provider_display: m.display_name,
        dpa_url: m.dpa_url,
        privacy_url: m.privacy_url
      });
    }
  };
  (mi.stages || []).forEach((s) => {
    const p = String(s.provider || '').toLowerCase();
    if (p.includes('openai')) add('openai');
    else if (p.includes('anthropic') || p.includes('claude')) add('anthropic');
    else if (p.includes('google') || p.includes('gemini')) add('google_vertex');
  });
  (mi.models_touched || []).forEach((t) => {
    const x = String(t || '').toLowerCase();
    if (x.includes('openai')) add('openai');
    if (x.includes('anthropic') || x.includes('claude')) add('anthropic');
    if (x.includes('google') || x.includes('gemini')) add('google_vertex');
  });
  return out;
}

async function getProcessingDisclosure(companyId, category) {
  const cfg = await getCompanyModelConfig(companyId);
  const cat = CATEGORY_KEYS.includes(category) ? category : 'chat';
  let pk = cfg.chat_provider;
  let model = cfg.chat_model;
  if (cat === 'supervision') {
    pk = cfg.supervision_provider;
    model = cfg.supervision_model;
  } else if (cat === 'reports') {
    pk = cfg.reports_provider;
    model = cfg.reports_model;
  }
  const meta = resolveProviderMeta(pk);
  return {
    provider_label: meta.display_name,
    model: model || '—',
    privacy_path: '/app/admin/nexusia-custos?tab=infra',
    footer_pt: `Processado via ${meta.display_name} — Modelo ${model || '—'}. Veja detalhes de privacidade no módulo Nexus IA.`,
    provider_key: meta.key
  };
}

/** Resumo multi-etapa para respostas do Conselho Cognitivo (percepção → análise → síntese). */
async function getCognitivePipelineDisclosure(companyId) {
  const cfg = await getCompanyModelConfig(companyId);
  const metaChat = resolveProviderMeta(cfg.chat_provider);
  const metaSup = resolveProviderMeta(cfg.supervision_provider);
  const metaRep = resolveProviderMeta(cfg.reports_provider);
  const footer_pt = `Conselho Cognitivo: ${metaSup.display_name} (percepção), ${metaRep.display_name} (análise), ${metaChat.display_name} (síntese). Detalhes de privacidade no Nexus IA.`;
  return {
    provider_label: 'Pipeline (Conselho Cognitivo)',
    model: `${cfg.supervision_model} → ${cfg.reports_model} → ${cfg.chat_model}`,
    privacy_path: '/app/admin/nexusia-custos?tab=infra',
    footer_pt,
    pipeline: {
      perception: {
        provider_key: metaSup.key,
        provider_label: metaSup.display_name,
        model: cfg.supervision_model
      },
      analysis: {
        provider_key: metaRep.key,
        provider_label: metaRep.display_name,
        model: cfg.reports_model
      },
      synthesis: {
        provider_key: metaChat.key,
        provider_label: metaChat.display_name,
        model: cfg.chat_model
      }
    }
  };
}

async function buildTransparencyPayloadForCompany(companyId) {
  const cfg = await getCompanyModelConfig(companyId);
  const health = await aiHealth.getAiIntegrationsHealth();
  const cards = [];

  for (const cat of CATEGORY_KEYS) {
    let pk = cfg.chat_provider;
    let model = cfg.chat_model;
    let label = 'Chat e interação';
    if (cat === 'supervision') {
      pk = cfg.supervision_provider;
      model = cfg.supervision_model;
      label = 'Supervisão e automação (Gemini / Vertex)';
    } else if (cat === 'reports') {
      pk = cfg.reports_provider;
      model = cfg.reports_model;
      label = 'Relatórios e análise avançada (Claude)';
    }
    const meta = resolveProviderMeta(pk);
    const live = aiHealth.isLiveUp(meta.key, health);
    const hEntry = aiHealth.healthEntryForProviderKey(meta.key, health);
    cards.push({
      category_key: cat,
      category_label_pt: label,
      provider_key: meta.key,
      provider_display: meta.display_name,
      logo_hint: meta.logo_hint,
      model_active: model || '—',
      region_note: meta.default_region_note,
      retention_policy_pt: meta.retention_policy_pt,
      dpa_url: meta.dpa_url,
      privacy_url: meta.privacy_url,
      compliance_badge_pt: meta.compliance_badge_pt,
      operational_status: live ? 'up' : 'down',
      operational_status_label: aiHealth.operationalLabel(meta.key, health),
      operational_probe_detail: hEntry?.detail || null,
      credentials_present: aiHealth.credentialsConfigured(meta.key)
    });
  }

  return {
    ok: true,
    schema_version: 'nexus_transparency_v1',
    company_config_source: cfg.from_db ? 'database' : 'defaults_env',
    updated_at: cfg.updated_at || null,
    integrations_health: {
      probed_at: health.probed_at,
      from_cache: !!health.from_cache,
      cache_ttl_ms: health.cache_ttl_ms,
      providers_snapshot: {
        openai: health.openai,
        anthropic: health.anthropic,
        google_vertex: health.google_vertex,
        akool: health.akool
      }
    },
    providers_reference: Object.values(PROVIDER_CATALOG).map((p) => ({
      key: p.key,
      display_name: p.display_name,
      dpa_url: p.dpa_url,
      privacy_url: p.privacy_url
    })),
    cards
  };
}

async function getSubprocessorsForExport(companyId) {
  const payload = await buildTransparencyPayloadForCompany(companyId);
  const unique = new Map();
  for (const c of payload.cards || []) {
    unique.set(c.provider_key, {
      nome_fornecedor: c.provider_display,
      categoria_utilizacao_pt: c.category_label_pt,
      modelo_configurado: c.model_active,
      regiao_processamento_pt: c.region_note,
      politica_retencao_pt: c.retention_policy_pt,
      link_privacidade: c.privacy_url,
      link_dpa: c.dpa_url,
      selo_conformidade_pt: c.compliance_badge_pt,
      estado_integracao: c.operational_status,
      detalhe_sondagem: c.operational_probe_detail || null
    });
  }
  return {
    subprocessadores_ia: Array.from(unique.values()),
    nota_pt:
      'Lista reflete os fornecedores configurados para a sua organização no Nexus IA (chat, supervisão, relatórios).'
  };
}

async function upsertCompanyModelConfig(companyId, body, impetusAdminId) {
  const cur = defaultCompanyConfigRow();
  const chat_provider = body.chat_provider != null ? String(body.chat_provider).slice(0, 32) : cur.chat_provider;
  const chat_model = body.chat_model != null ? String(body.chat_model).slice(0, 256) : cur.chat_model;
  const supervision_provider =
    body.supervision_provider != null
      ? String(body.supervision_provider).slice(0, 32)
      : cur.supervision_provider;
  const supervision_model =
    body.supervision_model != null ? String(body.supervision_model).slice(0, 256) : cur.supervision_model;
  const reports_provider =
    body.reports_provider != null ? String(body.reports_provider).slice(0, 32) : cur.reports_provider;
  const reports_model =
    body.reports_model != null ? String(body.reports_model).slice(0, 256) : cur.reports_model;

  await db.query(
    `INSERT INTO nexus_ai_company_model_config (
       company_id, chat_provider, chat_model, supervision_provider, supervision_model,
       reports_provider, reports_model, updated_at, updated_by_impetus_admin_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7, now(), $8)
     ON CONFLICT (company_id) DO UPDATE SET
       chat_provider = EXCLUDED.chat_provider,
       chat_model = EXCLUDED.chat_model,
       supervision_provider = EXCLUDED.supervision_provider,
       supervision_model = EXCLUDED.supervision_model,
       reports_provider = EXCLUDED.reports_provider,
       reports_model = EXCLUDED.reports_model,
       updated_at = now(),
       updated_by_impetus_admin_id = EXCLUDED.updated_by_impetus_admin_id`,
    [
      companyId,
      chat_provider,
      chat_model,
      supervision_provider,
      supervision_model,
      reports_provider,
      reports_model,
      impetusAdminId || null
    ]
  );
  invalidateCompanyConfigCache(companyId);
  return fetchCompanyModelConfigRow(companyId);
}

module.exports = {
  PROVIDER_CATALOG,
  CATEGORY_KEYS,
  getCompanyModelConfig,
  enrichModelInfoForTrace,
  getProcessingDisclosure,
  getCognitivePipelineDisclosure,
  buildTransparencyPayloadForCompany,
  getSubprocessorsForExport,
  upsertCompanyModelConfig,
  invalidateCompanyConfigCache,
  integrationUp,
  resolveProviderMeta,
  defaultCompanyConfigRow
};
