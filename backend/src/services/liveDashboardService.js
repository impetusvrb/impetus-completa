'use strict';

const crypto = require('crypto');
const db = require('../db');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const dashboardAccessService = require('./dashboardAccessService');
const hierarchicalFilter = require('./hierarchicalFilter');
const userContext = require('./userContext');
const dashboardKPIs = require('./dashboardKPIs');
const { inferAreaFromJobTitle } = require('../config/dashboardProfiles');

const AREA_LABELS = {
  production: 'Produção',
  maintenance: 'Manutenção',
  quality: 'Qualidade',
  operations: 'Operações',
  pcp: 'PCP',
  hr: 'RH',
  finance: 'Financeiro',
  admin: 'Administração'
};

const orchestrationStash = new Map();
const STASH_TTL_MS = 30 * 60 * 1000;

function pruneStash() {
  const t = Date.now();
  for (const [k, v] of orchestrationStash) {
    if (t - v.at > STASH_TTL_MS) orchestrationStash.delete(k);
  }
}

function stashOrchestration(userId, payload) {
  pruneStash();
  const key = `${Date.now()}_${crypto.randomBytes(10).toString('hex')}`;
  orchestrationStash.set(key, { userId, ...payload, at: Date.now() });
  return key;
}

function popStash(key, userId) {
  pruneStash();
  const v = orchestrationStash.get(key);
  if (!v || v.userId !== userId) return null;
  orchestrationStash.delete(key);
  return v;
}

async function getDepartmentName(userId) {
  try {
    const r = await db.query(
      `SELECT d.name FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1 LIMIT 1`,
      [userId]
    );
    return r.rows?.[0]?.name || null;
  } catch (err) {
    console.warn('[liveDashboardService][department_name]', err?.message ?? err);
    return null;
  }
}

async function getTaskSignals(companyId, user, scope) {
  const base = ['company_id = $1'];
  const params = [companyId];
  let p = 2;

  try {
    if (!scope.isFullAccess && scope.scopeLevel === 'individual' && user?.id) {
      base.push(`(assigned_to::text = $${p} OR assigned_to IS NULL)`);
      params.push(String(user.id));
      p++;
    } else if (!scope.isFullAccess && scope.allowedUserIds?.length) {
      base.push(`(assigned_to::text = ANY($${p}::text[]) OR assigned_to IS NULL)`);
      params.push(scope.allowedUserIds.map((id) => String(id)));
      p++;
    }

    const r = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE COALESCE(status, 'open') NOT IN ('done', 'completed', 'closed', 'cancelled', 'rejected')) AS open,
        COUNT(*) FILTER (
          WHERE COALESCE(status, 'open') NOT IN ('done', 'completed', 'closed', 'cancelled', 'rejected')
          AND scheduled_at IS NOT NULL AND scheduled_at < now()
        ) AS overdue
      FROM tasks WHERE ${base.join(' AND ')}`,
      params
    );
    return {
      open: parseInt(r.rows[0]?.open || 0, 10),
      overdue: parseInt(r.rows[0]?.overdue || 0, 10)
    };
  } catch (e) {
    if (!String(e.message || '').includes('does not exist')) {
      console.warn('[LIVE_DASHBOARD] tasks:', e.message);
    }
    return { open: 0, overdue: 0, _unavailable: true };
  }
}

async function getOperationalAlertsPreview(companyId, limit = 8) {
  try {
    const r = await db.query(
      `SELECT id, tipo_alerta, severidade, titulo, mensagem, source, created_at
       FROM operational_alerts
       WHERE company_id = $1 AND (resolvido = false OR resolvido IS NULL)
       ORDER BY created_at DESC
       LIMIT $2`,
      [companyId, limit]
    );
    return (r.rows || []).map((row) => ({
      id: row.id,
      tipo_alerta: row.tipo_alerta,
      severidade: row.severidade || 'media',
      titulo: row.titulo || row.tipo_alerta || 'Alerta',
      message: row.mensagem || null,
      source: row.source || null
    }));
  } catch (err) {
    console.warn('[liveDashboardService][operational_alerts_preview]', err?.message ?? err);
    return [];
  }
}

async function getPlcTelemetrySummary(companyId) {
  try {
    const [eq, anom] = await Promise.all([
      db.query(
        `SELECT COUNT(DISTINCT equipment_id)::int AS c FROM plc_collected_data
         WHERE company_id = $1 AND equipment_id IS NOT NULL AND collected_at > now() - INTERVAL '24 hours'`,
        [companyId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM plc_analysis
         WHERE company_id = $1 AND created_at > now() - INTERVAL '24 hours' AND severity IN ('alta', 'high', 'critical', 'critica')`,
        [companyId]
      )
    ]);
    const equipments = parseInt(eq.rows[0]?.c || 0, 10);
    const anomalies = parseInt(anom.rows[0]?.c || 0, 10);
    return { ok: true, equipments_tracked: equipments, anomalies };
  } catch (err) {
    console.warn('[liveDashboardService][plc_telemetry_summary]', err?.message ?? err);
    return { ok: false, equipments_tracked: 0, anomalies: 0 };
  }
}

