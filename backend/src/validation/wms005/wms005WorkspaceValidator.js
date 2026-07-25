'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '../../../..');

function validateWorkspaceRegistration() {
  const checks = [];
  const app = fs.readFileSync(path.join(REPO, 'frontend/src/App.jsx'), 'utf8');
  const wmsReg = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/logistics-operational/routes/wmsOperationalRegistry.js'),
    'utf8'
  );
  const wmsMod = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/logistics-operational/routes/wmsModuleRegistry.js'),
    'utf8'
  );
  const supplyReg = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/supply/routes/supplyWorkspaceRegistry.js'),
    'utf8'
  );
  const wmsApi = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/logistics-operational/services/wmsV1ApiClient.js'),
    'utf8'
  );

  checks.push({ id: 'wms_route', ok: app.includes('/app/logistics-operational/workspace') && app.includes('/app/logistics/*') });
  checks.push({ id: 'supply_route', ok: app.includes('/app/supply/workspace') });
  checks.push({ id: 'wms_v1_client', ok: wmsApi.includes('/logistics-operational/v1') });
  checks.push({
    id: 'wms_nav_rbac',
    ok: wmsReg.includes('getWmsSidebarModules') && wmsMod.includes('filterNavByRbac')
  });
  checks.push({
    id: 'wms_modules',
    ok: wmsMod.includes('receiving') && wmsMod.includes('picking')
  });
  checks.push({ id: 'supply_cc_registry', ok: supplyReg.includes('SUPPLY_COMMAND_CENTER') });
  checks.push({ id: 'no_legacy_overview', ok: !wmsApi.includes('/operations/overview') });

  const valid = checks.every((c) => c.ok);
  return Object.freeze({ valid, checks });
}

module.exports = {
  validateWorkspaceRegistration
};
