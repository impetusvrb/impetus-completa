/**
 * CERT-PULSE-04 FASE 2 — Simulações de calibração (não altera pesos).
 */
'use strict';

const { correlateHumanSignals } = require('../humanCorrelationEngine');
const { computePulseIndex } = require('../indexCalculator');
const { inferOrganizationalState } = require('../stateEngine');

const SCENARIOS = {
  highly_productive_team: {
    label: 'Equipe altamente produtiva',
    perception: {
      ok: true,
      operational: { tpm_incidents_recorded: 12, proacao_proposals_submitted: 8, intelligent_registrations: 6 },
      human_signals: {
        tasks_completed: 15,
        communications_read: 20,
        tenure_days: 800,
        time_clock: { records: 22, absence_rate: 0.02, delay_rate: 0.05, overtime_minutes: 200 },
        latest_self_evaluation: { efficiency: 4, confidence: 4, proactivity: 5, synergy: 4 }
      }
    },
    expected_coherence: 'Índice elevado (≥70), estado healthy ou growing'
  },
  team_in_crisis: {
    label: 'Equipe em crise',
    perception: {
      ok: true,
      operational: { tpm_incidents_recorded: 0, proacao_proposals_submitted: 0, intelligent_registrations: 0 },
      human_signals: {
        tasks_completed: 0,
        communications_read: 1,
        tenure_days: 200,
        time_clock: { records: 18, absence_rate: 0.22, delay_rate: 0.35, overtime_minutes: 1200 },
        latest_self_evaluation: { efficiency: 2, confidence: 2, proactivity: 2, synergy: 2 }
      }
    },
    expected_coherence: 'Índice baixo (<50), estado at_risk ou disengaged'
  },
  newly_formed_team: {
    label: 'Equipe recém-formada',
    perception: {
      ok: true,
      operational: { tpm_incidents_recorded: 2, proacao_proposals_submitted: 1, intelligent_registrations: 1 },
      human_signals: {
        tasks_completed: 3,
        communications_read: 5,
        tenure_days: 45,
        time_clock: { records: 10, absence_rate: 0.08, delay_rate: 0.12, overtime_minutes: 300 }
      }
    },
    expected_coherence: 'Índice moderado (45–65), integração baixa por tenure'
  },
  small_company: {
    label: 'Empresa pequena (poucos colaboradores, sinais moderados)',
    perception: {
      ok: true,
      operational: { tpm_incidents_recorded: 3, proacao_proposals_submitted: 2, intelligent_registrations: 1 },
      human_signals: {
        tasks_completed: 4,
        communications_read: 6,
        tenure_days: 400,
        time_clock: { records: 15, absence_rate: 0.06, delay_rate: 0.1, overtime_minutes: 400 }
      }
    },
    expected_coherence: 'Índice estável, sem extremos'
  },
  medium_company: {
    label: 'Empresa média',
    perception: {
      ok: true,
      operational: { tpm_incidents_recorded: 5, proacao_proposals_submitted: 4, intelligent_registrations: 3 },
      human_signals: {
        tasks_completed: 8,
        communications_read: 10,
        tenure_days: 500,
        time_clock: { records: 20, absence_rate: 0.05, delay_rate: 0.08, overtime_minutes: 500 },
        latest_self_evaluation: { efficiency: 3, confidence: 3, proactivity: 4, synergy: 3 }
      }
    },
    expected_coherence: 'Índice médio-alto (55–75)'
  },
  large_company: {
    label: 'Empresa grande (alto volume de sinais)',
    perception: {
      ok: true,
      operational: { tpm_incidents_recorded: 10, proacao_proposals_submitted: 7, intelligent_registrations: 5 },
      human_signals: {
        tasks_completed: 12,
        communications_read: 18,
        tenure_days: 1200,
        time_clock: { records: 22, absence_rate: 0.04, delay_rate: 0.06, overtime_minutes: 450 },
        latest_self_evaluation: { efficiency: 4, confidence: 4, proactivity: 4, synergy: 4 }
      }
    },
    expected_coherence: 'Índice alto com tenure elevado'
  },
  low_data_company: {
    label: 'Empresa com poucos registros',
    perception: {
      ok: true,
      operational: { tpm_incidents_recorded: 0, proacao_proposals_submitted: 0, intelligent_registrations: 0 },
      human_signals: { tasks_completed: 0, communications_read: 0, tenure_days: 120 }
    },
    expected_coherence: 'Índice baixo-moderado, confiança reduzida — sistema deve sinalizar baixa cobertura'
  },
  highly_digitalized: {
    label: 'Empresa altamente digitalizada',
    perception: {
      ok: true,
      operational: { tpm_incidents_recorded: 8, proacao_proposals_submitted: 6, intelligent_registrations: 10 },
      human_signals: {
        tasks_completed: 14,
        communications_read: 25,
        tenure_days: 600,
        time_clock: { records: 22, absence_rate: 0.03, delay_rate: 0.04, overtime_minutes: 350 },
        latest_self_evaluation: { efficiency: 4, confidence: 4, proactivity: 5, synergy: 5 }
      }
    },
    expected_coherence: 'Índice elevado, learning e participation altos'
  }
};

function evaluateCoherence(scenarioKey, result) {
  const spec = SCENARIOS[scenarioKey];
  const idx = result.pulse_index;
  const state = result.state_code;
  const distortions = [];

  if (scenarioKey === 'highly_productive_team' && idx < 65) {
    distortions.push({ type: 'underestimation', note: 'Equipe produtiva com índice abaixo do esperado' });
  }
  if (scenarioKey === 'team_in_crisis' && idx > 55) {
    distortions.push({ type: 'false_negative_risk', note: 'Equipe em crise com índice não refletindo deterioração' });
  }
  if (scenarioKey === 'low_data_company' && result.confidence > 0.55) {
    distortions.push({
      type: 'overconfidence',
      note: 'Poucos dados mas confiança acima do limiar recomendado para exibição assertiva'
    });
  }
  if (scenarioKey === 'team_in_crisis' && !['at_risk_team', 'disengaged_team', 'overloaded_team'].includes(state)) {
    distortions.push({ type: 'state_mismatch', note: `Estado ${state} pode não refletir crise` });
  }

  return {
    scenario: scenarioKey,
    label: spec.label,
    expected_coherence: spec.expected_coherence,
    pulse_index: idx,
    state_code: state,
    confidence: result.confidence,
    dimensions: result.dimensions,
    distortions,
    coherent: distortions.length === 0
  };
}

function runWeightSimulations() {
  const results = [];

  for (const [key, spec] of Object.entries(SCENARIOS)) {
    const corr = correlateHumanSignals(spec.perception);
    const indexPack = computePulseIndex(spec.perception, corr);
    const state = inferOrganizationalState(indexPack, corr);
    const evaluation = evaluateCoherence(key, {
      pulse_index: indexPack.pulse_index,
      confidence: indexPack.confidence,
      dimensions: indexPack.dimensions,
      state_code: state.state_code
    });
    results.push(evaluation);
  }

  const distortionCount = results.reduce((s, r) => s + r.distortions.length, 0);

  return {
    ok: true,
    framework: 'pulse_weight_calibration',
    cert: 'CERT-PULSE-04',
    scenarios: results,
    summary: {
      total_scenarios: results.length,
      coherent_scenarios: results.filter((r) => r.coherent).length,
      distortions_detected: distortionCount,
      weights_modified: false
    },
    governance: { weights_frozen: true, human_in_the_loop: true }
  };
}

module.exports = { runWeightSimulations, SCENARIOS, evaluateCoherence };
