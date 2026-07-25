'use strict';

/**
 * WMS-001 — Contratos de integração futuros (inactivos).
 */

module.exports = Object.freeze({
  erp: { protocol: 'REST', status: 'contract_only', active: false },
  plc: { protocol: 'OPC/Modbus/MQTT', status: 'contract_only', active: false },
  collectors: { protocol: 'RF/Android', status: 'contract_only', active: false },
  label_printers: { protocol: 'ZPL/REST', status: 'contract_only', active: false },
  mqtt: { protocol: 'MQTT', status: 'contract_only', active: false },
  rest: { protocol: 'REST', status: 'contract_only', active: false }
});
