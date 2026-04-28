/**
 * IMPETUS - Detector Inteligente de Vazamento Financeiro
 * Analisa dados operacionais e detecta perdas ocultas
 * Integra: Centro de Custos, eventos máquinas, TPM, PLC, insights
 * CEO/Diretores: valores | Supervisores: alertas operacionais sem valores
 */
const db = require('../db');
const industrialCost = require('./industrialCostService');
const ai = require('./ai');

const LEAK_TYPE_LABELS = {
  maquinas_paradas: 'Máquinas paradas',
  equipe_ociosa: 'Tempo ocioso de equipes',
  retrabalho: 'Retrabalho na produção',
  baixa_eficiencia: 'Baixa eficiência operacional',
  consumo_energetico: 'Consumo energético excessivo',
  perda_materia_prima: 'Perda de matéria-prima',
  gargalo_produtivo: 'Gargalo produtivo',
  atraso_operacional: 'Atrasos operacionais',
  manutencao_excessiva: 'Manutenção excessiva',
  outros: 'Outras perdas'
};

const HIDE_VALUE_PLACEHOLDER = '—';

/**
 * Verifica se usuário pode ver valores financeiros
 * Apenas CEO, Diretores e Admin do sistema (configuração técnica)
 */
function canViewFinancial(role, hierarchyLevel) {
  const r = (role || '').toLowerCase();
  return ['ceo', 'diretor', 'admin', 'internal_admin'].includes(r) || (hierarchyLevel != null && hierarchyLevel <= 1);
}

/**
 * Oculta valores monetários se usuário não tiver permissão
 */
function maskFinancial(value, includeFinancial) {
  if (includeFinancial && value != null) return value;
  return HIDE_VALUE_PLACEHOLDER;
}

