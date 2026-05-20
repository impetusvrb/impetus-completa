'use strict';

const phaseW = require('./config/phaseWFeatureFlags');
const { logPhaseW } = require('./phaseWLogger');
const { extractReplyText } = require('./chatPayloadUtils');
const { inferHierarchyBand } = require('../kpiRollout/hierarchyKpiValidator');
const { normalizeAxis } = require('../kpiRollout/kpiDomainRegistry');

const DOMAIN_MARKERS = {
  executive: /\b(diretoria|conselho|ebitda|estratégia corporativa)\b/i,
  financial: /\b(margem|lucro|receita|orçamento financeiro)\b/i,
  hr: /\b(turnover|headcount|clima organizacional|RH)\b/i,
  quality: /\b(NC|não conformidade|inspeção qualidade)\b/i,
  safety: /\b(LTI|TRIR|SST|acidente de trabalho)\b/i,
  environmental: /\b(emissão|ESG|resíduo|ambiental)\b/i,
  operations: /\b(oee|turno|linha de produção|chão de fábrica)\b/i
};

const FORBIDDEN_MIX = [
  ['executive', 'operator'],
  ['safety', 'environmental'],
  ['hr', 'quality'],
  ['financial', 'operations']
];

function guardChatHierarchyIsolation(user, chatPayload, ctx = {}) {
  const text = extractReplyText(chatPayload);
  const band = inferHierarchyBand(user, ctx);
  const userAxis = normalizeAxis(ctx.functional_axis || user?.functional_axis);
  const violations = [];

  if (band === 'operator' && DOMAIN_MARKERS.executive.test(text)) {
    violations.push({ type: 'executive_leakage_to_operational', severity: 'critical' });
  }
  if (['executive', 'director'].includes(band) && DOMAIN_MARKERS.operations.test(text) && !DOMAIN_MARKERS.executive.test(text)) {
    violations.push({ type: 'operational_leakage_to_executive', severity: 'medium' });
  }

  const detectedDomains = Object.entries(DOMAIN_MARKERS)
    .filter(([, rx]) => rx.test(text))
    .map(([d]) => d);

  for (const [a, b] of FORBIDDEN_MIX) {
    if (detectedDomains.includes(a) && detectedDomains.includes(b)) {
      violations.push({ type: 'domain_mix_violation', domains: [a, b], severity: 'high' });
    }
  }
  if (userAxis === 'safety' && DOMAIN_MARKERS.environmental.test(text) && DOMAIN_MARKERS.safety.test(text)) {
    violations.push({ type: 'sst_esg_mix', severity: 'medium' });
  }

  if (violations.length && phaseW.isChatRuntimeObservabilityEnabled()) {
    logPhaseW('CHAT_HIERARCHY_MISMATCH_DETECTED', { band, count: violations.length, shadow_only: true });
  }

  return {
    hierarchy_band: band,
    user_axis: userAxis,
    violations,
    isolated: violations.filter((v) => v.severity === 'critical').length === 0,
    auto_block: false,
    enforcement_active: phaseW.isChatHierarchyIsolationEnabled()
  };
}

module.exports = { guardChatHierarchyIsolation };
