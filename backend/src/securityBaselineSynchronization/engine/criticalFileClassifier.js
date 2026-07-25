'use strict';

/**
 * SEC-21B — Classificação obrigatória por divergência (read-only).
 */

const fs = require('fs');
const path = require('path');
const { DOCS, resolveAbs } = require('../services/manifestComparisonService');
const { CLASSIFICATIONS } = require('../dto/baselineSynchronizationDto');

const CERT_DOCS = Object.freeze({
  'SEC-21': ['SEC_21_PRODUCTION_ACTIVATION.md', 'SEC_21_ACTIVATION_REPORT.md', 'SEC_21_REPORT.md'],
  'SEC-21A': ['SEC_21A_PRODUCTION_GO_LIVE_GATE.md', 'SEC_21A_REPORT.md'],
  'HARDENING-01': ['HARDENING-01_REPORT.md'],
  'HARDENING-02': ['INCIDENT-HARDENING-SILVY-RAN.md'],
  'SECURITY-BASELINE-01': ['SECURITY_BASELINE_01.md', 'evidence/security-baseline-01/criteria.json']
});

const FILE_PROFILES = Object.freeze({
  'backend/src/server.js': {
    causingSec: ['SEC-21', 'SEC-21A'],
    contentMarkers: ['securityProductionActivation', 'securityGoLiveGate', 'SEC-21_BOOT', 'SEC-21A_BOOT'],
    defaultClassification: 'CERTIFIED_EVOLUTION',
    architectureApproved: true,
    operationalChange: false,
    shouldRemain: true,
    eligibleForBaseline: true,
    rationale:
      'Boot tracking SEC-21/SEC-21A adicionado após snapshot baseline 2026-07-03; rotas audit em routes/audit.js'
  },
  'backend/.env.example': {
    causingSec: ['SEC-21', 'SEC-21A'],
    contentMarkers: ['SECURITY_PRODUCTION_ACTIVATION', 'SECURITY_GO_LIVE_GATE', 'SEC21A_'],
    defaultClassification: 'CERTIFIED_EVOLUTION',
    architectureApproved: true,
    operationalChange: false,
    shouldRemain: true,
    eligibleForBaseline: true,
    rationale: 'Flags SEC-21/SEC-21A documentadas; default OFF preservado'
  },
  'infra/nginx/impetus-production.conf': {
    causingSec: ['HARDENING-01', 'HARDENING-02', 'SEC-15'],
    contentMarkers: ['rate_limit', '403', '404', 'anti-scanner'],
    defaultClassification: 'EXPECTED_SECURITY_CHANGE',
    architectureApproved: true,
    operationalChange: true,
    shouldRemain: true,
    eligibleForBaseline: true,
    rationale: 'Evolução hardening pós-incidente; alinhado INCIDENT-KNOWLEDGE-BASE-01'
  },
  'infra/nginx/impetus-hardening-locations.conf': {
    causingSec: ['HARDENING-01', 'HARDENING-02', 'SEC-15'],
    contentMarkers: ['location', 'deny', '403'],
    defaultClassification: 'EXPECTED_SECURITY_CHANGE',
    architectureApproved: true,
    operationalChange: true,
    shouldRemain: true,
    eligibleForBaseline: true,
    rationale: 'Regras anti-scanner/enumeration certificadas HARDENING-01/02'
  },
  'scripts/deploy-nginx-hardening.sh': {
    causingSec: ['HARDENING-01', 'HARDENING-02'],
    contentMarkers: ['nginx', 'hardening', 'sites-available'],
    defaultClassification: 'EXPECTED_OPERATIONAL_CHANGE',
    architectureApproved: true,
    operationalChange: true,
    shouldRemain: true,
    eligibleForBaseline: true,
    rationale: 'Script operacional de deploy nginx; espelha configs repo → /etc/nginx'
  },
  '/etc/nginx/sites-available/impetus': {
    causingSec: ['HARDENING-01', 'HARDENING-02'],
    contentMarkers: [],
    defaultClassification: 'EXPECTED_OPERATIONAL_CHANGE',
    architectureApproved: true,
    operationalChange: true,
    shouldRemain: true,
    eligibleForBaseline: true,
    rationale: 'Estado deployado em produção; hash actual coincide com impetus-production.conf no repo'
  },
  'backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/Volume-10-ROADMAP-ENTERPRISE.md': {
    causingSec: ['SEC-21', 'SEC-21A', 'SEC-20'],
    contentMarkers: ['SEC-21', 'SEC-21A', 'Go-Live'],
    defaultClassification: 'CERTIFIED_EVOLUTION',
    architectureApproved: true,
    operationalChange: false,
    shouldRemain: true,
    eligibleForBaseline: true,
    rationale: 'Blueprint actualizado com SEC-21/21A; drift filesystem SEC-04 (BLUEPRINT_DRIFT)'
  }
});

