import { isSafetyOperationalRuntimeEnabled } from '../operational-runtime/safetyOperationalFeatureFlags.js';
import {
  isSafetyNavigationRuntimeEnabled,
  isSafetyPublicationRuntimeEnabled
} from './safetyPublicationFeatureFlags.js';
import { resolveSafetyNavigationPublication } from './safetyNavigationResolver.js';
import { recordSafetyPublicationAudit } from './safetyPublicationAudit.js';
import { noteSafetyNavigationDenied } from '../../../observability/safetyOperationalTelemetry.js';
import { safetyNavDebug } from '../../../utils/safetyNavDebug.js';

function normPath(p) {
  return String(p || '').split('?')[0].replace(/\/+$/, '') || '/';
}

export function assertSafetyPublicationAccess(args) {
  const pathname = normPath(args.pathname);
  if (!pathname.startsWith('/app/safety/')) {
    return { ok: true, reason: null };
  }

  if (!isSafetyOperationalRuntimeEnabled()) {
    noteSafetyNavigationDenied('operational_runtime_off');
    safetyNavDebug('[SAFETY_ROUTE_RESOLUTION] denied', { reason: 'operational_runtime_off', pathname });
    return { ok: false, reason: 'operational_runtime_off' };
  }

  const strictPublication =
    isSafetyNavigationRuntimeEnabled() && isSafetyPublicationRuntimeEnabled();

  const basePub = resolveSafetyNavigationPublication({
    user: args.user,
    visibleModules: args.visibleModules,
    serverPublication: null
  });

  if (!basePub.moduleOk) {
    noteSafetyNavigationDenied('safety_module_denied');
    recordSafetyPublicationAudit({
      actor: args.user?.id || null,
      audience: basePub.band,
      denied_reason: 'safety_module_denied',
      route: pathname
    });
    return { ok: false, reason: 'safety_module_denied' };
  }

  if (!strictPublication) {
    return { ok: true, reason: null, publication: { legacy_operational_only: true } };
  }

  const pub = resolveSafetyNavigationPublication({
    user: args.user,
    visibleModules: args.visibleModules,
    serverPublication: args.serverPublication || null
  });

  if (pub.serverBlocks || (args.serverPublication && args.serverPublication.publication_allowed === false)) {
    noteSafetyNavigationDenied('server_publication_blocked');
    return { ok: false, reason: 'server_publication_blocked' };
  }

  recordSafetyPublicationAudit({
    actor: args.user?.id || null,
    audience: pub.band,
    visibility_reason: 'strict_publication_ok',
    route: pathname,
    search: args.search || ''
  });

  return { ok: true, reason: null, publication: pub };
}
