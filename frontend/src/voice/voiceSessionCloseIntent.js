/**
 * Encerramento natural da sessão «IA ao vivo» — utilizador diz que não precisa de mais nada.
 */

export const VOICE_SESSION_CLOSE_EVENT = 'impetus-voice-session-close';

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getUserFirstName() {
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    const n = String(u?.name || u?.full_name || '').trim().split(/\s+/)[0];
    return n || '';
  } catch {
    return '';
  }
}

/** A assistente perguntou se precisa de mais alguma coisa. */
export function assistantAskedAnythingElse(text) {
  const n = norm(text);
  if (n.length < 5) return false;
  return (
    /\b(mais alguma|algo mais|alguma coisa mais|precisa de mais|precisa de algo|posso ajudar|te ajudo|ajudo (?:em|com|a)?|quer (?:que eu )?(?:faça|mostre|gera|ajude)|mais alguma coisa|deseja mais|quer algo mais|mais alguma duvida|mais alguma pergunta)\b/.test(
      n
    ) ||
    /\b(necessita de mais|mais alguma coisa|ajudar (?:em|com) mais|posso te ajudar|e isso ou precisa)\b/.test(n) ||
    (/\?/.test(n) && /\b(mais|alguma|ajudar|precisa|algo)\b/.test(n) && n.length <= 120)
  );
}

/** Utilizador recusa ajuda adicional (resposta curta após pergunta de encerramento). */
export function userDeclinesMoreHelp(text) {
  const n = norm(text);
  if (!n || n.length > 56) return false;
  if (/\?/.test(n)) return false;
  if (/\b(como|mostra|gera|gere|cria|quero ver|preciso ver|painel|grafico|relatorio|chat|abre|lista)\b/.test(n)) {
    return false;
  }
  if (
    /^(nao|nao obrigado|nao preciso|nada|nada nao|nada mais|so isso|e isso|tudo bem|tudo certo|ta bom|ok|certo|valeu|obrigado|obrigada|pode ser|pode encerrar|pode fechar|fecha|encerra|tchau|ate logo|so|nao quero|nao mais)$/.test(
      n
    )
  ) {
    return true;
  }
  if (n.length <= 28 && /\b(nao|nada|so isso|ta bom|tchau|valeu|obrigad)\b/.test(n) && !/\b(sim|quero|preciso|mostra)\b/.test(n)) {
    return true;
  }
  return /\b(nao preciso|nada mais|so isso|pode encerrar|pode fechar|nao quero mais|nao e necessario|nao ha mais)\b/.test(
    n
  );
}

/** Pedido explícito para sair do ao vivo. */
export function userRequestsSessionClose(text) {
  const n = norm(text);
  return /\b(encerr|fechar|desligar|sair|fecha a sess|encerre|pode sair|terminar (?:a )?sess)\b/.test(n);
}

/** Persona já disse que está encerrando. */
export function personaSignalsSessionEnd(text) {
  const n = norm(text);
  if (n.length < 8) return false;
  return (
    /\b(encerrando|encerro|vou encerrar|fechando a sess|finalizando a sess|encerrei)\b/.test(n) ||
    /\b(qualquer coisa [eé] s[oó] chamar|se precisar [eé] s[oó] chamar|ate a proxima|por hoje e isso|foi isso entao)\b/.test(
      n
    ) ||
    (/\b(ta bom|tudo bem)\b/.test(n) && /\b(chamar|ate logo|ate mais|encerr)\b/.test(n))
  );
}

function findLastAssistantText(turns, skipRoles = new Set(['user'])) {
  for (let i = turns.length - 1; i >= 0; i--) {
    const r = String(turns[i]?.role || '').toLowerCase();
    if (skipRoles.has(r)) continue;
    if (r === 'assistant' || r === 'persona') {
      return String(turns[i]?.text || '').trim();
    }
  }
  return '';
}

function anyRecentAssistantAskedAnythingElse(turns, maxLookback = 6) {
  let seen = 0;
  for (let i = turns.length - 1; i >= 0 && seen < maxLookback; i--) {
    const r = String(turns[i]?.role || '').toLowerCase();
    if (r !== 'assistant' && r !== 'persona') continue;
    seen += 1;
    if (assistantAskedAnythingElse(turns[i]?.text)) return true;
  }
  return false;
}

/**
 * @param {{ userText?: string, assistantText?: string, lastAssistantHint?: string, recentTurns?: { role: string, text: string }[] }} input
 * @returns {{ close: boolean, reason?: string, speakFarewell?: boolean, farewellLine?: string, delayMs?: number }}
 */
export function evaluateVoiceSessionClose(input = {}) {
  const userText = String(input.userText || '').trim();
  const assistantText = String(input.assistantText || '').trim();
  const lastAssistantHint = String(input.lastAssistantHint || '').trim();
  const turns = Array.isArray(input.recentTurns) ? input.recentTurns : [];

  const firstName = getUserFirstName();
  const nameBit = firstName ? `, ${firstName}` : '';
  const defaultFarewell = `Tá bom${nameBit}, encerrando a sessão. Qualquer coisa é só chamar.`;

  if (personaSignalsSessionEnd(assistantText)) {
    return { close: true, reason: 'persona_farewell', speakFarewell: false, delayMs: 1800 };
  }

  if (userRequestsSessionClose(userText)) {
    return {
      close: true,
      reason: 'user_explicit_close',
      speakFarewell: true,
      farewellLine: defaultFarewell,
      delayMs: 2800
    };
  }

  const prevAssistant =
    findLastAssistantText(turns) ||
    lastAssistantHint ||
    assistantText;

  const askedRecently =
    assistantAskedAnythingElse(prevAssistant) ||
    assistantAskedAnythingElse(lastAssistantHint) ||
    assistantAskedAnythingElse(assistantText) ||
    anyRecentAssistantAskedAnythingElse(turns);

  if (userDeclinesMoreHelp(userText) && askedRecently) {
    return {
      close: true,
      reason: 'user_declined_more',
      speakFarewell: true,
      farewellLine: defaultFarewell,
      delayMs: 2800
    };
  }

  return { close: false };
}

export function dispatchVoiceSessionClose(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(VOICE_SESSION_CLOSE_EVENT, {
      detail: { reason: detail.reason || 'unknown', ...detail }
    })
  );
}
