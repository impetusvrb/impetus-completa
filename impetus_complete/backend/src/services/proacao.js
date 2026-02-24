const db = require('../db');
const ai = require('./ai');
const documentContext = require('./documentContext');

async function createProposal(payload){
  if (!payload.company_id) throw new Error('company_id é obrigatório');
  const q = `INSERT INTO proposals(company_id, reporter_id, reporter_name, location, equipment_id, problem_category, process_type, frequency, probable_causes, consequences, proposed_solution, expected_benefits, urgency, attachments, notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`;
  const params = [payload.company_id,payload.reporter_id||null,payload.reporter_name||null,payload.location||null,payload.equipment_id||null,payload.problem_category||null,payload.process_type||null,payload.frequency||null,payload.probable_causes||null,payload.consequences||null,payload.proposed_solution||null,payload.expected_benefits||null,payload.urgency||null,payload.attachments||null,payload.notes||null];
  const r = await db.query(q, params);
  const proposal = r.rows[0];
  await db.query('INSERT INTO proposal_actions(proposal_id, action, comment) VALUES($1,$2,$3)', [proposal.id, 'submitted', null]);
  return proposal;
}

async function listProposals(limit=200, companyId=null){
  if (!companyId) return [];
  const r = await db.query('SELECT * FROM proposals WHERE company_id=$1 ORDER BY created_at DESC LIMIT $2', [companyId, limit]);
  return r.rows;
}

async function getProposal(id, companyId=null){
  const params = companyId ? [id, companyId] : [id];
  const whereClause = companyId ? 'id=$1 AND company_id=$2' : 'id=$1';
  const r = await db.query(`SELECT * FROM proposals WHERE ${whereClause}`, params);
  if(r.rowCount===0) return null;
  const p = r.rows[0];
  const actions = await db.query('SELECT * FROM proposal_actions WHERE proposal_id=$1 ORDER BY created_at', [id]);
  p.actions = actions.rows;
  return p;
}

async function aiEvaluateProposal(id, companyId){
  const p = await getProposal(id, companyId);
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

async function escalateToProjects(id, comment, escalated_by, companyId){
  const p = await getProposal(id, companyId);
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

async function recordPhaseData(id, phaseNumber, collectedData, userId, companyId){
  const p = await getProposal(id, companyId);
  if (!p) throw new Error('Proposta não encontrada');
  const comment = `phase_${phaseNumber}_data`;
  await db.query('INSERT INTO proposal_actions(proposal_id, user_id, action, comment, metadata) VALUES($1,$2,$3,$4,$5)', [id, userId||null, comment, null, collectedData]);
  return true;
}

async function finalizeProposal(id, finalReport, closedBy, companyId){
  const p = await getProposal(id, companyId);
  if (!p) throw new Error('Proposta não encontrada');
  await db.query('UPDATE proposals SET status=$1 WHERE id=$2 AND company_id=$3', ['done', id, companyId]);
  await db.query('INSERT INTO proposal_actions(proposal_id, user_id, action, comment, metadata) VALUES($1,$2,$3,$4,$5)', [id, closedBy||null, 'done', null, finalReport||null]);
  return true;
}

module.exports = { createProposal, listProposals, getProposal, aiEvaluateProposal, escalateToProjects, assignToAdministrative, recordPhaseData, finalizeProposal };
