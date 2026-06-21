/**
 * IMPETUS - Sistema de Alertas Inteligentes
 * Gera alertas quando detecta situações críticas
 */
const db = require('../db');
const notificationBridge = require('./notificationBridgeService');

const ALERT_WINDOW_MIN = 20; // Máquina parada há X min = alerta

/** Janela (horas) sem repetir o mesmo código de alerta do motor de decisões (anti-spam). */
const ODE_DEDUP_HOURS = Math.max(
  1,
  parseInt(String(process.env.OPERATIONAL_ALERT_ODE_DEDUP_HOURS || '4'), 10) || 4
);
/** Máximo de linhas inseridas por ciclo do motor (evita rajadas). */
const ODE_MAX_PER_RUN = Math.max(
  1,
  parseInt(String(process.env.OPERATIONAL_ALERT_ODE_MAX_PER_RUN || '5'), 10) || 5
);

/**
 * @param {string|undefined|null} sev
 * @returns {string}
 */
function mapEngineSeverityToDb(sev) {
  const s = sev != null ? String(sev).trim().toLowerCase() : '';
  if (s === 'high') return 'alta';
  if (s === 'low') return 'baixa';
  return 'media';
}

/**
 * EG-04 — delega distribuição ao adapter (shadow ou migrado); fallback silencioso.
 * @param {string} companyId
 * @param {object} alert
 */
async function _dispatchOperationalAlert(companyId, alert) {
  try {
    const esgNotify = require('./esgNotificationService');
    if (esgNotify.isEsgOperationalAlert(alert)) {
      await esgNotify.dispatchFromOperationalAlert(companyId, alert);
      return;
    }

    const sstNotify = require('./sstNotificationService');
    if (sstNotify.isSstOperationalAlert(alert)) {
      await sstNotify.dispatchFromOperationalAlert(companyId, alert);
      return;
    }

    const adapter = require('./governanceAdapters/operationalAlertsGovernanceAdapter');
    await adapter.dispatchOperationalAlert(companyId, alert);
  } catch (err) {
    console.warn('[operationalAlertsService][governance_dispatch]', err?.message ?? err);
    if (notificationBridge.isOperationalSeverityEligible(alert?.severidade || alert?.severity)) {
      notificationBridge
        .bridgeOperationalAlert(companyId, alert)
        .catch((bridgeErr) => {
          console.warn('[operationalAlertsService][nc_bridge_fallback]', bridgeErr?.message ?? bridgeErr);
        });
    }
  }
}

/**
 * Persiste alertas gerados por operationalDecisionEngine com deduplicação por (company, tipo_alerta) em janela temporal.
 * @param {string} companyId
 * @param {object[]} alerts — itens com code, message, severity
 * @param {string} [source] — ex.: data_retrieval:operational_overview
 * @returns {Promise<{ inserted: number, skipped: number }>}
 */
async function persistDecisionEngineAlerts(companyId, alerts, source = '') {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid || !Array.isArray(alerts) || alerts.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  const src = source != null ? String(source).slice(0, 256) : '';
  const ranked = [...alerts].filter((a) => a && typeof a === 'object' && a.code && a.message);
  ranked.sort((a, b) => {
    const o = (x) => (String(x && x.severity).toLowerCase() === 'high' ? 3 : String(x && x.severity).toLowerCase() === 'medium' ? 2 : 1);
    return o(b) - o(a);
  });

  let inserted = 0;
  let skipped = 0;

  for (const al of ranked.slice(0, ODE_MAX_PER_RUN)) {
    const code = String(al.code).slice(0, 128);
    const tipo_alerta = `operational_decision:${code}`;
    const titulo = `[${code}]`.slice(0, 500);
    const mensagem = String(al.message).slice(0, 4000);
    const severidade = mapEngineSeverityToDb(al.severity);

    try {
      const dup = await db.query(
        `
        SELECT 1 FROM operational_alerts
        WHERE company_id = $1::uuid
          AND tipo_alerta = $2
          AND resolvido IS NOT TRUE
          AND created_at > now() - ($3::int * interval '1 hour')
        LIMIT 1
        `,
        [cid, tipo_alerta, ODE_DEDUP_HOURS]
      );
      if (dup.rows && dup.rows.length > 0) {
        skipped += 1;
        continue;
      }

      await db.query(
        `
        INSERT INTO operational_alerts (
          company_id, tipo_alerta, titulo, mensagem, severidade, source, metadata
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb)
        `,
        [
          cid,
          tipo_alerta,
          titulo,
          mensagem,
          severidade,
          src || null,
          JSON.stringify({
            kind: al.kind != null ? String(al.kind).slice(0, 64) : 'suggestion_only',
            engine_code: code,
            dedupe_hours: ODE_DEDUP_HOURS
          })
        ]
      );
      inserted += 1;
      _dispatchOperationalAlert(cid, { severidade, titulo, mensagem, tipo_alerta }).catch(() => {});
    } catch (err) {
      console.warn('[operationalAlertsService][persistDecisionEngineAlerts]', err?.message ?? err);
    }
  }

  return { inserted, skipped };
}

