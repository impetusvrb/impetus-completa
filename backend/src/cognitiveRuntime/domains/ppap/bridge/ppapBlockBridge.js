'use strict';

const { PPAP_BLOCK_ALIASES } = require('../../../registry/ppapCognitiveBlockPack');

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

function bindSubmissionManagement(bundle) {
  const ds = bundle.datasets?.ppap_submissions;
  if (!ds?.available) {
    return _result('ppap.submission_management', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ppap_submissions',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const total = bundle.submissions?.total ?? 0;
  if (total === 0) {
    return _result('ppap.submission_management', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ppap_submissions',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const statusCounts = bundle.submissions?.status_counts || {};
  return _result('ppap.submission_management', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ppap_submissions',
    signal_count: total,
    reason: 'BOUND',
    metrics: { total, status_counts: statusCounts },
    summary: `Submissões observadas: ${total}`
  });
}

function bindSupplierApproval(bundle) {
  const ds = bundle.datasets?.ppap_approval_history;
  if (!ds?.available) {
    return _result('ppap.supplier_approval', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ppap_approval_history',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.elements?.approval_history?.count ?? 0;
  if (count === 0) {
    return _result('ppap.supplier_approval', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ppap_approval_history',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ppap.supplier_approval', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ppap_approval_history,ppap_submissions',
    signal_count: count,
    reason: 'BOUND',
    metrics: {
      approval_history_rows: count,
      suppliers_distinct: bundle.suppliers?.count ?? 0
    },
    summary: `Histórico aprovação: ${count} transições observadas`
  });
}

function bindDimensionalValidation(bundle) {
  const ds = bundle.datasets?.ppap_dimensional_results;
  if (!ds?.available) {
    return _result('ppap.dimensional_validation', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ppap_dimensional_results',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.elements?.dimensional?.count ?? 0;
  if (count === 0) {
    return _result('ppap.dimensional_validation', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ppap_dimensional_results',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ppap.dimensional_validation', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ppap_dimensional_results',
    signal_count: count,
    reason: 'BOUND',
    metrics: { dimensional_rows: count },
    summary: `Resultados dimensionais: ${count}`
  });
}

function bindMaterialCertification(bundle) {
  const ds = bundle.datasets?.ppap_material_certifications;
  if (!ds?.available) {
    return _result('ppap.material_certification', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ppap_material_certifications',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.elements?.material_certification?.count ?? 0;
  if (count === 0) {
    return _result('ppap.material_certification', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ppap_material_certifications',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ppap.material_certification', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ppap_material_certifications',
    signal_count: count,
    reason: 'BOUND',
    metrics: { certification_rows: count },
    summary: `Certificações material: ${count}`
  });
}

function bindProcessCapability(bundle) {
  const ds = bundle.datasets?.ppap_capability_studies;
  if (!ds?.available) {
    return _result('ppap.process_capability', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ppap_capability_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.elements?.capability?.count ?? 0;
  if (count === 0) {
    return _result('ppap.process_capability', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ppap_capability_studies',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ppap.process_capability', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ppap_capability_studies',
    signal_count: count,
    reason: 'BOUND',
    metrics: { capability_studies: count },
    summary: `Estudos capacidade: ${count}`
  });
}

function bindAppearanceApproval(bundle) {
  const ds = bundle.datasets?.ppap_appearance_approvals;
  if (!ds?.available) {
    return _result('ppap.appearance_approval', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ppap_appearance_approvals',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.elements?.appearance?.count ?? 0;
  if (count === 0) {
    return _result('ppap.appearance_approval', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ppap_appearance_approvals',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ppap.appearance_approval', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ppap_appearance_approvals',
    signal_count: count,
    reason: 'BOUND',
    metrics: { appearance_rows: count },
    summary: `Aprovações aparência: ${count}`
  });
}

function bindPerformanceValidation(bundle) {
  const ds = bundle.datasets?.ppap_performance_tests;
  if (!ds?.available) {
    return _result('ppap.performance_validation', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ppap_performance_tests',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.elements?.performance?.count ?? 0;
  if (count === 0) {
    return _result('ppap.performance_validation', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ppap_performance_tests',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ppap.performance_validation', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ppap_performance_tests',
    signal_count: count,
    reason: 'BOUND',
    metrics: { performance_tests: count },
    summary: `Testes desempenho: ${count}`
  });
}

function bindDocumentPackage(bundle) {
  const dsDocs = bundle.datasets?.ppap_attached_documents;
  const dsPsw = bundle.datasets?.ppap_psw_records;
  if (!dsDocs?.available && !dsPsw?.available) {
    return _result('ppap.document_package', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ppap_attached_documents,ppap_psw_records',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const docCount = bundle.elements?.documents?.count ?? 0;
  const pswCount = bundle.psw?.total ?? 0;
  const total = docCount + pswCount;
  if (total === 0) {
    return _result('ppap.document_package', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ppap_attached_documents,ppap_psw_records',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ppap.document_package', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ppap_attached_documents,ppap_psw_records',
    signal_count: total,
    reason: 'BOUND',
    metrics: { attached_documents: docCount, psw_records: pswCount },
    summary: `Documentos: ${docCount} · PSW: ${pswCount}`
  });
}

function bindEngineeringChange(bundle) {
  const ds = bundle.datasets?.ppap_engineering_changes;
  if (!ds?.available) {
    return _result('ppap.engineering_change', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ppap_engineering_changes',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const count = bundle.elements?.engineering_change?.count ?? 0;
  if (count === 0) {
    return _result('ppap.engineering_change', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ppap_engineering_changes',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ppap.engineering_change', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ppap_engineering_changes',
    signal_count: count,
    reason: 'BOUND',
    metrics: { ecn_rows: count },
    summary: `Alterações engenharia: ${count}`
  });
}

function bindCustomerRequirements(bundle) {
  const dsCustomers = bundle.datasets?.ppap_customers;
  if (!dsCustomers?.available) {
    return _result('ppap.customer_requirements', {
      engine_ok: false,
      binding_ok: false,
      dataset_used: 'ppap_customers',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  const customerCount = bundle.customers?.count ?? 0;
  const withCustomer = bundle.submissions?.integration_refs?.with_customer ?? 0;
  const total = customerCount + withCustomer;
  if (total === 0) {
    return _result('ppap.customer_requirements', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'ppap_customers,ppap_submissions',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ppap.customer_requirements', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'ppap_customers,ppap_submissions',
    signal_count: total,
    reason: 'BOUND',
    metrics: { customers: customerCount, submissions_with_customer: withCustomer },
    summary: `Clientes: ${customerCount} · submissões com cliente: ${withCustomer}`
  });
}

function bindContextualPpapAi(bundle, priorBindings = []) {
  const boundCount = priorBindings.filter((b) => b.binding_ok).length;
  if (boundCount === 0) {
    return _result('ppap.contextual_ppap_ai', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'bound_block_signals',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ppap.contextual_ppap_ai', {
    engine_ok: true,
    binding_ok: true,
    dataset_used: 'bound_block_signals',
    signal_count: boundCount,
    reason: 'BOUND',
    metrics: { blocks_with_data: boundCount },
    summary: `Blocos operacionais observados: ${boundCount}`
  });
}

function bindPpapNarrative(bundle, priorBindings = []) {
  const summaries = priorBindings.filter((b) => b.binding_ok && b.summary).map((b) => b.summary);
  if (summaries.length === 0) {
    return _result('ppap.ppap_narrative', {
      engine_ok: true,
      binding_ok: false,
      dataset_used: 'bound_block_summaries',
      signal_count: 0,
      reason: 'NO_DATASET'
    });
  }
  return _result('ppap.ppap_narrative', {
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
  'ppap.submission_management': bindSubmissionManagement,
  'ppap.supplier_approval': bindSupplierApproval,
  'ppap.dimensional_validation': bindDimensionalValidation,
  'ppap.material_certification': bindMaterialCertification,
  'ppap.process_capability': bindProcessCapability,
  'ppap.appearance_approval': bindAppearanceApproval,
  'ppap.performance_validation': bindPerformanceValidation,
  'ppap.document_package': bindDocumentPackage,
  'ppap.engineering_change': bindEngineeringChange,
  'ppap.customer_requirements': bindCustomerRequirements
};

function invokePpapBlockBridge(blockId, signalBundle = {}, ctx = {}) {
  const canonical = PPAP_BLOCK_ALIASES[blockId] || blockId;
  if (canonical === 'ppap.contextual_ppap_ai') {
    return bindContextualPpapAi(signalBundle, ctx._prior_bindings || []);
  }
  if (canonical === 'ppap.ppap_narrative') {
    return bindPpapNarrative(signalBundle, ctx._prior_bindings || []);
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
  invokePpapBlockBridge,
  PRIMARY_BINDERS
};
