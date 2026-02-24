#!/usr/bin/env node
/**
 * Job de manutenção periódica - Impetus Comunica IA
 * Uso: node -r dotenv/config scripts/maintenance.js [--dry-run]
 * Cron sugerido: 0 3 * * * (todo dia às 3h)
 */
require('dotenv').config();
const db = require('../src/db');

const DRY_RUN = process.argv.includes('--dry-run');
const RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS, 10) || 90;

async function run(sql, params = [], label) {
  if (DRY_RUN) {
    console.log(`[DRY-RUN] ${label}:`, sql.substring(0, 60) + '...');
    return { rowCount: 0 };
  }
  const r = await db.query(sql, params);
  console.log(`[OK] ${label}: ${r.rowCount ?? r.rows?.length ?? 0} afetado(s)`);
  return r;
}

async function main() {
  console.log(`[MAINTENANCE] Iniciando ${DRY_RUN ? '(dry-run)' : ''} às ${new Date().toISOString()}`);

  try {
    // 1. Remover sessões expiradas
    const s = await run(
      'DELETE FROM sessions WHERE expires_at < now()',
      [],
      'Sessões expiradas'
    );

    // 2. Arquivar/remover audit_logs antigos (LGPD: retenção configurável)
    const a = await run(
      `DELETE FROM audit_logs WHERE created_at < now() - interval '1 day' * $1`,
      [RETENTION_DAYS],
      `audit_logs (> ${RETENTION_DAYS} dias)`
    );

    // 3. Arquivar/remover data_access_logs antigos
    const d = await run(
      `DELETE FROM data_access_logs WHERE created_at < now() - interval '1 day' * $1`,
      [RETENTION_DAYS],
      `data_access_logs (> ${RETENTION_DAYS} dias)`
    );

    // 4. VACUUM ANALYZE em tabelas grandes (não usa run() - execução direta)
    if (!DRY_RUN) {
      const tables = ['audit_logs', 'data_access_logs', 'communications', 'sessions'];
      for (const t of tables) {
        try {
          await db.query(`VACUUM ANALYZE ${t}`);
          console.log(`[OK] VACUUM ANALYZE ${t}`);
        } catch (err) {
          if (err.message?.includes('does not exist')) {
            console.log(`[SKIP] Tabela ${t} não existe`);
          } else {
            console.warn(`[WARN] VACUUM ${t}:`, err.message);
          }
        }
      }
    } else {
      console.log('[DRY-RUN] VACUUM ANALYZE seria executado em audit_logs, data_access_logs, communications, sessions');
    }

    console.log('[MAINTENANCE] Concluído.');
  } catch (err) {
    console.error('[MAINTENANCE] Erro:', err.message);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

main();
