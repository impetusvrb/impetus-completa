'use strict';

/**
 * GF-019 — Cenário piloto operacional Ishikawa (enablement, sem alterar runtime).
 */
const db = require('../../../db');
const investigationService = require('./ishikawaInvestigationService');
const fishboneService = require('./ishikawaFishboneService');
const { ISHIKAWA_INVESTIGATION_STATUS } = require('../semantics/ishikawaCoreSemantics');
const { ISHIKAWA_WORKFLOW_ACTION } = require('../workflow/ishikawaWorkflowEngine');

const PILOT_SCENARIOS = Object.freeze([
  {
    code: 'DIM',
    title: 'Defeito dimensional — tolerância fora de spec',
    problem_statement: 'Peças com diâmetro fora de tolerância na linha 2',
    categories: ['MEASUREMENT', 'METHOD', 'MACHINE'],
    root_category: 'MEASUREMENT'
  },
  {
    code: 'ASM',
    title: 'Defeito de montagem — parafuso faltante',
    problem_statement: 'Unidades entregues sem fixação completa',
    categories: ['MAN', 'METHOD'],
    root_category: 'MAN'
  },
  {
    code: 'WLD',
    title: 'Defeito de soldagem — porosidade',
    problem_statement: 'Solda com poros visíveis em junta crítica',
    categories: ['MACHINE', 'METHOD', 'MAN'],
    root_category: 'METHOD'
  },
  {
    code: 'CAL',
    title: 'Falha de calibração — drift do instrumento',
    problem_statement: 'Paquímetro fora de calibração na inspeção final',
    categories: ['MEASUREMENT', 'MACHINE'],
    root_category: 'MEASUREMENT'
  },
  {
    code: 'OPR',
    title: 'Erro operacional — procedimento não seguido',
    problem_statement: 'Operador omitiu etapa de verificação in-process',
    categories: ['MAN', 'METHOD'],
    root_category: 'MAN'
  },
  {
    code: 'SUP',
    title: 'Falha de fornecedor — lote não conforme',
    problem_statement: 'Matéria-prima recebida fora de certificado',
    categories: ['MATERIAL', 'METHOD'],
    root_category: 'MATERIAL',
    supplier_ref: true
  },
  {
    code: 'CNT',
    title: 'Contaminação de material — particulado',
    problem_statement: 'Contaminante detectado em linha de pintura',
    categories: ['MATERIAL', 'MOTHER_NATURE', 'METHOD'],
    root_category: 'MATERIAL'
  },
  {
    code: 'ENV',
    title: 'Problema ambiental — humidade elevada',
    problem_statement: 'Umidade acima do limite na área de montagem',
    categories: ['MOTHER_NATURE', 'MEASUREMENT'],
    root_category: 'MOTHER_NATURE'
  },
  {
    code: 'PRC',
    title: 'Instabilidade de processo — variação Cpk',
    problem_statement: 'Capabilidade do processo abaixo do alvo por 3 turnos',
    categories: ['METHOD', 'MACHINE', 'MEASUREMENT'],
    root_category: 'METHOD'
  },
  {
    code: 'REC',
    title: 'Reincidência de não conformidade — NC-2024-088',
    problem_statement: 'Mesma NC reportada novamente após ação corretiva anterior',
    categories: ['METHOD', 'MAN', 'MATERIAL'],
    root_category: 'METHOD',
    verify: true
  }
]);

async function tryFindIntegrationRefs(companyId, suffix) {
  const refs = {
    quality_inspection_id: null,
    ppap_submission_id: null,
    msa_study_id: null,
    ncr_workflow_instance_id: null,
    capa_workflow_instance_id: null,
    supplier_ref: null,
    part_ref: `PART-${suffix}`
  };
  try {
    const q = await db.query(
      'SELECT id FROM quality_inspections WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
      [companyId]
    );
    refs.quality_inspection_id = q.rows[0]?.id || null;
  } catch {
    /* optional */
  }
  try {
    const p = await db.query(
      'SELECT id FROM ppap_submissions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
      [companyId]
    );
    refs.ppap_submission_id = p.rows[0]?.id || null;
  } catch {
    /* optional */
  }
  try {
    const m = await db.query(
      'SELECT id FROM msa_measurement_studies WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
      [companyId]
    );
    refs.msa_study_id = m.rows[0]?.id || null;
  } catch {
    /* optional */
  }
  return refs;
}

async function insertApprovalRecord(companyId, investigationId, approverName, decision = 'approved') {
  await db.query(
    `INSERT INTO ishikawa_investigation_approvals
      (id, company_id, investigation_id, approver_name, approver_role, decision, decided_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'quality_manager', $4, now())`,
    [companyId, investigationId, approverName, decision]
  );
}

