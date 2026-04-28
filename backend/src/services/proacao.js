const db = require('../db');
const ai = require('./ai');
const documentContext = require('./documentContext');
const hierarchicalFilter = require('./hierarchicalFilter');
let lotService;
try { lotService = require('./rawMaterialLotDetectionService'); } catch (_) {}

const STATUS_FLOW = ['nova', 'analise', 'aprovacao', 'execucao', 'concluida', 'rejeitada'];
const STATUS_ALIAS = {
  submitted: 'nova',
  escalated: 'analise',
  assigned: 'execucao',
  done: 'concluida'
};
const PRIORIDADES = new Set(['baixa', 'media', 'alta']);

function normalizeStatus(status) {
  const raw = String(status || '').trim().toLowerCase();
  const mapped = STATUS_ALIAS[raw] || raw;
  return STATUS_FLOW.includes(mapped) ? mapped : 'nova';
}

function toLegacyStatus(status) {
  if (status === 'nova') return 'submitted';
  if (status === 'analise') return 'escalated';
  if (status === 'execucao') return 'assigned';
  if (status === 'concluida') return 'done';
  return null;
}

function normalizePrioridade(v) {
  const p = String(v || '').trim().toLowerCase();
  return PRIORIDADES.has(p) ? p : null;
}

function toNullableNumber(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function validatePayload(payload, opts = {}) {
  const { partial = false } = opts;
  const title = payload.titulo || payload.problem_category;
  const descricao = payload.descricao || payload.proposed_solution;
  if (!partial && !(title || '').trim()) throw new Error('Título obrigatório');
  if (!partial && !(descricao || '').trim()) throw new Error('Descrição obrigatória');
  if (payload.status != null && !STATUS_FLOW.includes(normalizeStatus(payload.status))) {
    throw new Error('Status inválido');
  }
  if (payload.prioridade != null && !normalizePrioridade(payload.prioridade)) {
    throw new Error('Prioridade inválida');
  }
  ['impacto_financeiro', 'reducao_tempo', 'reducao_perda', 'custo_implementacao', 'payback_meses', 'score_ia'].forEach((k) => {
    if (payload[k] != null && payload[k] !== '' && !Number.isFinite(Number(payload[k]))) {
      throw new Error(`Valor numérico inválido para ${k}`);
    }
  });
}

function canTransitStatus(fromStatus, toStatus) {
  if (toStatus === 'rejeitada') return true;
  const fromIdx = STATUS_FLOW.indexOf(fromStatus);
  const toIdx = STATUS_FLOW.indexOf(toStatus);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx === fromIdx || toIdx === fromIdx + 1;
}

function mapProposal(row) {
  if (!row) return row;
  return {
    ...row,
    status: normalizeStatus(row.status),
    status_legacy: row.status_legacy || toLegacyStatus(normalizeStatus(row.status))
  };
}

async function createProposal(payload){
  if (!payload.company_id) throw new Error('company_id é obrigatório');
  validatePayload(payload);
  const lotCode = (payload.lot_code || '').trim();
  if (lotService && lotCode && await lotService.isLotBlocked(payload.company_id, lotCode)) {
    throw new Error(`O lote ${lotCode} está bloqueado para produção. Entre em contato com a Qualidade.`);
  }
  const prioridade = normalizePrioridade(payload.prioridade);
  const status = normalizeStatus(payload.status || 'nova');
  const title = (payload.titulo || payload.problem_category || '').trim() || null;
  const description = (payload.descricao || payload.proposed_solution || '').trim() || null;
  const iaData = payload.ia_data || null;
  const q = `INSERT INTO proposals(
    company_id, reporter_id, reporter_name, location, equipment_id, problem_category, process_type, frequency,
    probable_causes, consequences, proposed_solution, expected_benefits, urgency, attachments, notes, lot_code,
    supplier_name, material_name, machine_used, operator_id, setor, prioridade, responsavel_id, impacto_financeiro,
    reducao_tempo, reducao_perda, custo_implementacao, payback_meses, score_ia, ia_sugerida, prazo, data_aprovacao,
    data_conclusao, anexos, status, titulo, descricao, descricao_enriquecida, observacoes_ia, operational_team_member_id
  ) VALUES(
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40
  ) RETURNING *`;
  const params = [
    payload.company_id, payload.reporter_id||null, payload.reporter_name||null, payload.location||null,
    payload.equipment_id||null, payload.problem_category||null, payload.process_type||null, payload.frequency||null,
    payload.probable_causes||null, payload.consequences||null, payload.proposed_solution||null, payload.expected_benefits||null,
    payload.urgency||null, payload.attachments||null, payload.notes||null,
    lotCode||null, payload.supplier_name||null, payload.material_name||null, payload.machine_used||null, payload.operator_id||null,
    payload.setor || payload.location || null, prioridade, payload.responsavel_id || null, toNullableNumber(payload.impacto_financeiro),
    toNullableNumber(payload.reducao_tempo), toNullableNumber(payload.reducao_perda), toNullableNumber(payload.custo_implementacao),
    toNullableNumber(payload.payback_meses), toNullableNumber(payload.score_ia), payload.ia_sugerida === true,
    payload.prazo || null, payload.data_aprovacao || null, payload.data_conclusao || null, payload.anexos || null,
    status, title, description, iaData?.descricao_melhorada || null, iaData?.observacoes || null,
    payload.operational_team_member_id || null
  ];
  const r = await db.query(q, params);
  const proposal = mapProposal(r.rows[0]);
  await db.query(
    'INSERT INTO proposal_actions(proposal_id, user_id, action, comment, metadata) VALUES($1,$2,$3,$4,$5)',
    [proposal.id, payload.reporter_id || null, 'status_change', null, { from: null, to: proposal.status }]
  );
  if (lotService && lotCode) {
    lotService.recordLotUsage(payload.company_id, {
      lot_code: lotCode,
      material_name: payload.material_name,
      supplier_name: payload.supplier_name,
      source_type: 'proposal',
      source_id: proposal.id,
      machine_used: payload.machine_used || payload.equipment_id,
      operator_id: payload.operator_id || payload.reporter_id,
      defect_count: 1,
      rework_count: 0
    }).catch((err) => {
      console.warn('[proacao][record_lot_usage]', err?.message ?? err);
    });
  }
  return proposal;
}

async function listProposals(limit = 200, companyId = null, scope = null, filters = {}) {
  if (!companyId) return [];
  const qLimit = Math.max(1, Math.min(500, Number(limit) || 200));
  const extra = [];
  const extraParams = [];
  if (filters.status) {
    extra.push(`p.status = $${extraParams.length + 1}`);
    extraParams.push(normalizeStatus(filters.status));
  }
  if (filters.setor) {
    extra.push(`LOWER(COALESCE(p.setor, p.location, '')) = $${extraParams.length + 1}`);
    extraParams.push(String(filters.setor).trim().toLowerCase());
  }
  if (filters.prioridade) {
    extra.push(`p.prioridade = $${extraParams.length + 1}`);
    extraParams.push(normalizePrioridade(filters.prioridade));
  }
  if (filters.responsavel_id) {
    extra.push(`p.responsavel_id = $${extraParams.length + 1}`);
    extraParams.push(filters.responsavel_id);
  }
  const extraWhere = extra.length ? ` AND ${extra.join(' AND ')}` : '';
  if (!scope || scope.isFullAccess) {
    const r = await db.query(
      `SELECT p.* FROM proposals p WHERE p.company_id=$1${extraWhere} ORDER BY p.created_at DESC LIMIT $${extraParams.length + 2}`,
      [companyId, ...extraParams, qLimit]
    );
    return r.rows.map(mapProposal);
  }
  const propFilter = hierarchicalFilter.buildProposalsFilter(scope, companyId);
  const r = await db.query(
    `SELECT p.* FROM proposals p WHERE ${propFilter.whereClause}${extraWhere} ORDER BY p.created_at DESC LIMIT $${propFilter.params.length + extraParams.length + 1}`,
    [...propFilter.params, ...extraParams, qLimit]
  );
  return r.rows.map(mapProposal);
}

async function getProposal(id, companyId = null, scope = null) {
  const params = companyId ? [id, companyId] : [id];
  const whereClause = companyId ? 'id=$1 AND company_id=$2' : 'id=$1';
  const r = await db.query(`SELECT * FROM proposals WHERE ${whereClause}`, params);
  if (r.rowCount === 0) return null;
  const p = mapProposal(r.rows[0]);
  if (scope && !scope.isFullAccess) {
    const inScope = (scope.allowedUserIds?.includes(p.reporter_id)) ||
      (scope.managedDepartmentIds?.length && p.department_id && scope.managedDepartmentIds.includes(p.department_id));
    if (!inScope) return null;
  }
  const actions = await db.query('SELECT * FROM proposal_actions WHERE proposal_id=$1 ORDER BY created_at', [id]);
  p.actions = actions.rows;
  return p;
}

async function enrichProposalWithIA(id, companyId, scope = null) {
  const p = await getProposal(id, companyId, scope);
  if (!p) throw new Error('Proposta não encontrada');
  const contexto = await documentContext.buildAIContext({
    companyId,
    queryText: `${p.titulo || ''}\n${p.descricao || p.proposed_solution || ''}`
  });
  const prompt = `Você é um engenheiro industrial especialista em melhoria contínua.
Analise a proposta abaixo e retorne um JSON técnico com:
titulo_melhorado, descricao_melhorada, setor, prioridade, impacto_financeiro, reducao_tempo, reducao_perda, custo_implementacao, payback_meses, score_ia, observacoes.
Se não houver dados suficientes, faça estimativas conservadoras.

PROPOSTA:
titulo: ${p.titulo || p.problem_category || ''}
descricao: ${p.descricao || p.proposed_solution || ''}
setor_atual: ${p.setor || p.location || ''}
prioridade_atual: ${p.prioridade || ''}

CONTEXTO:
${contexto || 'Sem contexto adicional.'}
`;
  let parsed = null;
  if (typeof ai.chatCompletion === 'function') {
    const raw = await ai.chatCompletion(prompt, { max_tokens: 1200, temperature: 0.2 });
    try {
      const jsonText = String(raw).replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(jsonText);
    } catch (_) {
      parsed = { observacoes: String(raw).slice(0, 4000) };
    }
  } else {
    parsed = { observacoes: 'IA indisponível no momento' };
  }
  const update = await db.query(
    `UPDATE proposals
      SET descricao_enriquecida = COALESCE($1, descricao_enriquecida),
          observacoes_ia = COALESCE($2, observacoes_ia),
          score_ia = COALESCE($3, score_ia),
          setor = COALESCE($4, setor),
          prioridade = COALESCE($5, prioridade),
          impacto_financeiro = COALESCE($6, impacto_financeiro),
          reducao_tempo = COALESCE($7, reducao_tempo),
          reducao_perda = COALESCE($8, reducao_perda),
          custo_implementacao = COALESCE($9, custo_implementacao),
          payback_meses = COALESCE($10, payback_meses),
          ia_sugerida = true
     WHERE id = $11 AND company_id = $12
     RETURNING *`,
    [
      parsed?.descricao_melhorada || null,
      parsed?.observacoes || null,
      toNullableNumber(parsed?.score_ia),
      parsed?.setor || null,
      normalizePrioridade(parsed?.prioridade),
      toNullableNumber(parsed?.impacto_financeiro),
      toNullableNumber(parsed?.reducao_tempo),
      toNullableNumber(parsed?.reducao_perda),
      toNullableNumber(parsed?.custo_implementacao),
      toNullableNumber(parsed?.payback_meses),
      id,
      companyId
    ]
  );
  await db.query(
    'INSERT INTO proposal_actions(proposal_id, action, metadata) VALUES($1,$2,$3)',
    [id, 'ai_enriched', parsed]
  );
  return { proposal: mapProposal(update.rows[0]), ia: parsed };
}

async function aiEvaluateProposal(id, companyId, scope = null){
  const p = await getProposal(id, companyId, scope);
  if(!p) throw new Error('Proposta não encontrada');
  const coId = p.company_id || null;
  const docContext = await documentContext.buildAIContext({ companyId: coId, queryText: p.proposed_solution || '' });
  const promptBase = `Avalie a proposta de melhoria (Pró-Ação): Setor:${p.location} Categoria:${p.problem_category} Descrição:${p.proposed_solution}`;
  const fullPrompt = docContext ? `${promptBase}\n\n${docContext}\n\nGere avaliação priorizada (viabilidade, impacto, esforço) em conformidade com a política Impetus e documentação da empresa.` : promptBase;
  let evaluation = { note: 'IA não configurada' };
  try{
    if(typeof ai.chatCompletion === 'function'){
      const report = await ai.chatCompletion(fullPrompt, { max_tokens: 600 });
      evaluation = { report };
    } else if(typeof ai.generateDiagnosticReport === 'function'){
      const report = await ai.generateDiagnosticReport(promptBase, [], docContext);
      evaluation = { report };
    } else {
      evaluation = { report: 'IA não disponível - revisão humana necessária' };
    }
  }catch(err){
    evaluation = { report: 'Erro: '+err.message };
  }
  await db.query('UPDATE proposals SET ai_score=$1 WHERE id=$2', [toNullableNumber(evaluation?.score_ia) || null, id]);
  await db.query('INSERT INTO proposal_actions(proposal_id, action, metadata) VALUES($1,$2,$3)', [id, 'evaluated', evaluation]);
  return evaluation;
}

async function escalateToProjects(id, comment, escalated_by, companyId, scope = null){
  await updateProposalStatus(id, 'analise', escalated_by, companyId, scope, comment || null);
  await db.query('INSERT INTO proposal_actions(proposal_id, user_id, action, comment) VALUES($1,$2,$3,$4)', [id, escalated_by||null, 'escalated', comment||null]);
  return true;
}

async function assignToAdministrative(id, admin_sector, assigned_by, team, companyId){
  const p = await getProposal(id, companyId);
  if (!p) throw new Error('Proposta não encontrada');
  await updateProposalStatus(id, 'execucao', assigned_by, companyId, null, null);
  const meta = { admin_sector, team };
  await db.query('INSERT INTO proposal_actions(proposal_id, user_id, action, metadata) VALUES($1,$2,$3,$4)', [id, assigned_by||null, 'assigned', meta]);
  return true;
}

async function recordPhaseData(id, phaseNumber, collectedData, userId, companyId, scope = null){
  const p = await getProposal(id, companyId, scope);
  if (!p) throw new Error('Proposta não encontrada');
  const comment = `phase_${phaseNumber}_data`;
  await db.query('INSERT INTO proposal_actions(proposal_id, user_id, action, comment, metadata) VALUES($1,$2,$3,$4,$5)', [id, userId||null, comment, null, collectedData]);
  return true;
}

async function finalizeProposal(id, finalReport, closedBy, companyId, scope = null){
  await updateProposalStatus(id, 'concluida', closedBy, companyId, scope, null);
  await db.query('INSERT INTO proposal_actions(proposal_id, user_id, action, comment, metadata) VALUES($1,$2,$3,$4,$5)', [id, closedBy||null, 'done', null, finalReport||null]);
  return true;
}

async function updateProposal(id, patch, companyId, scope = null) {
  const current = await getProposal(id, companyId, scope);
  if (!current) throw new Error('Proposta não encontrada');
  validatePayload(patch, { partial: true });
  const next = {
    titulo: patch.titulo ?? current.titulo ?? current.problem_category,
    descricao: patch.descricao ?? current.descricao ?? current.proposed_solution,
    setor: patch.setor ?? current.setor ?? current.location,
    prioridade: patch.prioridade != null ? normalizePrioridade(patch.prioridade) : current.prioridade,
    responsavel_id: patch.responsavel_id ?? current.responsavel_id,
    impacto_financeiro: patch.impacto_financeiro ?? current.impacto_financeiro,
    reducao_tempo: patch.reducao_tempo ?? current.reducao_tempo,
    reducao_perda: patch.reducao_perda ?? current.reducao_perda,
    custo_implementacao: patch.custo_implementacao ?? current.custo_implementacao,
    payback_meses: patch.payback_meses ?? current.payback_meses,
    prazo: patch.prazo ?? current.prazo,
    anexos: patch.anexos ?? current.anexos
  };
  const r = await db.query(
    `UPDATE proposals SET
      titulo=$1, descricao=$2, setor=$3, prioridade=$4, responsavel_id=$5,
      impacto_financeiro=$6, reducao_tempo=$7, reducao_perda=$8, custo_implementacao=$9,
      payback_meses=$10, prazo=$11, anexos=$12
     WHERE id=$13 AND company_id=$14
     RETURNING *`,
    [
      next.titulo || null,
      next.descricao || null,
      next.setor || null,
      next.prioridade || null,
      next.responsavel_id || null,
      toNullableNumber(next.impacto_financeiro),
      toNullableNumber(next.reducao_tempo),
      toNullableNumber(next.reducao_perda),
      toNullableNumber(next.custo_implementacao),
      toNullableNumber(next.payback_meses),
      next.prazo || null,
      next.anexos || null,
      id,
      companyId
    ]
  );
  await db.query('INSERT INTO proposal_actions(proposal_id, action, metadata) VALUES($1,$2,$3)', [id, 'updated', patch]);
  return mapProposal(r.rows[0]);
}

async function updateProposalStatus(id, toStatusRaw, userId, companyId, scope = null, comment = null) {
  const current = await getProposal(id, companyId, scope);
  if (!current) throw new Error('Proposta não encontrada');
  const fromStatus = normalizeStatus(current.status);
  const toStatus = normalizeStatus(toStatusRaw);
  if (!canTransitStatus(fromStatus, toStatus)) {
    throw new Error(`Transição inválida de status: ${fromStatus} -> ${toStatus}`);
  }
  const dataAprovacao = toStatus === 'aprovacao' && !current.data_aprovacao ? new Date() : current.data_aprovacao;
  const dataConclusao = toStatus === 'concluida' && !current.data_conclusao ? new Date() : current.data_conclusao;
  const r = await db.query(
    `UPDATE proposals SET status=$1, data_aprovacao=$2, data_conclusao=$3 WHERE id=$4 AND company_id=$5 RETURNING *`,
    [toStatus, dataAprovacao, dataConclusao, id, companyId]
  );
  await db.query(
    'INSERT INTO proposal_actions(proposal_id, user_id, action, comment, metadata) VALUES($1,$2,$3,$4,$5)',
    [id, userId || null, 'status_change', comment, { from: fromStatus, to: toStatus }]
  );
  return mapProposal(r.rows[0]);
}

async function getProacaoSummary(companyId, scope = null) {
  const list = await listProposals(500, companyId, scope);
  const summary = {
    total_propostas: list.length,
    em_analise: 0,
    em_execucao: 0,
    concluidas: 0,
    economia_potencial_total: 0,
    economia_concluida: 0
  };
  list.forEach((p) => {
    if (p.status === 'analise' || p.status === 'aprovacao') summary.em_analise += 1;
    if (p.status === 'execucao') summary.em_execucao += 1;
    if (p.status === 'concluida') summary.concluidas += 1;
    summary.economia_potencial_total += Number(p.impacto_financeiro || 0);
    if (p.status === 'concluida') summary.economia_concluida += Number(p.impacto_financeiro || 0);
  });
  return summary;
}

async function getResponsibles(companyId) {
  const r = await db.query(
    `SELECT id, name, role
       FROM users
      WHERE company_id = $1
      ORDER BY name
      LIMIT 300`,
    [companyId]
  );
  return r.rows;
}

module.exports = {
  createProposal,
  listProposals,
  getProposal,
  updateProposal,
  updateProposalStatus,
  aiEvaluateProposal,
  enrichProposalWithIA,
  escalateToProjects,
  assignToAdministrative,
  recordPhaseData,
  finalizeProposal,
  getProacaoSummary,
  getResponsibles,
  normalizeStatus
};
