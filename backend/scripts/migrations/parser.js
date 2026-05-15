'use strict';

/**
 * SQL splitter robusto para PostgreSQL.
 *
 * Trata correctamente, sem regex frágil:
 *   - comentários de linha   `-- …`
 *   - comentários de bloco   `/* … *​/`
 *   - strings literais       `' … ''`           (com escape SQL '' )
 *   - identificadores quoted `" … """`
 *   - dollar-quoted strings  `$$ … $$`,  `$tag$ … $tag$`
 *   - escape PostgreSQL      `E'…\\…'`           (assumido como string normal — não interfere com `;`)
 *
 * O resultado é um array de statements **com** o `;` final preservado, prontos para `db.query`.
 * Nenhum statement contém apenas comentários ou whitespace.
 *
 * Usado em produção pelo runner forward (`run-all-migrations.js`) e pelo
 * runner de rollback (`run-rollback.js`).
 */

function tokenizeAndSplit(sql) {
  const out = [];
  let buf = '';
  const len = sql.length;
  let i = 0;

  // Estado: 'normal' | 'line_comment' | 'block_comment' | 'single' | 'double' | 'dollar'
  let state = 'normal';
  let dollarTag = ''; // delimiter actual quando state === 'dollar'

  function flushIfStatement() {
    const t = buf.trim();
    if (!t) {
      buf = '';
      return;
    }
    // Remove comentários de linha vestigiais? Não — já foram tratados durante tokenização.
    out.push(t.endsWith(';') ? t : t + ';');
    buf = '';
  }

  while (i < len) {
    const c = sql[i];
    const c2 = sql[i + 1] || '';

    if (state === 'line_comment') {
      if (c === '\n') {
        state = 'normal';
        buf += '\n';
      }
      // descarta o caractere
      i += 1;
      continue;
    }

    if (state === 'block_comment') {
      if (c === '*' && c2 === '/') {
        state = 'normal';
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (state === 'single') {
      buf += c;
      if (c === "'" && c2 === "'") {
        // escape '' dentro de string literal
        buf += c2;
        i += 2;
        continue;
      }
      if (c === "'") state = 'normal';
      i += 1;
      continue;
    }

    if (state === 'double') {
      buf += c;
      if (c === '"' && c2 === '"') {
        buf += c2;
        i += 2;
        continue;
      }
      if (c === '"') state = 'normal';
      i += 1;
      continue;
    }

    if (state === 'dollar') {
      // Procurar o tag de fecho exactamente igual a dollarTag
      if (c === '$' && sql.slice(i, i + dollarTag.length) === dollarTag) {
        buf += dollarTag;
        i += dollarTag.length;
        state = 'normal';
        dollarTag = '';
        continue;
      }
      buf += c;
      i += 1;
      continue;
    }

    // state === 'normal'
    if (c === '-' && c2 === '-') {
      state = 'line_comment';
      i += 2;
      continue;
    }
    if (c === '/' && c2 === '*') {
      state = 'block_comment';
      i += 2;
      continue;
    }
    if (c === "'") {
      state = 'single';
      buf += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      state = 'double';
      buf += c;
      i += 1;
      continue;
    }
    if (c === '$') {
      // tentar abrir dollar-quote: $tag$ onde tag é [A-Za-z_][A-Za-z0-9_]*
      const m = sql.slice(i).match(/^(\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)/);
      if (m) {
        dollarTag = m[1];
        buf += dollarTag;
        i += dollarTag.length;
        state = 'dollar';
        continue;
      }
      // não é dollar-quote válido — apenas $
      buf += c;
      i += 1;
      continue;
    }
    if (c === ';') {
      buf += c;
      flushIfStatement();
      i += 1;
      continue;
    }

    buf += c;
    i += 1;
  }

  // último statement sem ;
  flushIfStatement();
  return out;
}

/**
 * Aceita o conteúdo bruto de um .sql e devolve uma lista de statements
 * (cada um pronto para `db.query`).
 */
function splitStatements(sql) {
  if (typeof sql !== 'string') return [];
  const stmts = tokenizeAndSplit(sql);
  return stmts.filter((s) => {
    // Remover statements compostos só de whitespace ou só comentários acidentais
    const stripped = s
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
    return stripped.length > 1 && stripped !== ';';
  });
}

module.exports = {
  splitStatements,
  // exposto para testes
  _tokenizeAndSplit: tokenizeAndSplit
};