function docsExist(relativePaths) {
  return relativePaths.filter((p) => fs.existsSync(path.join(DOCS, p.replace(/^backend\/docs\//, ''))));
}

function secDocsPresent(secPhases) {
  const found = [];
  for (const sec of secPhases) {
    const docs = CERT_DOCS[sec] || [];
    for (const d of docs) {
      const full = d.startsWith('evidence/') ? path.join(DOCS, d) : path.join(DOCS, d);
      if (fs.existsSync(full)) found.push(d);
    }
  }
  return found;
}

function contentMatches(absPath, markers) {
  if (!markers.length || !fs.existsSync(absPath)) return [];
  try {
    const text = fs.readFileSync(absPath, 'utf8');
    return markers.filter((m) => text.includes(m));
  } catch (_e) {
    return [];
  }
}

function classifyDivergence(entry) {
  const filePath = entry.path;
  const profile = FILE_PROFILES[filePath] || null;
  const absPath = entry.absPath || resolveAbs(filePath);

  const analysis = {
    path: filePath,
    hashDiverged: entry.issue === 'HASH_MISMATCH' || entry.issue === 'BLUEPRINT_DRIFT',
    issue: entry.issue || 'HASH_MISMATCH',
    expectedSha256: entry.expectedSha256 || entry.expected || null,
    actualSha256: entry.actualSha256 || entry.actual || null,
    causingSec: profile?.causingSec || [],
    certified: false,
    documentation: [],
    architectureApproved: false,
    operationalChange: false,
    accidentalChange: false,
    shouldRemain: null,
    shouldRevert: false,
    eligibleForBaseline: false,
    classification: 'UNKNOWN_CHANGE',
    rationale: '',
    pendingReason: null
  };

  if (!profile) {
    analysis.classification = 'CRITICAL_INVESTIGATION_REQUIRED';
    analysis.rationale = 'Ficheiro divergente sem perfil de certificação conhecido';
    analysis.pendingReason = 'Investigação manual obrigatória';
    return analysis;
  }

  analysis.causingSec = profile.causingSec;
  analysis.documentation = secDocsPresent(profile.causingSec);
  analysis.certified = analysis.documentation.length > 0;
  analysis.architectureApproved = profile.architectureApproved;
  analysis.operationalChange = profile.operationalChange;
  analysis.rationale = profile.rationale;

  const matchedMarkers = contentMatches(absPath, profile.contentMarkers || []);
  analysis.contentEvidence = matchedMarkers;

  if (matchedMarkers.length === 0 && profile.contentMarkers.length > 0 && filePath !== '/etc/nginx/sites-available/impetus') {
    analysis.classification = 'UNKNOWN_CHANGE';
    analysis.pendingReason = 'Marcadores de conteúdo esperados não encontrados — rever manualmente';
    analysis.shouldRemain = null;
    analysis.shouldRevert = false;
    analysis.eligibleForBaseline = false;
    return analysis;
  }

  analysis.classification = profile.defaultClassification;
  analysis.shouldRemain = profile.shouldRemain;
  analysis.shouldRevert = false;
  analysis.eligibleForBaseline = profile.eligibleForBaseline && analysis.certified;

  if (!analysis.certified) {
    analysis.classification = 'UNKNOWN_CHANGE';
    analysis.eligibleForBaseline = false;
    analysis.pendingReason = `Documentação em falta para ${profile.causingSec.join(', ')}`;
  }

  if (entry.issue === 'MISSING') {
    analysis.classification = 'CRITICAL_INVESTIGATION_REQUIRED';
    analysis.shouldRevert = true;
    analysis.shouldRemain = false;
    analysis.eligibleForBaseline = false;
    analysis.rationale = 'Ficheiro crítico ausente — não actualizar baseline até restaurar';
  }

  return analysis;
}

function isApprovedClassification(classification) {
  return [
    'CERTIFIED_EVOLUTION',
    'EXPECTED_OPERATIONAL_CHANGE',
    'EXPECTED_SECURITY_CHANGE'
  ].includes(classification);
}

module.exports = {
  classifyDivergence,
  isApprovedClassification,
  FILE_PROFILES,
  CLASSIFICATIONS
};
