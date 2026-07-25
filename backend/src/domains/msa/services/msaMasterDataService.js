'use strict';

const db = require('../../../db');
const { v4: uuidv4 } = require('uuid');

async function createGauge(companyId, data) {
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO msa_gauges
      (id, company_id, gauge_code, gauge_name, gauge_type, resolution, measurement_unit, calibration_due_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      id,
      companyId,
      data.gauge_code,
      data.gauge_name,
      data.gauge_type || 'variable',
      data.resolution ?? null,
      data.measurement_unit ?? null,
      data.calibration_due_date ?? null
    ]
  );
  return r.rows[0];
}

async function listGauges(companyId, { limit = 100, offset = 0 } = {}) {
  const r = await db.query(
    `SELECT * FROM msa_gauges WHERE company_id = $1 ORDER BY gauge_code
     LIMIT $2 OFFSET $3`,
    [companyId, Math.min(200, Math.max(1, limit)), Math.max(0, offset)]
  );
  return r.rows;
}

async function listInstruments(companyId, { limit = 100, offset = 0 } = {}) {
  const r = await db.query(
    `SELECT i.*, g.gauge_code, g.gauge_name
     FROM msa_instruments i
     LEFT JOIN msa_gauges g ON g.id = i.gauge_id
     WHERE i.company_id = $1
     ORDER BY i.instrument_code
     LIMIT $2 OFFSET $3`,
    [companyId, Math.min(200, Math.max(1, limit)), Math.max(0, offset)]
  );
  return r.rows;
}

async function listOperators(companyId, { limit = 100, offset = 0 } = {}) {
  const r = await db.query(
    `SELECT * FROM msa_operators WHERE company_id = $1 ORDER BY operator_code
     LIMIT $2 OFFSET $3`,
    [companyId, Math.min(200, Math.max(1, limit)), Math.max(0, offset)]
  );
  return r.rows;
}

async function listParts(companyId, { limit = 100, offset = 0 } = {}) {
  const r = await db.query(
    `SELECT * FROM msa_parts WHERE company_id = $1 ORDER BY part_number
     LIMIT $2 OFFSET $3`,
    [companyId, Math.min(200, Math.max(1, limit)), Math.max(0, offset)]
  );
  return r.rows;
}

async function listCalibrationReferences(companyId, { limit = 100, offset = 0 } = {}) {
  const r = await db.query(
    `SELECT * FROM msa_calibration_references WHERE company_id = $1 ORDER BY reference_code
     LIMIT $2 OFFSET $3`,
    [companyId, Math.min(200, Math.max(1, limit)), Math.max(0, offset)]
  );
  return r.rows;
}

async function createInstrument(companyId, data) {
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO msa_instruments
      (id, company_id, instrument_code, serial_number, gauge_id, manufacturer, model)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      id,
      companyId,
      data.instrument_code,
      data.serial_number ?? null,
      data.gauge_id ?? null,
      data.manufacturer ?? null,
      data.model ?? null
    ]
  );
  return r.rows[0];
}

async function createOperator(companyId, data) {
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO msa_operators (id, company_id, operator_code, operator_name)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, companyId, data.operator_code, data.operator_name]
  );
  return r.rows[0];
}

async function createPart(companyId, data) {
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO msa_parts (id, company_id, part_number, part_name, revision, nominal_value, unit)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      id,
      companyId,
      data.part_number,
      data.part_name,
      data.revision || 'A',
      data.nominal_value ?? null,
      data.unit ?? null
    ]
  );
  return r.rows[0];
}

async function createCalibrationReference(companyId, data) {
  const id = uuidv4();
  const r = await db.query(
    `INSERT INTO msa_calibration_references
      (id, company_id, reference_code, reference_name, nominal_value, uncertainty, unit, certificate_number, valid_until)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      id,
      companyId,
      data.reference_code,
      data.reference_name,
      data.nominal_value ?? null,
      data.uncertainty ?? null,
      data.unit ?? null,
      data.certificate_number ?? null,
      data.valid_until ?? null
    ]
  );
  return r.rows[0];
}

async function ensureGauge(companyId, gaugeId) {
  if (!gaugeId) return;
  const r = await db.query('SELECT id FROM msa_gauges WHERE id = $1 AND company_id = $2', [gaugeId, companyId]);
  if (!r.rows[0]) throw new Error('gauge not found');
}

async function ensureInstrument(companyId, instrumentId) {
  if (!instrumentId) return;
  const r = await db.query('SELECT id FROM msa_instruments WHERE id = $1 AND company_id = $2', [
    instrumentId,
    companyId
  ]);
  if (!r.rows[0]) throw new Error('instrument not found');
}

module.exports = {
  createGauge,
  listGauges,
  createInstrument,
  listInstruments,
  createOperator,
  listOperators,
  createPart,
  listParts,
  createCalibrationReference,
  listCalibrationReferences,
  ensureGauge,
  ensureInstrument
};
