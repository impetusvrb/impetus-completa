'use strict';

function buildEmissionsCenter(bindings = [], signalBundle = {}) {
  const b = bindings.find((x) => x.block_id === 'environmental.emissions_monitor');
  return { center_id: 'environmental_emissions', label: 'Emissões', layer: 'operational', weight: 0.2, render_slot: 'kpi_cards', metrics: b?.metrics || {}, summary: b?.summary || '', ok: true };
}

function buildEsgCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'environmental.esg_governance');
  return { center_id: 'environmental_esg', label: 'ESG Contextual', layer: 'governance', weight: 0.16, render_slot: 'insights_ia', metrics: b?.metrics || {}, summary: b?.summary || '', ok: true };
}

function buildComplianceCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'environmental.license_compliance');
  return { center_id: 'environmental_compliance', label: 'Compliance / Licenças', layer: 'governance', weight: 0.18, render_slot: 'alertas', metrics: b?.metrics || {}, summary: b?.summary || '', ok: true };
}

function buildWasteCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'environmental.waste_management');
  return { center_id: 'environmental_waste', label: 'Resíduos', layer: 'operational', weight: 0.14, render_slot: 'kpi_cards', metrics: b?.metrics || {}, summary: b?.summary || '', ok: true };
}

function buildRiskCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'environmental.regulatory_risk');
  return { center_id: 'environmental_regulatory_risk', label: 'Risco Regulatório', layer: 'governance', weight: 0.16, render_slot: 'grafico_tendencia', metrics: b?.metrics || {}, summary: b?.summary || '', ok: true };
}

function buildTelemetryCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'environmental.environmental_telemetry');
  return { center_id: 'environmental_telemetry', label: 'Telemetria Ambiental', layer: 'operational', weight: 0.12, render_slot: 'insights_ia', metrics: b?.metrics || {}, summary: b?.summary || '', ok: true };
}

function buildTimelineCenter(bindings = []) {
  const b = bindings.find((x) => x.block_id === 'environmental.compliance_timeline');
  return { center_id: 'environmental_timeline', label: 'Vencimentos', layer: 'governance', weight: 0.12, render_slot: 'alertas', metrics: b?.metrics || {}, summary: b?.summary || '', ok: true };
}

function buildEnvironmentalAiCenter(bindings = [], engineContext = {}) {
  return {
    center_id: 'environmental_operational_ai',
    label: 'IA Ambiental',
    layer: 'governance',
    weight: 0.1,
    render_slot: 'insights_ia',
    contextual_questions: engineContext.ai?.contextual_questions || [],
    metrics: {},
    summary: 'IA contextual regulatória',
    ok: true
  };
}

function buildEnvironmentalNarrativeCenter(bindings = [], engineContext = {}) {
  return {
    center_id: 'environmental_narrative',
    label: 'Narrativa Ambiental',
    layer: 'strategic',
    weight: 0.08,
    render_slot: 'insights_ia',
    metrics: {},
    summary: engineContext.narrative?.paragraphs?.[0] || '',
    ok: true
  };
}

function buildEnvironmentalDecisionSupport(bindings = [], engineContext = {}) {
  return {
    center_id: 'environmental_decision_support',
    label: 'Suporte Decisão Ambiental',
    layer: 'governance',
    weight: 0.1,
    render_slot: 'insights_ia',
    contextual_questions: engineContext.ai?.contextual_questions || [],
    metrics: {},
    summary: 'Perguntas compliance e ESG operacional',
    ok: true
  };
}

module.exports = {
  buildEmissionsCenter,
  buildEsgCenter,
  buildComplianceCenter,
  buildWasteCenter,
  buildRiskCenter,
  buildTelemetryCenter,
  buildTimelineCenter,
  buildEnvironmentalAiCenter,
  buildEnvironmentalNarrativeCenter,
  buildEnvironmentalDecisionSupport
};
