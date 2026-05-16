'use strict';

/**
 * WAVE 4 — compressão de factos (estrutura densa, anti-alucinação).
 */

const { validateFact, KNOWN_FACT_SOURCES } = require('./cognitiveBudgetContracts');

const SECTION_SOURCE_MAP = {
  'memória operacional': 'operational_memory',
  'tarefas pendentes': 'tasks',
  'lembretes': 'reminders',
  'eventos recentes': 'eventos_empresa',
  'histórico operacional': 'knowledge_memory',
  'casos de manutenção': 'casos_manutencao'
};

function _detectSource(sectionHeader) {
  const h = String(sectionHeader || '').toLowerCase();
  for (const [key, src] of Object.entries(SECTION_SOURCE_MAP)) {
    if (h.includes(key)) return src;
  }
  return 'system';
}

/**
 * Extrai bullets de um bloco markdown em factos estruturados.
 * @param {string} block
 */
function compressBlockToFacts(block) {
  if (!block || !String(block).trim()) return { facts: [], compressed_text: '' };

  const lines = String(block).split('\n');
  const facts = [];
  let currentSource = 'system';
  let section = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('###')) {
      section = trimmed.replace(/^#+\s*/, '');
      currentSource = _detectSource(section);
      continue;
    }
    if (trimmed.startsWith('- ')) {
      const text = trimmed.slice(2).trim();
      if (text.length < 3) continue;
      const v = validateFact({ text, source: currentSource, confidence: 0.9 });
      if (v.ok) facts.push(v.fact);
    }
  }

  const compressedLines = [
    '## FACTOS OPERACIONAIS (comprimidos)',
    ...facts.slice(0, 40).map((f) => `- [${f.source}] ${f.text}`)
  ];

  if (facts.length > 40) {
    compressedLines.push(`- ... +${facts.length - 40} factos omitidos por budget`);
  }

  compressedLines.push(
    '',
    'REGRA: Responda apenas com base nos factos acima. Não invente equipamentos, datas ou métricas ausentes.'
  );

  return {
    facts,
    compressed_text: compressedLines.join('\n'),
    fact_count: facts.length
  };
}

module.exports = {
  KNOWN_FACT_SOURCES,
  compressBlockToFacts
};
