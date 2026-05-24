'use strict';

/**
 * Vocabulário operacional industrial canónico.
 *
 * Mapeia termos técnicos para linguagem operacional madura e vice-versa.
 * Usado para melhorar naturalidade das narrativas do Runtime Z.
 */

// Abreviações e siglas industriais com expansão contextual
const ABBREVIATIONS = Object.freeze({
  oee: 'OEE (Eficiência Global do Equipamento)',
  nr12: 'NR-12 (Segurança em Máquinas)',
  nr10: 'NR-10 (Segurança em Elétrica)',
  nr35: 'NR-35 (Trabalho em Altura)',
  nr33: 'NR-33 (Espaço Confinado)',
  nr6: 'NR-6 (EPI)',
  capa: 'CAPA (Acção Correctiva e Preventiva)',
  rca: 'RCA (Análise de Causa Raiz)',
  cat: 'CAT (Comunicado de Acidente de Trabalho)',
  spc: 'SPC (Controle Estatístico de Processo)',
  sst: 'SST (Saúde e Segurança no Trabalho)',
  mttr: 'MTTR (Tempo Médio de Reparo)',
  mtbf: 'MTBF (Tempo Médio entre Falhas)',
  esg: 'ESG (Ambiental, Social e Governança)',
  pcp: 'PCP (Planeamento e Controle da Produção)',
  setup: 'Setup (Preparação de Máquina)',
  pm: 'PM (Manutenção Preventiva)',
  pta: 'PT-A (Permissão de Trabalho - Actividade)'
});

// Templates de linguagem madura por tipo de situação
const LANGUAGE_TEMPLATES = Object.freeze({
  // Continuidade de contexto
  context_inherited:
    'Z identificou continuidade com "{summary}" — o contexto anterior foi mantido automaticamente.',
  context_inherited_short:
    'Contexto herdado de interacção anterior.',

  // Prioridades
  priority_p1:
    'Situação de máxima prioridade (P1) — atenção imediata recomendada.',
  priority_p2:
    'Prioridade elevada (P2) — resolução nas próximas {hours}h sugerida.',
  priority_p3:
    'Prioridade moderada (P3) — agendar resolução no turno actual.',
  priority_p4:
    'Prioridade informativa (P4) — sem urgência operacional identificada.',

  // Criticidade
  criticality_critical:
    'Criticidade CRÍTICA detectada — activar protocolo de resposta imediata.',
  criticality_high:
    'Criticidade ALTA — envolver responsável de área brevemente.',
  criticality_medium:
    'Criticidade MÉDIA — acompanhar no ciclo operacional normal.',
  criticality_low:
    'Criticidade BAIXA — registar e monitorar.',

  // Turno
  shift_change:
    'Mudança de turno detectada — verificar pendências antes da passagem.',
  shift_context:
    'Operação em {shift_name}, período {part_of_day}.',

  // Acções preparadas
  action_prepared:
    '{count} acção(ões) preparada(s) para revisão. Nenhuma será executada sem autorização explícita.',
  action_communication:
    'Comunicado preparado com base no contexto "{summary}" — aguarda revisão e aprovação.',
  action_confirmation:
    'Lista de confirmação preparada para "{summary}" — aguarda validação.',

  // Sem contexto
  no_context:
    'Z aguarda mais contexto para inferir continuidade operacional.',
  no_pattern:
    'Padrão operacional não identificado — respondendo com base no contexto disponível.',

  // Erros / ruído
  low_confidence:
    'Confiança de inferência baixa — Z responde de forma conservadora.',

  // Escalonamento
  escalation_suggested:
    'Z sugere envolver {role} para esta situação — decisão humana obrigatória.',

  // Riscos
  risk_safety:
    'Sinal de risco SST detectado — verificar conformidade e protocolo aplicável.',
  risk_environmental:
    'Sinal ambiental detectado — verificar plano de contenção e notificação.',
  risk_production:
    'Risco produtivo identificado — verificar impacto no OEE do turno.',
  risk_multi:
    'Múltiplos domínios impactados ({domains}) — análise de correlação sugerida.'
});

function expandAbbreviation(term = '') {
  return ABBREVIATIONS[String(term).toLowerCase()] || term;
}

function getTemplate(key, vars = {}) {
  const tpl = LANGUAGE_TEMPLATES[key] || '';
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? String(vars[k]) : `{${k}}`);
}

function allTemplateKeys() {
  return Object.keys(LANGUAGE_TEMPLATES);
}

module.exports = { expandAbbreviation, getTemplate, allTemplateKeys, ABBREVIATIONS, LANGUAGE_TEMPLATES };
