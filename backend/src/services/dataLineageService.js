'use strict';

/**
 * Catálogo e linhagem de dados (Data Lineage) — proveniência para IA e auditoria.
 * Valores de last_sync em runtime: instante do pedido/snapshot salvo em meta.
 */

const SOURCE_CATALOG = {
  dashboard_kpis: {
    source_name: 'KPIs do painel IMPETUS',
    table_reference: 'dashboard_kpis_runtime / composer',
    update_frequency: 'snapshot por pedido à API',
    reliability_default: 88
  },
  operational_events: {
    source_name: 'Eventos operacionais',
    table_reference: 'eventos_empresa',
    update_frequency: 'quase tempo real (ingestão)',
    reliability_default: 86
  },
  maintenance_cases: {
    source_name: 'Histórico de manutenção',
    table_reference: 'casos_manutencao',
    update_frequency: 'atualização por intervenção',
    reliability_default: 90
  },
  tasks_backlog: {
    source_name: 'Tarefas e backlog',
    table_reference: 'tasks',
    update_frequency: 'contínuo',
    reliability_default: 87
  },
  assets_registry: {
    source_name: 'Registo de ativos',
    table_reference: 'assets',
    update_frequency: 'cadastro mestre',
    reliability_default: 92
  },
  sensors_context: {
    source_name: 'Contexto de sensores / IoT',
    table_reference: 'sensors (payload contextual)',
    update_frequency: 'variável (gateway / última leitura)',
    reliability_default: 78
  },
  documents_context: {
    source_name: 'Documentos referenciados',
    table_reference: 'knowledge_memory / anexos',
    update_frequency: 'sob carga no pedido',
    reliability_default: 84
  },
  gemini_perception: {
    source_name: 'Percepção multimodal (Vertex/Gemini)',
    table_reference: 'inferência_visual_sessao',
    update_frequency: 'tempo real na sessão',
    reliability_default: 82
  },
  erp_integration: {
    source_name: 'Integração ERP / externos',
    table_reference: 'erp_integration_staging',
    update_frequency: 'conforme conector',
    reliability_default: 72
  },
  chat_context: {
    source_name: 'Contexto da conversa (histórico)',
    table_reference: 'dashboard_chat_session',
    update_frequency: 'turno atual',
    reliability_default: 80
  },
  operational_insights_engine: {
    source_name: 'Motor de insights operacionais',
    table_reference: 'operational_insights',
    update_frequency: 'padrões agregados',
    reliability_default: 85
  },
  user_prompt_only: {
    source_name: 'Pedido do utilizador (sem dados estruturados)',
    table_reference: 'n/a',
    update_frequency: 'instante do pedido',
    reliability_default: 95
  }
};

function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Texto amigável em português para idade dos dados.
 */
