/**
 * IMPETUS - Memória Corporativa
 * Persiste eventos extraídos pela IA em knowledge_memory, casos_manutencao, eventos_empresa
 * e cria tarefas automáticas quando detectadas em conversas.
 */
const db = require('../db');

const EVENT_TIPOS = ['tarefa', 'manutencao', 'falha', 'troca_peca', 'parada_maquina', 'parada_linha', 'decisao', 'alerta', 'informacao', 'observacao'];

function parseScheduledAt(dataStr, horaStr) {
  if (!dataStr && !horaStr) return null;
  try {
    const data = dataStr ? new Date(dataStr) : new Date();
    if (isNaN(data.getTime())) return null;
    let hours = 0, mins = 0;
    if (horaStr) {
      const m = String(horaStr).match(/(\d{1,2})[h:.]?(\d{0,2})?/);
      if (m) { hours = parseInt(m[1], 10) || 0; mins = parseInt(m[2], 10) || 0; }
    }
    data.setHours(hours, mins, 0, 0);
    return data.toISOString();
  } catch {
    return null;
  }
}

/**
 * Persiste eventos corporativos extraídos e cria tarefas quando aplicável
 */
async function persistCorporateEvents(opts = {}) {
  const {
    companyId,
    corporateEvents = [],
    sourceType = 'internal_chat',
    sourceId = null,
    sourceMetadata = {},
    conversationId = null
  } = opts;

  if (!companyId || !corporateEvents.length) {
    return { kmInserted: 0, casosInserted: 0, eventosInserted: 0, tasksCreated: 0 };
  }

  let kmInserted = 0, casosInserted = 0, eventosInserted = 0, tasksCreated = 0;

  for (const ev of corporateEvents) {
    const tipo = ev.tipo_evento && EVENT_TIPOS.includes(ev.tipo_evento) ? ev.tipo_evento : 'informacao';
    const descricao = ev.descricao || JSON.stringify(ev);

    try {
      const kmRes = await db.query(
        `INSERT INTO knowledge_memory (
          company_id, tipo_evento, descricao, equipamento, linha, usuario,
          source_type, source_id, source_metadata, data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, now()))
        RETURNING id`,
        [
          companyId,
          tipo,
          descricao,
          ev.equipamento || null,
          ev.linha || null,
          ev.usuario_responsavel || null,
          sourceType,
          sourceId,
          JSON.stringify(sourceMetadata),
          ev.data ? new Date(ev.data).toISOString() : null
        ]
      );
      const kmId = kmRes.rows?.[0]?.id;
      if (kmId) kmInserted++;

      const shouldCasos =
        (tipo === 'manutencao' || tipo === 'falha') && (ev.problema || ev.solucao || ev.peca_trocada) ||
        (tipo === 'troca_peca' && (ev.peca_trocada || ev.equipamento));
      if (shouldCasos) {
        const problemaCasos = tipo === 'troca_peca' ? `Troca de peça: ${ev.peca_trocada || 'peça'}` : (ev.problema || descricao);
        await db.query(
          `INSERT INTO casos_manutencao (
            company_id, equipamento, linha, problema, causa, solucao, peca_trocada, tecnico, source_metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            companyId,
            ev.equipamento || null,
            ev.linha || null,
            problemaCasos,
            ev.causa || null,
            ev.solucao || null,
            ev.peca_trocada || null,
            ev.tecnico || ev.usuario_responsavel || null,
            JSON.stringify({ ...sourceMetadata, knowledge_memory_id: kmId })
          ]
        );
        casosInserted++;
      }

      const evTipoMap = {
        tarefa: 'tarefa criada',
        troca_peca: 'troca de peça',
        parada_maquina: 'parada de máquina',
        parada_linha: 'parada de linha',
        manutencao: 'manutenção realizada',
        falha: 'alerta técnico',
        decisao: 'decisão',
        alerta: 'alerta'
      };
      const eventoLabel = evTipoMap[tipo] || tipo;
      await db.query(
        `INSERT INTO eventos_empresa (
          company_id, tipo_evento, origem, equipamento, linha, descricao, knowledge_memory_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [companyId, eventoLabel, sourceType, ev.equipamento || null, ev.linha || null, descricao, kmId]
      );
      eventosInserted++;

      if (tipo === 'tarefa' && (ev.usuario_responsavel || ev.descricao)) {
        const scheduledAt = parseScheduledAt(ev.data, ev.hora);
        const title = (ev.descricao || '').slice(0, 200) || 'Tarefa detectada em conversa';
        const assignee = ev.usuario_responsavel || null;
        const taskRes = await db.query(
          `INSERT INTO tasks (
            company_id, title, description, assignee, status, scheduled_at, origem_conversa
          ) VALUES ($1, $2, $3, $4, 'open', $5, $6)
          RETURNING id`,
          [companyId, title, descricao.slice(0, 1000), assignee, scheduledAt, conversationId]
        );
        if (taskRes.rows?.[0]?.id) {
          tasksCreated++;
          await db.query(
            'UPDATE eventos_empresa SET task_id = $1 WHERE knowledge_memory_id = $2',
            [taskRes.rows[0].id, kmId]
          );
        }
      }
    } catch (err) {
      console.warn('[CORPORATE_MEMORY] persist event error:', err.message, 'event:', tipo);
    }
  }

  return { kmInserted, casosInserted, eventosInserted, tasksCreated };
}

async function getRelevantContext(opts = {}) {
  const { companyId, query = '', equipamento, linha, limit = 15 } = opts;
  if (!companyId) return [];

  const conditions = ['company_id = $1'];
  const params = [companyId];
  let idx = 2;
  if (equipamento) {
    conditions.push('(equipamento ILIKE $' + idx + ' OR descricao ILIKE $' + idx + ')');
    params.push(`%${equipamento}%`);
    idx++;
  }
  if (linha) {
    conditions.push('(linha ILIKE $' + idx + ' OR descricao ILIKE $' + idx + ')');
    params.push(`%${linha}%`);
    idx++;
  }
  if (query.trim()) {
    conditions.push('(descricao ILIKE $' + idx + ' OR tags::text ILIKE $' + idx + ')');
    params.push(`%${query.split(/\s+/).filter(Boolean).slice(0, 3).join('%')}%`);
    idx++;
  }

  const r = await db.query(
    `SELECT id, tipo_evento, descricao, equipamento, linha, usuario, data
     FROM knowledge_memory
     WHERE ${conditions.join(' AND ')}
     ORDER BY data DESC NULLS LAST, created_at DESC
     LIMIT $${idx}`,
    [...params, limit]
  );
  return r.rows || [];
}

async function getSimilarMaintenanceCases(opts = {}) {
  const { companyId, problema, equipamento, linha, limit = 5 } = opts;
  if (!companyId) return [];

  const conditions = ['company_id = $1'];
  const params = [companyId];
  let idx = 2;
  if (problema) {
    conditions.push('(problema ILIKE $' + idx + ' OR solucao ILIKE $' + idx + ')');
    params.push(`%${problema}%`);
    idx++;
  }
  if (equipamento) {
    conditions.push('equipamento ILIKE $' + idx);
    params.push(`%${equipamento}%`);
    idx++;
  }
  if (linha) {
    conditions.push('linha ILIKE $' + idx);
    params.push(`%${linha}%`);
    idx++;
  }

  const r = await db.query(
    `SELECT equipamento, linha, problema, causa, solucao, peca_trocada, tecnico, data
     FROM casos_manutencao
     WHERE ${conditions.join(' AND ')}
     ORDER BY data DESC
     LIMIT $${idx}`,
    [...params, limit]
  );
  return r.rows || [];
}

module.exports = {
  persistCorporateEvents,
  getRelevantContext,
  getSimilarMaintenanceCases,
  EVENT_TIPOS,
  parseScheduledAt
};
