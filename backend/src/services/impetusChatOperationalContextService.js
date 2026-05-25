/**
 * Contexto operacional do Chat Impetus para voz, painel e snapshots.
 * Dados reais das conversas do utilizador (não inventar mensagens).
 */
const db = require('../db');
const chatService = require('./chatService');
const dashboardAccessService = require('./dashboardAccessService');

const STOP_WORDS = new Set([
  'o',
  'a',
  'os',
  'as',
  'um',
  'uma',
  'de',
  'da',
  'do',
  'dos',
  'das',
  'no',
  'na',
  'nos',
  'nas',
  'em',
  'com',
  'para',
  'pra',
  'me',
  'meu',
  'minha',
  'que',
  'ela',
  'ele',
  'eles',
  'elas',
  'voce',
  'você',
  'vc',
  'impetus',
  'chat',
  'interno',
  'conversa',
  'conversas',
  'mensagem',
  'mensagens',
  'resumo',
  'cite',
  'citar',
  'painel',
  'gera',
  'gerar',
  'gere',
  'mostra',
  'mostrar',
  'nova',
  'novas',
  'novo',
  'novos',
  'ultima',
  'última',
  'ultimas',
  'últimas',
  'mandou',
  'mandei',
  'enviou',
  'enviado',
  'disse',
  'falou',
  'ha',
  'há',
  'tem',
  'tinha',
  'teve',
  'alguma',
  'algum',
  'sobre',
  'isso',
  'isto'
]);

function normText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const row = new Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[n];
}

function scoreNameMatch(query, name) {
  const q = normText(query);
  const n = normText(name);
  if (!q || !n) return 0;
  if (n === q) return 100;
  if (n.includes(q) || q.includes(n)) return 82;
  const qTokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (!qTokens.length) return 0;
  const hit = qTokens.filter((t) => n.includes(t)).length;
  if (hit === qTokens.length) return 72;
  if (hit > 0 && qTokens.length <= 2) return 55 + hit * 5;
  const nTokens = n.split(/\s+/).filter((t) => t.length >= 2);
  let fuzzyBest = 0;
  for (const qt of qTokens) {
    if (qt.length < 4) continue;
    for (const nt of nTokens) {
      if (nt.length < 4) continue;
      if (nt.includes(qt) || qt.includes(nt)) {
        fuzzyBest = Math.max(fuzzyBest, 78);
        continue;
      }
      const dist = levenshtein(qt, nt);
      const maxLen = Math.max(qt.length, nt.length);
      const maxDist = maxLen >= 9 ? 2 : 1;
      if (dist <= maxDist) fuzzyBest = Math.max(fuzzyBest, 68 - dist * 6);
    }
  }
  return fuzzyBest;
}

function userHasChatAccess(user) {
  if (!user) return false;
  const perms = new Set(dashboardAccessService.getEffectivePermissions(user));
  if (perms.has('*')) return true;
  const allowed = new Set(dashboardAccessService.getAllowedModules(user));
  if (allowed.has('chat') || allowed.has('ai')) return true;
  return perms.has('chat.view') || perms.has('ACCESS_AI_ANALYTICS');
}

/**
 * Extrai nome de contacto de frases como «resumo da conversa da Joyce», «o que ela me mandou».
 * @returns {string|null}
 */
