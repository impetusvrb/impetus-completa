'use strict';

const schemas = require('../schemas/wmsSchemas');

function validateAgainst(schema, data) {
  const errors = [];
  for (const field of schema.required || []) {
    if (data[field] == null || data[field] === '') errors.push(`${field} required`);
  }
  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateWarehouse: (data) => validateAgainst(schemas.WAREHOUSE_SCHEMA, data),
  validateAddress: (data) => validateAgainst(schemas.ADDRESS_SCHEMA, data),
  validateItem: (data) => validateAgainst(schemas.ITEM_SCHEMA, data),
  validateStock: (data) => validateAgainst(schemas.STOCK_SCHEMA, data),
  validateMovement: (data) => validateAgainst(schemas.MOVEMENT_SCHEMA, data),
  validateOrder: (data) => validateAgainst(schemas.ORDER_SCHEMA, data)
};
