/**
 * Frases curtas para voz — variação sem soar robótico (evita repetir sempre a mesma cue).
 */

export const VOICE_THINKING_SPOKEN = [
  'Só um segundo.',
  'Um instante.',
  'Só um momento.',
  'Aguarde um instante.'
];

let _lastThinkingIdx = -1;

/** Escolhe frase de “pensando” sem repetir a imediatamente anterior. */
export function pickThinkingPhrase() {
  const arr = VOICE_THINKING_SPOKEN;
  if (!arr.length) return 'Só um segundo.';
  if (arr.length === 1) return arr[0];
  let i = Math.floor(Math.random() * arr.length);
  if (i === _lastThinkingIdx) i = (i + 1) % arr.length;
  _lastThinkingIdx = i;
  return arr[i];
}

export const VOICE_LISTENING_SPOKEN = [
  'Ouvindo...',
  'Estou ouvindo.',
  'Pode falar.',
  'Estou aqui com você.'
];

let _lastListeningIdx = -1;
export function pickListeningPhrase() {
  const arr = VOICE_LISTENING_SPOKEN;
  if (!arr.length) return 'Ouvindo...';
  if (arr.length === 1) return arr[0];
  let i = Math.floor(Math.random() * arr.length);
  if (i === _lastListeningIdx) i = (i + 1) % arr.length;
  _lastListeningIdx = i;
  return arr[i];
}

export const VOICE_PROCESSING_SPOKEN = [
  'Processando...',
  'Um instante...',
  'Deixa comigo...',
  'Só um segundo...'
];

let _lastProcessingIdx = -1;
export function pickProcessingPhrase() {
  const arr = VOICE_PROCESSING_SPOKEN;
  if (!arr.length) return 'Processando...';
  if (arr.length === 1) return arr[0];
  let i = Math.floor(Math.random() * arr.length);
  if (i === _lastProcessingIdx) i = (i + 1) % arr.length;
  _lastProcessingIdx = i;
  return arr[i];
}

export const VOICE_SPEAKING_SPOKEN = [
  'Falando...',
  'Estou te respondendo...',
  'Vamos lá...'
];

let _lastSpeakingIdx = -1;
export function pickSpeakingPhrase() {
  const arr = VOICE_SPEAKING_SPOKEN;
  if (!arr.length) return 'Falando...';
  if (arr.length === 1) return arr[0];
  let i = Math.floor(Math.random() * arr.length);
  if (i === _lastSpeakingIdx) i = (i + 1) % arr.length;
  _lastSpeakingIdx = i;
  return arr[i];
}

export const VOICE_ALERT_FOLLOWUP_SPOKEN = [
  'Deseja que eu abra o painel de manutenção?',
  'Quer que eu abra o painel de manutenção agora?',
  'Posso abrir o painel de manutenção para você?'
];

let _lastAlertFollowupIdx = -1;
export function pickAlertFollowupPhrase() {
  const arr = VOICE_ALERT_FOLLOWUP_SPOKEN;
  if (!arr.length) return 'Deseja que eu abra o painel de manutenção?';
  if (arr.length === 1) return arr[0];
  let i = Math.floor(Math.random() * arr.length);
  if (i === _lastAlertFollowupIdx) i = (i + 1) % arr.length;
  _lastAlertFollowupIdx = i;
  return arr[i];
}
