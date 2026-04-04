/**
 * Realtime Conversation Engine (cliente) — políticas de turno, blocos curtos e cadência.
 * O motor de áudio real (VAD, barge-in, TTS) continua em useVoiceEngine / OpenAI Realtime.
 *
 * Regras documentadas:
 * - respostas preferencialmente em blocos curtos (5–10s falados);
 * - interrupção: o utilizador fala → o motor cancela TTS (já existente);
 * - priorizar velocidade sobre perfeição nas primeiras frases.
 */

/** Duração alvo por bloco de fala (orientação para prompts), em caracteres ~ */
export const REALTIME_CHUNK_CHAR_TARGET = { min: 80, max: 380 };

/** Pausa sugerida entre blocos (ms) — complementa lightweightCadencePauseMs no useVoiceEngine */
export const REALTIME_INTER_CHUNK_MS = { min: 45, max: 180 };

/**
 * Indica se o texto deve ser dividido antes do TTS (heurística leve).
 * @param {string} text
 */
export function shouldSplitForRealtime(text) {
  const t = String(text || '').trim();
  return t.length > REALTIME_CHUNK_CHAR_TARGET.max;
}
