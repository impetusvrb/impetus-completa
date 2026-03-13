/**
 * IMPETUS - Detecção Inteligente de Anomalias Operacionais
 * Aprendizado do comportamento normal, monitoramento contínuo, análise de causas
 */
const db = require('../db');
const ai = require('./ai');

const DEVIATION_THRESHOLD = 2.5; // N * std para flagar anomalia
const MIN_SAMPLES = 10; // Mínimo de amostras para baseline válido
const DEFAULT_LEARNING_DAYS = 30;

/**
 * Agrega dados PLC por equipamento (últimos N dias)
 */
async function getPlcAggregates(companyId, days = DEFAULT_LEARNING_DAYS) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const r = await db.query(`
    SELECT
      equipment_id,
      equipment_name,
      AVG(temperature) as temp_avg, STDDEV(temperature) as temp_std, MIN(temperature) as temp_min, MAX(temperature) as temp_max,
      AVG(pressure) as press_avg, STDDEV(pressure) as press_std, MIN(pressure) as press_min, MAX(pressure) as press_max,
      AVG(vibration) as vib_avg, STDDEV(vibration) as vib_std, MAX(vibration) as vib_max,
      AVG(rpm) as rpm_avg, STDDEV(rpm) as rpm_std,
      AVG(power_kw) as power_avg, STDDEV(power_kw) as power_std,
      COUNT(*) as sample_count
    FROM plc_collected_data
    WHERE company_id = $1 AND collected_at >= $2
    GROUP BY equipment_id, equipment_name
  `, [companyId, since]);
  return r.rows || [];
}

/**
 * Agrega TPM por equipamento/turno
 */
async function getTpmAggregates(companyId, days = DEFAULT_LEARNING_DAYS) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const r = await db.query(`
    SELECT
      equipment_code as entity_id,
      COALESCE(equipment_code, 'unknown') as entity_name,
      COUNT(*) as incident_count,
      AVG(losses_before + losses_during + losses_after) as avg_losses,
      SUM(losses_before + losses_during + losses_after) as total_losses
    FROM tpm_incidents
    WHERE company_id = $1 AND incident_date >= $2
    GROUP BY equipment_code
  `, [companyId, since]);
  return r.rows || [];
}

/**
 * Agrega eventos de máquina
 */
async function getMachineEventAggregates(companyId, days = DEFAULT_LEARNING_DAYS) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const r = await db.query(`
    SELECT
      machine_identifier as entity_id,
      machine_name as entity_name,
      event_type,
      COUNT(*) as event_count
    FROM machine_detected_events
    WHERE company_id = $1 AND created_at >= $2
    GROUP BY machine_identifier, machine_name, event_type
  `, [companyId, since]);
  return r.rows || [];
}

/**
 * Calibra baseline para uma métrica
 */
async function calibrateBaseline(companyId, entityType, entityId, entityName, metricName, values) {
  if (!values || values.length < MIN_SAMPLES) return null;
  const nums = values.filter((v) => v != null && !Number.isNaN(Number(v))).map(Number);
  if (nums.length < MIN_SAMPLES) return null;

  const sorted = [...nums].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = nums.reduce((s, v) => s + v, 0);
  const mean = sum / n;
  const variance = nums.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const p25 = sorted[Math.floor(n * 0.25)];
  const p50 = sorted[Math.floor(n * 0.5)];
  const p75 = sorted[Math.floor(n * 0.75)];

  await db.query(`
    INSERT INTO operational_anomaly_baselines
      (company_id, entity_type, entity_id, entity_name, metric_name, value_mean, value_std, value_min, value_max, value_p25, value_p50, value_p75, sample_count, learning_window_days, last_calibrated_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now(), now())
    ON CONFLICT (company_id, entity_type, entity_id, metric_name) DO UPDATE SET
      value_mean = EXCLUDED.value_mean,
      value_std = EXCLUDED.value_std,
      value_min = EXCLUDED.value_min,
      value_max = EXCLUDED.value_max,
      value_p25 = EXCLUDED.value_p25,
      value_p50 = EXCLUDED.value_p50,
      value_p75 = EXCLUDED.value_p75,
      sample_count = EXCLUDED.sample_count,
      last_calibrated_at = now(),
      updated_at = now()
  `, [
    companyId, entityType, entityId, entityName, metricName,
    mean, std || 0, Math.min(...nums), Math.max(...nums), p25, p50, p75,
    nums.length, DEFAULT_LEARNING_DAYS
  ]);
  return { mean, std, min: Math.min(...nums), max: Math.max(...nums) };
}

