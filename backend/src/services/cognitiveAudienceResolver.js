'use strict';

/**
 * Público cognitivo do Centro de Comando — alinhado ao motor do dashboard
 * (Base Estrutural + utilizador + profile_code), evitando RH/turnover em perfis não-RH.
 */

const AXIS_TO_AUDIENCE = Object.freeze({
  qualidade: 'quality',
  quality: 'quality',
  humano: 'hr',
  hr: 'hr',
  manutencao: 'maintenance',
  maintenance: 'maintenance',
  ambiental: 'environmental',
  environmental: 'environmental',
  operacional: 'operations',
  operations: 'operations',
  financeiro: 'finance',
  finance: 'finance',
  executivo: 'executive',
  planejamento: 'planning'
});

function resolveCognitiveAudience(profileCode = '', orgCtx = {}) {
  const p = String(profileCode || '').toLowerCase();
  const fa = String(orgCtx.functional_area || '').toLowerCase();
  const cargo = String(orgCtx.cargo || orgCtx.display?.cargo || '').toLowerCase();

  const isHr =
    p.includes('hr') ||
    p === 'hr_management' ||
    ['hr', 'rh', 'recursos_humanos'].includes(fa) ||
    /(recursos humanos|gestao de pessoas|human resources|people operations|\brh\b)/.test(cargo);

  const isQuality =
    !isHr &&
    (p.includes('quality') ||
      p.includes('inspector') ||
      ['quality', 'qualidade', 'laboratory', 'laboratorio'].includes(fa) ||
      /(qualidade|nao conform|inspec|conformidade|laboratorio)/.test(cargo));

  const isMaintenance =
    !isHr &&
    !isQuality &&
    (p.includes('maintenance') ||
      ['maintenance', 'manutencao'].includes(fa) ||
      /(manutenc|pcm|ordem de servico)/.test(cargo));

  const isEnvironmental =
    !isHr &&
    (p.includes('environmental') ||
      ['environmental', 'sustainability', 'esg', 'environmental_health_safety'].includes(fa) ||
      /(meio ambiente|ambiental|sustentabil|esg)/.test(cargo));

  let primaryAxis = 'operations';
  if (isHr) primaryAxis = 'hr';
  else if (isQuality) primaryAxis = 'quality';
  else if (isMaintenance) primaryAxis = 'maintenance';
  else if (isEnvironmental) primaryAxis = 'environmental';
  else if (p.includes('production') || fa === 'production' || fa === 'producao') primaryAxis = 'production';

  return { isHr, isQuality, isMaintenance, isEnvironmental, primaryAxis, profileCode: p };
}

/**
 * Mesma fonte que o dashboard personalizado: cargo estrutural + eixo da Base Estrutural.
 */
function resolveCognitiveAudienceFromStructural(enrichedUser = {}, orgCtx = {}, profileCode = '') {
  const sp = enrichedUser.structural_profile || {};
  const p = String(profileCode || '').toLowerCase();
  const role = String(enrichedUser.role || sp.funcao || '').toLowerCase();
  const hint = String(
    enrichedUser.company_role_dashboard_hint ||
    enrichedUser.structural_role_row?.dashboard_functional_hint ||
    ''
  )
    .toLowerCase()
    .trim();

  const mergedCtx = {
    ...orgCtx,
    functional_area:
      orgCtx.functional_area ||
      enrichedUser.functional_area ||
      sp.area_funcional ||
      null,
    cargo: orgCtx.cargo || enrichedUser.job_title || sp.cargo || null
  };

  let audience = resolveCognitiveAudience(profileCode, mergedCtx);

  const axisRaw = String(sp.eixo_primario || '').replace(/^eixo_/, '');
  const mapped = AXIS_TO_AUDIENCE[axisRaw];

  const isExecutive =
    role === 'ceo' ||
    hint === 'executive' ||
    mapped === 'executive' ||
    p.includes('ceo_executive') ||
    (p.includes('director') && !p.includes('quality') && !p.includes('maintenance'));

  if (isExecutive) {
    audience = {
      ...audience,
      isHr: false,
      isQuality: false,
      isMaintenance: false,
      isEnvironmental: false,
      isExecutive: true,
      primaryAxis: 'executive'
    };
  } else if (hint === 'quality' || hint === 'qualidade' || p.includes('quality')) {
    audience = {
      ...audience,
      isHr: false,
      isQuality: true,
      isMaintenance: false,
      isExecutive: false,
      primaryAxis: 'quality'
    };
  } else if (mapped === 'quality') {
    audience = { ...audience, isHr: false, isQuality: true, isMaintenance: false, isExecutive: false, primaryAxis: 'quality' };
  } else if (mapped === 'hr' || hint === 'hr') {
    audience = { ...audience, isHr: true, isQuality: false, isExecutive: false, primaryAxis: 'hr' };
  } else if (mapped === 'maintenance' && !(hint === 'quality' || hint === 'qualidade')) {
    audience = { ...audience, isHr: false, isQuality: false, isMaintenance: true, isExecutive: false, primaryAxis: 'maintenance' };
  } else if (mapped === 'environmental') {
    audience = { ...audience, isEnvironmental: true, isExecutive: false, primaryAxis: 'environmental' };
  } else if (mapped) {
    audience = { ...audience, isExecutive: false, primaryAxis: mapped };
  }

  // Eixos secundários do texto longo não sobrescrevem CEO nem hint explícito da Base Estrutural.
  if (Array.isArray(sp.eixos) && !audience.isExecutive && !hint) {
    if (sp.eixos.includes('eixo_qualidade') && !audience.isHr && (axisRaw === 'qualidade' || axisRaw === 'quality')) {
      audience.isQuality = true;
      audience.primaryAxis = 'quality';
    }
    if (sp.eixos.includes('eixo_humano') && (axisRaw === 'humano' || axisRaw === 'hr')) {
      audience.isHr = true;
      audience.primaryAxis = 'hr';
    }
  }

  audience.structural_complete = sp.structural_complete === true;
  audience.cargo_estrutural = sp.cargo_estrutural?.nome || null;
  audience.departamento = sp.departamento || mergedCtx.departamento || null;
  audience.source = audience.structural_complete ? 'structural_profile' : 'profile_resolver';

  return audience;
}

