/**
 * Governança Anam → ações do painel (chat, imprimir, PDF, Excel).
 * Quando a persona CONFIRMA («vou enviar para o João no chat»), o sistema executa — como no painel visual.
 */
import { parsePanelVoiceMetaCommand } from '../features/smartPanel/panelVoiceMetaCommands';

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const WORKFLOW_BLOCK =
  /^(?:revis[aã]o|produ[cç][aã]o|fabrica|f[aá]brica|sistema|homolog|staging|an[aá]lise|aprova[cç][aã]o|qualidade)$/i;

function userWantsMetaKind(userText, kind) {
  const u = String(userText || '').trim();
  if (!u) return false;
  const parsed = parsePanelVoiceMetaCommand(u);
  if (parsed?.kind === kind) return true;
  const n = norm(u);
  if (kind === 'chat') {
    return /\b(enviar|envia|envie|mandar|manda|mande|passar|passa|repassar|encaminhar|chat)\w*\b/.test(n);
  }
  if (kind === 'print') {
    return /\b(imprim\w*|impress\w*|print\w*|copia|papel)\b/.test(n);
  }
  if (kind === 'pdf') return /\b(pdf|baixar|descarregar|download)\w*\b/.test(n);
  if (kind === 'excel') return /\b(excel|planilha|xlsx)\b/.test(n);
  return false;
}

function conversationWantsKind(userText, assistantText, kind) {
  const blob = `${String(userText || '')} ${String(assistantText || '')}`;
  if (userWantsMetaKind(userText, kind) || userWantsMetaKind(blob, kind)) return true;
  const a = norm(assistantText);
  if (kind === 'chat' && /\b(chat|mensagem|impetus|interno)\b/.test(a)) return true;
  if (kind === 'print' && /\b(imprim\w*|impress\w*)\b/.test(a)) return true;
  if (kind === 'pdf' && /\bpdf\b/.test(a)) return true;
  if (kind === 'excel' && /\b(excel|planilha)\b/.test(a)) return true;
  return false;
}

/** Persona confirmou que vai executar (ou já executou) — dispara o sistema. */
export function isAnamMetaCommitPhrase(kind, assistantText, userText = '') {
  const raw = String(assistantText || '').trim();
  const a = norm(raw);
  if (a.length < 10) return false;
  if (!conversationWantsKind(userText, assistantText, kind)) return false;

  if (raw.endsWith('?') && !/\b(vou|ja|já|estou|deixa|irei)\b/.test(a)) return false;

  const isQuestion =
    /\b(quer|gostaria|prefere|qual\s|quando\s|como\s|devo\s|confirma|confirme|deseja|me diz|me diga)\b/.test(a) &&
    !/\b(vou|ja|já|estou|enviando|mandando|imprimindo)\b/.test(a);
  if (isQuestion) return false;

  if (kind === 'chat') {
    return /\b(enviando|mandando|vou\s+enviar|vou\s+mandar|ja\s+enviei|já\s+enviei|enviei|mandei|estou\s+enviando|a\s+enviar|a\s+mandar|deixa\s+eu\s+enviar|deixa\s+eu\s+mandar|vou\s+passar|passando|encaminhando)\b/.test(
      a
    );
  }
  if (kind === 'print') {
    return /\b(imprimindo|vou\s+imprim|ja\s+imprimi|já\s+imprimi|imprimi|abri\s+a\s+impress|abrindo\s+a\s+impress|a\s+imprimir|deixa\s+eu\s+imprim|mandei\s+imprimir)\b/.test(
      a
    );
  }
  if (kind === 'pdf') {
    return /\b(baixando|vou\s+baixar|gerando\s+o\s+pdf|vou\s+gerar\s+o\s+pdf|ja\s+baixei|já\s+baixei|baixei|descarreguei|pdf\s+pronto)\b/.test(
      a
    );
  }
  if (kind === 'excel') {
    return /\b(baixando|vou\s+baixar|gerando\s+a\s+planilha|planilha\s+pronta|excel\s+pronto|ja\s+baixei|já\s+baixei|baixei)\b/.test(
      a
    );
  }
  return false;
}

