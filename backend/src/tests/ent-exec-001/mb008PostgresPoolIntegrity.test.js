'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const backend = path.resolve(__dirname, '../../..');
const repository = path.resolve(backend, '..');
const dbSource = fs.readFileSync(path.join(backend, 'src/db/index.js'), 'utf8');

function productionJavaScriptFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'tests' && entry.name !== 'testing') {
        files.push(...productionJavaScriptFiles(absolute));
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(absolute);
    }
  }
  return files;
}

test('MB-008: fallback do pool coincide com a configuração canónica', () => {
  const example = fs.readFileSync(path.join(backend, '.env.example'), 'utf8');

  assert.match(dbSource, /DB_POOL_MAX,\s*10\)\s*\|\|\s*20/);
  assert.doesNotMatch(dbSource, /DB_POOL_MAX,\s*10\)\s*\|\|\s*30/);
  assert.match(example, /^DB_POOL_MAX=20$/m);
  assert.match(dbSource, /DB_POOL_CONNECT_TIMEOUT,\s*10\)\s*\|\|\s*10000/);
  assert.match(dbSource, /DB_STATEMENT_TIMEOUT,\s*10\)\s*\|\|\s*60000/);
  assert.match(dbSource, /DB_IDLE_IN_TX_TIMEOUT,\s*10\)\s*\|\|\s*30000/);
});

test('MB-008: pressão do pool é observável sem amplificação ilimitada de logs', () => {
  assert.match(dbSource, /POOL_PRESSURE_LOG_INTERVAL_MS = 10000/);
  assert.match(dbSource, /suppressed_since_last_log/);
  assert.match(dbSource, /logPoolPressure\(stats\)/);
  assert.doesNotMatch(
    dbSource,
    /if \(stats\.waitingCount >= 3\) \{\s*console\.warn\('\[DB\]\[POOL_PRESSURE\]'/
  );
});

test('MB-008: aquisições diretas de produção possuem release em finally', () => {
  const suspects = [];

  for (const file of productionJavaScriptFiles(path.join(backend, 'src'))) {
    const source = fs.readFileSync(file, 'utf8')
      .replace(/\/\*[^]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const connects = (source.match(/\b(?:db\.)?pool\.connect\(/g) || []).length;
    if (connects === 0) continue;

    const releases = (source.match(/\.release\(/g) || []).length;
    const finallyBlocks = (source.match(/finally\s*\{/g) || []).length;
    if (releases < connects || finallyBlocks < connects) {
      suspects.push({
        file: path.relative(repository, file),
        connects,
        releases,
        finallyBlocks
      });
    }
  }

  assert.deepEqual(suspects, []);
});
