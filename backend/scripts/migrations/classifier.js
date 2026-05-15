'use strict';

/**
 * Classificador estático de migrations IMPETUS.
 *
 * Devolve, para cada statement ou ficheiro, a sua categoria de risco e os
 * "destructive flags" que disparou. O resultado é estritamente observacional
 * — quem decide bloquear ou prosseguir é o runner.
 *
 * Categorias (classifier): 'safe' | 'low' | 'destructive'
 * Tiers formais adicionais (relatórios / runner): ver `migrationSafetyPolicy.js` (SAFE, MODERATE,
 * DESTRUCTIVE, REBUILD_REQUIRED, LEGACY, MANUAL_ONLY).
 *
 * As regras seguintes correm sobre statements **já normalizados** pelo parser
 * (sem comentários, sem strings literais a poluir o regex).
 */

// Strip simples para análise (apenas para detector — não é executado).
function stripStringsAndComments(sql) {
  return String(sql || '')
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:""|[^"])*"/g, '""')
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g, '$$STR$$');
}

const DESTRUCTIVE = [
  {
    flag: 'DROP_TABLE',
    pattern: /\bDROP\s+TABLE\b(?!\s+IF\s+EXISTS\s+\w*_(temp|tmp|staging)\b)/i,
    severity: 'critical',
    description: 'DROP TABLE — perda permanente de dados.'
  },
  {
    flag: 'DROP_COLUMN',
    pattern: /\bALTER\s+TABLE\s+[^;]+\bDROP\s+COLUMN\b/i,
    severity: 'critical',
    description: 'DROP COLUMN — perda permanente de coluna e dados.'
  },
  {
    flag: 'DROP_SCHEMA',
    pattern: /\bDROP\s+SCHEMA\b/i,
    severity: 'critical',
    description: 'DROP SCHEMA — perda em massa de objectos.'
  },
  {
    flag: 'DROP_DATABASE',
    pattern: /\bDROP\s+DATABASE\b/i,
    severity: 'critical',
    description: 'DROP DATABASE — apaga base de dados inteira.'
  },
  {
    flag: 'TRUNCATE',
    pattern: /\bTRUNCATE\b/i,
    severity: 'critical',
    description: 'TRUNCATE — esvazia tabela (não auditável por trigger ON DELETE).'
  },
  {
    flag: 'DELETE_WITHOUT_WHERE',
    // DELETE FROM <ident> [;] sem WHERE
    pattern: /\bDELETE\s+FROM\s+(?:[a-zA-Z_][\w.]*)\s*(?:RETURNING\s|;|$)/i,
    severity: 'critical',
    description: 'DELETE FROM sem WHERE — apaga toda a tabela.'
  }
];

const LOW_RISK = [
  {
    flag: 'DROP_CONSTRAINT',
    pattern: /\bDROP\s+CONSTRAINT\b/i,
    description: 'DROP CONSTRAINT — geralmente seguro quando precede ADD CONSTRAINT.'
  },
  {
    flag: 'DROP_TRIGGER',
    pattern: /\bDROP\s+TRIGGER\b/i,
    description: 'DROP TRIGGER — seguro quando faz parte de recriação idempotente.'
  },
  {
    flag: 'DROP_INDEX',
    pattern: /\bDROP\s+INDEX\b/i,
    description: 'DROP INDEX — sem perda de dados.'
  },
  {
    flag: 'DROP_POLICY',
    pattern: /\bDROP\s+POLICY\b/i,
    description: 'DROP POLICY — sem perda de dados.'
  },
  {
    flag: 'DROP_VIEW',
    pattern: /\bDROP\s+VIEW\b/i,
    description: 'DROP VIEW — sem perda de dados (recriável).'
  },
  {
    flag: 'DROP_FUNCTION',
    pattern: /\bDROP\s+FUNCTION\b/i,
    description: 'DROP FUNCTION — sem perda de dados.'
  },
  {
    flag: 'DROP_TYPE',
    pattern: /\bDROP\s+TYPE\b/i,
    description: 'DROP TYPE — pode falhar se tipo estiver em uso.'
  }
];

function detectFlags(sql) {
  const norm = stripStringsAndComments(sql);
  const destructive = [];
  const low = [];
  for (const rule of DESTRUCTIVE) {
    if (rule.pattern.test(norm)) {
      destructive.push({ flag: rule.flag, severity: rule.severity, description: rule.description });
    }
  }
  for (const rule of LOW_RISK) {
    if (rule.pattern.test(norm)) {
      low.push({ flag: rule.flag, description: rule.description });
    }
  }
  return { destructive, low };
}

function classifyFile(sql) {
  const flags = detectFlags(sql);
  let category;
  if (flags.destructive.length > 0) category = 'destructive';
  else if (flags.low.length > 0) category = 'low';
  else category = 'safe';
  return { category, ...flags };
}

function isDestructive(sql) {
  return classifyFile(sql).category === 'destructive';
}

module.exports = {
  classifyFile,
  detectFlags,
  isDestructive,
  // exposto para testes
  _stripStringsAndComments: stripStringsAndComments
};
