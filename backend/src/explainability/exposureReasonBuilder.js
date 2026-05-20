'use strict';

const LAYER_LABELS = {
  deny: 'Negativa explícita (deny-first)',
  domain_authority: 'Autoridade de domínio (Domain Authority)',
  rbac: 'Controlo de acesso por perfil (RBAC)',
  explicit_policy: 'Política explícita de visibilidade',
  ia_contextual: 'Contexto IA (limitado pelo envelope)',
  ux: 'Apresentação UX'
};

function buildExposureReason(ctx = {}) {
  const {
    decision = 'allow',
    winning_layer = null,
    reason = null,
    domain = null,
    blocked_content = null,
    policy_source = null,
    envelope_scope = null,
    channel = null,
    meta = {}
  } = ctx;

  const layerLabel = winning_layer ? LAYER_LABELS[winning_layer] || winning_layer : null;

  let human_summary;
  if (decision === 'deny') {
    human_summary = layerLabel ?
      `Conteúdo negado pela camada «${winning_layer}»: ${reason || 'política de governança'}.` :
      `Conteúdo negado: ${reason || 'política de governança'}.`;
  } else {
    human_summary = layerLabel ?
      `Conteúdo permitido; camada decisória: ${winning_layer}.` :
      'Conteúdo permitido dentro do envelope cognitivo.';
  }

  return {
    decision,
    reason: reason || (decision === 'deny' ? 'governance_denied' : 'governance_allowed'),
    winning_layer,
    winning_layer_label: layerLabel,
    domain: domain || meta.functional_axis || null,
    blocked_content,
    policy_source: policy_source || 'content_exposure_policy_engine',
    envelope_scope: envelope_scope || meta.envelope_depth || null,
    channel,
    human_summary,
    meta
  };
}

module.exports = { buildExposureReason, LAYER_LABELS };
