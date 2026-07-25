'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { loadEnvFiles } = require('../../config/loadEnv');

const repository = path.resolve(__dirname, '../../../..');
const ecosystemPath = path.join(repository, 'ecosystem.runtime.config.cjs');
const ecosystem = require(ecosystemPath);

const app = (name) => {
  const found = ecosystem.apps.find((candidate) => candidate.name === name);
  assert.ok(found, `${name} deve existir no ecosystem canónico`);
  return found;
};

const read = (relativePath) => fs.readFileSync(path.join(repository, relativePath), 'utf8');

test('MB-006: perfis existentes distinguem desenvolvimento e produção', () => {
  for (const name of ['impetus-backend', 'impetus-frontend', 'impetus-admin-portal']) {
    const processConfig = app(name);
    assert.equal(processConfig.env.NODE_ENV, 'development');
    assert.equal(processConfig.env_production.NODE_ENV, 'production');
  }

  const source = `${read('ecosystem.config.js')}\n${read('ecosystem.runtime.config.cjs')}`;
  assert.doesNotMatch(source, /env_(?:staging|homologation|homologacao)/i);
});

test('MB-006: script backend resolve a partir do cwd configurado', () => {
  const backend = app('impetus-backend');
  const resolvedScript = path.resolve(backend.cwd, backend.script);

  assert.equal(resolvedScript, path.join(repository, 'backend/src/server.js'));
  assert.equal(fs.existsSync(resolvedScript), true);
});

test('MB-006: adaptador não muta o ecosystem certificado', () => {
  const certified = require(path.join(repository, 'ecosystem.config.js'));
  const certifiedBackend = certified.apps.find((candidate) => candidate.name === 'impetus-backend');
  const certifiedFrontend = certified.apps.find((candidate) => candidate.name === 'impetus-frontend');

  assert.equal(certifiedBackend.script, './backend/src/server.js');
  assert.equal(certifiedFrontend.filter_env, undefined);
  assert.equal(app('impetus-backend').script, './src/server.js');
  assert.ok(Array.isArray(app('impetus-frontend').filter_env));
});

test('MB-006: processos web não herdam namespaces de backend', () => {
  for (const name of ['impetus-frontend', 'impetus-admin-portal']) {
    const filters = app(name).filter_env;
    assert.ok(Array.isArray(filters));
    for (const prefix of ['IMPETUS_', 'DATABASE_', 'DB_', 'PG', 'JWT_', 'OIDC_', 'OPENAI_']) {
      assert.ok(filters.includes(prefix), `${name} deve filtrar ${prefix}`);
    }
  }

  assert.equal(app('impetus-backend').filter_env, undefined);
});

test('MB-006: ambiente do processo prevalece sobre ficheiros locais', () => {
  const loader = read('backend/src/config/loadEnv.js');
  const backendPackage = JSON.parse(read('backend/package.json'));

  assert.doesNotMatch(loader, /override:\s*true/);
  assert.match(backendPackage.scripts.dev, /^NODE_ENV=development\s/);
});

test('MB-006: precedência reproduzível é processo, primário, legado e cwd', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mb006-env-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const cwd = path.join(directory, 'cwd.env');
  const legacy = path.join(directory, 'legacy.env');
  const primary = path.join(directory, 'primary.env');
  fs.writeFileSync(cwd, 'COLLISION=cwd\nCWD_ONLY=cwd\n');
  fs.writeFileSync(legacy, 'COLLISION=legacy\nLEGACY_ONLY=legacy\n');
  fs.writeFileSync(primary, 'COLLISION=primary\nPRIMARY_ONLY=primary\n');

  const environment = { COLLISION: 'process' };
  loadEnvFiles([cwd, legacy, primary], environment);

  assert.deepEqual(environment, {
    COLLISION: 'process',
    CWD_ONLY: 'cwd',
    LEGACY_ONLY: 'legacy',
    PRIMARY_ONLY: 'primary'
  });

  const withoutProcessOverride = {};
  loadEnvFiles([cwd, legacy, primary], withoutProcessOverride);
  assert.equal(withoutProcessOverride.COLLISION, 'primary');
});

test('MB-006: launchers canónicos selecionam explicitamente produção', () => {
  const launchers = [
    'scripts/pm2-secure-restart.sh',
    'scripts/continue-from-checkpoint.sh',
    'scripts/deploy-impetus.sh',
    'backend/scripts/ops/install-industrial.sh',
    'backend/scripts/runtime-unification-promotion-pipeline.sh',
    'backend/scripts/environment-shadow-activation-deploy.js',
    'infra/scripts/impetus-emergency-restore.sh'
  ];

  for (const relativePath of launchers) {
    const source = read(relativePath);
    assert.match(source, /ecosystem\.runtime\.config\.cjs/);
    assert.match(source, /--env production/);
    assert.match(source, /--update-env/);
    assert.doesNotMatch(
      source,
      /pm2\s+(?:reload|restart|start)\s+impetus-(?:backend|frontend|admin-portal)\b/
    );
  }

  assert.match(
    read('backend/scripts/ops/install-industrial.sh'),
    /pm2 startOrRestart ecosystem\.runtime\.config\.cjs/
  );
  assert.match(
    read('scripts/continue-from-checkpoint.sh'),
    /\(cd "\$ROOT" && pm2 restart ecosystem\.runtime\.config\.cjs/
  );
});
