'use strict';

const path = require('path');
const fs = require('fs');

const CATALOG_PATH = path.join(__dirname, '../../data/security-signature-catalog.json');

let _catalogCache = null;

function loadCatalog() {
  if (_catalogCache) return _catalogCache;
  const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
  _catalogCache = JSON.parse(raw);
  return _catalogCache;
}

function clearCatalogCache() {
  _catalogCache = null;
}

function canonicalSignalType(originalType) {
  const catalog = loadCatalog();
  return catalog.signalTypeAliases?.[originalType] || originalType;
}

function matchPathConcept(requestPath) {
  if (!requestPath) return null;
  const p = String(requestPath).split('?')[0].toLowerCase();
  const catalog = loadCatalog();

  for (const concept of catalog.concepts || []) {
    for (const pattern of concept.patterns || []) {
      const pat = String(pattern).toLowerCase();
      if (p === pat || p.startsWith(`${pat}/`) || p.includes(pat)) {
        return concept;
      }
    }
  }
  return null;
}

/** Compila regex equivalente ao HTTP_PROBE_RE do threat-watch (validação). */
function buildNodeProbeRegex() {
  const catalog = loadCatalog();
  const parts = [];
  for (const concept of catalog.concepts || []) {
    for (const pattern of concept.patterns || []) {
      parts.push(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
  }
  return new RegExp(`(?:${parts.join('|')})`, 'i');
}

function getConcepts() {
  return loadCatalog().concepts || [];
}

function getSignalTypeAliases() {
  return loadCatalog().signalTypeAliases || {};
}

module.exports = {
  loadCatalog,
  clearCatalogCache,
  canonicalSignalType,
  matchPathConcept,
  buildNodeProbeRegex,
  getConcepts,
  getSignalTypeAliases,
  CATALOG_PATH
};
