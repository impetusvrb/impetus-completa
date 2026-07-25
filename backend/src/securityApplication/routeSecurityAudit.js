'use strict';

/**
 * APPSEC-01 — Enterprise Route Security Audit (estático)
 */

const fs = require('fs');
const path = require('path');

/**
 * @param {string} serverJsPath
 */
function auditServerMounts(serverJsPath) {
  const content = fs.readFileSync(serverJsPath, 'utf8');
  const mounts = [];
  const re = /useRoute\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]([^)]*)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const mountPath = m[1];
    const modulePath = m[2];
    const rest = m[3] || '';
    const hasRequireAuth = /requireAuth/.test(rest);
    mounts.push({ mountPath, modulePath, hasRequireAuthMount: hasRequireAuth });
  }
  return mounts;
}

/**
 * @param {string} routesDir
 */
function auditRouteFiles(routesDir) {
  const findings = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.endsWith('.js')) continue;
      const rel = path.relative(routesDir, full);
      const content = fs.readFileSync(full, 'utf8');
      const hasRouterUseAuth = /router\.use\s*\(\s*requireAuth/.test(content);
      const routeHandlers = (content.match(/router\.(get|post|put|patch|delete)\s*\(/g) || []).length;
      const handlersWithAuth = (content.match(/router\.(get|post|put|patch|delete)\([^)]*requireAuth/g) || []).length;
      if (routeHandlers > 0 && !hasRouterUseAuth && handlersWithAuth < routeHandlers) {
        const unprotectedEstimate = routeHandlers - handlersWithAuth;
        if (unprotectedEstimate > 0) {
          findings.push({
            file: rel,
            routeHandlers,
            handlersWithAuth,
            unprotectedEstimate,
            severity: unprotectedEstimate > 3 ? 'medium' : 'low',
            note: 'Verificar requireAuth por handler ou auth alternativa (webhook/scim)'
          });
        }
      }
    }
  };
  walk(routesDir);
  return findings;
}

/**
 * @param {string} backendSrc
 */
function generateRouteSecurityReport(backendSrc) {
  const src = backendSrc || path.join(__dirname, '..');
  const serverPath = path.join(src, 'server.js');
  const routesDir = path.join(src, 'routes');

  const mounts = auditServerMounts(serverPath);
  const withoutMountAuth = mounts.filter((m) => !m.hasRequireAuthMount);
  const routeFindings = auditRouteFiles(routesDir);

  const publicPrefixes = [
    '/api/auth',
    '/api/companies',
    '/api/webhook',
    '/api/webhooks',
    '/api/health',
    '/api/federation',
    '/api/anam/public-config'
  ];

  const potentiallyExposed = withoutMountAuth.filter(
    (m) => !publicPrefixes.some((p) => m.mountPath.startsWith(p))
  );

  return {
    schema_version: 'appsec_route_security_v1',
    generated_at: new Date().toISOString(),
    total_mounts: mounts.length,
    mounts_without_require_auth: withoutMountAuth.length,
    potentially_exposed_mounts: potentiallyExposed.map((m) => m.mountPath),
    route_file_findings: routeFindings,
    tenant_guard_note:
      'tenantIsolationGuard injectado automaticamente quando requireAuth está no mount (useRoute)',
    status: potentiallyExposed.length > 50 ? 'review_required' : 'acceptable_with_per_route_auth'
  };
}

module.exports = {
  auditServerMounts,
  auditRouteFiles,
  generateRouteSecurityReport
};