function extractContactHint(queryText) {
  const raw = String(queryText || '').trim();
  if (!raw) return null;
  const n = normText(raw);

  const patterns = [
    /conversa\s+(?:da|de|com|do|da\s+)?\s*([a-z][a-z\s]{1,35})/i,
    /(?:resumo|cite|citacao|citação|o\s+que)\s+(?:da|de|com|do)?\s*([a-z][a-z\s]{1,35})(?:\s+(?:me\s+)?mandou|disse|escreveu|falou)?/i,
    /mensagens?\s+(?:da|de|com|do)\s+([a-z][a-z\s]{1,35})/i,
    /(?:com|para)\s+([a-z][a-z\s]{1,30})\s+(?:no\s+)?chat/i,
    /chat\s+(?:com|da|de)\s+([a-z][a-z\s]{1,35})/i,
    /(?:nova|novas|ultima|última)\s+(?:conversa|mensagem)(?:s)?\s+(?:com|da|de)\s+([a-z][a-z\s]{1,35})/i
  ];

  for (const re of patterns) {
    const m = raw.match(re);
    if (!m?.[1]) continue;
    const hint = normText(m[1])
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
      .join(' ')
      .trim();
    if (hint.length >= 2) return hint;
  }

  if (/\bela\b|\bele\b/.test(n) && /\b(mandou|disse|escreveu|mensagem|conversa|cite)\b/.test(n)) {
    return '__PRONOUN__';
  }

  return null;
}

function resolveContactDisplay(row, userId) {
  if (row.type === 'group' && row.name) return String(row.name).trim();
  const parts = Array.isArray(row.participants) ? row.participants : [];
  const other = parts.find((p) => String(p.id) !== String(userId));
  return other?.name ? String(other.name).trim() : row.name || 'Conversa';
}

function isUnread(row, userId) {
  const lm = row.last_message;
  if (!lm?.created_at) return false;
  if (String(lm.sender_id) === String(userId)) return false;
  if (!row.last_read_at) return true;
  return new Date(lm.created_at) > new Date(row.last_read_at);
}

async function getConversationsEnriched(userId, companyId, limit = 35) {
  const { rows } = await db.query(
    `SELECT c.id, c.type, c.name, c.updated_at,
      cp.last_read_at,
      (SELECT json_build_object(
          'id', m.id, 'content', m.content, 'message_type', m.message_type,
          'created_at', m.created_at, 'sender_id', m.sender_id
        )
       FROM chat_messages m
       WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
       ORDER BY m.created_at DESC LIMIT 1) AS last_message,
      (SELECT json_agg(json_build_object(
          'id', u.id, 'name', u.name, 'email', u.email, 'role', u.role,
          'avatar_url', COALESCE(u.foto_perfil, u.avatar_url)
        ))
       FROM chat_participants cp2
       JOIN users u ON u.id = cp2.user_id
       WHERE cp2.conversation_id = c.id AND cp2.user_id != $1
       LIMIT 5) AS participants
    FROM chat_conversations c
    JOIN chat_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
    WHERE c.company_id = $2
    ORDER BY c.updated_at DESC
    LIMIT $3`,
    [userId, companyId, limit]
  );

  return (rows || []).map((row) => {
    const contactName = resolveContactDisplay(row, userId);
    const lm = row.last_message;
    const preview = lm?.content
      ? String(lm.content).replace(/\s+/g, ' ').trim().slice(0, 160)
      : lm?.message_type === 'file'
        ? '[ficheiro]'
        : '';
    return {
      id: row.id,
      type: row.type,
      contactName,
      updated_at: row.updated_at,
      last_read_at: row.last_read_at,
      last_message: lm,
      participants: row.participants,
      unread: isUnread(row, userId),
      preview
    };
  });
}

function matchConversationByHint(conversations, hint, userId) {
  if (!hint || hint === '__PRONOUN__') {
    const unread = conversations.filter((c) => c.unread);
    if (unread.length === 1) return unread[0];
    if (unread.length > 1) {
      return [...unread].sort(
        (a, b) => new Date(b.last_message?.created_at || 0) - new Date(a.last_message?.created_at || 0)
      )[0];
    }
    return conversations[0] || null;
  }

  let best = null;
  let bestScore = 0;
  for (const c of conversations) {
    const sc = scoreNameMatch(hint, c.contactName);
    if (sc > bestScore) {
      bestScore = sc;
      best = c;
    }
    const parts = Array.isArray(c.participants) ? c.participants : [];
    for (const p of parts) {
      const sc2 = scoreNameMatch(hint, p.name || '');
      if (sc2 > bestScore) {
        bestScore = sc2;
        best = c;
      }
    }
  }
  const minScore = normText(hint).length <= 4 ? 48 : 52;
  return bestScore >= minScore ? best : null;
}

