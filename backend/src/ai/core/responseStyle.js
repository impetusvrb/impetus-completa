'use strict';

const MODE_STYLES = {
  text: [
    'Modo: texto operacional.',
    'Pode estruturar em passos curtos quando ajudar execução.'
  ],
  assistant: [
    'Modo: assistente empresarial.',
    'Mantenha foco em produtividade e decisão.'
  ],
  voice: [
    'Modo: voz.',
    'Respostas curtas (3-4 frases), linguagem natural e sem listas longas.'
  ]
};

function buildResponseStyleBlock(mode = 'text') {
  const selected = MODE_STYLES[mode] || MODE_STYLES.text;
  return selected.join('\n');
}

module.exports = {
  buildResponseStyleBlock
};
