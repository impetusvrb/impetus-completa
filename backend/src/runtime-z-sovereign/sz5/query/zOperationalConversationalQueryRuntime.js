'use strict';

const flags = require('../config/sz5FeatureFlags');
const persistence = require('../persistence/zConversationIndexPersistence');
const governance = require('../governance/zConversationalGovernanceRuntime');

function parseQueryIntent(queryText = '') {
  const q = String(queryText).toLowerCase();
  const out = {
    type: 'general',
    actor_name: null,
    temporal: null,
    workflow_type: null
  };
  if (/\b(reuni[aã]o|meeting|reuniões)\b/.test(q)) out.workflow_type = 'meeting';
  if (/\b(tarefa|tarefas|pendente)\b/.test(q)) out.workflow_type = 'task';
  if (/\b(incidente|incidentes)\b/.test(q)) out.workflow_type = 'incident';
  if (/\b(manuten[cç][aã]o|manutenção)\b/.test(q)) out.workflow_type = 'maintenance';
  if (/\b(follow[- ]?up|followup)\b/.test(q)) out.workflow_type = 'followup';
  if (/\b(workflows?|fluxo)\b/.test(q)) out.workflow_type = 'workflow';
  if (/\b(compromisso|compromissos|atrasad)\b/.test(q)) out.workflow_type = 'followup';
  if (/\b(perdas|relat[oó]rio)\b/.test(q)) out.workflow_type = 'task';
  if (/\b(turnover)\b/.test(q)) out.workflow_type = 'followup';
  if (/amanh/i.test(q)) out.temporal = 'tomorrow';
  if (/\bhoje\b/.test(q)) out.temporal = 'today';
  const actorMatch = q.match(/\b(?:do|da|de)\s+([a-zà-ú]+(?:\s+[a-zà-ú]+)?)\b/);
  if (actorMatch) out.actor_name = actorMatch[1].trim();
  const names = q.match(/\b(gustavo|wellington|maria|joão|pedro|carlos|ana)\w*\b/i);
  if (names) out.actor_name = names[0];
  if (/\bquem\b/.test(q)) out.type = 'actor_query';
  if (out.workflow_type || out.temporal || out.actor_name) {
    out.type = out.type === 'actor_query' ? 'actor_query' : 'operational_lookup';
  }
  if (/\bhá\b/.test(q) && (out.workflow_type || out.temporal)) out.type = 'temporal_query';
  return out;
}

function formatFactLines(hits = []) {
  return hits.map((h) => {
    const rec = h.index_record || {};
    const actors = (rec.actors || []).map((a) => a.name).filter(Boolean).join(' e ');
    const when = (rec.temporal_markers || []).map((t) => t.raw).join(', ') || '—';
    return {
      message_id: h.message_id,
      thread_id: h.thread_id,
      actors,
      workflow_type: rec.workflow_type,
      intent: rec.intent,
      temporal: when,
      excerpt: String(h.content_snapshot || '').slice(0, 280),
      indexed_at: h.indexed_at
    };
  });
}

function buildSovereignAnswer(queryText, facts = []) {
  if (!facts.length) {
    return {
      found: false,
      answer_pt: 'Não encontrei factos operacionais conversacionais indexados para esta pergunta no seu âmbito de acesso.',
      facts: []
    };
  }
  const f0 = facts[0];
  const more = facts.length > 1 ? ` Mais ${facts.length - 1} registo(s) relacionado(s).` : '';
  const answer = `Identifiquei conversa(s) recente(s) com ${f0.actors || 'colaboradores'} ` +
    `relacionada(s) a ${f0.workflow_type || 'evento operacional'}` +
    (f0.temporal && f0.temporal !== '—' ? ` (${f0.temporal})` : '') +
    `: «${f0.excerpt}».` +
    ` O evento está no fluxo operacional conversacional indexado pelo Runtime Z.` +
    more;
  return { found: true, answer_pt: answer, facts };
}

async function queryOperationalConversation(user, queryText = '', opts = {}) {
  if (!flags.isEnabled() || !flags.isQueryRuntimeEnabled()) {
    return { ok: false, skipped: true };
  }

  const access = governance.assertChatAccess(user);
  if (!access.ok) {
    return { ok: false, scope_denied: true, denial_reason: access.reason };
  }

  const parsed = parseQueryIntent(queryText);
  const filters = {
    q: opts.forceTextSearch ? queryText.slice(0, 200) : null,
    actor_name: parsed.actor_name,
    workflow_type: parsed.workflow_type,
    temporal: parsed.temporal,
    thread_id: opts.threadId || null
  };

  if (!filters.q && !filters.actor_name && !filters.workflow_type && !filters.temporal) {
    filters.q = queryText.slice(0, 120);
  }

  const hits = await persistence.searchIndexedMessages(
    user.company_id,
    user.id,
    filters,
    opts.limit || 15
  );

  const governed = governance.filterHitsByGovernance(user, hits);
  const facts = formatFactLines(governed);
  const answer = buildSovereignAnswer(queryText, facts);

  return {
    ok: true,
    parsed,
    hit_count: facts.length,
    facts,
    answer,
    retrieval_hit: facts.length > 0,
    facts_before_llm: true
  };
}

module.exports = {
  parseQueryIntent,
  queryOperationalConversation,
  buildSovereignAnswer,
  formatFactLines
};
