const db = require('../db');
const ai = require('./ai');
const documentContext = require('./documentContext');
const hierarchicalFilter = require('./hierarchicalFilter');
let lotService;
try { lotService = require('./rawMaterialLotDetectionService'); } catch (_) {}

async function createProposal(payload){
  if (!payload.company_id) throw new Error('company_id é obrigatório');
  const lotCode = (payload.lot_code || '').trim();
  if (lotService && lotCode && await lotService.isLotBlocked(payload.company_id, lotCode)) {
    throw new Error(`O lote ${lotCode} está bloqueado para produção. Entre em contato com a Qualidade.`);
  }
  const q = `INSERT INTO proposals(company_id, reporter_id, reporter_name, location, equipment_id, problem_category, process_type, frequency, probable_causes, consequences, proposed_solution, expected_benefits, urgency, attachments, notes, lot_code, supplier_name, material_name, machine_used, operator_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`;
  const params = [
    payload.company_id, payload.reporter_id||null, payload.reporter_name||null, payload.location||null,
    payload.equipment_id||null, payload.problem_category||null, payload.process_type||null, payload.frequency||null,
    payload.probable_causes||null, payload.consequences||null, payload.proposed_solution||null, payload.expected_benefits||null,
    payload.urgency||null, payload.attachments||null, payload.notes||null,
    lotCode||null, payload.supplier_name||null, payload.material_name||null, payload.machine_used||null, payload.operator_id||null
  ];
  const r = await db.query(q, params);
  const proposal = r.rows[0];
  await db.query('INSERT INTO proposal_actions(proposal_id, action, comment) VALUES($1,$2,$3)', [proposal.id, 'submitted', null]);
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
    }).catch(() => {});
  }
  return proposal;
}

async function listProposals(limit = 200, companyId = null, scope = null) {
  if (!companyId) return [];
  if (!scope || scope.isFullAccess) {
    const r = await db.query('SELECT * FROM proposals WHERE company_id=$1 ORDER BY created_at DESC LIMIT $2', [companyId, limit]);
    return r.rows;
  }
  const propFilter = hierarchicalFilter.buildProposalsFilter(scope, companyId);
  const r = await db.query(
    `SELECT * FROM proposals p WHERE ${propFilter.whereClause} ORDER BY p.created_at DESC LIMIT $${propFilter.paramOffset}`,
    [...propFilter.params, limit]
  );
  return r.rows;
}

async function getProposal(id, companyId = null, scope = null) {
  const params = companyId ? [id, companyId] : [id];
  const whereClause = companyId ? 'id=$1 AND company_id=$2' : 'id=$1';
  const r = await db.query(`SELECT * FROM proposals WHERE ${whereClause}`, params);
  if (r.rowCount === 0) return null;
  const p = r.rows[0];
  if (scope && !scope.isFullAccess) {
    const inScope = (scope.allowedUserIds?.includes(p.reporter_id)) ||
      (scope.managedDepartmentIds?.length && p.department_id && scope.managedDepartmentIds.includes(p.department_id));
    if (!inScope) return null;
  }
  const actions = await db.query('SELECT * FROM proposal_actions WHERE proposal_id=$1 ORDER BY created_at', [id]);
  p.actions = actions.rows;
  return p;
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
  await db.query('UPDATE proposals SET ai_score=$1 WHERE id=$2', [evaluation, id]);
  await db.query('INSERT INTO proposal_actions(proposal_id, action, metadata) VALUES($1,$2,$3)', [id, 'evaluated', evaluation]);
  return evaluation;
}

async function escalateToProjects(id, comment, escalated_by, companyId, scope = null){
  const p = await getProposal(id, companyId, scope);
  if (!p) throw new Error('Proposta não encontrada');
  await db.query('UPDATE proposals SET status=$1 WHERE id=$2 AND company_id=$3', ['escalated', id, companyId]);
  await db.query('INSERT INTO proposal_actions(proposal_id, user_id, action, comment) VALUES($1,$2,$3,$4)', [id, escalated_by||null, 'escalated', comment||null]);
  return true;
}

async function assignToAdministrative(id, admin_sector, assigned_by, team, companyId){
  const p = await getProposal(id, companyId);
  if (!p) throw new Error('Proposta não encontrada');
  await db.query('UPDATE proposals SET status=$1 WHERE id=$2 AND company_id=$3', ['assigned', id, companyId]);
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
  const p = await getProposal(id, companyId, scope);
  if (!p) throw new Error('Proposta não encontrada');
  await db.query('UPDATE proposals SET status=$1 WHERE id=$2 AND company_id=$3', ['done', id, companyId]);
  await db.query('INSERT INTO proposal_actions(proposal_id, user_id, action, comment, metadata) VALUES($1,$2,$3,$4,$5)', [id, closedBy||null, 'done', null, finalReport||null]);
  return true;
}

module.exports = { createProposal, listProposals, getProposal, aiEvaluateProposal, escalateToProjects, assignToAdministrative, recordPhaseData, finalizeProposal };