function filterPredictionsList(predictions, audience) {
  if (!Array.isArray(predictions)) return predictions;
  return predictions.filter((item) => {
    const key = String(item.key || '').toLowerCase();
    const title = String(item.title || item.label || '').toLowerCase();
    if (key.includes('turnover') || title.includes('turnover')) {
      return audience.isHr;
    }
    return true;
  });
}

function filterPredictionCurves(curves, audience) {
  if (!curves || typeof curves !== 'object') return curves;
  const out = { ...curves };
  if (!audience.isHr) {
    delete out.turnover_risk_14d;
  }
  if (!audience.isQuality) {
    delete out.nc_risk_14d;
  }
  if (audience.isExecutive) {
    delete out.nc_risk_14d;
    delete out.turnover_risk_14d;
  }
  return out;
}

function crossAnalysisDomains(audience) {
  if (audience.isExecutive) return ['executivo', 'estrategia', 'financeiro', 'producao', 'comunicacao'];
  if (audience.isHr) return ['rh', 'producao', 'comunicacao', 'eficiencia', 'comportamento'];
  if (audience.isQuality) return ['qualidade', 'producao', 'compliance', 'comunicacao', 'eficiencia'];
  if (audience.isMaintenance) return ['manutencao', 'producao', 'comunicacao', 'eficiencia'];
  if (audience.isEnvironmental) return ['ambiental', 'compliance', 'producao', 'comunicacao'];
  return ['producao', 'manutencao', 'comunicacao', 'eficiencia'];
}

function crossAnalysisSummary(audience) {
  if (audience.isExecutive) {
    return 'Rede cognitiva executiva — visão consolidada, risco agregado e sincronização entre diretorias.';
  }
  if (audience.isHr) {
    return 'Rede cognitiva focada em pessoas — clima, absenteísmo e sincronização com operação.';
  }
  if (audience.isQuality) {
    return 'Rede cognitiva focada em qualidade — conformidade, NC, lotes e pressão intersetorial.';
  }
  if (audience.isMaintenance) {
    return 'Rede cognitiva focada em manutenção — ativos, falhas e disponibilidade.';
  }
  if (audience.isEnvironmental) {
    return 'Rede cognitiva focada em meio ambiente — compliance e impacto operacional.';
  }
  return 'Rede cognitiva ativa — cruzamento entre tarefas, alertas e identidade estrutural.';
}

function filterMultiAgents(multiAgents, audience) {
  if (!multiAgents || typeof multiAgents !== 'object') return multiAgents;
  const deny = new Set();
  if (!audience.isHr) deny.add('rh');
  if (!audience.isQuality) deny.add('comp');
  if (!audience.isMaintenance) deny.add('man');

  const agents = filterMultiAgentsList(multiAgents.agents, audience);
  const dialogue = (multiAgents.dialogue || []).filter((d) => {
    const from = String(d.from || '').toLowerCase();
    const to = String(d.to || '').toLowerCase();
    if (deny.has(from) || deny.has(to)) return false;
    const msg = String(d.message || '').toLowerCase();
    if (!audience.isHr && /(\brh\b|turnover|clima organizacional|absenteismo)/.test(msg)) {
      return false;
    }
    return true;
  });

  return { ...multiAgents, agents, dialogue };
}