function formatMoney(value) {
  if (value == null || value === HIDE_VALUE_PLACEHOLDER) return value;
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

/**
 * Detecta vazamentos agregando dados de múltiplas fontes
 */
async function detectAndAggregate(companyId) {
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const detections = [];

  // 1. Paradas de máquinas (industrial_cost_impact_events + machine_detected_events)
  const impactEvents = await db.query(`
    SELECT event_type, machine_identifier, line_identifier, duration_hours, calculated_impact, description, created_at
    FROM industrial_cost_impact_events
    WHERE company_id = $1 AND created_at >= $2
  `, [companyId, periodStart]);

  const byMachineLine = {};
  for (const e of impactEvents.rows || []) {
    const key = `${e.machine_identifier || ''}|${e.line_identifier || ''}`;
    if (!byMachineLine[key]) byMachineLine[key] = { total: 0, hours: 0, count: 0, line: e.line_identifier };
    byMachineLine[key].total += parseFloat(e.calculated_impact) || 0;
    byMachineLine[key].hours += parseFloat(e.duration_hours) || 1;
    byMachineLine[key].count += 1;
  }
  for (const [key, v] of Object.entries(byMachineLine)) {
    if (v.total > 0) {
      detections.push({
        leak_type: 'maquinas_paradas',
        line_identifier: v.line || null,
        impact_24h: v.total / 30 * 1,
        impact_7d: v.total / 30 * 7,
        impact_30d: v.total,
        description: `Paradas detectadas (${v.count} eventos, ~${v.hours.toFixed(1)}h)`,
        event_count: v.count
      });
    }
  }

  // 2. Retrabalho (TPM incidents com root_cause relacionado, industrial_cost com retrabalho)
  let tpmRework = { rows: [] };
  try {
    tpmRework = await db.query(`
      SELECT equipment_code, root_cause, losses_before, losses_during, losses_after, incident_date
      FROM tpm_incidents
      WHERE company_id = $1 AND incident_date >= $2
        AND (root_cause ILIKE '%retrabalho%' OR root_cause ILIKE '%retorno%' OR root_cause ILIKE '%refugo%')
    `, [companyId, periodStart.toISOString().slice(0, 10)]);
  } catch (err) {
    console.warn(
      '[financialLeakage][tpm_rework_query]',
      err && err.message ? err.message : err
    );
  }

  const reworkCount = (tpmRework.rows || []).length;
  if (reworkCount > 0) {
    const items = await industrialCost.listCostItems(companyId);
    const reworkCost = items
      .filter(i => ['retrabalho', 'linhas_producao', 'maquinas'].includes(i.category_id))
      .reduce((s, i) => s + (parseFloat(i.cost_rework) || 0), 0) / Math.max(1, items.length) * reworkCount;
    const avgDaily = reworkCost / 30;
    detections.push({
      leak_type: 'retrabalho',
      sector: 'Produção',
      impact_24h: avgDaily,
      impact_7d: avgDaily * 7,
      impact_30d: reworkCost,
      description: `Retrabalho registrado (${reworkCount} ocorrências TPM)`,
      event_count: reworkCount
    });
  }

  // 3. Consumo energético (plc_collected_data power_kw acima da média)
  let plcPower = { rows: [] };
  try {
    plcPower = await db.query(`
      SELECT equipment_id, AVG(power_kw) as avg_power, COUNT(*) as samples
      FROM plc_collected_data
      WHERE company_id = $1 AND collected_at >= $2 AND power_kw > 0
      GROUP BY equipment_id
    `, [companyId, periodStart]);
  } catch (err) {
    console.warn(
      '[financialLeakage][plc_power_query]',
      err && err.message ? err.message : err
    );
  }

  const powerRows = plcPower.rows || [];
  if (powerRows.length > 1) {
    const globalAvg = powerRows.reduce((s, r) => s + parseFloat(r.avg_power || 0), 0) / powerRows.length;
    const aboveAvg = powerRows.filter(r => parseFloat(r.avg_power) > globalAvg * 1.15);
    if (aboveAvg.length > 0) {
      const energyItems = (await industrialCost.listCostItems(companyId))
        .filter(i => i.category_id === 'energia');
      const hourCost = energyItems.reduce((s, i) => s + (parseFloat(i.cost_per_hour) || 0), 0) / Math.max(1, energyItems.length) || 50;
      const excessKw = aboveAvg.reduce((s, r) => s + (parseFloat(r.avg_power) - globalAvg), 0);
      const dailyExcess = excessKw * 24 * 0.5 * (hourCost / 100);
      detections.push({
        leak_type: 'consumo_energetico',
        impact_24h: dailyExcess,
        impact_7d: dailyExcess * 7,
        impact_30d: dailyExcess * 30,
        description: `${aboveAvg.length} equipamento(s) acima do consumo padrão`,
        event_count: aboveAvg.length
      });
    }
  }

  // 4. Baixa eficiência (muitos eventos high/critical sem parada explícita)
  let machineEvents = { rows: [] };
  try {
    machineEvents = await db.query(`
      SELECT event_type, machine_identifier, line_name, severity
      FROM machine_detected_events
      WHERE company_id = $1 AND created_at >= $2
    `, [companyId, periodStart]);
  } catch (err) {
    console.warn(
      '[financialLeakage][machine_events_query]',
      err && err.message ? err.message : err
    );
  }

  const evs = machineEvents.rows || [];
  const highCount = evs.filter(e => ['high', 'critical'].includes(e.severity)).length;
  const paradaCount = evs.filter(e => ['machine_stopped', 'compressor_offline'].includes(e.event_type)).length;
  if (highCount > paradaCount && highCount >= 3) {
    const items = await industrialCost.listCostItems(companyId);
    const avgHour = items.reduce((s, i) => s + (parseFloat(i.cost_per_hour) || 0), 0) / Math.max(1, items.length) || 200;
    const impact = (highCount - paradaCount) * avgHour * 0.5;
    detections.push({
      leak_type: 'baixa_eficiencia',
      impact_24h: impact / 30,
      impact_7d: impact / 30 * 7,
      impact_30d: impact,
      description: `Eventos de alta criticidade (${highCount}) indicando perda de eficiência`,
      event_count: highCount
    });
  }

  // 5. Persistir detecções (upsert por tipo+setor+linha no período)
  const periodEnd = now;
  for (const d of detections) {
    await db.query(`
      INSERT INTO financial_leakage_detections
        (company_id, leak_type, sector, line_identifier, machine_identifier,
         impact_1h, impact_24h, impact_7d, impact_30d, description, event_count, period_start, period_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      companyId, d.leak_type, d.sector || null, d.line_identifier || null, d.machine_identifier || null,
      (d.impact_30d || 0) / 720, d.impact_24h || 0, d.impact_7d || 0, d.impact_30d || 0,
      d.description, d.event_count || 0, periodStart, periodEnd
    ]);
  }

  return detections.length;
}

/**
 * Mapa de vazamento - principais perdas
 */
async function getLeakMap(companyId, includeFinancial = true) {
  await detectAndAggregate(companyId);

  const r = await db.query(`
    SELECT leak_type, sector, line_identifier, impact_24h, impact_7d, impact_30d, description, event_count
    FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY leak_type, COALESCE(line_identifier,''), COALESCE(sector,'') ORDER BY impact_30d DESC, period_end DESC) rn
      FROM financial_leakage_detections
      WHERE company_id = $1 AND period_end >= now() - INTERVAL '7 days'
    ) sub
    WHERE rn = 1
    ORDER BY impact_30d DESC
    LIMIT 15
  `, [companyId]);

  const sorted = r.rows || [];

  return sorted.map(row => ({
    leak_type: row.leak_type,
    leak_label: LEAK_TYPE_LABELS[row.leak_type] || row.leak_type,
    sector: row.sector,
    line_identifier: row.line_identifier,
    description: row.description,
    event_count: row.event_count,
    impact_24h: includeFinancial ? parseFloat(row.impact_24h) : null,
    impact_7d: includeFinancial ? parseFloat(row.impact_7d) : null,
    impact_30d: includeFinancial ? parseFloat(row.impact_30d) : null,
    impact_24h_formatted: includeFinancial ? formatMoney(row.impact_24h) : HIDE_VALUE_PLACEHOLDER,
    impact_30d_formatted: includeFinancial ? formatMoney(row.impact_30d) : HIDE_VALUE_PLACEHOLDER
  }));
}

/**
 * Ranking de perdas operacionais
 */
async function getLeakRanking(companyId, includeFinancial = true) {
  const map = await getLeakMap(companyId, includeFinancial);
  const byType = {};
  for (const m of map) {
    if (!byType[m.leak_type]) {
      byType[m.leak_type] = {
        leak_type: m.leak_type,
        leak_label: m.leak_label,
        sector: m.sector,
        impact_24h: 0,
        impact_7d: 0,
        impact_30d: 0,
        count: 0
      };
    }
    byType[m.leak_type].impact_24h += m.impact_24h || 0;
    byType[m.leak_type].impact_7d += m.impact_7d || 0;
    byType[m.leak_type].impact_30d += m.impact_30d || 0;
    byType[m.leak_type].count += 1;
  }

  const ranking = Object.values(byType)
    .sort((a, b) => (b.impact_30d || 0) - (a.impact_30d || 0))
    .map((r, i) => ({
      rank: i + 1,
      leak_type: r.leak_type,
      leak_label: r.leak_label,
      sector: r.sector || '-',
      impact_30d: includeFinancial ? r.impact_30d : null,
      impact_30d_formatted: includeFinancial ? formatMoney(r.impact_30d) : HIDE_VALUE_PLACEHOLDER
    }));

  return ranking;
}

/**
 * Alertas automáticos de vazamento
 */
async function getAlerts(companyId, limit = 10, includeFinancial = true) {
  const map = await getLeakMap(companyId, includeFinancial);

  const alerts = [];
  for (const m of map.slice(0, limit)) {
    if ((m.impact_30d || 0) > 0 || !includeFinancial) {
      alerts.push({
        id: `leak-${m.leak_type}-${m.line_identifier || m.sector || ''}`,
        leak_type: m.leak_type,
        leak_label: m.leak_label,
        title: `Perda detectada: ${m.leak_label}`,
        description: m.description,
        sector: m.sector,
        line_identifier: m.line_identifier,
        impact_estimated: includeFinancial ? m.impact_30d : null,
        impact_30d_formatted: includeFinancial ? formatMoney(m.impact_30d) : HIDE_VALUE_PLACEHOLDER,
        possible_cause: inferPossibleCause(m.leak_type),
        suggestion: inferSuggestion(m.leak_type)
      });
    }
  }

  return alerts;
}

function inferPossibleCause(leakType) {
  const causes = {
    maquinas_paradas: 'Paradas não programadas ou manutenção corretiva',
    retrabalho: 'Falhas no processo ou qualidade',
    consumo_energetico: 'Equipamentos fora do padrão ou carga excessiva',
    baixa_eficiencia: 'Eventos operacionais recorrentes',
    equipe_ociosa: 'Aguardando processo ou manutenção'
  };
  return causes[leakType] || 'Análise operacional necessária';
}

function inferSuggestion(leakType) {
  const suggestions = {
    maquinas_paradas: 'Revisar manutenção preventiva e causas de parada',
    retrabalho: 'Revisar procedimento e treinamento da equipe',
    consumo_energetico: 'Inspecionar equipamentos e ajustar carga',
    baixa_eficiencia: 'Identificar gargalos e otimizar processo',
    equipe_ociosa: 'Balancear carga e reduzir tempos de espera'
  };
  return suggestions[leakType] || 'Analisar causa raiz e implementar ação corretiva';
}

/**
 * Relatório IA
 */
async function generateAIReport(companyId, includeFinancial = true) {
  const ranking = await getLeakRanking(companyId, includeFinancial);
  const map = await getLeakMap(companyId, includeFinancial);
  const top = ranking[0];

  let aiSuggestion = 'Monitore os indicadores operacionais e priorize ações nos itens de maior impacto.';
  let fullReportText = '';

  if (top) {
    fullReportText = `Maior causa de perda: ${top.leak_label}.`;
    if (includeFinancial && top.impact_30d > 0) {
      fullReportText += ` Impacto estimado em 30 dias: ${formatMoney(top.impact_30d)}.`;
    }
    fullReportText += ` Possível causa: ${inferPossibleCause(top.leak_type)}. Sugestão: ${inferSuggestion(top.leak_type)}.`;
  }

  try {
    const sugestaoBase = top ? inferSuggestion(top.leak_type) : '';
    const prompt = `Como analista industrial, resuma em 2-3 frases o relatório de perdas operacionais:
${JSON.stringify({ principais: ranking.slice(0, 5).map(r => ({ tipo: r.leak_label, setor: r.sector })), sugestao_base: sugestaoBase })}
Responda em português, de forma objetiva.`;
    const aiRes = await ai.chatCompletion(prompt, { max_tokens: 200 });
    if (aiRes && !aiRes.startsWith('FALLBACK')) {
      aiSuggestion = aiRes;
    }
  } catch (err) {
    console.warn(
      '[financialLeakage][ai_report_summary]',
      err && err.message ? err.message : err
    );
  }

  const report = {
    main_cause: top?.leak_label || null,
    main_cause_impact: includeFinancial && top ? top.impact_30d : null,
    main_cause_impact_formatted: includeFinancial && top ? formatMoney(top.impact_30d) : HIDE_VALUE_PLACEHOLDER,
    main_cause_sector: top?.sector || null,
    possible_cause: top ? inferPossibleCause(top.leak_type) : null,
    ai_suggestion: aiSuggestion,
    full_report_text: fullReportText,
    ranking_summary: ranking
  };

  await db.query(`
    INSERT INTO financial_leakage_reports (company_id, report_type, period_start, period_end, main_cause, main_cause_impact, main_cause_sector, possible_cause, ai_suggestion, full_report_text, ranking_summary)
    VALUES ($1, 'on_demand', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8)
  `, [companyId, report.main_cause, report.main_cause_impact, report.main_cause_sector, report.possible_cause, report.ai_suggestion, report.full_report_text, JSON.stringify(ranking)]);

  return report;
}

/**
 * Impacto projetado (integração com Centro de Previsão)
 */
async function getProjectedImpact(companyId, days = 30, includeFinancial = true) {
  const map = await getLeakMap(companyId, includeFinancial);
  const total30d = map.reduce((s, m) => s + (m.impact_30d || 0), 0);
  const ratePerDay = total30d / Math.max(30, 1);
  const projected = Math.round(ratePerDay * days);

  return {
    projected_impact: includeFinancial ? projected : null,
    projected_impact_formatted: includeFinancial ? formatMoney(projected) : HIDE_VALUE_PLACEHOLDER,
    days_ahead: days,
    baseline_30d: includeFinancial ? total30d : null,
    message: includeFinancial
      ? `Se o nível atual de perdas continuar por ${days} dias: prejuízo estimado de ${formatMoney(projected)}.`
      : `Se o nível atual de perdas continuar por ${days} dias, impacto operacional significativo é esperado.`
  };
}

module.exports = {
  canViewFinancial,
  maskFinancial,
  LEAK_TYPE_LABELS,
  detectAndAggregate,
  getLeakMap,
  getLeakRanking,
  getAlerts,
  generateAIReport,
  getProjectedImpact
};
