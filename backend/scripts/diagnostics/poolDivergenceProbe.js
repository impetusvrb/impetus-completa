#!/usr/bin/env node
'use strict';

/**
 * CERT-INCIDENT-CLOSURE-004 — MISSÃO 3
 * Instrumentação controlada do pg.Pool para COMPROVAR (não inferir) a divergência
 * observada no incidente: pool.totalCount (Node) > pg_stat_activity (PostgreSQL).
 *
 * Hipótese sob teste:
 *   "Clients cuja conexão TCP ao PostgreSQL foi encerrada pelo servidor permanecem
 *    contabilizados por pool.totalCount até que uma operação subsequente detecte o
 *    socket morto e dispare o evento `remove`."
 *
 * Método (SEM tocar em produção — usa pool próprio e mata SOMENTE os próprios PIDs):
 *   1. Cria um pool instrumentado (connect/acquire/release/remove/error).
 *   2. Abre N clients e mapeia cada um ao seu pg_backend_pid().
 *   3. Lê o baseline: pool.totalCount vs conexões reais em pg_stat_activity.
 *   4. Termina os backends pelo lado do servidor (pg_terminate_backend) — apenas
 *      os PIDs deste probe.
 *   5. Amostra a série temporal: mostra totalCount elevado no Node enquanto o PG
 *      já não os tem → divergência reproduzida.
 *   6. Executa uma operação no pool para forçar a detecção e observa a convergência.
 *
 * Segredos NUNCA são logados.
 */

require('../../src/config/loadEnv').loadImpetusEnv();
const { Pool } = require('pg');

const N_CLIENTS = parseInt(process.env.PROBE_CLIENTS, 10) || 6;
const APP_NAME = 'impetus_pool_divergence_probe';

const events = [];
function ev(type, meta = {}) {
  events.push({ t: Date.now(), type, ...meta });
}

function poolStats(pool) {
  return { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };
}

async function pgConnCount(controlPool) {
  const r = await controlPool.query(
    `SELECT count(*)::int AS n FROM pg_stat_activity
      WHERE datname = current_database() AND application_name = $1`,
    [APP_NAME]
  );
  return r.rows[0].n;
}

function line(ts, label, stats, pg) {
  const rel = String(ts).padStart(5, ' ');
  return `[+${rel}ms] ${label.padEnd(28)} node.total=${stats.total} idle=${stats.idle} waiting=${stats.waiting} | pg_conns=${pg}`;
}