async function getChatOperationalMentions(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM chat_messages m
       JOIN chat_conversations c ON c.id = m.conversation_id
       WHERE c.company_id = $1
         AND m.created_at > now() - INTERVAL '48 hours'
         AND m.message_type = 'text'
         AND m.content ~* '(manutenção|parada|falha|urgente|plc|linha|produção|qualidade|nc|defeito)'`,
      [companyId]
    );
    const mentions = parseInt(r.rows[0]?.c || 0, 10);
    const r2 = await db.query(
      `SELECT COUNT(*)::int AS c FROM chat_messages m
       JOIN chat_conversations c ON c.id = m.conversation_id
       WHERE c.company_id = $1 AND m.created_at > now() - INTERVAL '48 hours'`,
      [companyId]
    );
    return {
      operational_mentions: mentions,
      messages_scanned_48h: parseInt(r2.rows[0]?.c || 0, 10)
    };
  } catch (err) {
    console.warn('[liveDashboardService][chat_operational_mentions]', err?.message ?? err);
    return { operational_mentions: 0, messages_scanned_48h: 0, _unavailable: true };
  }
}

async function getAuditSevere24h(companyId) {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM audit_logs
       WHERE company_id = $1 AND created_at > now() - INTERVAL '24 hours'
         AND severity IN ('error', 'critical', 'failed', 'high', 'alta')`,
      [companyId]
    );
    return parseInt(r.rows[0]?.c || 0, 10);
  } catch (err) {
    console.warn('[liveDashboardService][audit_severe_24h]', err?.message ?? err);
    return 0;
  }
}

