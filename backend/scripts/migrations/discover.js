'use strict';

/**
 * Descoberta segura de migrations forward.
 *
 * Regras imutáveis (não podem ser desactivadas por flag):
 *   1. Qualquer ficheiro dentro de uma pasta cujo basename comece com "_"
 *      (ex.: _rollback, _archive, _drafts) é IGNORADO em qualquer profundidade.
 *   2. Qualquer ficheiro com nome que termine em `_rollback.sql` é IGNORADO.
 *   3. Qualquer ficheiro com nome que comece por `rollback_` é IGNORADO.
 *   4. Qualquer ficheiro cujo nome corresponda a `*.legacy.sql` é IGNORADO no
 *      forward automático (migrations congeladas / apenas referência).
 *   5. Qualquer ficheiro que não termine em `.sql` é IGNORADO.
 *
 * Ordem dos ficheiros forward:
 *   - Em `src/models/`: usa-se a lista MIGRATIONS_ORDER fornecida (legado);
 *     ficheiros não listados vão para o fim, ordenados alfabeticamente.
 *   - Em `migrations/`: ordem alfabética estrita (assumido convención numérica
 *     ou semântica auto-ordenável).
 */

const fs = require('fs');
const path = require('path');

function isRollbackName(name) {
  if (!name) return false;
  if (name.startsWith('rollback_')) return true;
  if (name.endsWith('_rollback.sql')) return true;
  return false;
}

/** Ficheiros `.legacy.sql` — congelados / fora do pipeline forward automático. */
function isLegacyFrozenSqlName(name) {
  if (!name) return false;
  return /\.legacy\.sql$/i.test(name);
}

function listSqlFilesShallow(dirAbs) {
  if (!fs.existsSync(dirAbs)) return [];
  return fs
    .readdirSync(dirAbs, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.sql') && !isLegacyFrozenSqlName(d.name))
    .map((d) => d.name);
}

function listRollbackFolderFilesShallow(dirAbs) {
  const rb = path.join(dirAbs, '_rollback');
  if (!fs.existsSync(rb)) return [];
  return fs
    .readdirSync(rb, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.sql'))
    .map((d) => d.name);
}

function discoverModelsForward(modelsDir, orderedList) {
  const all = listSqlFilesShallow(modelsDir);
  const candidates = all.filter((f) => !isRollbackName(f));
  const ignored = all.filter((f) => isRollbackName(f));
  const ordered = orderedList.filter((f) => candidates.includes(f));
  const rest = candidates.filter((f) => !orderedList.includes(f)).sort();
  return {
    forward: [...ordered, ...rest],
    ignored,
    rollbackFolder: listRollbackFolderFilesShallow(modelsDir)
  };
}

function discoverMigrationsForward(migrationsDir) {
  const all = listSqlFilesShallow(migrationsDir);
  const candidates = all.filter((f) => !isRollbackName(f));
  const ignored = all.filter((f) => isRollbackName(f));
  return {
    forward: candidates.sort(),
    ignored,
    rollbackFolder: listRollbackFolderFilesShallow(migrationsDir)
  };
}

function readIfExists(absPath) {
  try {
    return fs.readFileSync(absPath, 'utf8');
  } catch (_) {
    return null;
  }
}

module.exports = {
  isRollbackName,
  isLegacyFrozenSqlName,
  listSqlFilesShallow,
  listRollbackFolderFilesShallow,
  discoverModelsForward,
  discoverMigrationsForward,
  readIfExists
};