function wantsChatDetail(queryText) {
  const n = normText(queryText);
  if (!n) return false;
  if (extractContactHint(queryText)) return true;
  return (
    /\b(chat|conversa|mensagem|mandou|mandei|nao\s+lida|não\s+lida|inbox|impetus\s+chat)\b/.test(n) &&
    /\b(resumo|cite|o\s+que|nova|novas|ultima|última|painel|gera|gere|mostra|tem|há|ha|conversa|mensagem)\b/.test(n)
  );
}

/**
 * @param {object} user
 * @param {string} [queryText]
 */
async function buildChatOperationalContext(user, queryText = '') {
  if (!user?.id || !user?.company_id) {
    return { permitted: false, denialReason: 'Utilizador sem empresa.' };
  }
  if (!userHasChatAccess(user)) {
    return {
      permitted: false,
      denialReason: 'O seu perfil não tem acesso ao Chat Impetus.'
    };
  }

  const conversations = await getConversationsEnriched(user.id, user.company_id);
  const unreadCount = conversations.filter((c) => c.unread).length;
  const hint = extractContactHint(queryText);
  const detailRequested = wantsChatDetail(queryText);
  const matched = detailRequested ? matchConversationByHint(conversations, hint, user.id) : null;

  let threadMessages = [];
  if (matched?.id) {
    try {
      threadMessages = await chatService.getMessages(matched.id, user.id, 40);
    } catch (e) {
      console.warn('[impetusChatOperationalContext] getMessages', e?.message || e);
    }
  }

  return {
    permitted: true,
    fetched_at: new Date().toISOString(),
    inbox: conversations.slice(0, 20),
    unreadCount,
    contactHint: hint,
    matchedConversation: matched
      ? {
          id: matched.id,
          contactName: matched.contactName,
          unread: matched.unread,
          preview: matched.preview,
          last_message_at: matched.last_message?.created_at || matched.updated_at
        }
      : null,
    threadMessages: threadMessages.map((m) => ({
      id: m.id,
      at: m.created_at,
      from: m.sender?.name || '—',
      fromSelf: String(m.sender_id) === String(user.id),
      type: m.message_type || 'text',
      content: String(m.content || '').replace(/\s+/g, ' ').trim().slice(0, 500)
    }))
  };
}

function formatInboxLine(c) {
  const flag = c.unread ? '[NOVA]' : '[lida]';
  const when = c.last_message?.created_at
    ? new Date(c.last_message.created_at).toISOString().slice(0, 16).replace('T', ' ')
    : '—';
  const prev = c.preview ? c.preview.slice(0, 100) : '(sem texto)';
  return `${flag} ${c.contactName} — ${when}: ${prev}`;
}

