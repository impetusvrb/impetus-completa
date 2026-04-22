'use strict';

const db = require('../db');

/** Colunas esperadas por AdminStructural.jsx — consulta dinâmica evita 500 se o PG estiver desatualizado. */
const COMPANY_DATA_COLUMNS = [
  'id',
  'name',
  'trade_name',
  'cnpj',
  'industry_segment',
  'subsegment',
  'address',
  'city',
  'state',
  'country',
  'main_unit',
  'other_units',
  'employee_count',
  'shift_count',
  'operating_hours',
  'operation_type',
  'production_type',
  'products_manufactured',
  'market',
  'company_description',
  'mission',
  'vision',
  'values_text',
  'internal_policy',
  'operation_rules',
  'organizational_culture',
  'strategic_notes',
  'company_policy_text',
  'config',
  'active',
  'created_at',
  'updated_at'
];

async function selectCompanyRowStructural(cid) {
  const colRes = await db.query(
    `
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies'
  `
  );
  const have = new Set(colRes.rows.map((r) => r.column_name));
  const cols = COMPANY_DATA_COLUMNS.filter((c) => have.has(c));
  if (!cols.includes('id')) {
    throw new Error('Coluna id ausente em companies');
  }
  const quoted = cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(', ');
  const r = await db.query(`SELECT ${quoted} FROM companies WHERE id = $1`, [cid]);
  return { row: r.rows[0] || null, have };
}

function companyRowToApiPayload(row, have) {
  const sEmpty = (k) => {
    if (!have.has(k)) return '';
    const v = row[k];
    return v == null ? '' : String(v);
  };
  const nullable = (k) => (have.has(k) ? row[k] ?? null : null);
  return {
    id: row.id,
    name: sEmpty('name'),
    trade_name: sEmpty('trade_name'),
    cnpj: sEmpty('cnpj'),
    industry_segment: sEmpty('industry_segment'),
    subsegment: sEmpty('subsegment'),
    address: sEmpty('address'),
    city: sEmpty('city'),
    state: sEmpty('state'),
    country: sEmpty('country'),
    main_unit: sEmpty('main_unit'),
    other_units: nullable('other_units'),
    employee_count: nullable('employee_count'),
    shift_count: nullable('shift_count'),
    operating_hours: sEmpty('operating_hours'),
    operation_type: sEmpty('operation_type'),
    production_type: sEmpty('production_type'),
    products_manufactured: nullable('products_manufactured'),
    market: sEmpty('market'),
    company_description: sEmpty('company_description'),
    mission: sEmpty('mission'),
    vision: sEmpty('vision'),
    values_text: sEmpty('values_text'),
    internal_policy: sEmpty('internal_policy'),
    operation_rules: sEmpty('operation_rules'),
    organizational_culture: sEmpty('organizational_culture'),
    strategic_notes: sEmpty('strategic_notes'),
    company_policy_text: sEmpty('company_policy_text'),
    config: nullable('config'),
    active: have.has('active') ? row.active !== false : true,
    created_at: nullable('created_at'),
    updated_at: nullable('updated_at')
  };
}

module.exports = {
  COMPANY_DATA_COLUMNS,
  selectCompanyRowStructural,
  companyRowToApiPayload
};
