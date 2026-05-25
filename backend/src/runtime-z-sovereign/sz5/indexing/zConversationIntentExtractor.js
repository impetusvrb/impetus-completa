'use strict';

const INDUSTRIAL = Object.freeze({
  meeting: /\b(reuni[aã]o|meeting|call|videoconfer[eê]ncia|stand-?up)\b/i,
  turnover: /\b(turnover|rotatividade|demiss[aã]o|desligamento)\b/i,
  perdas: /\b(perdas|perda|scrap|refugo)\b/i,
  manutencao: /\b(manuten[cç][aã]o|mec[aâ]nico|parada|m[aá]quina)\b/i,
  capa: /\b(capa|n[aã]o\s+conform|nc\b)\b/i,
  incidente: /\b(incidente|acidente|emerg[eê]ncia)\b/i,
  nr12: /\b(nr\s*12|seguran[cç]a\s+do\s+trabalho)\b/i,
  auditoria: /\b(auditoria|auditar)\b/i,
  followup: /\b(follow[- ]?up|acompanhar|retorno)\b/i,
  tarefa: /\b(entregar|relat[oó]rio|documento|enviar|preparar)\b/i,
  aprovacao: /\b(aprovar|aprova[cç][aã]o|validar)\b/i,
  escalonamento: /\b(escalar|supervisor|diretor)\b/i,
  urgente: /\b(urgente|cr[ií]tico|imediato)\b/i
});

function extractIntent(text = '') {
  const t = String(text).trim();
  const domains = [];
  for (const [k, re] of Object.entries(INDUSTRIAL)) {
    if (re.test(t)) domains.push(k);
  }
  let workflow_type = 'informational';
  if (domains.includes('meeting')) workflow_type = 'meeting';
  else if (domains.includes('tarefa')) workflow_type = 'task';
  else if (domains.includes('incidente') || domains.includes('urgente')) workflow_type = 'incident';
  else if (domains.includes('manutencao')) workflow_type = 'maintenance';
  else if (domains.includes('capa')) workflow_type = 'quality';
  else if (domains.includes('followup')) workflow_type = 'followup';

  return {
    intent: workflow_type === 'meeting' ? 'schedule_meeting' : workflow_type === 'task' ? 'task_request' : 'inform',
    workflow_type,
    operational_domains: domains,
    requires_followup: domains.includes('followup') || domains.includes('tarefa'),
    requires_reminder: /\b(amanh[aã]|hoje|prazo|at[eé]\s+\d|às\s+\d)/i.test(t),
    requires_escalation: domains.includes('escalonamento') || domains.includes('urgente')
  };
}

module.exports = { extractIntent, INDUSTRIAL };