async function runInvestigationToArchived(companyId, spec, { tag, userId, suffix, integrationRefs }) {
  const inv = await investigationService.createInvestigation(
    companyId,
    {
      title: spec.title,
      problem_statement: spec.problem_statement,
      effect_description: spec.title,
      investigation_number: `ISH-${suffix}-${spec.code}`,
      supplier_ref: spec.supplier_ref ? `SUP-${suffix}` : integrationRefs.supplier_ref,
      part_ref: integrationRefs.part_ref,
      quality_inspection_id: integrationRefs.quality_inspection_id,
      ppap_submission_id: integrationRefs.ppap_submission_id,
      msa_study_id: integrationRefs.msa_study_id
    },
    userId
  );

  await investigationService.addTeamMember(companyId, inv.id, {
    member_name: `${spec.code} Lead`,
    member_role: 'investigation_lead',
    is_lead: true
  });
  await investigationService.addTeamMember(companyId, inv.id, {
    member_name: 'Quality Engineer',
    member_role: 'quality_engineer'
  });

  for (const cat of spec.categories) {
    await fishboneService.addFishboneCause(companyId, inv.id, {
      category_key: cat,
      cause_text: `Causa ${cat} — ${spec.title}`,
      is_root_candidate: cat === spec.root_category
    });
  }

  await fishboneService.createFiveWhyAnalysis(companyId, inv.id, {
    answers: [
      `Porque ${spec.problem_statement.slice(0, 40)}`,
      'Controle insuficiente no processo',
      'Procedimento desatualizado',
      'Treinamento incompleto',
      `Causa raiz: falha em ${spec.root_category}`
    ]
  });

  await investigationService.addEvidence(companyId, inv.id, {
    evidence_type: 'observation',
    description: `Evidência operacional — ${spec.code}`,
    source_ref: `ref://${tag}/${suffix}/${spec.code}/evidence`
  });

  await investigationService.addAttachedDocument(companyId, inv.id, {
    document_name: `${spec.title} — Relatório`,
    document_ref: `ref://${tag}/${suffix}/${spec.code}/report.pdf`,
    mime_type: 'application/pdf'
  });

  let cur = inv;
  cur = await investigationService.runWorkflowAction(companyId, cur.id, ISHIKAWA_WORKFLOW_ACTION.START, { userId });
  cur = await investigationService.runWorkflowAction(companyId, cur.id, ISHIKAWA_WORKFLOW_ACTION.DEFINE_ROOT_CAUSE, {
    userId,
    root_cause_summary: `Causa raiz (${spec.root_category}): ${spec.problem_statement}`
  });

  await investigationService.addCorrectiveAction(companyId, cur.id, {
    action_title: `AC-${spec.code}`,
    action_description: `Ação corretiva para ${spec.title}`,
    responsible_name: 'Pilot Quality Team'
  });

  await investigationService.addPreventiveAction(companyId, cur.id, {
    action_title: `AP-${spec.code}`,
    action_description: `Ação preventiva para ${spec.title}`,
    responsible_name: 'Pilot Process Owner'
  });

  cur = await investigationService.runWorkflowAction(companyId, cur.id, ISHIKAWA_WORKFLOW_ACTION.PLAN_ACTIONS, { userId });
  cur = await investigationService.runWorkflowAction(companyId, cur.id, ISHIKAWA_WORKFLOW_ACTION.SUBMIT_APPROVAL, { userId });

  await insertApprovalRecord(companyId, cur.id, 'Pilot Quality Manager', 'approved');
  cur = await investigationService.approveInvestigation(companyId, cur.id, { userId });
  cur = await investigationService.runWorkflowAction(companyId, cur.id, ISHIKAWA_WORKFLOW_ACTION.CLOSE, { userId });

  await investigationService.addVerificationResult(companyId, cur.id, {
    verification_method: 'effectiveness_check',
    result_summary: `Verificação ${spec.code} — eficaz`,
    effective: true,
    verified_at: new Date().toISOString()
  });

  cur = await investigationService.runWorkflowAction(companyId, cur.id, ISHIKAWA_WORKFLOW_ACTION.ARCHIVE, { userId });

  if (cur.status !== ISHIKAWA_INVESTIGATION_STATUS.ARCHIVED) {
    throw new Error(`pilot workflow failed: expected ARCHIVED, got ${cur.status}`);
  }

  return cur;
}

/**
 * Executa 10 investigações piloto cobrindo cenários típicos de qualidade.
 */
async function runIshikawaPilotScenario(companyId, { tag = 'GF-019', userId = null } = {}) {
  const suffix = `${tag}-${Date.now().toString(36)}`.toUpperCase();
  const integrationRefs = await tryFindIntegrationRefs(companyId, suffix);

  const investigations = [];
  for (const spec of PILOT_SCENARIOS) {
    const inv = await runInvestigationToArchived(companyId, spec, { tag, userId, suffix, integrationRefs });
    investigations.push({ ...spec, investigation: inv });
  }

  const primary = investigations[0];
  const detail = await investigationService.getInvestigationDetail(companyId, primary.investigation.id);

  return {
    companyId,
    tag,
    suffix,
    primaryInvestigationId: primary.investigation.id,
    primaryInvestigation: primary.investigation,
    detail,
    investigations,
    integrations: integrationRefs,
    scenario_count: PILOT_SCENARIOS.length
  };
}

module.exports = { runIshikawaPilotScenario, PILOT_SCENARIOS };