/**
 * Aprende baselines a partir dos dados históricos
 */
async function learnBaselines(companyId, days = DEFAULT_LEARNING_DAYS) {
  const results = { plc: 0, tpm: 0 };

  const plcData = await getPlcAggregates(companyId, days);
  for (const row of plcData) {
    if (row.sample_count >= MIN_SAMPLES) {
      const eqId = row.equipment_id || 'unknown';
      const eqName = row.equipment_name || eqId;
      if (row.temp_avg != null) {
        const tempVals = await db.query(`
          SELECT temperature as v FROM plc_collected_data
          WHERE company_id = $1 AND equipment_id = $2 AND collected_at >= now() - $3::int * interval '1 day'
          AND temperature IS NOT NULL
        `, [companyId, eqId, days]).then((r) => (r.rows || []).map((x) => x.v));
        await calibrateBaseline(companyId, 'equipment', eqId, eqName, 'temperature', tempVals);
        results.plc++;
      }
      if (row.press_avg != null) {
        const pressVals = await db.query(`
          SELECT pressure as v FROM plc_collected_data
          WHERE company_id = $1 AND equipment_id = $2 AND collected_at >= now() - $3::int * interval '1 day'
          AND pressure IS NOT NULL
        `, [companyId, eqId, days]).then((r) => (r.rows || []).map((x) => x.v));
        await calibrateBaseline(companyId, 'equipment', eqId, eqName, 'pressure', pressVals);
      }
      if (row.vib_avg != null) {
        const vibVals = await db.query(`
          SELECT vibration as v FROM plc_collected_data
          WHERE company_id = $1 AND equipment_id = $2 AND collected_at >= now() - $3::int * interval '1 day'
          AND vibration IS NOT NULL
        `, [companyId, eqId, days]).then((r) => (r.rows || []).map((x) => x.v));
        await calibrateBaseline(companyId, 'equipment', eqId, eqName, 'vibration', vibVals);
      }
    }
  }

  const tpmData = await getTpmAggregates(companyId, days);
  for (const row of tpmData) {
    const incidentCount = parseInt(row.incident_count || 0, 10);
    if (incidentCount >= 1) {
      const dailyCounts = await db.query(`
        SELECT incident_date, COUNT(*) as cnt FROM tpm_incidents
        WHERE company_id = $1 AND equipment_code = $2 AND incident_date >= CURRENT_DATE - $3
        GROUP BY incident_date
      `, [companyId, row.entity_id, days]).then((r) => (r.rows || []).map((x) => x.cnt));
      await calibrateBaseline(companyId, 'machine', row.entity_id, row.entity_name || row.entity_id, 'incident_count_per_day', dailyCounts.length ? dailyCounts : [incidentCount]);
      results.tpm++;
    }
  }

  return results;
}

/**
 * Obtém baseline para uma entidade/métrica
 */
async function getBaseline(companyId, entityType, entityId, metricName) {
  const r = await db.query(`
    SELECT * FROM operational_anomaly_baselines
    WHERE company_id = $1 AND entity_type = $2 AND entity_id = $3 AND metric_name = $4
  `, [companyId, entityType, entityId, metricName]);
  return r.rows?.[0] || null;
}

/**
 * Verifica se valor está fora do esperado
 */
function isAnomaly(observed, baseline, threshold = DEVIATION_THRESHOLD) {
  if (!baseline || baseline.sample_count < MIN_SAMPLES) return false;
  const mean = parseFloat(baseline.value_mean) || 0;
  const std = parseFloat(baseline.value_std) || 0;
  const val = parseFloat(observed);
  if (Number.isNaN(val)) return false;
  if (std === 0) return val !== mean;
  const z = Math.abs((val - mean) / std);
  return z > threshold;
}

