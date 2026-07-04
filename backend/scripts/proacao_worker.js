#!/usr/bin/env node
'use strict';

/**
 * Alias legado npm run proacao-worker.
 * O worker cron histórico foi removido (AUD-WORKERS-01); automação Pró-Ação
 * permanece via API / eventos — não há runner PM2 dedicado equivalente.
 *
 * Uso: npm run proacao-worker
 */

console.error(`
[proacao-worker] O script legado scripts/proacao_worker.js foi descontinuado.

Automação Pró-Ação disponível via:
  - API: POST /api/proacao/evaluate
  - Módulo: backend/src/services/proacao.js

Para orquestração batch, avalie AUD-WORKERS-01_REPORT.md (P2 backlog).
`);
process.exit(2);
