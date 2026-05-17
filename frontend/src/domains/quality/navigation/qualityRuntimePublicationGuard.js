import { isQualityOperationalRuntimeEnabled } from '../operational-runtime/qualityOperationalFeatureFlags.js';
import {
  isQualityNavigationRuntimeEnabled,
  isQualityPublicationRuntimeEnabled
} from './qualityPublicationFeatureFlags.js';
import { resolveQualityNavigationPublication } from './qualityNavigationResolver.js';
import { recordQualityPublicationAudit } from './qualityPublicationAudit.js';
import { noteQualityNavigationDenied } from '../../../observability/qualityOperationalTelemetry.js';
import { qualityNavDebug } from '../../../utils/qualityNavDebug.js';

function normPath(p) {
  return String(p || '').split('?')[0].replace(/\/+$/, '') || '/';
}

/**
 * @param {object} args
 * @param {object|null} args.user
 * @param {string[]} args.visibleModules
 * @param {string} args.pathname
 * @param {string} [args.search]
 * @param {object|null} [args.serverPublication]
 */
export function assertQualityPublicationAccess(args) {
  const pathname = normPath(args.pathname);
  if (!pathname.startsWith('/app/quality/')) {
    return { ok: true, reason: null };
  }

  if (!isQualityOperationalRuntimeEnabled()) {
    noteQualityNavigationDenied('operational_runtime_off');
    qualityNavDebug('[QUALITY_ROUTE_RESOLUTION] denied', { reason: 'operational_runtime_off', pathname });
    return { ok: false, reason: 'operational_runtime_off' };
  }

  const strictPublication =
    isQualityNavigationRuntimeEnabled() && isQualityPublicationRuntimeEnabled();

  const basePub = resolveQualityNavigationPublication({
    user: args.user,
    visibleModules: args.visibleModules,
    serverPublication: null
  });

  if (!basePub.moduleOk) {
    noteQualityNavigationDenied('quality_module_denied');
    qualityNavDebug('[QUALITY_ROUTE_RESOLUTION] denied', { reason: 'quality_module_denied', pathname });
    recordQualityPublicationAudit({
      actor: args.user?.id || null,
      audience: basePub.band,
      denied_reason: 'quality_module_denied',
      route: pathname
    });
    return { ok: false, reason: 'quality_module_denied' };
  }

  if (!strictPublication) {
    return { ok: true, reason: null, publication: { legacy_operational_only: true } };
  }

  const pub = resolveQualityNavigationPublication({
    user: args.user,
    visibleModules: args.visibleModules,
    serverPublication: args.serverPublication || null
  });

  if (pub.serverBlocks || (args.serverPublication && args.serverPublication.publication_allowed === false)) {
    noteQualityNavigationDenied('server_publication_blocked');
    qualityNavDebug('[QUALITY_ROUTE_RESOLUTION] denied', { reason: 'server_publication_blocked', pathname });
    return { ok: false, reason: 'server_publication_blocked' };
  }

  recordQualityPublicationAudit({
    actor: args.user?.id || null,
    audience: pub.band,
    visibility_reason: 'strict_publication_ok',
    route: pathname,
    search: args.search || ''
  });

  return { ok: true, reason: null, publication: pub };
}
