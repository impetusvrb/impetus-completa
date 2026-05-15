'use strict';

/**
 * Política de segurança de migrations IMPETUS — camada acima do classificador.
 *
 * - Denylist permanente: migrations que NUNCA devem ser executadas pelo runner,
 *   mesmo com IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true (exigem intervenção DBA
 *   manual e plano assistido documentado).
 * - Tiers formais para relatórios / logs (não substituem category do classifier).
 */

/** Nomes de ficheiro exactos bloqueados permanentemente pelo runner. */
const PERMANENT_MANUAL_ONLY_NAMES = new Set([
  'pgvector_semantic_search_migration.sql',
  'pgvector_semantic_search_migration.legacy.sql'
]);

/**
 * Padrões SQL que indicam alteração destrutiva em colunas vetoriais (embedding).
 * Qualquer migration que os contenha é escalada para REBUILD_REQUIRED e emite alerta
 * no runner — mesmo se o classifier base a classificar como 'safe' ou 'low'.
 */
const VECTOR_DESTRUCTIVE_PATTERNS = Object.freeze([
  { pattern: /\bDROP\s+COLUMN\b[^;]*\bembedding\b/i, flag: 'VECTOR_DROP_COLUMN', description: 'DROP COLUMN em coluna de embedding — perda de memória cognitiva.' },
  { pattern: /\bALTER\s+COLUMN\b[^;]*\bembedding\b[^;]*\bTYPE\b/i, flag: 'VECTOR_ALTER_TYPE', description: 'ALTER TYPE em coluna vector — incompatibilidade dimensional.' },
  { pattern: /\bTRUNCATE\b[^;]*\bmanual_chunks\b/i, flag: 'VECTOR_TRUNCATE_CHUNKS', description: 'TRUNCATE da tabela de chunks — apaga todos os embeddings.' },
  { pattern: /\bDROP\s+TABLE\b[^;]*\bmanual_chunks\b/i, flag: 'VECTOR_DROP_TABLE', description: 'DROP TABLE manual_chunks — destruição total da memória vetorial.' },
  { pattern: /\bDROP\s+EXTENSION\b[^;]*\bvector\b/i, flag: 'VECTOR_DROP_EXTENSION', description: 'DROP EXTENSION vector — desativa pgvector no cluster.' }
]);

/**
 * Verifica se um SQL contém padrões destrutivos vetoriais.
 * Usa strip de comentários e strings para não detectar falsos positivos em exemplos comentados.
 * @param {string} sql
 * @returns {{ isVectorDestructive: boolean, flags: Array<{flag: string, description: string}> }}
 */
function detectVectorDestructivePatterns(sql) {
  // Reutilizar o strip do classifier para eliminar comentários SQL e strings
  let norm;
  try {
    const classifier = require('./classifier');
    norm = classifier._stripStringsAndComments(String(sql || ''));
  } catch (_) {
    norm = String(sql || '');
  }
  const flags = [];
  for (const rule of VECTOR_DESTRUCTIVE_PATTERNS) {
    if (rule.pattern.test(norm)) {
      flags.push({ flag: rule.flag, description: rule.description });
    }
  }
  return { isVectorDestructive: flags.length > 0, flags };
}

const SAFETY_TIERS = Object.freeze({
  SAFE: 'SAFE',
  MODERATE: 'MODERATE',
  DESTRUCTIVE: 'DESTRUCTIVE',
  REBUILD_REQUIRED: 'REBUILD_REQUIRED',
  LEGACY: 'LEGACY',
  MANUAL_ONLY: 'MANUAL_ONLY'
});

/**
 * @param {string} source
 * @param {string} name
 * @returns {boolean}
 */
function isPermanentManualBlock(source, name) {
  return PERMANENT_MANUAL_ONLY_NAMES.has(String(name || ''));
}

/**
 * @param {{ category: string, permanent_manual_block?: boolean, destructive_flags?: unknown[] }} item
 */
function resolveSafetyTier(item) {
  const c = item && item.category;
  const perm = !!(item && item.permanent_manual_block);
  if (perm) return SAFETY_TIERS.MANUAL_ONLY;
  if (c === 'destructive') {
    const flags = item.destructive_flags || [];
    const hasDropCol = flags.some((f) => f && f.flag === 'DROP_COLUMN');
    if (hasDropCol) return SAFETY_TIERS.REBUILD_REQUIRED;
    return SAFETY_TIERS.DESTRUCTIVE;
  }
  if (c === 'low') return SAFETY_TIERS.MODERATE;
  return SAFETY_TIERS.SAFE;
}

/**
 * @param {{ category: string, permanent_manual_block?: boolean, destructive_flags?: unknown[], source: string, name: string }} item
 */
function resolveSafetyLabels(item) {
  const labels = [];
  const perm = !!(item && item.permanent_manual_block);
  if (perm) {
    labels.push('LEGACY', 'DESTRUCTIVE', 'MANUAL_ONLY', 'BLOCKED_PERMANENTLY');
    return labels;
  }
  if (item && item.category === 'destructive') labels.push('DESTRUCTIVE');
  if (item && item.category === 'low') labels.push('MODERATE');
  if (!labels.length && item && item.category === 'safe') labels.push('SAFE');
  return labels;
}

/**
 * @param {object} item — resultado enriquecido de planForFile
 */
function buildSafetySummary(item) {
  return {
    source: item.source,
    name: item.name,
    classifier_category: item.category,
    safety_tier: resolveSafetyTier(item),
    safety_labels: resolveSafetyLabels(item),
    permanent_manual_block: !!item.permanent_manual_block
  };
}

module.exports = {
  SAFETY_TIERS,
  PERMANENT_MANUAL_ONLY_NAMES,
  VECTOR_DESTRUCTIVE_PATTERNS,
  isPermanentManualBlock,
  detectVectorDestructivePatterns,
  resolveSafetyTier,
  resolveSafetyLabels,
  buildSafetySummary
};
