/**
 * IMPETUS - Sistema de Insights Automáticos
 * Gera insights para líderes baseados em padrões e eventos
 */
const db = require('../db');

/**
 * Gera insights a partir de padrões detectados
 */
async function generateFromPatterns(companyId, patterns) {
  if (!companyId || !patterns?.length) return [];

  const inserted = [];
  for (const p of patterns) {
    const categoria = p.type === 'falha_recorrente' || p.type === 'consumo_anormal' ? 'manutencao' : 'producao';
    const r = await db.query(`
      INSERT INTO operational_insights (company_id, categoria, titulo, descricao, tipo_insight, severidade, equipamento, linha, peca, metadados)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      companyId,
      categoria,
      p.descricao?.slice(0, 200) || p.type,
      p.descricao,
      p.type,
      p.severidade || 'atencao',
      p.equipamento || null,
      p.linha || null,
      p.peca || null,
      JSON.stringify({ count: p.count })
    ]);
    if (r.rows?.[0]) inserted.push(r.rows[0]);
  }
  return inserted;
}

async function listRecent(companyId, opts = {}) {
  const { limit = 20, categoria } = opts;
  if (!companyId) return [];

  let sql = `SELECT * FROM operational_insights WHERE company_id = $1`;
  const params = [companyId];
  if (categoria) {
    params.push(categoria);
    sql += ` AND categoria = $${params.length}`;
  }
  params.push(limit);
  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

  const r = await db.query(sql, params);
  return r.rows || [];
}

async function markAsRead(id, userId) {
  await db.query(`UPDATE operational_insights SET lido = true, lido_por = $2, lido_em = now() WHERE id = $1`, [id, userId]);
}

async function getProducaoSummary(companyId, opts = {}) {
  const since = opts.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const r = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE tipo_evento ILIKE '%parada%') as paradas,
      COUNT(*) FILTER (WHERE tipo_evento ILIKE '%reiniciad%') as reinicios
    FROM eventos_empresa
    WHERE company_id = $1 AND created_at >= $2
  `, [companyId, since]);
  const row = r.rows?.[0];
  return {
    paradas_24h: parseInt(row?.paradas || 0, 10),
    reinicios_24h: parseInt(row?.reinicios || 0, 10)
  };
}

async function getManutencaoSummary(companyId, opts = {}) {
  const since = opts.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const r = await db.query(`
    SELECT COUNT(*) as total, COUNT(DISTINCT peca_trocada) as pecas_diferentes
    FROM casos_manutencao
    WHERE company_id = $1 AND created_at >= $2
  `, [companyId, since]);
  const row = r.rows?.[0];
  return {
    intervencoes_7d: parseInt(row?.total || 0, 10),
    pecas_trocadas: parseInt(row?.pecas_diferentes || 0, 10)
  };
}

async function getGestaoSummary(companyId, opts = {}) {
  const r = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status != 'done') as abertas,
      COUNT(*) FILTER (WHERE status != 'done' AND scheduled_at < now()) as atrasadas
    FROM tasks
    WHERE company_id = $1
  `, [companyId]);
  const row = r.rows?.[0];
  return {
    tarefas_abertas: parseInt(row?.abertas || 0, 10),
    tarefas_atrasadas: parseInt(row?.atrasadas || 0, 10)
  };
}

module.exports = {
  generateFromPatterns,
  listRecent,
  markAsRead,
  getProducaoSummary,
  getManutencaoSummary,
  getGestaoSummary
};
