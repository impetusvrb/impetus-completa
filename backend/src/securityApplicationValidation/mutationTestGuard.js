'use strict';

/**
 * CERT-INCIDENT-CLOSURE-004 — Barreira estrutural central para testes MUTÁVEIS.
 *
 * Qualquer cenário de segurança que execute mutação real (POST/PUT/PATCH/DELETE
 * ou INSERT/UPDATE/DELETE/TRUNCATE/DROP no banco) DEVE passar por
 * `assertMutationTestsAllowed()` antes da primeira operação.
 *
 * Filosofia: FAIL CLOSED. Na dúvida, aborta.
 *
 * A autorização exige CUMULATIVAMENTE:
 *   1. NODE_ENV === 'test'                  (nunca em production/staging)
 *   2. RT_MUTATION_TESTS === '1'            (opt-in explícito)
 *   3. Alvo de banco NÃO pertencente à produção  (denylist estrutural)
 *   4. Alvo de banco POSITIVAMENTE marcado como teste (allowlist estrutural:
 *      nome com padrão *_test / test_* OU TEST_DB_CONFIRMED === '1')
 *   5. (opcional, quando `verifyMarker: true`) marcador físico existente
 *      APENAS no banco de teste, provado por query.
 *
 * Não confia apenas no nome da variável de opt-in: valida o ALVO real.
 */

/** Identificadores do ambiente de PRODUÇÃO atual (nunca podem receber mutação de teste). */
const PRODUCTION_DB_NAMES = Object.freeze(['impetus_db']);
const PRODUCTION_DB_HOSTS = Object.freeze(['127.0.0.1', 'localhost', '::1']);

/** Padrão que um banco de TESTE deve satisfazer para ser aceito. */
const TEST_DB_NAME_PATTERN = /(^|[_-])test([_-]|$)/i;

/** Nome do marcador físico que só deve existir no banco de teste. */
const TEST_DB_MARKER_TABLE = '__impetus_mutation_test_marker';

class MutationTestGuardError extends Error {
  constructor(reasons, target) {
    super(`[MUTATION_TEST_GUARD] Execução mutável BLOQUEADA (fail-closed). Motivos: ${reasons.join('; ')}`);
    this.name = 'MutationTestGuardError';
    this.code = 'MUTATION_TEST_BLOCKED';
    this.reasons = reasons;
    this.target = target ? { database: target.database, host: target.host } : null;
  }
}

/**
 * Resolve o alvo de banco efetivo a partir de DATABASE_URL ou dos campos
 * individuais — a mesma precedência usada por `src/db/index.js`.
 * @returns {{ database: string, host: string, source: string }}
 */
function resolveDbTarget() {
  const url = (process.env.DATABASE_URL || '').trim();
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        database: decodeURIComponent((parsed.pathname || '').replace(/^\//, '')) || '',
        host: parsed.hostname || '',
        source: 'DATABASE_URL'
      };
    } catch (_) {
      // URL malformada → tratamos como desconhecido (fail closed adiante)
      return { database: '', host: '', source: 'DATABASE_URL_INVALID' };
    }
  }
  return {
    database: process.env.DB_NAME || process.env.PGDATABASE || '',
    host: process.env.DB_HOST || process.env.PGHOST || '',
    source: 'ENV_FIELDS'
  };
}

/**
 * Avalia (sem lançar) todas as condições. Útil para relatórios/decisões estáticas.
 * @returns {{ allowed: boolean, reasons: string[], target: object }}
 */
function evaluateMutationTests() {
  const reasons = [];
  const target = resolveDbTarget();

  if (process.env.NODE_ENV !== 'test') {
    reasons.push(`NODE_ENV='${process.env.NODE_ENV || '(vazio)'}' (exigido: 'test')`);
  }
  if (process.env.RT_MUTATION_TESTS !== '1') {
    reasons.push("RT_MUTATION_TESTS != '1' (opt-in ausente)");
  }

  const dbName = (target.database || '').toLowerCase();
  const dbHost = (target.host || '').toLowerCase();

  if (!dbName) {
    reasons.push('alvo de banco indeterminado (nome vazio)');
  } else if (PRODUCTION_DB_NAMES.includes(dbName)) {
    reasons.push(`banco alvo '${target.database}' está na denylist de PRODUÇÃO`);
  }

  // Allowlist estrutural: precisa provar que É teste (não basta "não ser produção").
  const namedAsTest = TEST_DB_NAME_PATTERN.test(dbName);
  const explicitlyConfirmed = process.env.TEST_DB_CONFIRMED === '1';
  if (dbName && !namedAsTest && !explicitlyConfirmed) {
    reasons.push(
      `banco '${target.database}' não é comprovadamente de teste ` +
      '(nome sem padrão *test* e TEST_DB_CONFIRMED != 1)'
    );
  }

  // Produção atual usa host local; se o host for de produção E o nome for de produção,
  // reforça o bloqueio (já coberto pelo nome, mas mantém defesa em profundidade).
  if (PRODUCTION_DB_HOSTS.includes(dbHost) && PRODUCTION_DB_NAMES.includes(dbName)) {
    reasons.push(`host '${target.host}' + banco '${target.database}' = perfil de produção`);
  }

  return { allowed: reasons.length === 0, reasons, target };
}

/**
 * Conveniência booleana para cenários que decidem entre validação estática e probe ao vivo.
 * @returns {boolean}
 */
function isMutationTestsAllowed() {
  return evaluateMutationTests().allowed;
}

/**
 * Barreira imperativa. Lança `MutationTestGuardError` se a mutação não for permitida.
 * @param {{ verifyMarker?: boolean, db?: { query: Function } }} [options]
 * @returns {Promise<object>} target validado
 */
async function assertMutationTestsAllowed(options = {}) {
  const { allowed, reasons, target } = evaluateMutationTests();
  if (!allowed) {
    throw new MutationTestGuardError(reasons, target);
  }

  // Camada extra opcional: exige um marcador físico existente só no banco de teste.
  if (options.verifyMarker) {
    const db = options.db || require('../db');
    let markerOk = false;
    try {
      const r = await db.query(
        `SELECT 1 FROM information_schema.tables
          WHERE table_name = $1 LIMIT 1`,
        [TEST_DB_MARKER_TABLE]
      );
      markerOk = r.rowCount > 0;
    } catch (e) {
      throw new MutationTestGuardError(
        [`falha ao verificar marcador de banco de teste: ${e.message}`],
        target
      );
    }
    if (!markerOk) {
      throw new MutationTestGuardError(
        [`marcador físico '${TEST_DB_MARKER_TABLE}' ausente — alvo não comprovado como teste`],
        target
      );
    }
  }

  return target;
}

module.exports = {
  assertMutationTestsAllowed,
  isMutationTestsAllowed,
  evaluateMutationTests,
  resolveDbTarget,
  MutationTestGuardError,
  TEST_DB_MARKER_TABLE,
  PRODUCTION_DB_NAMES,
  PRODUCTION_DB_HOSTS
};
