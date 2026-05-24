import api from '../../services/api';

function normName(s) {
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
      row[j] =
        a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[n];
}

export function scoreMatch(query, name) {
  const q = normName(query);
  const n = normName(name);
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
      if (dist <= maxDist) {
        fuzzyBest = Math.max(fuzzyBest, 68 - dist * 6);
      }
    }
  }
  return fuzzyBest;
}

function resolveUser(recipientQuery, users) {
  let best = null;
  let bestScore = 0;
  for (const u of users) {
    const sc = Math.max(scoreMatch(recipientQuery, u.name), scoreMatch(recipientQuery, u.email || ''));
    if (sc > bestScore) {
      bestScore = sc;
      best = u;
    }
  }
  const q = normName(recipientQuery);
  const minScore = q.length <= 4 ? 48 : 52;
  if (!best || bestScore < minScore) return null;
  return best;
}

function roleLabelToPatterns(label) {
  const n = normName(label);
  const patterns = [];
  if (/supervis/.test(n)) patterns.push(/supervis|supervisor/i);
  if (/gestor|gerent/.test(n)) patterns.push(/gestor|gerent|manager/i);
  if (/tecnico|mecan/.test(n)) patterns.push(/tecnico|mecan|maintenance|manut/i);
  if (/operador/.test(n)) patterns.push(/operador|operator/i);
  if (/coordenad/.test(n)) patterns.push(/coordenad/i);
  if (/rh|recursos humanos/.test(n)) patterns.push(/\brh\b|human/i);
  if (/produ/.test(n)) patterns.push(/produ|production/i);
  if (/qualidade/.test(n)) patterns.push(/qualidade|quality/i);
  if (/manuten/.test(n)) patterns.push(/manuten|maintenance/i);
  if (!patterns.length) {
    const stem = n.replace(/s$/, '').slice(0, 24);
    if (stem.length >= 4) patterns.push(new RegExp(stem, 'i'));
  }
  return patterns;
}

function resolveUsersByRole(roleQueries, users) {
  const seen = new Set();
  const matched = [];
  for (const rq of roleQueries) {
    const patterns = roleLabelToPatterns(rq);
    for (const u of users) {
      if (seen.has(u.id)) continue;
      const blob = `${u.name || ''} ${u.role || ''} ${u.email || ''}`;
      if (patterns.some((re) => re.test(blob))) {
        seen.add(u.id);
        matched.push(u);
      }
    }
  }
  return matched;
}

async function resolveGroupConversation(groupQuery) {
  const convRes = await api.get('/chat/conversations');
  const convs = Array.isArray(convRes.data) ? convRes.data : [];
  let best = null;
  let bestScore = 0;
  for (const c of convs) {
    if (c.type !== 'group' || !c.name) continue;
    const sc = scoreMatch(groupQuery, c.name);
    if (sc > bestScore) {
      bestScore = sc;
      best = c;
    }
  }
  if (!best || bestScore < 48) return null;
  return best;
}

function conversationIdFromResponse(res) {
  const d = res?.data;
  return d?.id || d?.conversation?.id || d?.conversationId || null;
}

function messageSendError(err) {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    'Falha ao enviar mensagem no chat.'
  );
}

async function sendToPrivateUsers(users, content) {
  const seen = new Set();
  const names = [];
  const failures = [];

  for (const u of users) {
    if (!u?.id || seen.has(u.id)) continue;
    seen.add(u.id);
    try {
      const convRes = await api.post('/chat/conversations', {
        type: 'private',
        targetUserId: u.id
      });
      const cid = conversationIdFromResponse(convRes);
      if (!cid) {
        failures.push(`${u.name || u.id} (sem conversa)`);
        continue;
      }
      await api.post(`/chat/conversations/${cid}/messages`, { content });
      names.push(u.name || u.email || 'contacto');
    } catch (err) {
      console.warn('[panel-chat] send private', u.name, messageSendError(err));
      failures.push(u.name || String(u.id));
    }
  }

  return { names, failures };
}

/**
 * @param {{ userQueries: string[], groupQuery: string | null, roleQueries?: string[] }} targets
 * @param {string} plainText
 */
