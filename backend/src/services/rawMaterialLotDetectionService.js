/**
 * IMPETUS - Detecção e Bloqueio Inteligente de Lotes de Matéria-Prima
 * Monitoramento contínuo, análise de risco, alertas, recomendações IA
 */
const db = require('../db');
const ai = require('./ai');

const DEFECT_INCREASE_THRESHOLD_PCT = 20;
const MIN_EVENTS_FOR_RISK = 3;
const QUALITY_ROLES = ['quality', 'qualidade', 'gerente', 'diretor', 'ceo'];

/**
 * Garante cadastro de lote (upsert)
 */
async function ensureLot(companyId, { lot_code, material_name, supplier_name }) {
  if (!lot_code || !lot_code.trim()) return null;
  const code = String(lot_code).trim();
  await db.query(`
    INSERT INTO raw_material_lots (company_id, lot_code, material_name, supplier_name, status)
    VALUES ($1, $2, $3, $4, 'released')
    ON CONFLICT (company_id, lot_code) DO UPDATE SET
      material_name = COALESCE(EXCLUDED.material_name, raw_material_lots.material_name),
      supplier_name = COALESCE(EXCLUDED.supplier_name, raw_material_lots.supplier_name),
      updated_at = now()
  `, [companyId, code, material_name || null, supplier_name || null]);
  const r = await db.query('SELECT * FROM raw_material_lots WHERE company_id = $1 AND lot_code = $2', [companyId, code]);
  return r.rows?.[0] || null;
}

/**
 * Registra uso de lote (de TPM, proposal, etc.)
 */
async function recordLotUsage(companyId, opts) {
  const { lot_code, material_name, supplier_name, source_type, source_id, machine_used, operator_id, operator_name, defect_count = 0, rework_count = 0, inspection_result } = opts;
  if (!lot_code) return null;
  const lot = await ensureLot(companyId, { lot_code, material_name, supplier_name });
  if (!lot) return null;

  await db.query(`
    INSERT INTO raw_material_lot_usage (company_id, lot_id, lot_code, source_type, source_id, machine_used, operator_id, operator_name, defect_count, rework_count, inspection_result)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [companyId, lot.id, lot_code, source_type, source_id || '', machine_used || null, operator_id || null, operator_name || null, defect_count, rework_count, inspection_result || null]);

  return lot;
}

/**
 * Agrega defeitos por lote (últimos N dias)
 */
async function getLotDefectAggregates(companyId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const tpmByLot = await db.query(`
    SELECT lot_code, COUNT(*) as cnt, SUM(COALESCE(losses_before,0) + COALESCE(losses_during,0) + COALESCE(losses_after,0)) as losses
    FROM tpm_incidents WHERE company_id = $1 AND incident_date >= $2 AND lot_code IS NOT NULL
    GROUP BY lot_code
  `, [companyId, since]);

  const prevPeriod = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const tpmPrev = await db.query(`
    SELECT lot_code, COUNT(*) as cnt, SUM(COALESCE(losses_before,0) + COALESCE(losses_during,0) + COALESCE(losses_after,0)) as losses
    FROM tpm_incidents WHERE company_id = $1 AND incident_date >= $2 AND incident_date < $3 AND lot_code IS NOT NULL
    GROUP BY lot_code
  `, [companyId, prevPeriod, since]);

  const prevMap = (tpmPrev.rows || []).reduce((m, r) => { m[r.lot_code] = r; return m; }, {});
  const currentMap = (tpmByLot.rows || []).reduce((m, r) => { m[r.lot_code] = r; return m; }, {});

  return { tpmByLot: currentMap, tpmPrev: prevMap };
}

/**
 * Detecta lotes com aumento de defeitos
 */
async function detectLotRisks(companyId, days = 14) {
  const { tpmByLot, tpmPrev } = await getLotDefectAggregates(companyId, days);
  const risks = [];

  for (const [lotCode, curr] of Object.entries(tpmByLot)) {
    const currCount = parseInt(curr.cnt || 0, 10);
    const currLosses = parseInt(curr.losses || 0, 10);
    const prev = tpmPrev[lotCode];
    const prevCount = prev ? parseInt(prev.cnt || 0, 10) : 0;
    const prevLosses = prev ? parseInt(prev.losses || 0, 10) : 0;

    if (currCount < MIN_EVENTS_FOR_RISK && currLosses < 5) continue;

    let increasePct = 0;
    if (prevCount > 0) increasePct = ((currCount - prevCount) / prevCount) * 100;
    else if (currLosses > 0) increasePct = 50;

    if (increasePct >= DEFECT_INCREASE_THRESHOLD_PCT || (prevCount === 0 && currCount >= MIN_EVENTS_FOR_RISK)) {
      risks.push({
        lot_code: lotCode,
        defect_count: currCount,
        defect_increase_pct: Math.round(increasePct * 100) / 100,
        total_losses: currLosses,
        severity: increasePct >= 50 ? 'high' : increasePct >= 30 ? 'medium' : 'low'
      });
    }
  }

  return risks;
}

/**
 * Gera análise e recomendações pela IA
 */
async function generateLotAnalysis(companyId, risk) {
  let analysis = '';
  let recommendations = [];

  try {
    const prompt = `Lote de matéria-prima ${risk.lot_code} apresenta aumento de ${risk.defect_increase_pct}% no índice de defeitos (${risk.defect_count} incidentes, ${risk.total_losses} perdas).

Gere:
1) Uma análise objetiva em 2-3 frases
2) Lista de 3-5 recomendações práticas (ex: suspender uso temporariamente, realizar nova inspeção, verificar parâmetros, analisar com fornecedor, revisar processo). Seja específico.`;
    const aiRes = await ai.chatCompletion(prompt, { max_tokens: 400 });
    if (aiRes && !String(aiRes).startsWith('FALLBACK:')) {
      analysis = String(aiRes).trim();
      const recs = (aiRes.match(/^\d+\.\s*(.+)$/gm) || []).map((l) => l.replace(/^\d+\.\s*/, '').trim());
      recommendations = recs.length ? recs : [
        'Suspender temporariamente o uso do lote',
        'Realizar nova inspeção de qualidade',
        'Verificar parâmetros da produção',
        'Analisar matéria-prima junto ao fornecedor',
        'Revisar processo produtivo relacionado ao material'
      ];
    }
  } catch (_) {
    recommendations = [
      'Suspender temporariamente o uso do lote',
      'Realizar nova inspeção de qualidade',
      'Verificar parâmetros da produção',
      'Analisar matéria-prima junto ao fornecedor'
    ];
  }

  return { analysis, recommendations };
}

/**
 * Cria alerta e opcionalmente marca lote em análise
 */
async function createLotRiskAlert(companyId, risk, analysisResult) {
  const lot = await ensureLot(companyId, { lot_code: risk.lot_code });
  if (!lot) return null;

  const title = `Risco de qualidade: Lote ${risk.lot_code}`;
  const desc = `Aumento de ${risk.defect_increase_pct}% no índice de defeitos após início de utilização na produção.`;
  const aiRec = analysisResult?.recommendations || [];

  const r = await db.query(`
    INSERT INTO raw_material_lot_alerts (company_id, lot_id, alert_type, severity, title, description, ai_analysis, ai_recommendations, defect_increase_pct)
    VALUES ($1, $2, 'defect_increase', $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [companyId, lot.id, risk.severity, title, desc, analysisResult?.analysis || null, JSON.stringify(aiRec), risk.defect_increase_pct]);

  const alert = r.rows[0];
  if (alert && risk.severity === 'high') {
    await updateLotStatus(companyId, lot.id, 'in_analysis', null, `Risco detectado: ${risk.defect_increase_pct}% aumento de defeitos`);
  }

  await db.query(`
    INSERT INTO raw_material_lot_events (company_id, lot_id, event_type, description, ai_analysis)
    VALUES ($1, $2, 'risk_detected', $3, $4)
  `, [companyId, lot.id, desc, analysisResult?.analysis || null]);

  return alert;
}

