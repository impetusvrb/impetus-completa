'use strict';

/**
 * Comportamentos industriais esperados por tipo de cenário.
 *
 * Cada entrada define o que o Runtime Z DEVE sugerir — não executar —
 * quando detecta aquele cenário. Comportamento curado, determinístico.
 */

const BEHAVIORS = Object.freeze([
  {
    scenario: 'safety_incident_active',
    trigger_conditions: { criticality: ['critical'], domains: ['safety'] },
    expected_behaviors: [
      'Activar protocolo de resposta a incidente de segurança',
      'Notificar SESMT e liderança responsável',
      'Iniciar registo de CAT se aplicável',
      'Isolar área de risco enquanto aguarda avaliação'
    ],
    auto_actions_blocked: true,
    human_authority_required: true,
    response_tone: 'direct_urgent'
  },
  {
    scenario: 'oee_below_threshold',
    trigger_conditions: { domains: ['production'], keywords: ['oee', 'parada', 'downtime'] },
    expected_behaviors: [
      'Identificar causa raiz da parada',
      'Quantificar perda de produção no turno',
      'Activar análise rápida com manutenção',
      'Documentar para CAPA se recorrente'
    ],
    auto_actions_blocked: true,
    human_authority_required: true,
    response_tone: 'analytical'
  },
  {
    scenario: 'nr_training_required',
    trigger_conditions: { domains: ['safety'], keywords: ['nr-', 'treinamento', 'capacitação'] },
    expected_behaviors: [
      'Verificar lista de colaboradores habilitados',
      'Preparar comunicado de convocatória',
      'Gerar lista de controlo de presença',
      'Registar validade do treinamento após conclusão'
    ],
    auto_actions_blocked: true,
    human_authority_required: false,
    response_tone: 'organised'
  },
  {
    scenario: 'audit_preparation',
    trigger_conditions: { domains: ['quality'], keywords: ['auditoria', 'iso', 'iatf', 'certificação'] },
    expected_behaviors: [
      'Consolidar evidências objectivas por requisito',
      'Verificar não-conformidades abertas',
      'Actualizar plano de acção preventiva',
      'Preparar equipa com simulação de perguntas'
    ],
    auto_actions_blocked: true,
    human_authority_required: false,
    response_tone: 'structured'
  },
  {
    scenario: 'shift_handover',
    trigger_conditions: { keywords: ['passagem de turno', 'troca de turno', 'ata de turno'] },
    expected_behaviors: [
      'Registar pendências do turno actual',
      'Comunicar ocorrências críticas ao próximo turno',
      'Validar estado dos activos principais',
      'Confirmar recebimento da passagem'
    ],
    auto_actions_blocked: true,
    human_authority_required: false,
    response_tone: 'compact'
  },
  {
    scenario: 'environmental_incident',
    trigger_conditions: { criticality: ['critical'], domains: ['environmental'] },
    expected_behaviors: [
      'Activar plano de resposta ambiental',
      'Contener fonte do incidente',
      'Notificar responsável ambiental e gestor de planta',
      'Iniciar registo para órgão ambiental se necessário'
    ],
    auto_actions_blocked: true,
    human_authority_required: true,
    response_tone: 'direct_urgent'
  }
]);

function findBehavior(scenario) {
  return BEHAVIORS.find((b) => b.scenario === scenario) || null;
}

function matchBehaviors({ domains = [], criticality = 'low', text = '' } = {}) {
  const t = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return BEHAVIORS.filter((b) => {
    const cond = b.trigger_conditions;
    const critOk = !cond.criticality || cond.criticality.includes(criticality);
    const domainOk = cond.domains && cond.domains.some((d) => domains.includes(d));
    const kwOk = cond.keywords && cond.keywords.some((k) => t.includes(k));
    // precisa de pelo menos um sinal positivo (domínio OU keyword)
    // se a condição tem criticidade definida, ela já serve como sinal
    const hasCritSignal = !!cond.criticality;
    return critOk && (domainOk || kwOk || (hasCritSignal && critOk && cond.criticality.includes(criticality)));
  });
}

module.exports = { findBehavior, matchBehaviors, BEHAVIORS };