function extractChatMetaFromText(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const parsed = parsePanelVoiceMetaCommand(raw);
  if (parsed?.kind === 'chat') return parsed;

  const groupM = raw.match(/\b(?:para|pr[oó]|pro)\s+(?:o|a)\s+grupo\s+([^.,!?]+)/i);
  if (groupM) {
    const gname = groupM[1].trim();
    if (gname.length >= 2) {
      return { kind: 'chat', userQueries: [], groupQuery: gname, roleQueries: [] };
    }
  }

  const pluralM = raw.match(/\b(?:para|pr[oó]|pro)\s+(?:os|as)\s+([^.,!?]+)/i);
  if (pluralM) {
    const label = pluralM[1].trim().replace(/\s+no\s+chat.*$/i, '');
    if (label.length >= 3 && !WORKFLOW_BLOCK.test(norm(label))) {
      return { kind: 'chat', userQueries: [], groupQuery: label, roleQueries: [label] };
    }
  }

  const paraM = raw.match(
    /\b(?:para|pr[oó]|pro)\s+(?:o|a|os|as)?\s*([^.,!?]+?)(?:\s+no\s+chat|\s+no\s+impetus|\s+pelo\s+chat|$)/i
  );
  if (paraM) {
    let name = paraM[1].trim();
    name = name.replace(/^(?:o|a|os|as)\s+/i, '').trim();
    if (name.length >= 2 && !WORKFLOW_BLOCK.test(norm(name))) {
      return { kind: 'chat', userQueries: [name], groupQuery: null, roleQueries: [] };
    }
  }

  return null;
}

/**
 * Extrai intenção de chat/impressão/etc. da conversa (utilizador + Anam).
 * @param {string} userText
 * @param {string} assistantText
 * @param {'chat'|'print'|'pdf'|'excel'|null} [preferredKind]
 */
export function resolvePanelMetaFromConversation(userText, assistantText, preferredKind = null) {
  const blob = `${String(userText || '').trim()} ${String(assistantText || '').trim()}`.trim();
  const sources = [userText, assistantText, blob].filter((t) => String(t || '').trim().length >= 3);

  for (const t of sources) {
    const meta = parsePanelVoiceMetaCommand(t);
    if (meta && (!preferredKind || meta.kind === preferredKind)) return meta;
  }

  if (!preferredKind || preferredKind === 'chat') {
    for (const t of sources) {
      const chat = extractChatMetaFromText(t);
      if (chat) return chat;
    }
  }

  if (!preferredKind || preferredKind === 'print') {
    if (userWantsMetaKind(blob, 'print')) return { kind: 'print' };
  }
  if (!preferredKind || preferredKind === 'pdf') {
    if (userWantsMetaKind(blob, 'pdf')) return { kind: 'pdf' };
  }
  if (!preferredKind || preferredKind === 'excel') {
    if (userWantsMetaKind(blob, 'excel')) return { kind: 'excel' };
  }

  return null;
}

/** Texto sintético para o executor (reutiliza parser existente). */
export function buildSyntheticMetaCommand(meta) {
  if (!meta?.kind) return '';
  if (meta.kind === 'chat') {
    if (meta.groupQuery) return `manda isso para o grupo ${meta.groupQuery}`;
    if (meta.roleQueries?.length) return `enviar para os ${meta.roleQueries[0]}`;
    if (meta.userQueries?.length) {
      return `manda isso para ${meta.userQueries.join(' e ')}`;
    }
    return 'enviar no chat interno';
  }
  if (meta.kind === 'print') return 'imprimir o painel';
  if (meta.kind === 'pdf') return 'baixar pdf do painel';
  if (meta.kind === 'excel') return 'baixar excel do painel';
  if (meta.kind === 'share') return 'partilhar';
  return '';
}
