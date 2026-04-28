/**
 * IMPETUS - Sistema de Alertas Inteligentes
 * Gera alertas quando detecta situações críticas
 */
const db = require('../db');
const unifiedMessaging = require('./unifiedMessagingService');

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
      const r = await db.query(`
        INSERT INTO operational_alerts (company_id, tipo_alerta, titulo, mensagem, severidade, equipamento, linha, evento_origem_id)
        VALUES ($1, 'maquina_parada', $2, $3, 'alta', $4, $5, $6)
        RETURNING id
      `, [
        companyId,
        `${p.equipamento || 'Máquina'}${p.linha ? ` linha ${p.linha}` : ''} parada há ${mins} minutos`,
        p.descricao || `Parada detectada há ${mins} minutos.`,
        p.equipamento || null,
        p.linha || null,
        p.id
      ]);
      if (r.rows?.[0]) created.push(r.rows[0]);
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
      if (r.rows?.[0]) created.push(r.rows[0]);
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

async function resolve(id, userId) {
  await db.query(`UPDATE operational_alerts SET resolvido = true, resolvido_por = $2, resolvido_em = now() WHERE id = $1`, [id, userId]);
}

/**
 * Alerta derivado do plano operacional (execução segura — só registo interno / painel).
 * @param {string} companyId
 * @param {object} opts
 * @returns {Promise<string|null>} id ou null
 */
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
    return r.rows?.[0]?.id ? String(r.rows[0].id) : null;
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

module.exports = {
  checkAndCreate,
  listPending,
  resolve,
  getTimeline,
  createPlanningDerivedAlert,
  persistDecisionEngineAlerts
};
