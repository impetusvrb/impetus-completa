'use strict';

const policy = require('../governance/actionToolPolicyRegistry');

function buildExplanation(toolName, args, ctx = {}) {
  const p = policy.getToolPolicy(toolName);
  const safeArgs = { ...args };
  delete safeArgs.password;
  delete safeArgs.token;

  const lines = [
    p.explain_template,
    `Ferramenta: ${toolName}`,
    `Categoria: ${p.category}`,
    `Risco: ${p.risk}`,
    `Aprovação humana: ${p.require_approval ? 'obrigatória' : 'não necessária (leitura)'}`,
  ];

  if (args.titulo) lines.push(`Título: ${String(args.titulo).slice(0, 200)}`);
  if (args.tarefa_id) lines.push(`Tarefa: ${args.tarefa_id}`);
  if (ctx.conversationId) lines.push(`Conversa: ${ctx.conversationId}`);

  return {
    summary: lines[0],
    detail: lines.join('\n'),
    risk_level: p.risk,
    requires_approval: policy.requiresApproval(toolName),
    policy: p,
    args_preview: safeArgs,
    requested_by: ctx.userId || null,
    ts: new Date().toISOString()
  };
}

module.exports = { buildExplanation };