function filterMultiAgentsList(agents, audience) {
  if (!Array.isArray(agents)) return agents;
  const deny = new Set();
  if (!audience.isHr) deny.add('rh');
  if (!audience.isQuality) deny.add('comp');
  if (!audience.isMaintenance) deny.add('man');
  return agents.filter((a) => !deny.has(a.id));
}

function filterIaObservationLines(lines, audience) {
  if (!Array.isArray(lines)) return lines;
  return lines.filter((line) => {
    const t = String(line).toLowerCase();
    if (!audience.isHr && /(\brh\b|turnover|clima organizacional|absenteismo|supervis[aã]o e rh)/.test(t)) {
      return false;
    }
    return true;
  });
}

function filterCauseEffect(causeEffect, audience) {
  if (!causeEffect?.chains) return causeEffect;
  const chains = causeEffect.chains.filter((c) => {
    if (!audience.isHr && String(c.domain || '').toLowerCase() === 'rh') return false;
    const cause = String(c.cause || '').toLowerCase();
    const effect = String(c.effect || '').toLowerCase();
    if (!audience.isHr && /(fadiga operacional|turnover|clima)/.test(`${cause} ${effect}`)) {
      return false;
    }
    return true;
  });
  return { ...causeEffect, chains: chains.length ? chains : causeEffect.chains.slice(0, 1) };
}

function filterBlackbox(blackbox, audience) {
  if (!blackbox) return blackbox;
  const log = (blackbox.background_log || []).map((line) => {
    const t = String(line).toLowerCase();
    if (!audience.isHr && t.includes('rh')) {
      if (audience.isQuality) return 'Cause-effect: correlacionando NC → atrasos de liberação';
      return 'Cause-effect: correlacionando comunicação → atrasos operacionais';
    }
    return line;
  });
  return { ...blackbox, background_log: log };
}

function filterDigitalTwin(twin, audience) {
  if (!twin?.sectors) return twin;
  let sectors = twin.sectors;
  if (!audience.isHr) {
    sectors = sectors.filter((s) => !/^rh$/i.test(String(s.name || '').trim()));
  }
  if (audience.isQuality && sectors.length === 0) {
    sectors = [
      { id: 'twin-q', name: 'Qualidade', role: 'sector', productivity_index: 78, communication_flow: 74, operational_heat: 38, tension: 'estável', signals: ['conformidade'] },
      { id: 'twin-p', name: 'Produção', role: 'sector', productivity_index: 72, communication_flow: 70, operational_heat: 42, tension: 'atenção', signals: ['monitorar'] }
    ];
  }
  return { ...twin, sectors };
}

/**
 * Aplica filtro final ao payload do pulso cognitivo (pós-composição).
 */
function applyAudienceToPulse(pulse, audience) {
  if (!pulse || !audience) return pulse;

  pulse.prediction_curves = filterPredictionCurves(pulse.prediction_curves, audience);
  pulse.predictions = filterPredictionsList(pulse.predictions, audience);

  if (pulse.advanced_predictions?.items) {
    pulse.advanced_predictions = {
      ...pulse.advanced_predictions,
      items: filterPredictionsList(pulse.advanced_predictions.items, audience)
    };
  }

  pulse.multi_agents = filterMultiAgents(pulse.multi_agents, audience);
  pulse.ia_observations = filterIaObservationLines(pulse.ia_observations, audience);
  pulse.cause_effect = filterCauseEffect(pulse.cause_effect, audience);
  pulse.digital_twin = filterDigitalTwin(pulse.digital_twin, audience);
  pulse.blackbox = filterBlackbox(pulse.blackbox, audience);

  pulse.cross_analysis = {
    ...(pulse.cross_analysis || {}),
    domains: crossAnalysisDomains(audience),
    summary: crossAnalysisSummary(audience)
  };

  pulse.cognitive_audience = {
    primary_axis: audience.primaryAxis,
    is_executive: audience.isExecutive === true,
    is_hr: audience.isHr,
    is_quality: audience.isQuality,
    is_maintenance: audience.isMaintenance,
    is_environmental: audience.isEnvironmental,
    structural_complete: audience.structural_complete === true,
    source: audience.source
  };

  return pulse;
}

module.exports = {
  resolveCognitiveAudience,
  resolveCognitiveAudienceFromStructural,
  filterPredictionsList,
  filterPredictionCurves,
  crossAnalysisDomains,
  crossAnalysisSummary,
  filterMultiAgents,
  filterMultiAgentsList,
  filterIaObservationLines,
  filterCauseEffect,
  filterBlackbox,
  filterDigitalTwin,
  applyAudienceToPulse
};