/**
 * Atualiza status do lote (bloqueio, liberação)
 */
async function updateLotStatus(companyId, lotId, newStatus, userId, reason = '') {
  const r = await db.query('SELECT * FROM raw_material_lots WHERE id = $1 AND company_id = $2', [lotId, companyId]);
  const lot = r.rows?.[0];
  if (!lot) return null;

  const prev = lot.status;
  const now = new Date().toISOString();

  if (newStatus === 'blocked') {
    await db.query(`
      UPDATE raw_material_lots SET status = 'blocked', status_reason = $3, blocked_at = now(), blocked_by = $4, released_at = null, released_by = null, updated_at = now()
      WHERE id = $1 AND company_id = $2
    `, [lotId, companyId, reason || 'Bloqueado manualmente', userId]);
  } else if (newStatus === 'released') {
    await db.query(`
      UPDATE raw_material_lots SET status = 'released', status_reason = null, released_at = now(), released_by = $4, blocked_at = null, blocked_by = null, updated_at = now()
      WHERE id = $1 AND company_id = $2
    `, [lotId, companyId, userId]);
  } else {
    await db.query(`
      UPDATE raw_material_lots SET status = $3, status_reason = $4, updated_at = now()
      WHERE id = $1 AND company_id = $2
    `, [lotId, companyId, newStatus, reason || null]);
  }

  await db.query(`
    INSERT INTO raw_material_lot_events (company_id, lot_id, event_type, previous_status, new_status, description, performed_by)
    VALUES ($1, $2, 'status_change', $3, $4, $5, $6)
  `, [companyId, lotId, prev, newStatus, reason || null, userId]);

  return true;
}

