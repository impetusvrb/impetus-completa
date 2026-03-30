'use strict';

const db = require('../../../db');

async function insert(row) {
  const r = await db.query(
    `INSERT INTO technical_library_field_analyses (
       id, company_id, user_id, machine_label, sector, maintenance_type, urgency, observation,
       media_paths, video_path, extracted_frame_paths, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,$12)
     RETURNING *`,
    [
      row.id,
      row.company_id,
      row.user_id,
      row.machine_label,
      row.sector,
      row.maintenance_type,
      row.urgency,
      row.observation,
      JSON.stringify(row.media_paths || []),
      row.video_path || null,
      JSON.stringify(row.extracted_frame_paths || []),
      row.status || 'pending'
    ]
  );
  return r.rows[0];
}

async function updateResult(companyId, id, patch) {
  const fields = [];
  const vals = [];
  let n = 1;
  const jsonCols = new Set(['media_paths', 'extracted_frame_paths', 'ai_result', 'unity_payload']);
  const map = {
    media_paths: 'media_paths',
    video_path: 'video_path',
    extracted_frame_paths: 'extracted_frame_paths',
    status: 'status',
    ai_result: 'ai_result',
    unity_payload: 'unity_payload',
    fallback_level: 'fallback_level',
    matched_equipment_id: 'matched_equipment_id',
    error_message: 'error_message'
  };
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) {
      if (jsonCols.has(k)) {
        fields.push(`${col} = $${n}::jsonb`);
        vals.push(JSON.stringify(patch[k]));
      } else {
        fields.push(`${col} = $${n}`);
        vals.push(patch[k]);
      }
      n++;
    }
  }
  if (!fields.length) return null;
  fields.push('updated_at = now()');
  vals.push(companyId, id);
  const r = await db.query(
    `UPDATE technical_library_field_analyses SET ${fields.join(', ')}
     WHERE company_id = $${n} AND id = $${n + 1}
     RETURNING *`,
    vals
  );
  return r.rows[0] || null;
}

async function findById(companyId, id) {
  const r = await db.query(
    `SELECT * FROM technical_library_field_analyses WHERE company_id = $1 AND id = $2`,
    [companyId, id]
  );
  return r.rows[0] || null;
}

module.exports = { insert, updateResult, findById };
