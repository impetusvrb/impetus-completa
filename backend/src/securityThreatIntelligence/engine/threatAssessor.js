'use strict';

/**
 * SEC-03 — Assessment determinístico de ameaça.
 * Trabalha com hipóteses e probabilidades — nunca afirma identidade de atacante.
 */

const { extractThreatIndicators } = require('./indicatorExtractor');
const { resolveProvidersForIncident } = require('./providerRegistry');

/**
 * @param {object} incident
 * @returns {string}
 */
function determinePrimaryAssessment(incident) {
  const cls = incident.classification || 'UNKNOWN';
  const m = incident.metrics || {};
  const durationMs = incident.durationMs || 0;
  const providers = resolveProvidersForIncident(incident);
  const indicators = extractThreatIndicators(incident);

  if (cls === 'OPERATIONAL_ACCESS') return 'OPERATIONAL_ACCESS';
  if (cls === 'CRAWLER') return 'CRAWLER';
  if (cls === 'HEALTH_CHECK') return 'BACKGROUND_INTERNET_NOISE';

  if (cls === 'CREDENTIAL_SCAN') {
    if (providers.length > 0) return 'CLOUD_SCANNER';
    return 'CREDENTIAL_SCANNER';
  }

  if (durationMs >= 3600000 && m.eventCount >= 10) {
    return 'PERSISTENT_ENUMERATION';
  }

  if (m.requestCount >= 10000 && m.uniquePaths >= 20) {
    return 'RECON_CAMPAIGN';
  }

  if (cls === 'BACKGROUND_INTERNET_NOISE') return 'BACKGROUND_INTERNET_NOISE';
  if (cls === 'GENERIC_SCANNER') {
    if (providers.length > 0) return 'CLOUD_SCANNER';
    return 'GENERIC_SCANNER';
  }
  if (cls === 'ENUMERATION') {
    if (durationMs >= 1800000) return 'PERSISTENT_ENUMERATION';
    return 'GENERIC_SCANNER';
  }

  const hasSuspicious = indicators.some((i) =>
    ['CREDENTIAL_SCAN', 'MASSIVE_404', 'RATE_SPIKE', 'KNOWN_SCANNER'].includes(i.code)
  );
  if (hasSuspicious) return 'SUSPICIOUS';

  return 'UNKNOWN';
}

function buildOriginAssessment(incident, providers) {
  const ips = incident.participants?.ips || [];
  const asns = incident.participants?.asns || [];

  if (incident.classification === 'OPERATIONAL_ACCESS') {
    return {
      kind: 'origin',
      level: 'Likely',
      label: 'Acesso operacional autorizado',
      hypothesis: 'Origem consistente com operador ou rede de confiança configurada',
      confidence: 0.85,
      evidence: ips.map((ip) => ({ type: 'ip', value: ip }))
    };
  }

  if (providers.length > 0) {
    const names = providers.map((p) => p.name).join(', ');
    return {
      kind: 'origin',
      level: 'Likely',
      label: `Infraestrutura cloud provável (${names})`,
      hypothesis: 'Origem consistente com instância em provedor cloud — não implica actor humano único',
      confidence: Math.max(...providers.map((p) => p.confidence || 0.7)),
      evidence: providers.map((p) => ({ type: 'provider', value: p.name, ip: p.matchedIp }))
    };
  }

  if (ips.length === 1) {
    return {
      kind: 'origin',
      level: 'Possible',
      label: 'Origem IP única observada',
      hypothesis: 'Actividade originada de um endereço IP — identidade do actor desconhecida',
      confidence: 0.5,
      evidence: [{ type: 'ip', value: ips[0] }]
    };
  }

  if (ips.length > 1) {
    return {
      kind: 'origin',
      level: 'Possible',
      label: 'Múltiplas origens IP no mesmo incidente',
      hypothesis: 'Várias origens observadas — pode ser campanha distribuída ou scanners independentes; número de actores indeterminado',
      confidence: 0.45,
      evidence: ips.map((ip) => ({ type: 'ip', value: ip }))
    };
  }

  return {
    kind: 'origin',
    level: 'Unknown',
    label: 'Origem indeterminada',
    hypothesis: null,
    confidence: 0,
    evidence: asns.length ? asns.map((a) => ({ type: 'asn', value: a })) : []
  };
}

