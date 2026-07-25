'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '../../..');
const FE = path.join(REPO, 'frontend/src/domains/logistics-operational');
const APP = path.join(REPO, 'frontend/src/App.jsx');
const PRES = path.join(REPO, 'frontend/src/presentation/navigation');

function readFe(rel) {
  return fs.readFileSync(path.join(FE, rel), 'utf8');
}

function readApp() {
  return fs.readFileSync(APP, 'utf8');
}

function readPres(rel) {
  return fs.readFileSync(path.join(PRES, rel), 'utf8');
}

const STANDALONE_PATHS = [
  '/app/logistics/warehouses',
  '/app/logistics/inventory',
  '/app/logistics/receiving',
  '/app/logistics/picking',
  '/app/logistics/shipping',
  '/app/logistics/transfers'
];

const MODULE_PAGES = [
  'WarehouseModulePage',
  'InventoryModulePage',
  'ReceivingModulePage',
  'PickingModulePage',
  'ShippingModulePage',
  'TransferModulePage'
];

module.exports = { REPO, FE, APP, PRES, readFe, readApp, readPres, STANDALONE_PATHS, MODULE_PAGES };
