'use strict';

const { MSA_BLOCK_ALIASES } = require('../../../registry/msaCognitiveBlockPack');

function _result(blockId, { engine_ok, binding_ok, dataset_used, signal_count, reason, metrics = {}, summary = null }) {
  return {
    block_id: blockId,
    engine_ok: engine_ok === true,
    binding_ok: binding_ok === true,
    dataset_used: dataset_used || null,
    signal_count: signal_count ?? 0,
    reason: reason || (binding_ok ? 'BOUND' : 'NOT_BOUND'),
    bridge_status: binding_ok ? 'bound_z20' : 'bound_empty',
    data_status: binding_ok ? 'engine_bound' : 'graceful_empty',
    metrics,
    summary,
    engine_invoked: true,
    assistive_only: true,
    render_active: false
  };
}

function bindMeasurementSystemRegistry(bundle) {
  const ds = bundle.datasets?.msa_measurement_studies;
  if (!ds?.available) {
    return _result('msa.measurement_system_registry', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'msa_measurement_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const total = bundle.studies?.total ?? 0;
  if (total === 0) {
    return _result('msa.measurement_system_registry', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'msa_measurement_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.measurement_system_registry', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'msa_measurement_studies',
    signal_count: total,
    reason: 'BOUND',
    metrics: {
      total,
      status_counts: bundle.studies?.status_counts || {},
      workflow_stage_counts: bundle.studies?.workflow_stage_counts || {}
    },
    summary: `Estudos MSA observados: ${total}`
  });
}

function bindGaugeInventory(bundle) {
  const dsG = bundle.datasets?.msa_gauges;
  const dsI = bundle.datasets?.msa_instruments;
  if (!dsG?.available && !dsI?.available) {
    return _result('msa.gauge_inventory', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'msa_gauges,msa_instruments',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const gaugeCount = bundle.support?.gauges?.count ?? 0;
  const instrumentCount = bundle.support?.instruments?.count ?? 0;
  const total = gaugeCount + instrumentCount;
  if (total === 0) {
    return _result('msa.gauge_inventory', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'msa_gauges,msa_instruments',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.gauge_inventory', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'msa_gauges,msa_instruments',
    signal_count: total,
    reason: 'BOUND',
    metrics: { gauges: gaugeCount, instruments: instrumentCount },
    summary: `Instrumentos: ${gaugeCount} gages · ${instrumentCount} equipamentos`
  });
}

function bindVariableGrr(bundle) {
  const ds = bundle.datasets?.msa_variable_grr_studies;
  if (!ds?.available) {
    return _result('msa.variable_grr', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'msa_variable_grr_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.study_types?.variable_grr?.count ?? 0;
  if (count === 0) {
    return _result('msa.variable_grr', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'msa_variable_grr_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.variable_grr', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'msa_variable_grr_studies',
    signal_count: count,
    reason: 'BOUND',
    metrics: { variable_grr_studies: count },
    summary: `Estudos GRR variável: ${count}`
  });
}

function bindAttributeAgreement(bundle) {
  const ds = bundle.datasets?.msa_attribute_agreement_studies;
  if (!ds?.available) {
    return _result('msa.attribute_agreement', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'msa_attribute_agreement_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.study_types?.attribute_agreement?.count ?? 0;
  if (count === 0) {
    return _result('msa.attribute_agreement', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'msa_attribute_agreement_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.attribute_agreement', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'msa_attribute_agreement_studies',
    signal_count: count,
    reason: 'BOUND',
    metrics: { attribute_studies: count },
    summary: `Estudos atributo: ${count}`
  });
}

function bindBiasAnalysis(bundle) {
  const ds = bundle.datasets?.msa_bias_studies;
  if (!ds?.available) {
    return _result('msa.bias_analysis', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'msa_bias_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.study_types?.bias?.count ?? 0;
  if (count === 0) {
    return _result('msa.bias_analysis', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'msa_bias_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.bias_analysis', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'msa_bias_studies',
    signal_count: count,
    reason: 'BOUND',
    metrics: { bias_studies: count },
    summary: `Estudos viés: ${count}`
  });
}

function bindLinearityAnalysis(bundle) {
  const ds = bundle.datasets?.msa_linearity_studies;
  if (!ds?.available) {
    return _result('msa.linearity_analysis', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'msa_linearity_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.study_types?.linearity?.count ?? 0;
  if (count === 0) {
    return _result('msa.linearity_analysis', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'msa_linearity_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.linearity_analysis', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'msa_linearity_studies',
    signal_count: count,
    reason: 'BOUND',
    metrics: { linearity_studies: count },
    summary: `Estudos linearidade: ${count}`
  });
}

function bindStabilityAnalysis(bundle) {
  const ds = bundle.datasets?.msa_stability_studies;
  if (!ds?.available) {
    return _result('msa.stability_analysis', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'msa_stability_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.study_types?.stability?.count ?? 0;
  if (count === 0) {
    return _result('msa.stability_analysis', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'msa_stability_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.stability_analysis', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'msa_stability_studies',
    signal_count: count,
    reason: 'BOUND',
    metrics: { stability_studies: count },
    summary: `Estudos estabilidade: ${count}`
  });
}

function bindMeasurementCapability(bundle) {
  const dsSamples = bundle.datasets?.msa_measurement_samples;
  const dsStudies = bundle.datasets?.msa_measurement_studies;
  if (!dsSamples?.available && !dsStudies?.available) {
    return _result('msa.measurement_capability', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'msa_measurement_samples,msa_measurement_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const sampleCount = bundle.support?.samples?.count ?? 0;
  const studyCount = bundle.studies?.total ?? 0;
  const total = sampleCount + studyCount;
  if (total === 0) {
    return _result('msa.measurement_capability', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'msa_measurement_samples,msa_measurement_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.measurement_capability', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'msa_measurement_samples,msa_measurement_studies',
    signal_count: total,
    reason: 'BOUND',
    metrics: { measurement_samples: sampleCount, studies: studyCount },
    summary: `Amostras: ${sampleCount} · estudos: ${studyCount}`
  });
}

function bindCalibrationMonitoring(bundle) {
  const dsRef = bundle.datasets?.msa_calibration_references;
  const dsGauges = bundle.datasets?.msa_gauges;
  if (!dsRef?.available && !dsGauges?.available) {
    return _result('msa.calibration_monitoring', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'msa_calibration_references,msa_gauges',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const refCount = bundle.support?.calibration_references?.count ?? 0;
  const gaugeCount = bundle.support?.gauges?.count ?? 0;
  const total = refCount + gaugeCount;
  if (total === 0) {
    return _result('msa.calibration_monitoring', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'msa_calibration_references,msa_gauges',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.calibration_monitoring', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'msa_calibration_references,msa_gauges',
    signal_count: total,
    reason: 'BOUND',
    metrics: { calibration_references: refCount, gauges: gaugeCount },
    summary: `Calibração: ${refCount} refs · ${gaugeCount} gages`
  });
}

function bindStudyGovernance(bundle) {
  const dsHist = bundle.datasets?.msa_study_history;
  const dsAppr = bundle.datasets?.msa_study_approvals;
  if (!dsHist?.available && !dsAppr?.available) {
    return _result('msa.study_governance', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'msa_study_history,msa_study_approvals',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const histCount = bundle.support?.study_history?.count ?? 0;
  const apprCount = bundle.support?.study_approvals?.count ?? 0;
  const total = histCount + apprCount;
  if (total === 0) {
    return _result('msa.study_governance', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'msa_study_history,msa_study_approvals',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.study_governance', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'msa_study_history,msa_study_approvals',
    signal_count: total,
    reason: 'BOUND',
    metrics: { history_rows: histCount, approval_rows: apprCount },
    summary: `Governança: ${histCount} transições · ${apprCount} aprovações`
  });
}

function bindContextualMsaAi(bundle, priorBindings = []) {
  const boundCount = priorBindings.filter((b) => b.binding_ok).length;
  if (boundCount === 0) {
    return _result('msa.contextual_msa_ai', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'bound_block_signals',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.contextual_msa_ai', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'bound_block_signals',
    signal_count: boundCount,
    reason: 'BOUND',
    metrics: { blocks_with_data: boundCount },
    summary: `Blocos operacionais observados: ${boundCount}`
  });
}

function bindMsaNarrative(bundle, priorBindings = []) {
  const summaries = priorBindings.filter((b) => b.binding_ok && b.summary).map((b) => b.summary);
  if (summaries.length === 0) {
    return _result('msa.msa_narrative', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'bound_block_summaries',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('msa.msa_narrative', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'bound_block_summaries',
    signal_count: summaries.length,
    reason: 'BOUND',
    metrics: { facts_used: summaries.length },
    summary: summaries.slice(0, 3).join(' · ')
  });
}

const PRIMARY_BINDERS = {
  'msa.measurement_system_registry': bindMeasurementSystemRegistry,
  'msa.gauge_inventory': bindGaugeInventory,
  'msa.variable_grr': bindVariableGrr,
  'msa.attribute_agreement': bindAttributeAgreement,
  'msa.bias_analysis': bindBiasAnalysis,
  'msa.linearity_analysis': bindLinearityAnalysis,
  'msa.stability_analysis': bindStabilityAnalysis,
  'msa.measurement_capability': bindMeasurementCapability,
  'msa.calibration_monitoring': bindCalibrationMonitoring,
  'msa.study_governance': bindStudyGovernance
};

function invokeMsaBlockBridge(blockId, signalBundle = {}, ctx = {}) {
  const canonical = MSA_BLOCK_ALIASES[blockId] || blockId;
  if (canonical === 'msa.contextual_msa_ai') {
    return bindContextualMsaAi(signalBundle, ctx._prior_bindings || []);
  }
  if (canonical === 'msa.msa_narrative') {
    return bindMsaNarrative(signalBundle, ctx._prior_bindings || []);
  }
  const fn = PRIMARY_BINDERS[canonical];
  if (!fn) {
    return _result(canonical, {
      engine_ok: false,
      binding_ok: false,
      dataset_used: null,
      signal_count: 0,
      reason: 'NOT_BOUND'
    });
  }
  return fn(signalBundle);
}

module.exports = {
  invokeMsaBlockBridge,
  PRIMARY_BINDERS
};