function formatFreshnessPt(isoString, referenceNow = Date.now()) {
  if (!isoString) return 'instante do pedido (snapshot)';
  const t = new Date(isoString).getTime();
  if (Number.isNaN(t)) return 'instante do pedido (snapshot)';
  const sec = Math.max(0, Math.floor((referenceNow - t) / 1000));
  if (sec < 60) return `há ${sec} segundo(s)`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} minuto(s)`;
  const h = Math.floor(min / 60);
  if (h < 48) return `há ${h} hora(s)`;
  const d = Math.floor(h / 24);
  return `há ${d} dia(s)`;
}

function catalogMeta(key) {
  return SOURCE_CATALOG[key] || SOURCE_CATALOG.user_prompt_only;
}

function clampRel(n) {
  const x = typeof n === 'number' && !Number.isNaN(n) ? Math.round(n) : 80;
  return Math.max(0, Math.min(100, x));
}

function pickRowTimestamp(row) {
  if (!row || typeof row !== 'object') return null;
  return row.updated_at || row.fetched_at || row.synced_at || row.created_at || row.timestamp || null;
}

/**
 * Entradas de linhagem derivadas do dossiê cognitivo (sem queries pesadas).
 */
function buildLineageEntriesFromDossier(dossier) {
  const d = dossier?.data || {};
  const snapshotIso = dossier?.context?.timestamp || new Date().toISOString();
  const refNow = Date.now();
  const entries = [];

  const nK = Array.isArray(d.kpis) ? d.kpis.length : 0;
  if (nK > 0) {
    const cat = catalogMeta('dashboard_kpis');
    const titles = d.kpis
      .slice(0, 3)
      .map((k) => k.title || k.name || k.key || 'indicador')
      .filter(Boolean);
    const freshest = d.kpis.map(pickRowTimestamp).filter(Boolean).sort().reverse()[0];
    entries.push({
      entity: titles.length ? `Indicadores: ${titles.join(', ')}` : `${nK} indicador(es) do painel`,
      origin: `${cat.source_name} — ${cat.table_reference}`,
      freshness: formatFreshnessPt(freshest || snapshotIso, refNow),
      reliability_score: clampRel(cat.reliability_default),
      source_key: 'dashboard_kpis',
      update_frequency: cat.update_frequency,
      last_sync_timestamp: freshest || snapshotIso
    });
  }

  const nE = Array.isArray(d.events) ? d.events.length : 0;
  if (nE > 0) {
    const cat = catalogMeta('operational_events');
    const freshest = d.events.map(pickRowTimestamp).filter(Boolean).sort().reverse()[0];
    entries.push({
      entity: `${nE} evento(s) operacional(is) no contexto`,
      origin: `${cat.source_name} — ${cat.table_reference}`,
      freshness: formatFreshnessPt(freshest || snapshotIso, refNow),
      reliability_score: clampRel(cat.reliability_default),
      source_key: 'operational_events',
      update_frequency: cat.update_frequency,
      last_sync_timestamp: freshest || snapshotIso
    });
  }

  const nA = Array.isArray(d.assets) ? d.assets.length : 0;
  if (nA > 0) {
    const cat = catalogMeta('assets_registry');
    entries.push({
      entity: `${nA} referência(s) de ativos/equipamentos`,
      origin: `${cat.source_name} — ${cat.table_reference}`,
      freshness: formatFreshnessPt(snapshotIso, refNow),
      reliability_score: clampRel(cat.reliability_default),
      source_key: 'assets_registry',
      update_frequency: cat.update_frequency,
      last_sync_timestamp: snapshotIso
    });
  }

  const sk =
    d.sensors && typeof d.sensors === 'object' ? Object.keys(d.sensors).length : 0;
  if (sk > 0) {
    const cat = catalogMeta('sensors_context');
    entries.push({
      entity: `Bloco contextual de sensores (${sk} chave(s))`,
      origin: `${cat.source_name} — ${cat.table_reference}`,
      freshness: formatFreshnessPt(snapshotIso, refNow),
      reliability_score: clampRel(cat.reliability_default),
      source_key: 'sensors_context',
      update_frequency: cat.update_frequency,
      last_sync_timestamp: snapshotIso
    });
  }

  const nDoc = Array.isArray(d.documents) ? d.documents.length : 0;
  if (nDoc > 0) {
    const cat = catalogMeta('documents_context');
    entries.push({
      entity: `${nDoc} documento(s) referenciado(s)`,
      origin: `${cat.source_name} — ${cat.table_reference}`,
      freshness: formatFreshnessPt(snapshotIso, refNow),
      reliability_score: clampRel(cat.reliability_default),
      source_key: 'documents_context',
      update_frequency: cat.update_frequency,
      last_sync_timestamp: snapshotIso
    });
  }

  const nI = Array.isArray(d.images) ? d.images.length : 0;
  if (nI > 0) {
    const cat = catalogMeta('gemini_perception');
    entries.push({
      entity: `${nI} frame(s) ou imagem(ns) para percepção multimodal`,
      origin: `${cat.source_name} — ${cat.table_reference}`,
      freshness: formatFreshnessPt(snapshotIso, refNow),
      reliability_score: clampRel(cat.reliability_default),
      source_key: 'gemini_perception',
      update_frequency: cat.update_frequency,
      last_sync_timestamp: snapshotIso
    });
  }

  const extras = d.extras && typeof d.extras === 'object' ? d.extras : {};
  if (extras.erp_snapshot || extras.erp) {
    const cat = catalogMeta('erp_integration');
    entries.push({
      entity: 'Dados agregados de integração ERP',
      origin: `${cat.source_name} — ${cat.table_reference}`,
      freshness: formatFreshnessPt(snapshotIso, refNow),
      reliability_score: clampRel(cat.reliability_default),
      source_key: 'erp_integration',
      update_frequency: cat.update_frequency,
      last_sync_timestamp: snapshotIso
    });
  }

  if (entries.length === 0) {
    const cat = catalogMeta('user_prompt_only');
    entries.push({
      entity: 'Pedido textual (sem blocos estruturados KPI/evento/ativo no dossiê)',
      origin: `${cat.source_name}`,
      freshness: formatFreshnessPt(snapshotIso, refNow),
      reliability_score: clampRel(cat.reliability_default),
      source_key: 'user_prompt_only',
      update_frequency: cat.update_frequency,
      last_sync_timestamp: snapshotIso
    });
  }

  return entries;
}

/**
 * Anexa linhagem ao dossiê (snapshot de auditoria + bloco compacto para prompts).
 */
function attachToDossier(dossier) {
  if (!dossier?.meta) dossier.meta = {};
  const entries = buildLineageEntriesFromDossier(dossier);
  dossier.meta.data_lineage_snapshot = entries;
  dossier.meta.data_lineage_for_prompt = entries.map((e) => ({
    entidade: e.entity,
    fonte_tecnica: e.origin,
    frescura: e.freshness,
    fiabilidade_0_100: e.reliability_score,
    frequencia_atualizacao: e.update_frequency || '',
    sincronizado_em: e.last_sync_timestamp || null
  }));
  return dossier;
}

/**
 * Linhagem mínima para chat dashboard (dossiê leve).
 */
function buildLineageForChatContext({ messagePreview, historyTurns, snapshotIso }) {
  const cat = catalogMeta('chat_context');
  const iso = snapshotIso || new Date().toISOString();
  return [
    {
      entity: `Mensagem do utilizador e ${historyTurns || 0} turno(s) recente(s) de histórico`,
      origin: `${cat.source_name} — ${cat.table_reference}`,
      freshness: formatFreshnessPt(iso),
      reliability_score: clampRel(cat.reliability_default),
      source_key: 'chat_context',
      update_frequency: cat.update_frequency,
      last_sync_timestamp: iso,
      message_preview: String(messagePreview || '').slice(0, 200)
    }
  ];
}

/**
 * Linhagem para um KPI de insight (painel).
 */
function buildLineageForKpiCard(k, user) {
  const cat = catalogMeta('dashboard_kpis');
  const title = (k?.title || 'Indicador').trim();
  const iso = new Date().toISOString();
  return [
    {
      entity: `Cartão: ${title}`,
      origin: `${cat.source_name} — ${cat.table_reference}`,
      freshness: formatFreshnessPt(k?.updated_at || k?.fetched_at || iso),
      reliability_score: clampRel(cat.reliability_default),
      source_key: 'dashboard_kpis',
      update_frequency: cat.update_frequency,
      last_sync_timestamp: k?.updated_at || k?.fetched_at || iso,
      profile: user?.role || null
    }
  ];
}

/**
 * Linhagem para insight operacional (Cérebro).
 */
function buildLineageForOperationalInsightRow(row) {
  const cat = catalogMeta('operational_insights_engine');
  const iso = row?.created_at || new Date().toISOString();
  return [
    {
      entity: row?.titulo ? `Insight: ${String(row.titulo).slice(0, 120)}` : 'Insight operacional',
      origin: `${cat.source_name} — ${cat.table_reference}`,
      freshness: formatFreshnessPt(iso),
      reliability_score: clampRel(cat.reliability_default),
      source_key: 'operational_insights_engine',
      update_frequency: cat.update_frequency,
      last_sync_timestamp: iso,
      insight_id: row?.id ?? null
    }
  ];
}

function normalizeDataLineageItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const entity =
    raw.entity != null
      ? String(raw.entity).slice(0, 500)
      : raw.entidade != null
        ? String(raw.entidade).slice(0, 500)
        : '';
  const origin =
    raw.origin != null
      ? String(raw.origin).slice(0, 500)
      : raw.fonte_tecnica != null
        ? String(raw.fonte_tecnica).slice(0, 500)
        : '';
  if (!entity && !origin) return null;
  const freshnessRaw =
    raw.freshness != null ? raw.freshness : raw.frescura != null ? raw.frescura : null;
  return {
    entity: entity || 'Fonte não nomeada',
    origin: origin || 'Origem não especificada',
    freshness: freshnessRaw != null ? String(freshnessRaw).slice(0, 200) : 'n/d',
    reliability_score: clampRel(
      typeof raw.reliability_score === 'number'
        ? raw.reliability_score
        : typeof raw.fiabilidade_0_100 === 'number'
          ? raw.fiabilidade_0_100
          : raw.reliability
    )
  };
}

/**
 * Funde linha do catálogo com entradas do modelo (dedupe por entity+origin).
 */
function mergeDataLineage(catalogEntries, modelEntries) {
  const out = [];
  const seen = new Set();
  const add = (item) => {
    const n = normalizeDataLineageItem(item);
    if (!n) return;
    const k = `${n.entity}|${n.origin}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(n);
  };
  (Array.isArray(catalogEntries) ? catalogEntries : []).forEach(add);
  (Array.isArray(modelEntries) ? modelEntries : []).forEach(add);
  return out;
}

module.exports = {
  SOURCE_CATALOG,
  formatFreshnessPt,
  buildLineageEntriesFromDossier,
  attachToDossier,
  buildLineageForChatContext,
  buildLineageForKpiCard,
  buildLineageForOperationalInsightRow,
  mergeDataLineage,
  normalizeDataLineageItem,
  catalogMeta
};
