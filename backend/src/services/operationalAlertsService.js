/**
 * IMPETUS - Sistema de Alertas Inteligentes
 * Gera alertas quando detecta situações críticas
 */
const db = require('../db');
const unifiedMessaging = require('./unifiedMessagingService');

const ALERT_WINDOW_MIN = 20; // Máquina parada há X min = alerta

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

module.exports = { checkAndCreate, listPending, resolve, getTimeline };
