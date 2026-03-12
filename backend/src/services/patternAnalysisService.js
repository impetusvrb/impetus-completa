/**
 * IMPETUS - Identificação de Padrões Operacionais
 * Analisa dados históricos para detectar:
 * - Falhas recorrentes (ex: 3 trocas de rolamento na mesma bomba em 2 meses)
 * - Paradas frequentes (ex: linha 4 parou 6 vezes na semana)
 * - Consumo anormal de peças
 */
const db = require('../db');

const RECURRING_THRESHOLD = 3; // Mínimo de ocorrências para considerar recorrente
const PERIOD_DAYS = 60; // Janela de análise em dias

/**
 * Analisa padrões e retorna descobertas
 * @returns {Array} [{ type, equipamento, linha, descricao, count, severidade }]
 */
async function analyze(companyId) {
  if (!companyId) return [];

  const patterns = [];
  const since = new Date(Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. Falhas recorrentes (mesma peça/equipamento/linha em casos_manutencao)
    const r1 = await db.query(`
      SELECT equipamento, linha, peca_trocada, COUNT(*) as cnt
      FROM casos_manutencao
      WHERE company_id = $1 AND created_at >= $2
      GROUP BY equipamento, linha, peca_trocada
      HAVING COUNT(*) >= $3
    `, [companyId, since, RECURRING_THRESHOLD]);

    for (const row of r1.rows || []) {
      patterns.push({
        type: 'falha_recorrente',
        equipamento: row.equipamento,
        linha: row.linha,
        peca: row.peca_trocada,
        count: parseInt(row.cnt, 10),
        descricao: `Falha recorrente detectada: ${row.peca_trocada || 'peça'}${row.equipamento ? ` em ${row.equipamento}` : ''}${row.linha ? ` linha ${row.linha}` : ''} - ${row.cnt} ocorrências em ${PERIOD_DAYS} dias. Recomenda-se inspeção preventiva.`,
        severidade: row.cnt >= 5 ? 'critica' : 'atencao'
      });
    }

    // 2. Paradas frequentes por linha (eventos_empresa)
    const r2 = await db.query(`
      SELECT linha, COUNT(*) as cnt
      FROM eventos_empresa
      WHERE company_id = $1 AND created_at >= $2
        AND (tipo_evento ILIKE '%parada%' OR tipo_evento ILIKE '%parada_maquina%' OR tipo_evento ILIKE '%parada de%')
      GROUP BY linha
      HAVING COUNT(*) >= $3
    `, [companyId, since, RECURRING_THRESHOLD]);

    for (const row of r2.rows || []) {
      patterns.push({
        type: 'parada_frequente',
        linha: row.linha,
        count: parseInt(row.cnt, 10),
        descricao: `Alta incidência de parada na linha ${row.linha || 'não identificada'}: ${row.cnt} paradas em ${PERIOD_DAYS} dias.`,
        severidade: row.cnt >= 10 ? 'critica' : 'atencao'
      });
    }

    // 3. Consumo anormal de peça (mesma peça trocada muitas vezes)
    const r3 = await db.query(`
      SELECT peca_trocada, COUNT(*) as cnt
      FROM casos_manutencao
      WHERE company_id = $1 AND created_at >= $2 AND peca_trocada IS NOT NULL AND peca_trocada != ''
      GROUP BY peca_trocada
      HAVING COUNT(*) >= $3
    `, [companyId, since, RECURRING_THRESHOLD]);

    for (const row of r3.rows || []) {
      if (!patterns.some((p) => p.type === 'falha_recorrente' && p.peca === row.peca_trocada)) {
        patterns.push({
          type: 'consumo_anormal',
          peca: row.peca_trocada,
          count: parseInt(row.cnt, 10),
          descricao: `Peça '${row.peca_trocada}' teve consumo acima do normal: ${row.cnt} trocas em ${PERIOD_DAYS} dias. Verificar estoque e necessidade de reposição.`,
          severidade: 'atencao'
        });
      }
    }
  } catch (err) {
    console.warn('[PATTERN_ANALYSIS]', err?.message);
  }

  return patterns;
}

module.exports = { analyze };
