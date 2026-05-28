'use strict';

/**
 * Matriz de remediação derivada de gaps (prioridade, esforço, owner sugerido).
 */

const REMEDIATION_PLAYBOOK = Object.freeze({
  'ISO27001-A.8.24': {
    priority: 'P1',
    effort: 'M',
    owner: 'Security',
    action: 'Promover KMS governance + encryption at rest em todos os tenants piloto'
  },
  'ISO27001-A.5.34': {
    priority: 'P1',
    effort: 'M',
    owner: 'DPO',
    action: 'Uniformizar retention enforce + RLS on em produção'
  },
  'ISO42001-AI-1': {
    priority: 'P1',
    effort: 'S',
    owner: 'AI Governance',
    action: 'Completar AI Model Registry com iso_42001_controls por modelo'
  },
  'ISO42001-AI-2': {
    priority: 'P2',
    effort: 'M',
    owner: 'AI Platform',
    action: 'Expandir Action Runtime HITL para todas as mutações IA'
  },
  'SOC2-CC7.2': {
    priority: 'P1',
    effort: 'M',
    owner: 'SRE',
    action: 'APM enterprise + SLO dashboards Grafana operacionais 90 dias'
  },
  'SOC2-A1.2': {
    priority: 'P2',
    effort: 'L',
    owner: 'Ops',
    action: 'Documentar BCP/DR + testes de restore trimestrais'
  },
  'IEC62443-SL-T3': {
    priority: 'P1',
    effort: 'L',
    owner: 'OT',
    action: 'Validar conectores MQTT/OPC/Modbus em lab industrial real'
  },
  'IEC62443-SL-T4': {
    priority: 'P2',
    effort: 'L',
    owner: 'Edge',
    action: 'Deploy edge agent store-and-forward com mutual TLS'
  }
});

const DEFAULT_REMEDIATION = {
  priority: 'P2',
  effort: 'M',
  owner: 'Platform',
  action: 'Fechar gap via controlo documentado + evidência em audit trail'
};

function buildRemediationMatrix(gapAnalysis) {
  const rows = (gapAnalysis.gaps || []).concat(gapAnalysis.partials || []).map((g) => {
    const playbook = REMEDIATION_PLAYBOOK[g.control_id] || DEFAULT_REMEDIATION;
    return {
      control_id: g.control_id,
      framework: g.framework,
      title: g.title,
      status: g.status,
      score: g.score,
      missing_evidence: g.missing_evidence,
      priority: playbook.priority,
      effort: playbook.effort,
      owner_suggestion: playbook.owner,
      remediation_action: playbook.action,
      rollback_safe: true,
      shadow_validation_required: g.status === 'partial'
    };
  });

  rows.sort((a, b) => {
    const p = { P1: 0, P2: 1, P3: 2 };
    return (p[a.priority] || 9) - (p[b.priority] || 9);
  });

  return {
    total_items: rows.length,
    p1_count: rows.filter((r) => r.priority === 'P1').length,
    rows
  };
}

module.exports = { buildRemediationMatrix };
