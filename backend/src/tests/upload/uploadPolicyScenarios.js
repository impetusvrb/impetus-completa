'use strict';

/**
 * Regressão — política de upload e rota dashboard/chat/upload-file.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const uploadPolicy = require('../../config/uploadPolicy');
const { createUploadMiddleware, handleUploadError } = require('../../middleware/impetusUploadMiddleware');

function testUploadPolicy() {
  assert.ok(uploadPolicy.getMaxBytes('dashboard_chat') > 0);
  assert.strictEqual(uploadPolicy.isExtensionAllowed('.pdf', ['document']), true);
  assert.strictEqual(uploadPolicy.isExtensionAllowed('.exe', ['document']), false);
  assert.strictEqual(uploadPolicy.isMimeAllowed('application/pdf', ['document']), true);
  assert.strictEqual(uploadPolicy.isExtensionAllowed('.xlsx', ['document']), true);
  assert.strictEqual(uploadPolicy.isExtensionAllowed('.mp3', ['audio']), true);
}

function testMiddlewareFactory() {
  const mw = createUploadMiddleware({
    module: 'dashboard_chat',
    destination: path.join(__dirname, '../../uploads/chat-multimodal-test')
  });
  assert.strictEqual(typeof mw.single, 'function');
  assert.strictEqual(mw.moduleKey, 'dashboard_chat');
}

function testUploadRouteExists() {
  const dashboardSrc = fs.readFileSync(
    path.join(__dirname, '../../routes/dashboard.js'),
    'utf8'
  );
  assert.match(dashboardSrc, /\/chat\/upload-file/);
  assert.match(dashboardSrc, /processUploadedFile/);
}

async function main() {
  testUploadPolicy();
  testMiddlewareFactory();
  testUploadRouteExists();
  console.log('[upload/uploadPolicyScenarios] OK');
}

main().catch((e) => {
  console.error('[upload/uploadPolicyScenarios] FAIL', e);
  process.exit(1);
});
