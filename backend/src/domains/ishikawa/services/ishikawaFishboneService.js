'use strict';

const db = require('../../../db');
const { v4: uuidv4 } = require('uuid');
const {
  ISHIKAWA_CATEGORY_KEYS,
  ISHIKAWA_CATEGORY_LABELS,
  buildIshikawaTemplate
} = require('../core/ishikawaRootCauseAlgorithms');
const { fiveWhysChain } = require('../core/ishikawaRootCauseAlgorithms');

async function createFishboneDiagram(client, companyId, investigationId, effectLabel) {
  const diagramId = uuidv4();
  await client.query(
    `INSERT INTO ishikawa_fishbone_diagrams (id, company_id, investigation_id, effect_label)
     VALUES ($1,$2,$3,$4)`,
    [diagramId, companyId, investigationId, effectLabel]
  );

  const template = buildIshikawaTemplate();
  let sort = 0;
  for (const key of ISHIKAWA_CATEGORY_KEYS) {
    await client.query(
      `INSERT INTO ishikawa_fishbone_categories
        (id, company_id, diagram_id, category_key, label, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuidv4(), companyId, diagramId, key, ISHIKAWA_CATEGORY_LABELS[key], sort++]
    );
  }
  return diagramId;
}

async function loadFishboneDiagram(companyId, investigationId) {
  const d = await db.query(
    `SELECT * FROM ishikawa_fishbone_diagrams WHERE investigation_id = $1 AND company_id = $2`,
    [investigationId, companyId]
  );
  if (!d.rows[0]) return null;

  const categories = await db.query(
    `SELECT c.*,
       COALESCE(
         json_agg(
           json_build_object(
             'id', ca.id,
             'cause_text', ca.cause_text,
             'is_root_candidate', ca.is_root_candidate,
             'severity', ca.severity,
             'evidence_ref', ca.evidence_ref,
             'sort_order', ca.sort_order
           ) ORDER BY ca.sort_order, ca.created_at
         ) FILTER (WHERE ca.id IS NOT NULL),
         '[]'::json
       ) AS causes
     FROM ishikawa_fishbone_categories c
     LEFT JOIN ishikawa_fishbone_causes ca ON ca.category_id = c.id
     WHERE c.diagram_id = $1 AND c.company_id = $2
     GROUP BY c.id
     ORDER BY c.sort_order`,
    [d.rows[0].id, companyId]
  );

  return {
    diagram: d.rows[0],
    categories: categories.rows
  };
}

async function addFishboneCause(companyId, investigationId, { category_key, cause_text, is_root_candidate, severity, evidence_ref }) {
  const key = String(category_key || '').toUpperCase();
  if (!ISHIKAWA_CATEGORY_KEYS.includes(key)) {
    throw new Error(`invalid category_key: ${category_key}`);
  }
  if (!cause_text) throw new Error('cause_text required');

  const cat = await db.query(
    `SELECT c.id FROM ishikawa_fishbone_categories c
     JOIN ishikawa_fishbone_diagrams d ON d.id = c.diagram_id
     WHERE d.investigation_id = $1 AND d.company_id = $2 AND c.category_key = $3`,
    [investigationId, companyId, key]
  );
  if (!cat.rows[0]) throw new Error('fishbone diagram not found');

  const r = await db.query(
    `INSERT INTO ishikawa_fishbone_causes
      (id, company_id, category_id, cause_text, is_root_candidate, severity, evidence_ref)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      uuidv4(),
      companyId,
      cat.rows[0].id,
      cause_text,
      is_root_candidate === true,
      severity || null,
      evidence_ref || null
    ]
  );
  return r.rows[0];
}

async function createFiveWhyAnalysis(companyId, investigationId, { fishbone_cause_id, answers = [] }) {
  const parsed = fiveWhysChain(answers);
  const analysisId = uuidv4();
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO ishikawa_five_why_analyses
        (id, company_id, investigation_id, fishbone_cause_id, root_hypothesis, depth)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        analysisId,
        companyId,
        investigationId,
        fishbone_cause_id || null,
        parsed.root_hypothesis,
        parsed.depth
      ]
    );
    for (const step of parsed.chain) {
      await client.query(
        `INSERT INTO ishikawa_five_why_steps (id, company_id, analysis_id, step_number, answer_text)
         VALUES ($1,$2,$3,$4,$5)`,
        [uuidv4(), companyId, analysisId, step.step, step.answer]
      );
    }
    await client.query('COMMIT');
    return getFiveWhyAnalysis(companyId, analysisId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function getFiveWhyAnalysis(companyId, analysisId) {
  const a = await db.query(
    'SELECT * FROM ishikawa_five_why_analyses WHERE id = $1 AND company_id = $2',
    [analysisId, companyId]
  );
  if (!a.rows[0]) return null;
  const steps = await db.query(
    'SELECT * FROM ishikawa_five_why_steps WHERE analysis_id = $1 ORDER BY step_number',
    [analysisId]
  );
  return { analysis: a.rows[0], steps: steps.rows };
}

async function listFiveWhyAnalyses(companyId, investigationId) {
  const rows = await db.query(
    'SELECT * FROM ishikawa_five_why_analyses WHERE investigation_id = $1 AND company_id = $2 ORDER BY created_at',
    [investigationId, companyId]
  );
  const out = [];
  for (const row of rows.rows) {
    out.push(await getFiveWhyAnalysis(companyId, row.id));
  }
  return out;
}

module.exports = {
  createFishboneDiagram,
  loadFishboneDiagram,
  addFishboneCause,
  createFiveWhyAnalysis,
  getFiveWhyAnalysis,
  listFiveWhyAnalyses,
  buildIshikawaTemplate,
  fiveWhysChain
};