async function getOpenCommunicationsCount(scope, companyId) {
  try {
    const filter = hierarchicalFilter.buildCommunicationsFilter(scope, companyId);
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM communications c
       WHERE ${filter.whereClause} AND COALESCE(c.status, '') NOT IN ('resolved', 'archived')`,
      filter.params
    );
    return parseInt(r.rows[0]?.c || 0, 10);
  } catch (err) {
    console.warn('[liveDashboardService][open_communications_count]', err?.message ?? err);
    return 0;
  }
}

function mapUrgencyToPriority(u) {
  const x = String(u || '').toLowerCase();
  if (/crit|urg|1|alta/.test(x)) return 'alta';
  if (/m[eé]d|2|norm/.test(x)) return 'media';
  return 'baixa';
}

async function buildOrchestrationPlan(companyId, user, scope, profileCode) {
  const strategic = /ceo_executive|director_/.test(profileCode);
  try {
    const filter = hierarchicalFilter.buildProposalsFilter(scope, companyId);
    const r = await db.query(
      `SELECT id, COALESCE(title, LEFT(proposed_solution, 120), problem_category, 'Pró-Ação') AS title,
              urgency, status, problem_category, created_at
       FROM proposals p
       WHERE ${filter.whereClause}
         AND COALESCE(status, '') NOT IN ('completed', 'rejected', 'done', 'closed')
       ORDER BY
         CASE WHEN urgency ILIKE '%crit%' OR urgency ILIKE '%urg%' THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT ${strategic ? 5 : 12}`,
      filter.params
    );
    const items = (r.rows || []).map((row, idx) => ({
      id: row.id,
      title: strategic ? `Consolidar: ${row.title}` : row.title,
      priority: mapUrgencyToPriority(row.urgency),
      suggested_order: idx + 1,
      source: 'proposals',
      context_line: row.problem_category || null,
      assignee_hint: strategic ? 'Diretoria / responsável tático' : 'Equipe do setor',
      eta_minutes: strategic ? 120 : 45,
      actions: [
        {
          id: `review_${row.id}`,
          label: strategic ? 'Registrar decisão / prioridade' : 'Abrir no Pró-Ação'
        }
      ]
    }));
    return { items, suggestions: [] };
  } catch (e) {
    console.warn('[LIVE_DASHBOARD] orchestration:', e.message);
    return { items: [], suggestions: [] };
  }
}

function kpiMapByKey(kpis) {
  const m = {};
  for (const k of kpis || []) {
    const key = (k.key || k.id || '').toString();
    if (key) m[key] = k.value;
  }
  return m;
}

function buildLayoutWidgets(profileConfig, kpiByKey) {
  const cards = profileConfig.cards || [];
  const widgets = [];
  let order = 0;
  for (const c of cards.slice(0, 10)) {
    const key = c.key;
    const val = kpiByKey[key];
    const hasData = val !== undefined && val !== null && val !== '';
    widgets.push({
      id: key || `w_${order}`,
      label: c.title || key,
      type: key || 'card',
      display_order: order++,
      highlight: false,
      pulse_level: 'calm',
      pulse_scale: 1,
      live_metric:
        hasData
          ? { label: 'Indicador', value: val }
          : null,
      personalization_note: hasData
        ? null
        : 'Sem dado numérico vinculado ainda — o cartão reflete o seu perfil; complete cadastros ou integrações para valores ao vivo.'
    });
  }
  if (widgets.length === 0) {
    widgets.push({
      id: 'placeholder',
      label: 'Perfil sem cartões configurados',
      type: 'placeholder',
      display_order: 0,
      live_metric: null,
      personalization_note:
        'Contate o administrador para associar um perfil de dashboard ao seu cargo e setor.'
    });
  }
  return widgets;
}

function canOrchestrate(user, profileCode) {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'ceo' || role === 'diretor') return true;
  const level = user?.hierarchy_level ?? userContext.buildUserContext(user)?.hierarchy_level ?? 5;
  if (level <= 4) return true;
  return /supervisor_|coordinator_|manager_|director_|ceo_/.test(profileCode);
}

function buildIntelligentSummary({
  userName,
  profileLabel,
  areaLabel,
  deptName,
  jobTitle,
  signals,
  gaps,
  sufficiency
}) {
  const parts = [
    `${userName ? `${userName}, ` : ''}esta leitura é **personalizada** para o perfil **${profileLabel}**`
  ];
  if (areaLabel) parts.push(`área funcional **${areaLabel}**`);
  if (deptName) parts.push(`setor organizacional **${deptName}**`);
  if (jobTitle) parts.push(`função declarada: *${jobTitle}*`);

  parts.push(
    `Indicadores rápidos no seu escopo: **${signals.tasksOpen}** tarefas abertas, **${signals.tasksOverdue}** com prazo vencido, **${signals.alertsOpen}** alertas operacionais abertos.`
  );

  if (sufficiency === 'minimal') {
    parts.push(
      '**Dados insuficientes para personalização fina:** faltam informações no cadastro ou integrações. O painel mostra o que o sistema conseguiu cruzar com o seu perfil — preencha setor, cargo e hierarquia e conecte fontes (PLC, ERP) quando disponíveis.'
    );
  } else if (sufficiency === 'partial') {
    parts.push(
      '**Personalização parcial:** alguns blocos usam agregados da empresa ou ficam sem métrica até haver dados na origem.'
    );
  }

  if (gaps.length) {
    parts.push(`**Ajustes recomendados:** ${gaps.join(' · ')}`);
  }

  return parts.join('. ') + '.';
}

/**
 * Estado completo do dashboard vivo (contrato do frontend LiveDashboardUnifiedPanel).
 */
async function buildLiveStateForUser(user) {
  const companyId = user?.company_id;
  if (!companyId) {
    return {
      ok: false,
      error: 'Empresa não associada ao usuário.'
    };
  }

  const ctx = userContext.buildUserContext(user);
  const scope = await hierarchicalFilter.resolveHierarchyScope(user);
  const dashConfig = dashboardProfileResolver.getDashboardConfigForUser(user);
  const profileConfig = dashConfig.profile_config || {};
  const profileCode = dashConfig.profile_code;
  const functionalArea = dashConfig.functional_area || 'production';
  const areaLabel = AREA_LABELS[functionalArea] || functionalArea;

  const [deptName, kpisRaw, tasks, alertsPreview, plc, chatM, auditN, commOpen] = await Promise.all([
    getDepartmentName(user.id),
    dashboardKPIs.getDashboardKPIs(user, scope).catch(() => []),
    getTaskSignals(companyId, user, scope),
    getOperationalAlertsPreview(companyId, 10),
    getPlcTelemetrySummary(companyId),
    getChatOperationalMentions(companyId),
    getAuditSevere24h(companyId),
    getOpenCommunicationsCount(scope, companyId)
  ]);

  const kpiByKey = kpiMapByKey(dashboardAccessService.getAllowedKpis(user, kpisRaw));
  const iaDepth = dashboardAccessService.getIADataDepth(user);

  const gaps = [];
  if ((!kpisRaw || kpisRaw.length === 0) && (profileConfig.cards || []).length > 0) {
    gaps.push('indicadores dinâmicos vazios para o seu escopo (sem dados nas fontes ou tabelas ainda)');
  }
  if (!user.job_title || String(user.job_title).trim().length < 2) {
    gaps.push('informe o cargo (job title) no cadastro');
  }
  if (!user.functional_area && !inferAreaFromJobTitle(user.job_title)) {
    gaps.push('defina a área funcional (produção, manutenção, etc.) no usuário');
  }
  const hl = ctx?.hierarchy_level ?? user.hierarchy_level;
  const roleLow = String(user.role || '').toLowerCase();
  if (hl == null) {
    gaps.push('defina o nível hierárquico no cadastro para filtrar dados corretamente');
  } else if (hl >= 5 && ['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor'].includes(roleLow)) {
    gaps.push('nível hierárquico parece inconsistente com o cargo (liderança marcada como colaborador)');
  }
  if (!plc.ok || plc.equipments_tracked === 0) {
    gaps.push('telemetria PLC sem equipamentos com leitura recente');
  }
  if (chatM._unavailable) {
    gaps.push('menções operacionais no chat não puderam ser calculadas (estrutura ou permissão)');
  }
  if (tasks._unavailable) {
    gaps.push('contagem de tarefas indisponível');
  }

  let data_sufficiency = 'full';
  if (gaps.length >= 4) data_sufficiency = 'minimal';
  else if (gaps.length >= 2) data_sufficiency = 'partial';

  const userName = user.name || user.email?.split('@')[0] || 'Usuário';
  const orchestrationAllowed = canOrchestrate(user, profileCode);
  const orch = orchestrationAllowed
    ? await buildOrchestrationPlan(companyId, user, scope, profileCode)
    : { items: [], suggestions: [] };

  const signals = {
    tasks: { open: tasks.open, overdue: tasks.overdue },
    alerts: { open: alertsPreview.length },
    telemetry_anomalies: plc.anomalies ?? 0,
    critical_operational_events: alertsPreview.filter((a) =>
      /crit|alta|high/i.test(String(a.severidade || ''))
    ).length
  };

  const intelligent_summary = buildIntelligentSummary({
    userName,
    profileLabel: profileConfig.label || profileCode,
    areaLabel,
    deptName,
    jobTitle: user.job_title || null,
    signals: {
      tasksOpen: tasks.open,
      tasksOverdue: tasks.overdue,
      alertsOpen: alertsPreview.length
    },
    gaps,
    sufficiency: data_sufficiency
  });

  const layout = { widgets: buildLayoutWidgets(profileConfig, kpiByKey) };

  const operational_events = alertsPreview.slice(0, 6).map((a) => ({
    id: a.id,
    title: a.titulo,
    severity: String(a.severidade || 'medium').toLowerCase(),
    detail: a.tipo_alerta || ''
  }));

  let orchestration_stash_key = null;
  if (orchestrationAllowed && orch.items.length) {
    orchestration_stash_key = stashOrchestration(user.id, { plan: orch });
  }

  const captured_at = new Date().toISOString();

  return {
    ok: true,
    captured_at,
    intelligent_summary,
    signals,
    data_sources: {
      impetus_tasks: { open: tasks.open, overdue: tasks.overdue },
      impetus_operational_alerts: { open: alertsPreview.length },
      plc_telemetry: plc,
      plc_sensors: {
        ok: plc.ok,
        samples_used: plc.anomalies ?? 0
      },
      erp_integrations: { connectors: 0, erp_connected: false, log_errors_24h: 0 },
      chat_impetus: chatM,
      audit_logs: { severe_or_failed_24h: auditN },
      communications_open_in_scope: commOpen
    },
    alerts_preview: alertsPreview.slice(0, 8),
    operational_events,
    layout,
    capabilities: {
      task_orchestration: orchestrationAllowed,
      ia_depth: iaDepth
    },
    orchestration: orch,
    orchestration_stash_key,
    personalization: {
      profile_code: profileCode,
      profile_label: profileConfig.label || profileCode,
      functional_area: functionalArea,
      functional_area_label: areaLabel,
      role: user.role || null,
      hierarchy_level: ctx?.hierarchy_level ?? user.hierarchy_level ?? null,
      job_title: user.job_title || null,
      department_name: deptName,
      scope_level: scope.scopeLevel,
      data_sufficiency,
      gaps,
      user_message:
        data_sufficiency === 'full'
          ? 'Painel alinhado ao seu cargo, setor e perfil Impetus.'
          : data_sufficiency === 'partial'
            ? 'Parte das métricas ainda é genérica ou vazia até o sistema acumular dados ou o cadastro ser completado.'
            : 'Personalização limitada: faltam dados de cadastro ou de integração; abaixo está o que foi possível inferir com segurança.'
    }
  };
}

async function executeOrchestrationStash(user, body) {
  const { stash_key, confirm } = body || {};
  if (!confirm) return { ok: false, error: 'Confirmação necessária.' };
  const rec = popStash(stash_key, user.id);
  if (!rec) return { ok: false, error: 'Plano expirado ou inválido. Atualize o painel.' };
  return {
    ok: true,
    message: 'Confirmação registrada. Execuções profundas continuam no fluxo Pró-Ação / tarefas.'
  };
}

module.exports = {
  buildLiveStateForUser,
  executeOrchestrationStash
};