function buildIntentAssessment(incident, primaryAssessment) {
  const templates = {
    CREDENTIAL_SCANNER: {
      level: 'Likely',
      label: 'Procura de credenciais/configurações expostas',
      hypothesis: 'Intenção provável de descoberta de secrets — sem confirmação de exfiltração'
    },
    CLOUD_SCANNER: {
      level: 'Likely',
      label: 'Varredura automatizada desde infra cloud',
      hypothesis: 'Scanner automatizado — intenção de reconhecimento, não necessariamente actor humano'
    },
    RECON_CAMPAIGN: {
      level: 'Likely',
      label: 'Campanha de reconhecimento sustentada',
      hypothesis: 'Mapeamento sistemático de superfície de ataque'
    },
    PERSISTENT_ENUMERATION: {
      level: 'Likely',
      label: 'Enumeração persistente',
      hypothesis: 'Exploração prolongada de endpoints — persistência observada'
    },
    OPERATIONAL_ACCESS: {
      level: 'Confirmed',
      label: 'Acesso operacional legítimo',
      hypothesis: 'Actividade consistente com operador autorizado'
    },
    CRAWLER: {
      level: 'Possible',
      label: 'Indexação/crawler',
      hypothesis: 'Comportamento compatível com bot de indexação'
    },
    BACKGROUND_INTERNET_NOISE: {
      level: 'Possible',
      label: 'Ruído de fundo da Internet',
      hypothesis: 'Actividade automatizada de baixo impacto esperado'
    },
    GENERIC_SCANNER: {
      level: 'Possible',
      label: 'Scanner genérico',
      hypothesis: 'Varredura automatizada sem alvo específico confirmado'
    },
    SUSPICIOUS: {
      level: 'Possible',
      label: 'Actividade suspeita',
      hypothesis: 'Indicadores presentes — evidência insuficiente para classificação definitiva'
    },
    UNKNOWN: {
      level: 'Unknown',
      label: 'Intenção indeterminada',
      hypothesis: null
    }
  };

  const t = templates[primaryAssessment] || templates.UNKNOWN;
  return {
    kind: 'intent',
    level: t.level,
    label: t.label,
    hypothesis: t.hypothesis,
    confidence: t.level === 'Confirmed' ? 0.9 : t.level === 'Likely' ? 0.7 : t.level === 'Possible' ? 0.45 : 0.2,
    evidence: [{ type: 'assessment', value: primaryAssessment }]
  };
}

function buildPersistenceAssessment(incident) {
  const durationMs = incident.durationMs || 0;
  const m = incident.metrics || {};

  if (durationMs >= 7200000) {
    return {
      kind: 'persistence',
      level: 'Likely',
      label: 'Persistência prolongada (>2h)',
      hypothesis: 'Actividade sustentada ao longo de múltiplas horas',
      confidence: 0.8,
      evidence: [{ type: 'duration_ms', value: durationMs }]
    };
  }

  if (durationMs >= 3600000 || m.eventCount >= 15) {
    return {
      kind: 'persistence',
      level: 'Possible',
      label: 'Persistência moderada',
      hypothesis: 'Actividade distribuída em janela temporal alargada',
      confidence: 0.55,
      evidence: [{ type: 'event_count', value: m.eventCount }]
    };
  }

  return {
    kind: 'persistence',
    level: 'Unknown',
    label: 'Sem persistência significativa observada',
    hypothesis: null,
    confidence: 0.3,
    evidence: []
  };
}