/**
 * Verifica condições e cria alertas
 * @returns {Array} Alertas criados
 */
async function checkAndCreate(companyId) {
  if (!companyId) return [];

  const created = [];

  try {
    // 1. Máquina parada há muito tempo (eventos_empresa + audio_detected_events)
    const paradas = await db.query(`
      SELECT id, equipamento, linha, descricao, created_at
      FROM eventos_empresa
      WHERE company_id = $1
        AND (tipo_evento ILIKE '%parada%' OR tipo_evento = 'maquina_parada')
        AND created_at < now() - interval '1 minute' * $2
        AND NOT EXISTS (
          SELECT 1 FROM operational_alerts oa
          WHERE oa.evento_origem_id::text = eventos_empresa.id::text AND oa.resolvido = false
        )
      ORDER BY created_at DESC
      LIMIT 5
    `, [companyId, ALERT_WINDOW_MIN]);

    for (const p of paradas.rows || []) {
      const mins = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 60000);
      const titulo = `${p.equipamento || 'Máquina'}${p.linha ? ` linha ${p.linha}` : ''} parada há ${mins} minutos`;
      const mensagem = p.descricao || `Parada detectada há ${mins} minutos.`;
      const r = await db.query(`
        INSERT INTO operational_alerts (company_id, tipo_alerta, titulo, mensagem, severidade, equipamento, linha, evento_origem_id)
        VALUES ($1, 'maquina_parada', $2, $3, 'alta', $4, $5, $6)
        RETURNING id
      `, [
        companyId,
        titulo,
        mensagem,
        p.equipamento || null,
        p.linha || null,
        p.id
      ]);
      if (r.rows?.[0]) {
        created.push(r.rows[0]);
        _dispatchOperationalAlert(companyId, {
          severidade: 'alta',
          titulo,
          mensagem,
          tipo_alerta: 'maquina_parada'
        }).catch(() => {});
      }
    }

    // 2. Tarefas atrasadas
    const atrasadas = await db.query(`
      SELECT id, title, assignee, scheduled_at
      FROM tasks
      WHERE company_id = $1 AND status != 'done' AND scheduled_at IS NOT NULL AND scheduled_at < now()
        AND NOT EXISTS (
          SELECT 1 FROM operational_alerts oa
          WHERE oa.metadata->>'task_id' = tasks.id::text AND oa.tipo_alerta = 'tarefa_atrasada' AND oa.resolvido = false
        )
      LIMIT 5
    `, [companyId]);

    for (const t of atrasadas.rows || []) {
      const r = await db.query(`
        INSERT INTO operational_alerts (company_id, tipo_alerta, titulo, mensagem, severidade, metadata)
        VALUES ($1, 'tarefa_atrasada', $2, $3, 'media', $4)
        RETURNING id
      `, [
        companyId,
        `Tarefa atrasada: ${(t.title || '').slice(0, 80)}`,
        `Responsável: ${t.assignee || 'não atribuído'}. Agendada para ${t.scheduled_at ? new Date(t.scheduled_at).toLocaleString('pt-BR') : '-'}`,
        JSON.stringify({ task_id: t.id })
      ]);
      if (r.rows?.[0]) {
        created.push(r.rows[0]);
        _dispatchOperationalAlert(companyId, {
          severidade: 'media',
          titulo: `Tarefa atrasada: ${(t.title || '').slice(0, 80)}`,
          mensagem: `Responsável: ${t.assignee || 'não atribuído'}. Agendada para ${t.scheduled_at ? new Date(t.scheduled_at).toLocaleString('pt-BR') : '-'}`,
          tipo_alerta: 'tarefa_atrasada'
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[OPERATIONAL_ALERTS]', err?.message);
  }

  return created;
}

async function listPending(companyId, opts = {}) {
  const limit = opts.limit || 20;
  const r = await db.query(`
    SELECT * FROM operational_alerts
    WHERE company_id = $1 AND resolvido = false
    ORDER BY created_at DESC
    LIMIT $2
  `, [companyId, limit]);
  return r.rows || [];
}

/**
 * Resolve alerta operacional — Enterprise Hardening Bloco 2 (C6):
 * exige `companyId` para garantir isolamento multi-tenant. Assinatura legada
 * (id, userId) é detetada e bloqueada com warning estruturado.
 */
async function resolve(id, userId, companyId) {
  if (!id || !userId) return false;
  if (!companyId) {
    try {
      console.warn(
        '[TENANT_ISOLATION_LEGACY_CALL]',
        JSON.stringify({
          event: 'TENANT_ISOLATION_LEGACY_CALL',
          service: 'operationalAlertsService.resolve',
          message: 'companyId omitido — chamada bloqueada por hardening multi-tenant.',
          id: String(id),
          user_id: String(userId),
          at: new Date().toISOString()
        })
      );
    } catch (_e) {
      /* ignore */
    }
    return false;
  }
  const r = await db.query(
    `UPDATE operational_alerts
       SET resolvido = true, resolvido_por = $2, resolvido_em = now()
     WHERE id = $1 AND company_id = $3
     RETURNING id`,
    [id, userId, companyId]
  );
  return !!(r.rows && r.rows[0]);
}

async function createPlanningDerivedAlert(companyId, opts = {}) {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid) {
    return null;
  }
  const tipo = opts.tipo_alerta != null ? String(opts.tipo_alerta).slice(0, 64) : 'plano_operacional';
  const titulo = opts.titulo != null ? String(opts.titulo).slice(0, 500) : 'Plano operacional';
  const mensagem = opts.mensagem != null ? String(opts.mensagem).slice(0, 4000) : '';
  const severidade = opts.severidade != null ? String(opts.severidade).slice(0, 32) : 'media';
  const meta =
    opts.metadata && typeof opts.metadata === 'object' ? opts.metadata : {};
  const sourceCol =
    opts.source != null && String(opts.source).trim() !== ''
      ? String(opts.source).slice(0, 256)
      : null;
  try {
    const r = await db.query(
      `
      INSERT INTO operational_alerts (company_id, tipo_alerta, titulo, mensagem, severidade, metadata, source)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      RETURNING id
      `,
      [cid, tipo, titulo, mensagem, severidade, JSON.stringify(meta), sourceCol]
    );
    const alertId = r.rows?.[0]?.id ? String(r.rows[0].id) : null;
    if (alertId) {
      _dispatchOperationalAlert(cid, { severidade, titulo, mensagem, tipo_alerta: tipo }).catch(() => {});
    }
    return alertId;
  } catch (err) {
    console.warn('[operationalAlertsService][createPlanningDerivedAlert]', err?.message ?? err);
    return null;
  }
}

async function getTimeline(companyId, opts = {}) {
  const limit = opts.limit || 50;
  const since = opts.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const r = await db.query(`
    SELECT tipo_evento as evento, created_at as data, equipamento, descricao, impacto
    FROM eventos_empresa
    WHERE company_id = $1 AND created_at >= $2
    ORDER BY created_at DESC
    LIMIT $3
  `, [companyId, since, limit]);

  return (r.rows || []).map((row) => ({
    ...row,
    data: row.data ? new Date(row.data).toISOString() : null
  }));
}

/** Tipos SST canónicos para registo industrial (Parte 7.2 / NR integração). */
const SST_LIFECYCLE_KINDS = Object.freeze({
  incident: { tipo_alerta: 'sst_incident_created', default_severity: 'alta' },
  near_miss: { tipo_alerta: 'sst_near_miss', default_severity: 'media' },
  training_expired: { tipo_alerta: 'sst_training_expired', default_severity: 'media' }
});

/**
 * Regista evento SST (incidente, quase-acidente, treinamento vencido) em operational_alerts
 * e dispara SST_LIFECYCLE via sstNotificationService.
 * @returns {Promise<{ id: string, tipo_alerta: string }|null>}
 */
async function createSstLifecycleAlert(companyId, opts = {}) {
  const kind = SST_LIFECYCLE_KINDS[opts.kind];
  if (!kind) {
    throw new Error(`createSstLifecycleAlert: kind inválido (${opts.kind})`);
  }
  const titulo = opts.title != null ? String(opts.title).slice(0, 500) : 'Evento SST';
  const mensagem = opts.message != null ? String(opts.message).slice(0, 4000) : '';
  const severidade = opts.severity != null ? String(opts.severity).slice(0, 32) : kind.default_severity;
  const meta = {
    kind: opts.kind,
    location: opts.location || null,
    reported_by: opts.reported_by || null,
    correlation_id: opts.correlation_id || null,
    ...(opts.metadata && typeof opts.metadata === 'object' ? opts.metadata : {})
  };

  const id = await createPlanningDerivedAlert(companyId, {
    tipo_alerta: kind.tipo_alerta,
    titulo,
    mensagem,
    severidade,
    source: 'safety_operational',
    metadata: meta
  });

  if (!id) return null;

  if (opts.kind === 'training_expired' && opts.hr_alert !== false) {
    try {
      await db.query(
        `INSERT INTO hr_alerts (company_id, alert_type, severity, title, description, metrics)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          companyId,
          'treinamento_vencido',
          severidade === 'alta' ? 'high' : 'medium',
          titulo,
          mensagem,
          JSON.stringify({ source: 'sst_lifecycle', operational_alert_id: id, ...meta })
        ]
      );
    } catch (err) {
      console.warn('[operationalAlertsService][createSstLifecycleAlert][hr_alert]', err?.message ?? err);
    }
  }

  return { id, tipo_alerta: kind.tipo_alerta };
}

module.exports = {
  checkAndCreate,
  listPending,
  resolve,
  getTimeline,
  createPlanningDerivedAlert,
  createSstLifecycleAlert,
  persistDecisionEngineAlerts,
  SST_LIFECYCLE_KINDS
};
