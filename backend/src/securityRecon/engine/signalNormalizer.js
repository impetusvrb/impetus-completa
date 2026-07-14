'use strict';

const { createSecuritySignal } = require('../dto/securitySignalDto');
const { canonicalSignalType, matchPathConcept } = require('../catalog/securitySignatureCatalog');
const { hasValidatedServiceIdentity: hasServiceMarker } = require('./serviceIdentityMarker');
const { resolveIdentityContext } = require('./identityContext');
const { isLoopbackIp } = require('../../services/clientIpResolver');

function normalizeFromHttpRequest(req, resContext = {}) {
  const ip = resContext.canonicalIp || {};
  const path = (req.originalUrl || req.path || '').split('?')[0];
  const concept = matchPathConcept(path);
  const identity = resolveIdentityContext(req);

  let signalType = 'PATH_DISCOVERY';
  let detectionConfidence = 0.3;
  const metadata = {
    identityStage: identity.identityStage
  };

  if (concept) {
    signalType = concept.canonicalSignalType;
    detectionConfidence = 0.85;
    metadata.probeConcept = concept.id;
    metadata.targetTechnology = concept.targetTechnology;
    metadata.technologyPresent = concept.technologyPresent;
    metadata.probeConfidence = concept.confidence;
  }

  if (resContext.statusCode === 404 || resContext.statusCode === 444) {
    metadata.notFound = true;
    detectionConfidence = Math.max(detectionConfidence, 0.4);
  }

  return createSecuritySignal({
    sourceLayer: 'SEC01_RUNTIME',
    signalType,
    originalSignalType: signalType,
    canonicalSignalType: canonicalSignalType(signalType),
    requestId: req.id || req.headers?.['x-request-id'] || null,
    clientIp: ip.clientIp,
    immediatePeerIp: ip.immediatePeerIp,
    proxyResolutionSource: ip.resolutionSource,
    ipConfidence: ip.confidence,
    spoofRisk: ip.spoofRisk === true,
    path,
    method: req.method,
    statusCode: resContext.statusCode,
    credentialPresent: identity.credentialPresent,
    authenticated: identity.authenticatedIdentity,
    serviceIdentityPresent: hasServiceMarker(req),
    userId: identity.userId,
    companyId: identity.companyId,
    detectionConfidence,
    metadata
  });
}

function normalizeFromSec01Event(event) {
  const originalType = event.event_type || event.classification || 'PATH_DISCOVERY';
  const canonical = canonicalSignalType(originalType);

  return createSecuritySignal({
    sourceLayer: 'SEC01_RUNTIME',
    signalType: canonical,
    originalSignalType: originalType,
    canonicalSignalType: canonical,
    clientIp: event.source_ip,
    path: event.path_prefix,
    method: event.method,
    detectionConfidence: 0.7,
    metadata: {
      classification: event.classification,
      request_count: event.request_count,
      status_codes: event.status_codes
    }
  });
}

function normalizeFromThreatWatchLine(line) {
  const alertRe =
    /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\]\s+ALERT\s+(LOW|MEDIUM|HIGH|CRITICAL)\s+(\S+)\s+([0-9a-fA-F:.]+)\s+—\s+(.+)$/;
  const banRe =
    /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\]\s+BAN\s+(\S+)\s+([0-9a-fA-F:.]+)\s+—\s+(.+?)(?:\s+\(silencioso\))?$/;

  let m = line.match(alertRe);
  if (m) {
    const [, ts, severity, category, ip, detail] = m;
    return buildThreatSignal(ts, category, ip, detail, severity, false);
  }

  m = line.match(banRe);
  if (m) {
    const [, ts, category, ip, detail] = m;
    return buildThreatSignal(ts, category, ip, detail, 'HIGH', true);
  }

  return null;
}

function buildThreatSignal(ts, category, ip, detail, severity, silentBan) {
  const canonical = canonicalSignalType(category);
  const pathMatch = String(detail).match(/\b(GET|POST|PUT|DELETE|PATCH|HEAD)\s+(\S+)/i);
  const path = pathMatch ? pathMatch[2].split('?')[0] : null;
  const concept = matchPathConcept(path);

  const metadata = {
    severity,
    detail: String(detail).slice(0, 240),
    silentBan: silentBan === true,
    externalBanAlreadyApplied: true
  };

  if (concept) {
    metadata.probeConcept = concept.id;
    metadata.targetTechnology = concept.targetTechnology;
    metadata.technologyPresent = concept.technologyPresent;
  }

  return createSecuritySignal({
    timestamp: ts,
    sourceLayer: 'NGINX_THREAT_WATCH',
    signalType: canonical,
    originalSignalType: category,
    canonicalSignalType: canonical,
    clientIp: ip,
    path,
    method: pathMatch ? pathMatch[1].toUpperCase() : null,
    detectionConfidence: silentBan ? 0.9 : 0.85,
    metadata
  });
}

function normalizeFromThreatIncidentJson(doc) {
  if (!doc || !doc.category) return null;
  return buildThreatSignal(
    doc.timestamp_utc || new Date().toISOString(),
    doc.category,
    doc.source_ip,
    doc.detail || '',
    doc.severity || 'MEDIUM',
    false
  );
}

/**
 * Peer local confiável — immediatePeerIp loopback, não clientIp via XFF spoof.
 */
function isTrustedLocalPeer(signal) {
  const peer = signal.immediatePeerIp;
  if (!peer || !isLoopbackIp(peer)) return false;
  if (signal.spoofRisk === true) return false;
  if (signal.ipConfidence === 'low') return false;
  return isLoopbackIp(signal.clientIp);
}

function isInternalTrustedSignal(signal) {
  if (isTrustedLocalPeer(signal)) return true;
  if (signal.serviceIdentityPresent === true) return true;
  return false;
}

module.exports = {
  normalizeFromHttpRequest,
  normalizeFromSec01Event,
  normalizeFromThreatWatchLine,
  normalizeFromThreatIncidentJson,
  isInternalTrustedSignal,
  isTrustedLocalPeer
};
