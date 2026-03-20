/**
 * Mapa simples de pronuncia para forçar leitura mais “PT-BR” em nomes/marcas.
 *
 * Observacao: nao usamos SSML; portanto o melhor que conseguimos aqui e
 * segmentar silabas com hifens para guiar o TTS.
 */

const REPLACEMENTS = [
  // Marca principal
  { re: /\bimpetus\b/gi, out: 'Im-pê-tus' },
  // Frequente em conversas sobre IA / voz
  { re: /\bIA\b/g, out: 'i a' },
  // Modelo / stacks que aparecem em texto
  { re: /\bOpenAI\b/g, out: 'O-pen-Ai' },
  { re: /\bTTS\b/g, out: 'T T S' }
];

export function applyPronunciation(text) {
  let t = String(text || '');
  for (const { re, out } of REPLACEMENTS) {
    t = t.replace(re, out);
  }
  return t;
}

