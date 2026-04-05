import api from '../../services/api';

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
  return 0;
}

function resolveUser(recipientQuery, users) {
  let best = null;
  let bestScore = 0;
  for (const u of users) {
    const sc = scoreMatch(recipientQuery, u.name);
    if (sc > bestScore) {
      bestScore = sc;
      best = u;
    }
  }
  if (!best || bestScore < 52) return null;
  return best;
}

/**
 * @param {{ userQueries: string[], groupQuery: string | null }} targets
 * @param {string} plainText
 */
export async function sendPanelTextToImpetusChatTargets(targets, plainText) {
  const content = String(plainText || '').trim();
  if (!content) throw new Error('Não há conteúdo do painel para enviar.');

  const groupQuery = targets?.groupQuery != null ? String(targets.groupQuery).trim() : '';
  const userQueries = Array.isArray(targets?.userQueries) ? targets.userQueries.map((q) => String(q || '').trim()).filter(Boolean) : [];

  if (groupQuery) {
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
    if (!best || bestScore < 48) {
      throw new Error('Não encontrei um grupo seu com esse nome no chat Impetus.');
    }
    await api.post(`/chat/conversations/${best.id}/messages`, { content });
    return { mode: 'group', groupName: best.name, conversationId: best.id, names: [best.name], failures: [] };
  }

  if (!userQueries.length) {
    throw new Error('Indique pelo menos um contacto ou um grupo.');
  }

  const ures = await api.get('/chat/users');
  const users = Array.isArray(ures.data) ? ures.data : [];
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
    const convRes = await api.post('/chat/conversations', {
      type: 'private',
      targetUserId: best.id
    });
    const cid = convRes.data?.id;
    if (!cid) {
      failures.push(q);
      continue;
    }
    await api.post(`/chat/conversations/${cid}/messages`, { content });
    names.push(best.name);
  }

  if (names.length === 0) {
    throw new Error(
      failures.length ? `Não encontrei: ${failures.join(', ')}.` : 'Nenhum destinatário válido.'
    );
  }

  return { mode: 'users', names, failures };
}

/**
 * Um único destinatário (UI clássica).
 */
export async function sendPanelTextToImpetusChat(recipientQuery, plainText) {
  return sendPanelTextToImpetusChatTargets(
    { userQueries: [String(recipientQuery || '').trim()], groupQuery: null },
    plainText
  );
}
