'use strict';

function extractActors(message = {}, participants = []) {
  const actors = [];
  if (message.sender_id) {
    actors.push({
      user_id: message.sender_id,
      name: message.sender_name || message.sender?.name || 'Utilizador',
      role: message.operational_role || message.sender?.role || null,
      hierarchy_level: message.hierarchy_level ?? null,
      department: message.department || null,
      source: 'sender'
    });
  }
  const text = String(message.content || '');
  const nameRe = /\b([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)\b/g;
  let m;
  while ((m = nameRe.exec(text)) !== null) {
    const name = m[1].trim();
    if (name.length < 3 || ['Impetus', 'Runtime', 'Segunda'].includes(name)) continue;
    const hit = participants.find((p) => (p.name || '').toLowerCase().includes(name.toLowerCase().split(' ')[0]));
    actors.push({
      user_id: hit?.user_id || hit?.id || null,
      name,
      role: hit?.role || null,
      hierarchy_level: hit?.hierarchy_level ?? null,
      source: 'mention'
    });
  }
  const seen = new Set();
  return actors.filter((a) => {
    const k = `${a.user_id || ''}:${a.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

module.exports = { extractActors };
