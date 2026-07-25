'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO = path.join(__dirname, '../../..');
const FE = path.join(REPO, 'frontend/src/domains/logistics-operational');
const PRES = path.join(REPO, 'frontend/src/presentation/navigation');

const APP = path.join(REPO, 'frontend/src/App.jsx');

function readFe(rel) {
  return fs.readFileSync(path.join(FE, rel), 'utf8');
}

function readApp() {
  return fs.readFileSync(APP, 'utf8');
}

function readPres(rel) {
  return fs.readFileSync(path.join(PRES, rel), 'utf8');
}

const OPERATIONAL_SEGMENTS = ['warehouses', 'inventory', 'receiving', 'picking', 'shipping', 'transfers'];

const MODULE_COMPONENTS = {
  warehouses: 'WarehouseModule',
  inventory: 'InventoryModule',
  receiving: 'ReceivingModule',
  picking: 'PickingModule',
  shipping: 'ShippingModule',
  transfers: 'TransferModule'
};

const MODULE_APIS = {
  warehouses: 'listWarehouses',
  inventory: 'listItems',
  receiving: 'listReceiving',
  picking: 'listPicking',
  shipping: 'listShipping',
  transfers: 'listTransfers'
};

module.exports = {
  REPO,
  FE,
  PRES,
  APP,
  readFe,
  readApp,
  readPres,
  OPERATIONAL_SEGMENTS,
  MODULE_COMPONENTS,
  MODULE_APIS
};