/**
 * Detecta anomalias comparando dados recentes com baseline
 */
async function detectAnomalies(companyId) {
  const anomalies = [];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // últimas 24h

  const plcRecent = await db.query(`
    SELECT equipment_id, equipment_name,
      AVG(temperature) as temp_avg, AVG(pressure) as press_avg, AVG(vibration) as vib_avg,
      COUNT(*) as cnt
    FROM plc_collected_data
    WHERE company_id = $1 AND collected_at >= $2
    GROUP BY equipment_id, equipment_name
  `, [companyId, since]);

  for (const row of plcRecent.rows || []) {
    const eqId = row.equipment_id || 'unknown';
    if (row.temp_avg != null) {
      const bl = await getBaseline(companyId, 'equipment', eqId, 'temperature');
      if (bl && isAnomaly(row.temp_avg, bl)) {
        const exp = parseFloat(bl.value_mean);
        const dev = exp !== 0 ? ((row.temp_avg - exp) / exp * 100) : 0;
        anomalies.push({
          anomaly_type: 'process_parameter_out_of_range',
          severity: Math.abs(dev) > 30 ? 'high' : 'medium',
          entity_type: 'equipment',
          entity_id: eqId,
          entity_name: row.equipment_name || eqId,
          machine_identifier: eqId,
          observed_value: row.temp_avg,
          expected_value: exp,
          deviation_pct: Math.round(dev * 100) / 100,
          raw_data: { metric: 'temperature' }
        });
      }
    }
    if (row.vib_avg != null) {
      const bl = await getBaseline(companyId, 'equipment', eqId, 'vibration');
      if (bl && isAnomaly(row.vib_avg, bl)) {
        const exp = parseFloat(bl.value_mean);
        anomalies.push({
          anomaly_type: 'process_parameter_out_of_range',
          severity: 'high',
          entity_type: 'equipment',
          entity_id: eqId,
          entity_name: row.equipment_name || eqId,
          machine_identifier: eqId,
          observed_value: row.vib_avg,
          expected_value: exp,
          deviation_pct: exp ? Math.round((row.vib_avg - exp) / exp * 10000) / 100 : 0,
          raw_data: { metric: 'vibration' }
        });
      }
    }
  }

  const tpmRecent = await db.query(`
    SELECT equipment_code, COUNT(*) as cnt
    FROM tpm_incidents
    WHERE company_id = $1 AND incident_date >= CURRENT_DATE - 1
    GROUP BY equipment_code
  `, [companyId]);

  for (const row of tpmRecent.rows || []) {
    const eqId = row.equipment_code || 'unknown';
    const cnt = parseInt(row.cnt, 10);
    const bl = await getBaseline(companyId, 'machine', eqId, 'incident_count_per_day');
    if (bl && isAnomaly(cnt, bl)) {
      const exp = parseFloat(bl.value_mean) || 0;
      anomalies.push({
        anomaly_type: 'defect_increase',
        severity: cnt > (exp * 2) ? 'high' : 'medium',
        entity_type: 'machine',
        entity_id: eqId,
        machine_identifier: eqId,
        observed_value: cnt,
        expected_value: exp,
        deviation_pct: exp ? Math.round((cnt - exp) / exp * 10000) / 100 : 0,
        raw_data: { metric: 'incident_count' }
      });
    }
  }

  return anomalies;
}

/**
 * Verifica se anomalia similar já foi registrada recentemente (evita duplicatas)
 */
async function hasRecentSimilar(companyId, anomaly, hours = 4) {
  const r = await db.query(`
    SELECT id FROM operational_anomalies
    WHERE company_id = $1 AND entity_type = $2 AND entity_id = $3
    AND anomaly_type = $4 AND created_at >= now() - $5::int * interval '1 hour'
  `, [companyId, anomaly.entity_type || '', anomaly.entity_id || '', anomaly.anomaly_type, hours]);
  return (r.rows || []).length > 0;
}