/**
 * Verifica se lote está bloqueado (para impedir seleção)
 */
async function isLotBlocked(companyId, lotCode) {
  if (!lotCode) return false;
  const r = await db.query(`
    SELECT status FROM raw_material_lots WHERE company_id = $1 AND lot_code = $2
  `, [companyId, String(lotCode).trim()]);
  const status = r.rows?.[0]?.status;
  return status === 'blocked' || status === 'quality_risk';
}

/**
 * Lista lotes bloqueados (para validação em formulários)
 */
async function getBlockedLotCodes(companyId) {
  const r = await db.query(`
    SELECT lot_code FROM raw_material_lots
    WHERE company_id = $1 AND status IN ('blocked', 'quality_risk')
  `, [companyId]);
  return (r.rows || []).map((x) => x.lot_code);
}

/**
 * Executa ciclo de detecção
 */
async function runDetectionCycle(companyId) {
  const risks = await detectLotRisks(companyId, 14);
  const alerts = [];
  for (const risk of risks) {
    const analysis = await generateLotAnalysis(companyId, risk);
    const alert = await createLotRiskAlert(companyId, risk, analysis);
    if (alert) alerts.push(alert);
  }
  await recalculateSupplierMetrics(companyId);
  return { risks: risks.length, alerts: alerts.length };
}

/**
 * Recalcula métricas de fornecedores
 */
async function recalculateSupplierMetrics(companyId) {
  const r = await db.query(`
    SELECT supplier_name,
      COUNT(*) as lot_count,
      COUNT(*) FILTER (WHERE status IN ('blocked','quality_risk')) as risk_count,
      SUM(defect_count) as total_defects
    FROM raw_material_lots
    WHERE company_id = $1 AND supplier_name IS NOT NULL
    GROUP BY supplier_name
  `, [companyId]);

  for (const row of r.rows || []) {
    const lotCount = parseInt(row.lot_count || 1, 10);
    const riskCount = parseInt(row.risk_count || 0, 10);
    const totalDefects = parseInt(row.total_defects || 0, 10);
    const impactScore = (riskCount * 20) + (totalDefects / Math.max(1, lotCount));
    const defectFreq = totalDefects / Math.max(1, lotCount);
    await db.query(`
      INSERT INTO supplier_quality_metrics (company_id, supplier_name, lot_count_total, lot_count_blocked, lot_count_quality_risk, defect_frequency, impact_score, last_calculated_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
      ON CONFLICT (company_id, supplier_name) DO UPDATE SET
        lot_count_total = EXCLUDED.lot_count_total,
        lot_count_blocked = EXCLUDED.lot_count_blocked,
        lot_count_quality_risk = EXCLUDED.lot_count_quality_risk,
        defect_frequency = EXCLUDED.defect_frequency,
        impact_score = EXCLUDED.impact_score,
        last_calculated_at = now(),
        updated_at = now()
    `, [companyId, row.supplier_name, lotCount, 0, riskCount, defectFreq, impactScore]);
  }

  const ranked = await db.query(`
    SELECT id, supplier_name, impact_score FROM supplier_quality_metrics
    WHERE company_id = $1 ORDER BY impact_score DESC
  `, [companyId]);
  let rank = 1;
  for (const row of ranked.rows || []) {
    await db.query('UPDATE supplier_quality_metrics SET quality_rank = $3 WHERE id = $1 AND company_id = $2', [row.id, companyId, rank++]);
  }
}

/**
 * Lista lotes com filtro de status
 */
async function listLots(companyId, opts = {}) {
  const { status, limit = 50 } = opts;
  let sql = 'SELECT * FROM raw_material_lots WHERE company_id = $1';
  const params = [companyId];
  if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
  params.push(limit || 50);
  sql += ` ORDER BY updated_at DESC LIMIT $${params.length}`;
  const r = await db.query(sql, params);
  return r.rows || [];
}

/**
 * Histórico de eventos do lote
 */
async function getLotHistory(companyId, lotId) {
  const r = await db.query(`
    SELECT * FROM raw_material_lot_events WHERE lot_id = $1 AND company_id = $2 ORDER BY created_at DESC LIMIT 50
  `, [lotId, companyId]);
  return r.rows || [];
}

/**
 * Ranking de fornecedores
 */
async function getSupplierRanking(companyId) {
  const r = await db.query(`
    SELECT * FROM supplier_quality_metrics WHERE company_id = $1 ORDER BY quality_rank ASC NULLS LAST
  `, [companyId]);
  return r.rows || [];
}

module.exports = {
  ensureLot,
  recordLotUsage,
  detectLotRisks,
  createLotRiskAlert,
  updateLotStatus,
  isLotBlocked,
  getBlockedLotCodes,
  runDetectionCycle,
  listLots,
  getLotHistory,
  getSupplierRanking,
  recalculateSupplierMetrics
};