export async function sendPanelTextToImpetusChatTargets(targets, plainText) {
  const content = String(plainText || '').trim();
  if (!content) throw new Error('Não há conteúdo do painel para enviar.');
  if (content.length < 12) {
    throw new Error('O painel ainda não tem conteúdo suficiente para enviar. Gere o relatório primeiro.');
  }

  const groupQuery = targets?.groupQuery != null ? String(targets.groupQuery).trim() : '';
  const roleQueries = Array.isArray(targets?.roleQueries)
    ? targets.roleQueries.map((q) => String(q || '').trim()).filter(Boolean)
    : [];
  const userQueries = Array.isArray(targets?.userQueries)
    ? targets.userQueries.map((q) => String(q || '').trim()).filter(Boolean)
    : [];

  const ures = await api.get('/chat/users');
  const users = Array.isArray(ures.data) ? ures.data : [];

  if (groupQuery) {
    const best = await resolveGroupConversation(groupQuery);
    if (best) {
      try {
        await api.post(`/chat/conversations/${best.id}/messages`, { content });
      } catch (err) {
        throw new Error(messageSendError(err));
      }
      return { mode: 'group', groupName: best.name, conversationId: best.id, names: [best.name], failures: [] };
    }
    if (roleQueries.length || COLLECTIVE_FALLBACK(groupQuery)) {
      const byRole = resolveUsersByRole([groupQuery, ...roleQueries], users);
      if (byRole.length) {
        const { names, failures } = await sendToPrivateUsers(byRole, content);
        if (names.length) {
          return {
            mode: 'role',
            groupName: groupQuery,
            names,
            failures,
            roleLabel: groupQuery
          };
        }
        throw new Error(
          failures.length
            ? `Não consegui enviar para: ${failures.join(', ')}.`
            : 'Não encontrei destinatários com esse perfil.'
        );
      }
    }
    throw new Error('Não encontrei um grupo seu com esse nome no chat Impetus.');
  }

  if (roleQueries.length && !userQueries.length) {
    const byRole = resolveUsersByRole(roleQueries, users);
    if (byRole.length) {
      const { names, failures } = await sendToPrivateUsers(byRole, content);
      if (names.length) {
        return {
          mode: 'role',
          names,
          failures,
          roleLabel: roleQueries.join(', ')
        };
      }
      throw new Error(
        failures.length
          ? `Não consegui enviar para: ${failures.join(', ')}.`
          : 'Não encontrei pessoas com esse perfil no chat.'
      );
    }
    throw new Error('Não encontrei pessoas com esse perfil no chat Impetus.');
  }

  if (!userQueries.length) {
    throw new Error('Indique pelo menos um contacto ou um grupo.');
  }

  const seen = new Set();
  const names = [];
  const failures = [];

  for (const q of userQueries) {
    const best = resolveUser(q, users);
    if (!best) {
      failures.push(q);
      continue;
    }
    if (seen.has(best.id)) continue;
    seen.add(best.id);
    try {
      const convRes = await api.post('/chat/conversations', {
        type: 'private',
        targetUserId: best.id
      });
      const cid = conversationIdFromResponse(convRes);
      if (!cid) {
        failures.push(q);
        continue;
      }
      await api.post(`/chat/conversations/${cid}/messages`, { content });
      names.push(best.name);
    } catch (err) {
      console.warn('[panel-chat] send user', q, messageSendError(err));
      failures.push(q);
    }
  }

  if (names.length === 0) {
    throw new Error(
      failures.length ? `Não encontrei: ${failures.join(', ')}.` : 'Nenhum destinatário válido.'
    );
  }

  return { mode: 'users', names, failures };
}

function COLLECTIVE_FALLBACK(label) {
  return /supervis|gestor|gerent|tecnico|mecan|operador|coordenad|rh|produ|qualidade|manuten/i.test(
    String(label || '')
  );
}

/**
 * Um único destinatário (UI clássica).
 */
export async function sendPanelTextToImpetusChat(recipientQuery, plainText) {
  return sendPanelTextToImpetusChatTargets(
    { userQueries: [String(recipientQuery || '').trim()], groupQuery: null, roleQueries: [] },
    plainText
  );
}