/**
 * Persiste anomalia e dispara análise de causa
 */
async function recordAnomaly(companyId, anomaly) {
  if (await hasRecentSimilar(companyId, anomaly)) return null;
  const r = await db.query(`
    INSERT INTO operational_anomalies
      (company_id, anomaly_type, severity, entity_type, entity_id, entity_name, machine_identifier, observed_value, expected_value, deviation_pct, raw_data)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    companyId, anomaly.anomaly_type, anomaly.severity || 'medium',
    anomaly.entity_type || null, anomaly.entity_id || null, anomaly.entity_name || null,
    anomaly.machine_identifier || null, anomaly.observed_value, anomaly.expected_value,
    anomaly.deviation_pct || null, JSON.stringify(anomaly.raw_data || {})
  ]);
  const rec = r.rows[0];
  if (rec) {
    await analyzeCause(rec.id);
    await distributeAlerts(companyId, rec.id);
  }
  return rec;
}

/**
 * Análise de causa com IA
 */
async function analyzeCause(anomalyId) {
  const r = await db.query(`
    SELECT a.*, c.name as company_name FROM operational_anomalies a
    JOIN companies c ON c.id = a.company_id WHERE a.id = $1
  `, [anomalyId]);
  const row = r.rows?.[0];
  if (!row) return null;

  let analysis = '';
  let possibleCauses = [];

  try {
    const prompt = `Anomalia operacional detectada na empresa ${row.company_name || 'industria'}:
- Tipo: ${row.anomaly_type}
- Severidade: ${row.severity}
- Equipamento: ${row.entity_name || row.entity_id || 'N/A'}
- Valor observado: ${row.observed_value}
- Valor esperado: ${row.expected_value}
- Desvio: ${row.deviation_pct}%

Liste em até 5 linhas numeradas as possíveis causas mais prováveis (operador, máquina, lote, fornecedor, manutenção recente, alteração de processo). Seja objetivo.`;
    const aiRes = await ai.chatCompletion(prompt, { max_tokens: 400 });
    if (aiRes && !String(aiRes).startsWith('FALLBACK:')) {
      analysis = String(aiRes).trim();
      possibleCauses = (aiRes.match(/^\d+\.\s*(.+)$/gm) || []).map((l) => l.replace(/^\d+\.\s*/, '').trim());
    }
  } catch (_) {}

  await db.query(`
    UPDATE operational_anomalies SET ai_analysis = $2, possible_causes = $3 WHERE id = $1
  `, [anomalyId, analysis || null, JSON.stringify(possibleCauses)]);

  return { analysis, possibleCauses };
}

/**
 * Distribui alertas por cargo (supervisor=operacional, gerente=tático, diretor/ceo=estratégico)
 */
async function distributeAlerts(companyId, anomalyId) {
  const r = await db.query(`
    SELECT * FROM operational_anomalies WHERE id = $1 AND company_id = $2
  `, [anomalyId, companyId]);
  const anom = r.rows?.[0];
  if (!anom) return;

  const title = `Anomalia: ${anom.anomaly_type.replace(/_/g, ' ')} - ${anom.entity_name || anom.entity_id || 'Operação'}`;
  const msg = `Valor observado ${anom.observed_value} (esperado ${anom.expected_value}). Desvio: ${anom.deviation_pct}%.`;

  const users = await db.query(`
    SELECT id, role, hierarchy_level, functional_area FROM users
    WHERE company_id = $1 AND active = true AND deleted_at IS NULL
    AND hierarchy_level <= 3
  `, [companyId]);

  for (const u of users.rows || []) {
    const role = (u.role || '').toLowerCase();
    const h = u.hierarchy_level ?? 5;
    let level = 'operational';
    if (role === 'ceo' || h <= 0) level = 'strategic';
    else if (role === 'diretor' || h <= 1) level = 'strategic';
    else if (role === 'gerente' || h <= 2) level = 'tactical';
    else level = 'operational';

    await db.query(`
      INSERT INTO operational_anomaly_alerts (company_id, anomaly_id, target_user_id, target_role_level, alert_level, title, message, severity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [companyId, anomalyId, u.id, h, level, title, msg, anom.severity]);
  }
}