function formatForVoiceAppend(ctx) {
  if (!ctx?.permitted) {
    return ctx?.denialReason ? `CHAT IMPETUS: ${ctx.denialReason}` : '';
  }
  const lines = [
    'CHAT IMPETUS (dados reais do utilizador — use para responder e para gerar painel; não invente mensagens):',
    `- Conversas recentes: ${ctx.inbox?.length ?? 0}`,
    `- Com mensagem não lida pelo utilizador: ${ctx.unreadCount ?? 0}`
  ];

  const unread = (ctx.inbox || []).filter((c) => c.unread).slice(0, 8);
  if (unread.length) {
    lines.push('', 'NÃO LIDAS / NOVAS (prioridade):');
    unread.forEach((c) => lines.push(`- ${formatInboxLine(c)}`));
  }

  const recent = (ctx.inbox || []).slice(0, 12);
  if (recent.length) {
    lines.push('', 'INBOX (últimas conversas):');
    recent.forEach((c) => lines.push(`- ${formatInboxLine(c)}`));
  }

  if (ctx.matchedConversation) {
    lines.push(
      '',
      `CONVERSA FOCADA: ${ctx.matchedConversation.contactName} (id ${ctx.matchedConversation.id})${
        ctx.matchedConversation.unread ? ' — há mensagem nova' : ''
      }`
    );
    if (ctx.threadMessages?.length) {
      lines.push('', 'TRANSCRIPT (ordem cronológica — cite em voz só o que consta aqui):');
      for (const m of ctx.threadMessages.slice(-25)) {
        const who = m.fromSelf ? 'Você' : m.from;
        lines.push(`- [${m.at}] ${who}: ${m.content || `[${m.type}]`}`.slice(0, 420));
      }
    } else {
      lines.push('- Sem mensagens carregadas neste extracto.');
    }
  }

  lines.push(
    '',
    'PAINEL: se pedirem resumo/citação de conversa, confirme «gerando no painel» — o sistema monta tabela com estas mensagens.'
  );
  return lines.join('\n');
}

function buildPanelChatTables(ctx) {
  if (!ctx?.permitted) return [];
  const tables = [];

  if (ctx.inbox?.length) {
    tables.push({
      title: 'Chat Impetus — inbox',
      columns: ['Contacto', 'Estado', 'Última mensagem (prévia)'],
      rows: ctx.inbox.slice(0, 15).map((c) => [
        c.contactName,
        c.unread ? 'Nova / não lida' : 'Lida',
        (c.preview || '—').slice(0, 120)
      ])
    });
  }

  if (ctx.matchedConversation && ctx.threadMessages?.length) {
    const name = ctx.matchedConversation.contactName;
    tables.push({
      title: `Conversa — ${name}`,
      columns: ['Data/hora', 'De', 'Mensagem'],
      rows: ctx.threadMessages.map((m) => [
        String(m.at || '—').slice(0, 19),
        m.fromSelf ? 'Você' : m.from,
        (m.content || `[${m.type}]`).slice(0, 280)
      ])
    });
    const fromThem = ctx.threadMessages.filter((m) => !m.fromSelf);
    if (fromThem.length) {
      const last = fromThem[fromThem.length - 1];
      tables.push({
        title: `Última mensagem de ${name}`,
        columns: ['Campo', 'Valor'],
        rows: [
          ['Data', String(last.at || '—')],
          ['Texto', (last.content || '—').slice(0, 400)]
        ]
      });
    }
  }

  return tables;
}

async function fetchChatSnapshot(user, queryText = '') {
  const ctx = await buildChatOperationalContext(user, queryText);
  if (!ctx.permitted) {
    return {
      ok: true,
      rows: [['Acesso', ctx.denialReason || 'Sem permissão']],
      metrics: [],
      chatContext: ctx
    };
  }
  const rows = [
    ['Conversas (inbox)', String(ctx.inbox?.length ?? 0)],
    ['Não lidas', String(ctx.unreadCount ?? 0)]
  ];
  if (ctx.matchedConversation) {
    rows.push(['Foco', ctx.matchedConversation.contactName]);
    rows.push(['Mensagens no extracto', String(ctx.threadMessages?.length ?? 0)]);
  }
  return {
    ok: true,
    rows,
    metrics: [
      { name: 'Conversas', value: ctx.inbox?.length ?? 0 },
      { name: 'Não lidas', value: ctx.unreadCount ?? 0 }
    ],
    chatContext: ctx
  };
}

module.exports = {
  userHasChatAccess,
  extractContactHint,
  wantsChatDetail,
  buildChatOperationalContext,
  formatForVoiceAppend,
  buildPanelChatTables,
  fetchChatSnapshot,
  scoreNameMatch,
  matchConversationByHint
};
