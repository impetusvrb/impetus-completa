'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repository = path.resolve(__dirname, '../../../..');
const certified = require(path.join(repository, 'ecosystem.config.js'));
const runtime = require(path.join(repository, 'ecosystem.runtime.config.cjs'));

const app = (configuration, name) => {
  const found = configuration.apps.find((candidate) => candidate.name === name);
  assert.ok(found, `${name} deve existir`);
  return found;
};

const read = (relativePath) => fs.readFileSync(path.join(repository, relativePath), 'utf8');

test('MB-007: timeout PM2 excede o watchdog de shutdown do backend', () => {
  const server = read('backend/src/server.js');
  const watchdogMatch = server.match(
    /watchdog timeout[^]*?process\.exit\(1\);\s*\},\s*(\d+)\s*\);/
  );
  assert.ok(watchdogMatch, 'watchdog de shutdown deve permanecer explícito');

  const watchdogMs = Number(watchdogMatch[1]);
  const runtimeBackend = app(runtime, 'impetus-backend');
  assert.equal(watchdogMs, 12000);
  assert.equal(runtimeBackend.kill_timeout, 15000);
  assert.ok(runtimeBackend.kill_timeout > watchdogMs);
});

test('MB-007: proteção de timeout não mascara OOM nem altera autorestart', () => {
  const certifiedBackend = app(certified, 'impetus-backend');
  const runtimeBackend = app(runtime, 'impetus-backend');

  assert.equal(runtimeBackend.max_memory_restart, certifiedBackend.max_memory_restart);
  assert.equal(runtimeBackend.autorestart, true);
  assert.equal(runtimeBackend.watch, false);
  assert.equal(runtimeBackend.cron_restart, undefined);
  assert.equal(runtimeBackend.exp_backoff_restart_delay, undefined);
});

test('MB-007: operações PM2 mutáveis exigem autorização explícita', () => {
  const rule = read('.cursor/rules/pm2-runtime-operation-safety.mdc');

  assert.match(rule, /alwaysApply: true/);
  assert.match(rule, /sem autorização explícita do prompt/);
  assert.match(rule, /ecosystem\.runtime\.config\.cjs --env production/);
  assert.match(rule, /no máximo um restart por processo/);
  assert.match(rule, /Nunca aumentar memória, timeout ou número de reinícios apenas para ocultar/);
});