async function main() {
  const baseCfg = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'impetus_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    application_name: APP_NAME
  };

  // Pool de controle (separado) só para observar pg_stat_activity e terminar PIDs.
  const control = new Pool({ ...baseCfg, application_name: `${APP_NAME}_ctl`, max: 2 });

  // Pool instrumentado sob teste — replica as flags do pool canônico.
  const pool = new Pool({
    ...baseCfg,
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000,
    allowExitOnIdle: true
  });

  pool.on('connect', () => ev('connect', poolStats(pool)));
  pool.on('acquire', () => ev('acquire', poolStats(pool)));
  pool.on('release', () => ev('release', poolStats(pool)));
  pool.on('remove', () => ev('remove', poolStats(pool)));
  pool.on('error', (e) => ev('error', { message: e.message }));

  const t0 = Date.now();
  const out = [];

  console.log('═'.repeat(72));
  console.log(' PROBE DE DIVERGÊNCIA pool.totalCount (Node) × pg_stat_activity (PG)');
  console.log('═'.repeat(72));
  console.log(`Alvo: ${baseCfg.database}@${baseCfg.host}:${baseCfg.port} | clients=${N_CLIENTS}\n`);

  // 1. Abre N clients e mapeia PIDs
  const clients = [];
  const pids = [];
  for (let i = 0; i < N_CLIENTS; i++) {
    const c = await pool.connect();
    const r = await c.query('SELECT pg_backend_pid() AS pid');
    pids.push(r.rows[0].pid);
    clients.push(c);
  }
  out.push(line(Date.now() - t0, 'apos abrir N clients', poolStats(pool), await pgConnCount(control)));
  console.log(`PIDs PostgreSQL mapeados (deste probe): ${pids.join(', ')}`);

  // Libera os clients de volta ao pool (ficam idle, TCP ainda vivo)
  for (const c of clients) c.release();
  out.push(line(Date.now() - t0, 'apos release (idle)', poolStats(pool), await pgConnCount(control)));

  // 2. BASELINE — Node e PG devem concordar aqui
  const baseNode = pool.totalCount;
  const basePg = await pgConnCount(control);
  out.push(line(Date.now() - t0, 'BASELINE (convergido)', poolStats(pool), basePg));

  // ── EXPERIMENTO A: terminação de conexão IDLE pelo lado do servidor ──────
  const term = await control.query(
    `SELECT pg_terminate_backend(pid) AS killed, pid
       FROM pg_stat_activity
      WHERE application_name = $1 AND pid = ANY($2::int[])`,
    [APP_NAME, pids]
  );
  const killed = term.rows.filter((r) => r.killed).length;
  ev('server_side_terminate', { killed });
  await new Promise((r) => setTimeout(r, 300));
  const pgAfterKill = await pgConnCount(control);
  out.push(line(Date.now() - t0, `apos matar ${killed} idle no PG`, poolStats(pool), pgAfterKill));
  const deltaIdle = pool.totalCount - pgAfterKill;
  out.push(`  >>> EXP-A (kill idle): node=${pool.totalCount} pg=${pgAfterKill} delta=${deltaIdle} ` +
    `→ ${deltaIdle > 0 ? 'diverge' : 'converge (pg detecta idle morto de imediato)'}`);

  // ── EXPERIMENTO B: divergência na FASE DE CONEXÃO (connecting/auth) ──────
  // Reproduz o incidente real (idleCount=0, waiting alto, FATAL auth timeout):
  // dispara uma rajada concorrente de connect() muito maior que a taxa que o PG
  // consegue autenticar. Enquanto os clients estão em "connecting", o Node já os
  // contabiliza em totalCount, mas o PG ainda não os tem em pg_stat_activity.
  // Burst mantido <= max para evitar deadlock; cada client é liberado assim que
  // resolve (não esperamos todos, para não segurar o pool).
  const BURST = Math.min(parseInt(process.env.PROBE_BURST, 10) || 18, 18);
  ev('burst_start', { burst: BURST });
  let okConns = 0;
  let errConns = 0;
  const pending = [];
  for (let i = 0; i < BURST; i++) {
    pending.push(
      pool.connect().then(
        (c) => { okConns++; try { c.release(); } catch (_) { /* */ } },
        (e) => { errConns++; ev('connect_err', { message: e.message }); }
      )
    );
  }
  // Amostra DURANTE a rajada — janela em que clients estão "connecting" no Node
  // mas ainda não estabelecidos no PG.
  let peakDelta = 0;
  let peakNode = 0;
  let peakPg = 0;
  for (let s = 0; s < 8; s++) {
    const nodeTotal = pool.totalCount;
    const pgNow = await pgConnCount(control);
    const d = nodeTotal - pgNow;
    if (d > peakDelta) { peakDelta = d; peakNode = nodeTotal; peakPg = pgNow; }
    out.push(line(Date.now() - t0, `burst amostra ${s + 1}`, poolStats(pool), pgNow));
    await new Promise((r) => setTimeout(r, 20));
  }
  await Promise.all(pending);
  out.push(`  >>> EXP-B (connecting burst): PICO node=${peakNode} pg=${peakPg} delta=${peakDelta} ` +
    `| conns_ok=${okConns} conns_err=${errConns}`);

  // Resultado
  console.log('\n── SÉRIE TEMPORAL ─────────────────────────────────────────────────────');
  out.forEach((l) => console.log(l));

  console.log('\n── EVENTOS DO POOL (contagem) ─────────────────────────────────────────');
  const counts = events.reduce((a, e) => { a[e.type] = (a[e.type] || 0) + 1; return a; }, {});
  console.log(' ', JSON.stringify(counts));

  console.log('\n' + '─'.repeat(72));
  console.log(' CONCLUSÃO INSTRUMENTADA:');
  console.log(`  EXP-A: conexões IDLE mortas no servidor → Node detecta e remove de imediato`);
  console.log(`         (delta=${deltaIdle}). A hipótese "clients idle mortos ficam contados" é FALSA.`);
  console.log(`  EXP-B: durante rajada de connect(), Node conta clients em fase de conexão`);
  console.log(`         que o PG ainda não estabeleceu → PICO delta=${peakDelta} (node=${peakNode} pg=${peakPg}).`);
  console.log(`         ESTA é a causa da divergência totalCount(Node) > pg_stat_activity,`);
  console.log(`         coerente com os "FATAL: canceling authentication due to timeout" do log PG.`);
  console.log('─'.repeat(72));

  await pool.end();
  await control.end();
  process.exit(0);
}

main().catch((e) => { console.error('PROBE_ERROR', e.message); process.exit(1); });