/**
 * Executa ciclo completo: aprender baselines, detectar, registrar, analisar
 */
async function runDetectionCycle(companyId) {
  await learnBaselines(companyId);
  const anomalies = await detectAnomalies(companyId);
  const recorded = [];
  for (const a of anomalies) {
    const rec = await recordAnomaly(companyId, a);
    if (rec) recorded.push(rec);
  }
  return { detected: anomalies.length, recorded: recorded.length };
}

/**
 * Lista anomalias (histórico) com filtros
 */
async function listAnomalies(companyId, opts = {}) {
  const { since, until, anomaly_type, acknowledged, limit = 50 } = opts;
  let sql = `SELECT * FROM operational_anomalies WHERE company_id = $1`;
  const params = [companyId];
  if (since) { params.push(since); sql += ` AND created_at >= $${params.length}`; }
  if (until) { params.push(until); sql += ` AND created_at <= $${params.length}`; }
  if (anomaly_type) { params.push(anomaly_type); sql += ` AND anomaly_type = $${params.length}`; }
  if (acknowledged !== undefined) { params.push(acknowledged); sql += ` AND acknowledged = $${params.length}`; }
  params.push(limit || 50);
  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

  const r = await db.query(sql, params);
  return r.rows || [];
}

/**
 * Reconhece anomalia
 */
async function acknowledgeAnomaly(anomalyId, userId, companyId, actions = [], notes = '') {
  await db.query(`
    UPDATE operational_anomalies
    SET acknowledged = true, acknowledged_by = $2, acknowledged_at = now(),
        actions_taken = COALESCE($3::jsonb, actions_taken),
        resolution_notes = COALESCE(NULLIF($4,''), resolution_notes)
    WHERE id = $1 AND company_id = $5
  `, [anomalyId, userId, JSON.stringify(actions), notes, companyId]);
}

/**
 * Obtém alertas para o usuário
 */
async function getAlertsForUser(companyId, userId, hierarchyLevel) {
  const r = await db.query(`
    SELECT aa.*, oa.anomaly_type, oa.entity_name, oa.severity, oa.created_at as anomaly_at
    FROM operational_anomaly_alerts aa
    JOIN operational_anomalies oa ON oa.id = aa.anomaly_id
    WHERE aa.company_id = $1 AND (aa.target_user_id = $2 OR (aa.target_user_id IS NULL AND aa.target_role_level >= $3))
    AND aa.acknowledged = false
    ORDER BY aa.sent_at DESC LIMIT 30
  `, [companyId, userId, hierarchyLevel ?? 5]);
  return r.rows || [];
}

/**
 * Impacto das anomalias para BI/Previsão
 */
async function getAnomalyImpactForForecasting(companyId, days = 7) {
  const r = await db.query(`
    SELECT
      COUNT(*) as anomaly_count,
      COALESCE(SUM(financial_impact), 0) as total_financial_impact,
      AVG(productivity_impact) as avg_productivity_impact
    FROM operational_anomalies
    WHERE company_id = $1 AND created_at >= now() - $2::int * interval '1 day'
    AND acknowledged = false
  `, [companyId, days]);
  const row = r.rows?.[0] || {};
  return {
    anomaly_count: parseInt(row.anomaly_count || 0, 10),
    financial_impact: parseFloat(row.total_financial_impact || 0),
    productivity_impact: parseFloat(row.avg_productivity_impact || 0),
    risk_factor: Math.min(1, (parseInt(row.anomaly_count || 0, 10) / 10) * 0.2)
  };
}

module.exports = {
  learnBaselines,
  detectAnomalies,
  recordAnomaly,
  analyzeCause,
  distributeAlerts,
  runDetectionCycle,
  listAnomalies,
  acknowledgeAnomaly,
  getAlertsForUser,
  getAnomalyImpactForForecasting,
  getBaseline
};
