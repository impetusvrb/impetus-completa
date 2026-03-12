const db = require('../db');
const ai = require('./ai');
const documentContext = require('./documentContext');

const DIAGNOSTIC_QUESTIONS = [
  'Quando o problema começou? (data/hora)',
  'Descreva o comportamento detalhado (sons, cheiros, temperatura).',
  'Qual a frequência (1x/dia, 2-3x/dia, semanal, ocasional)?',
  'Existe código de erro ou número do equipamento (modelo)?',
  'Envolve energia elétrica ou fluidos sob pressão? (segurança)',
  'Você pode anexar foto/vídeo/áudio?'
];

async function ensureSufficientDetail(text){
  if(!text || text.trim().length<40) return { ok:false, reason:'short', questions: DIAGNOSTIC_QUESTIONS };
  const keywords=['vaza','não liga','parou','ruído','queima','falha','erro','superaquec','vazamento','queda','trava'];
  const low=(text||'').toLowerCase();
  const has = keywords.some(k=> low.includes(k));
  if(!has) return { ok:false, reason:'no_symptom_keyword', questions: DIAGNOSTIC_QUESTIONS };
  return { ok:true };
}

async function searchManuals(text, companyId = null){
  return documentContext.searchCompanyManuals(companyId, text, 8).then(rows =>
    rows.map(r => ({ id: r.id, chunk_text: r.chunk_text, title: r.title, distance: r.distance }))
  ).catch(() => []);
}

async function createDiagnosticRecord(request){
  const q = `INSERT INTO proposal_actions(proposal_id, action, comment, metadata) VALUES($1,$2,$3,$4) RETURNING *`;
  const params = [request.proposal_id||null,'diagnostic_generated',null,request];
  const r = await db.query(q, params);
  return r.rows[0];
}

async function runDiagnostic(request){
  const companyId = request.company_id || null;
  const check = await ensureSufficientDetail(request.text);
  if(!check.ok){
    return { status:'need_more_info', questions: DIAGNOSTIC_QUESTIONS };
  }
  const candidates = await searchManuals(request.text, companyId);
  // Safety mode: confiança baixa quando poucos trechos ou distância alta (pouca similaridade)
  const CONFIDENCE_THRESHOLD = 0.5;
  const avgDistance = candidates.length ? candidates.reduce((s,c) => s + (c.distance || 1), 0) / candidates.length : 1;
  if (candidates.length < 2 || avgDistance > CONFIDENCE_THRESHOLD) {
    return { status: 'need_more_info', questions: DIAGNOSTIC_QUESTIONS, reason: 'low_confidence' };
  }
  const docContext = await documentContext.buildAIContext({ companyId, queryText: request.text });
  let report = null;
  try{
    if(ai && ai.generateDiagnosticReport){
      report = await ai.generateDiagnosticReport(request.text, candidates, docContext);
    } else if(ai && ai.chatCompletion){
      const localCtx = candidates.map((c,i)=>`[${i+1}] Manual: ${(c.title||'manual')}\n${(c.chunk_text||'').slice(0,400)}`).join('\n---\n');
      const prompt = `Você é um assistente técnico.${docContext ? '\n' + docContext : ''}

Recebeu o relato: "${request.text}"

Contexto dos manuais (cite SEMPRE a fonte):
${localCtx}

Gere: 1) causas (cite [Manual: título]), 2) passos de verificação, 3) checklist de segurança, 4) referências explícitas. Cite a fonte ao usar informação dos manuais. Conformidade Impetus e documentação interna.`;
      report = await ai.chatCompletion(prompt);
    } else {
      const context = candidates.map((c,i)=>`[${i+1}] ${c.title}: ${(c.chunk_text||'').slice(0,200)}`).join('\n');
      report = `IA não configurada. Trechos relevantes:\n${context}`;
    }
  }catch(err){
    report = 'Erro ao gerar relatório: '+ err.message;
  }
  const rec = await createDiagnosticRecord({ proposal_id: request.proposal_id||null, reporter: request.reporter||null, text: request.text, report, references: candidates });
  return { status:'ok', diagnostic_id: rec.id, report, references: candidates };
}

module.exports = { runDiagnostic, ensureSufficientDetail, searchManuals };
