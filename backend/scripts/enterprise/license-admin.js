#!/usr/bin/env node
'use strict';

/**
 * CLI administrativa de licenciamento Enterprise.
 * CERT-LICENSE-01
 *
 * Uso:
 *   node scripts/enterprise/license-admin.js status
 *   node scripts/enterprise/license-admin.js validate [--file=path]
 *   node scripts/enterprise/license-admin.js info
 *   node scripts/enterprise/license-admin.js import --file=license.json
 *   node scripts/enterprise/license-admin.js issue --installation-id=... (requer chave emissor)
 */

require('../../src/config/loadEnv').loadImpetusEnv();

const fs = require('fs');
const path = require('path');
const local = require('../../src/services/license/enterpriseLicenseLocal');
const { validateLicense, invalidateCache, resolveValidationMode, isValidationEnabled } = require('../../src/services/license');
const { getCapabilitiesPayload } = require('../../src/services/license/licenseCapabilities');
const { getMetricsSnapshot } = require('../../src/services/license/licenseObservability');
const { signLicenseDocument } = require('../../src/services/license/licenseIssuer');
const home = require('../../src/config/impetusHome');

const cmd = process.argv[2] || 'status';
const arg = (name) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};

async function main() {
  home.ensureEnterpriseDirs();

  switch (cmd) {
    case 'status': {
      const result = await validateLicense(true);
      console.log(JSON.stringify({
        enabled: isValidationEnabled(),
        mode: resolveValidationMode(),
        installation_id: local.getOrCreateInstallationId(),
        license_file: local.licenseFilePath(),
        state: result.state,
        valid: result.valid,
        operational: result.operational,
        reason: result.reason,
        metrics: getMetricsSnapshot(),
        capabilities: getCapabilitiesPayload(result),
      }, null, 2));
      break;
    }
    case 'validate': {
      const fp = arg('file');
      const result = local.validateLocalLicense({ filePath: fp || undefined });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.operational ? 0 : 1);
    }
    case 'info': {
      const fp = local.licenseFilePath();
      const read = local.readLicenseFile(fp);
      if (!read.ok) {
        console.error(read.reason, read.path);
        process.exit(1);
      }
      const { signature, ...rest } = read.doc;
      console.log(JSON.stringify({
        path: read.path,
        installation_id: local.getOrCreateInstallationId(),
        payload: rest,
        signature_present: Boolean(signature),
      }, null, 2));
      break;
    }
    case 'import': {
      const src = arg('file');
      if (!src || !fs.existsSync(src)) {
        console.error('Uso: import --file=/caminho/impetus.license.json');
        process.exit(1);
      }
      const dest = path.join(home.licensesDir(), 'impetus.license.json');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      invalidateCache();
      const result = local.validateLocalLicense({ filePath: dest });
      console.log('Importado:', dest);
      console.log(JSON.stringify({ state: result.state, operational: result.operational }, null, 2));
      break;
    }
    case 'issue': {
      const installationId = arg('installation-id') || local.getOrCreateInstallationId();
      const companyId = arg('company-id') || '00000000-0000-4000-8000-000000000001';
      const expires = arg('expires') || new Date(Date.now() + 365 * 86400000).toISOString();
      const doc = signLicenseDocument({
        installation_id: installationId,
        company_id: companyId,
        company_name: arg('company-name') || 'Empresa Enterprise',
        plan: arg('plan') || 'enterprise',
        expires_at: expires,
        max_users: parseInt(arg('max-users') || '100', 10),
        capabilities: (arg('capabilities') || 'core,anam,digital_twin,executive,executive_boardroom,voice_realtime').split(','),
      });
      const out = arg('out') || path.join(home.licensesDir(), 'impetus.license.json');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`, { mode: 0o640 });
      console.log('Licença emitida:', out);
      console.log(JSON.stringify(local.evaluateLicenseDocument(doc), null, 2));
      break;
    }
    default:
      console.error('Comandos: status | validate | info | import | issue');
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
