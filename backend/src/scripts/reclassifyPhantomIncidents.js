'use strict';

const db = require('../db');

const DRY_RUN = process.argv.includes('--execute') ? false : true;

async function reclassifyPhantomIncidents() {
  console.info('[RECLASSIFY_PHANTOM] Iniciando...', { dry_run: DRY_RUN });

  const query = `
    SELECT id, trace_id, incident_type, severity, status, metadata
    FROM ai_incidents
    WHERE status NOT IN ('FALSE_POSITIVE', 'RESOLVED')
    AND (
      trace_id IS NULL
      OR metadata->>'data_state_at_complaint' = 'tenant_empty'
      OR metadata->>'data_state_at_complaint' IS NULL
    )
    ORDER BY created_at DESC
    LIMIT 500
  `;

  let rows;
  try {
    const result = await db.query(query);
    rows = result.rows || [];
  } catch (err) {
    console.error('[RECLASSIFY_PHANTOM] Erro ao consultar:', err.message);
    if (err.message && err.message.includes('does not exist')) {
      console.info('[RECLASSIFY_PHANTOM] Tabela ai_incidents pode não existir. Terminando.');
      return;
    }
    throw err;
  }

  console.info(`[RECLASSIFY_PHANTOM] Encontrados ${rows.length} candidatos`);

  let reclassified = 0;
  for (const row of rows) {
    if (DRY_RUN) {
      console.info('[RECLASSIFY_PHANTOM][DRY_RUN] Candidato:', {
        id: row.id,
        type: row.incident_type,
        severity: row.severity,
        status: row.status,
        trace_id: row.trace_id || 'NULL'
      });
      reclassified++;
      continue;
    }

    try {
      await db.query(
        `UPDATE ai_incidents
         SET status = 'FALSE_POSITIVE',
             metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2`,
        [
          JSON.stringify({
            resolution_note: 'Reclassificação automática — fase 3 do plano cognitivo',
            reclassified_at: new Date().toISOString(),
            reclassified_by: 'reclassifyPhantomIncidents.js'
          }),
          row.id
        ]
      );
      reclassified++;
    } catch (err) {
      console.error('[RECLASSIFY_PHANTOM] Erro ao atualizar:', row.id, err.message);
    }
  }

  console.info(`[RECLASSIFY_PHANTOM] ${DRY_RUN ? 'DRY RUN' : 'EXECUTADO'}: ${reclassified} de ${rows.length} reclassificados`);
}

if (require.main === module) {
  reclassifyPhantomIncidents()
    .then(() => {
      console.info('[RECLASSIFY_PHANTOM] Concluído.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[RECLASSIFY_PHANTOM] Falha:', err);
      process.exit(1);
    });
}

module.exports = { reclassifyPhantomIncidents };