function buildTargetAssessment(incident) {
  const components = incident.affectedComponents || [];
  const paths = (incident.evidence || []).map((e) => e.path_prefix).filter(Boolean);

  if (components.includes('api-auth')) {
    return {
      kind: 'target',
      level: 'Likely',
      label: 'Superfície de autenticação',
      hypothesis: 'Endpoints de autenticação foram alvo de tentativas',
      confidence: 0.75,
      evidence: paths.slice(0, 5).map((p) => ({ type: 'path', value: p }))
    };
  }

  if (paths.some((p) => /\.env|credentials|secrets|config/i.test(p))) {
    return {
      kind: 'target',
      level: 'Likely',
      label: 'Configurações e secrets',
      hypothesis: 'Paths sensíveis foram solicitados',
      confidence: 0.8,
      evidence: paths.filter((p) => /\.env|credentials|secrets|config/i.test(p)).slice(0, 5).map((p) => ({ type: 'path', value: p }))
    };
  }

  if (components.length > 0) {
    return {
      kind: 'target',
      level: 'Possible',
      label: `Componentes: ${components.join(', ')}`,
      hypothesis: 'Superfície HTTP/API afectada',
      confidence: 0.5,
      evidence: components.map((c) => ({ type: 'component', value: c }))
    };
  }

  return {
    kind: 'target',
    level: 'Unknown',
    label: 'Alvo indeterminado',
    hypothesis: null,
    confidence: 0.2,
    evidence: []
  };
}

function buildRecommendations(incident, primaryAssessment, indicators) {
  const recs = [];

  if (primaryAssessment === 'OPERATIONAL_ACCESS' || primaryAssessment === 'CRAWLER') {
    recs.push({ priority: 'info', text: 'Monitorizar — classificação de baixo risco operacional' });
    return recs;
  }

  if (['CREDENTIAL_SCANNER', 'CLOUD_SCANNER', 'RECON_CAMPAIGN', 'PERSISTENT_ENUMERATION'].includes(primaryAssessment)) {
    recs.push({ priority: 'medium', text: 'Rever logs nginx e confirmar ausência de exfiltração (observacional)' });
    recs.push({ priority: 'low', text: 'Correlacionar com incidentes históricos antes de qualquer acção (SEC-06+)' });
  }

  if (indicators.some((i) => i.code === 'MASSIVE_404')) {
    recs.push({ priority: 'low', text: 'Verificar hardening nginx (HARDENING-01) — paths sensíveis retornam 404' });
  }

  recs.push({ priority: 'info', text: 'Não inferir número de actores — aguardar SEC-05 para notificação humana' });

  return recs;
}

function computeProfileConfidence(assessments) {
  const levels = [assessments.origin, assessments.intent, assessments.persistence, assessments.target]
    .map((a) => a?.confidence || 0);
  const avg = levels.reduce((s, v) => s + v, 0) / Math.max(levels.length, 1);
  return Math.round(avg * 100) / 100;
}

function mapRiskLevel(primaryAssessment, incident) {
  const severity = incident.severity || 'INFO';
  if (primaryAssessment === 'OPERATIONAL_ACCESS' || primaryAssessment === 'CRAWLER') return 'Low';
  if (primaryAssessment === 'BACKGROUND_INTERNET_NOISE') return 'Low';
  if (severity === 'CRITICAL' || primaryAssessment === 'RECON_CAMPAIGN') return 'Critical';
  if (severity === 'HIGH' || primaryAssessment === 'CREDENTIAL_SCANNER') return 'High';
  if (severity === 'MEDIUM' || primaryAssessment === 'SUSPICIOUS') return 'Medium';
  return 'Low';
}

module.exports = {
  determinePrimaryAssessment,
  buildOriginAssessment,
  buildIntentAssessment,
  buildPersistenceAssessment,
  buildTargetAssessment,
  buildRecommendations,
  computeProfileConfidence,
  mapRiskLevel
};
