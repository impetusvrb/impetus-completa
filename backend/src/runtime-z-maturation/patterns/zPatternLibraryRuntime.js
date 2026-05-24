'use strict';

/**
 * Biblioteca estática de padrões industriais conhecidos.
 *
 * Cada padrão descreve um cenário operacional recorrente:
 *   tipo, triggers (palavras-chave), resposta esperada, domínio,
 *   criticidade base, linguagem natural madura.
 *
 * NÃO é treinada externamente — é curada internamente como conhecimento
 * operacional industrial consolidado.
 */

const LIBRARY = Object.freeze([
  {
    id: 'nr12_training',
    label: 'Treinamento NR-12',
    triggers: ['nr-12', 'nr12', 'segurança máquinas', 'laudo nr-12'],
    domain: 'safety',
    criticality: 'high',
    workflow_type: 'training_safety',
    typical_intents: ['plan_training', 'send_communication', 'create_tracking_list'],
    language_template: 'Treinamento NR-12 requer comunicado formal, lista de presença e confirmação de participação.',
    escalation_hint: 'supervisor'
  },
  {
    id: 'nr10_training',
    label: 'Treinamento NR-10',
    triggers: ['nr-10', 'nr10', 'elétrica', 'electricidade', 'choque'],
    domain: 'safety',
    criticality: 'critical',
    workflow_type: 'training_safety',
    typical_intents: ['plan_training', 'send_communication'],
    language_template: 'NR-10 envolve risco elétrico — treinamento de alta prioridade com registo obrigatório.',
    escalation_hint: 'area_manager'
  },
  {
    id: 'capa_quality',
    label: 'CAPA / Não-Conformidade',
    triggers: ['capa', 'nc', 'nao-conformidade', 'não conformidade', 'ação correctiva', 'acao corretiva', 'rca'],
    domain: 'quality',
    criticality: 'high',
    workflow_type: 'corrective_action',
    typical_intents: ['report_request', 'task_continue_workflow'],
    language_template: 'Não-conformidade activa requer análise de causa raiz (RCA), CAPA e acompanhamento de prazo.',
    escalation_hint: 'quality_manager'
  },
  {
    id: 'oee_drop',
    label: 'Queda de OEE',
    triggers: ['oee', 'eficiência', 'parada', 'downtime', 'parou'],
    domain: 'production',
    criticality: 'high',
    workflow_type: 'production_recovery',
    typical_intents: ['incident_response', 'report_request'],
    language_template: 'Queda de OEE detectada — verificar causa de parada, impacto no turno e plano de recuperação.',
    escalation_hint: 'plant_manager'
  },
  {
    id: 'preventive_maintenance',
    label: 'Manutenção Preventiva',
    triggers: ['manutenção preventiva', 'manutencao preventiva', 'pm', 'preventiva', 'plano de manutencao'],
    domain: 'maintenance',
    criticality: 'medium',
    workflow_type: 'maintenance_schedule',
    typical_intents: ['workflow_continue', 'task_continue_workflow'],
    language_template: 'Manutenção preventiva programada — confirmar disponibilidade de equipa e peças sobressalentes.',
    escalation_hint: 'supervisor'
  },
  {
    id: 'predictive_maintenance',
    label: 'Manutenção Preditiva',
    triggers: ['preditiva', 'vibração', 'temperatura', 'rolamento', 'lubrificação'],
    domain: 'maintenance',
    criticality: 'medium',
    workflow_type: 'maintenance_schedule',
    typical_intents: ['report_request', 'workflow_continue'],
    language_template: 'Sinal preditivo detectado — agendar intervenção antes da falha funcional.',
    escalation_hint: 'supervisor'
  },
  {
    id: 'safety_incident',
    label: 'Incidente de Segurança',
    triggers: ['acidente', 'incidente', 'lesão', 'lesao', 'cat', 'evacuar', 'emergência', 'emergencia'],
    domain: 'safety',
    criticality: 'critical',
    workflow_type: 'incident_response',
    typical_intents: ['incident_response'],
    language_template: 'Incidente de segurança — activar protocolo de resposta imediata, notificar SESMT e registar CAT.',
    escalation_hint: 'plant_manager'
  },
  {
    id: 'environmental_spill',
    label: 'Vazamento / Derrame Ambiental',
    triggers: ['vazamento', 'derrame', 'contaminação', 'contaminacao', 'esg', 'licença ambiental'],
    domain: 'environmental',
    criticality: 'critical',
    workflow_type: 'environmental_incident',
    typical_intents: ['incident_response', 'report_request'],
    language_template: 'Evento ambiental crítico — contener, registar e notificar órgão ambiental conforme protocolo.',
    escalation_hint: 'plant_manager'
  },
  {
    id: 'shift_handover',
    label: 'Passagem de Turno',
    triggers: ['passagem de turno', 'passagem', 'troca de turno', 'ata de turno', 'relatorio de turno'],
    domain: 'production',
    criticality: 'low',
    workflow_type: 'shift_handover',
    typical_intents: ['report_request', 'workflow_continue'],
    language_template: 'Passagem de turno — registar pendências, comunicar ocorrências e validar estado dos activos.',
    escalation_hint: 'self'
  },
  {
    id: 'audit_preparation',
    label: 'Preparação de Auditoria',
    triggers: ['auditoria', 'certificação', 'certificacao', 'iso', 'iatf', 'segunda parte', 'terceira parte'],
    domain: 'quality',
    criticality: 'high',
    workflow_type: 'audit_preparation',
    typical_intents: ['report_request', 'task_continue_workflow'],
    language_template: 'Auditoria programada — consolidar evidências, actualizar documentação e treinar equipa.',
    escalation_hint: 'quality_manager'
  },
  {
    id: 'turnover_alert',
    label: 'Alerta de Turnover / RH',
    triggers: ['turnover', 'demissão', 'demissao', 'desligamento', 'absenteísmo', 'absenteismo'],
    domain: 'hr',
    criticality: 'medium',
    workflow_type: 'hr_analysis',
    typical_intents: ['report_request', 'data_query'],
    language_template: 'Indicador de RH fora do padrão — verificar causas e activar plano de retenção.',
    escalation_hint: 'hr_manager'
  }
]);

function all() {
  return LIBRARY;
}

function findByTrigger(text = '') {
  const t = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return LIBRARY.filter((p) => p.triggers.some((k) => t.includes(k)));
}

function findById(id) {
  return LIBRARY.find((p) => p.id === id) || null;
}

function getTemplate(id) {
  const p = findById(id);
  return p ? p.language_template : null;
}

module.exports = { all, findByTrigger, findById, getTemplate };
