'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { REPO } = require('./ops001ManifestLoader');

function _statSafe(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function _git(args) {
  const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8' });
  if (r.status !== 0) return null;
  return (r.stdout || '').trim() || null;
}

function validateBuild() {
  const distIndex = path.join(REPO, 'frontend/dist/index.html');
  const distStat = _statSafe(distIndex);
  const gitHead = _git(['rev-parse', 'HEAD']);
  const gitDate = _git(['log', '-1', '--format=%ci']);
  const gitSubject = _git(['log', '-1', '--format=%s']);

  const distAssets = path.join(REPO, 'frontend/dist/assets');
  let wmsChunks = [];
  if (fs.existsSync(distAssets)) {
    wmsChunks = fs
      .readdirSync(distAssets)
      .filter((f) => /LogisticsOperational|logisticsOperational|wms/i.test(f));
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'frontend/package.json'), 'utf8'));
  const backendPkg = JSON.parse(fs.readFileSync(path.join(REPO, 'backend/package.json'), 'utf8'));

  const checks = [
    {
      id: 'dist_index_present',
      status: distStat ? 'PASS' : 'FAIL',
      observed: distStat ? distIndex : 'missing',
      impact: distStat ? 'Build estática publicada' : 'Frontend sem artefacto dist'
    },
    {
      id: 'wms004_chunks_in_dist',
      status: wmsChunks.length >= 2 ? 'PASS' : wmsChunks.length ? 'WARNING' : 'FAIL',
      observed: wmsChunks.length,
      files: wmsChunks.slice(0, 8),
      impact: 'Presença de chunks WMS-004 na build entregue'
    },
    {
      id: 'git_commit_available',
      status: gitHead ? 'PASS' : 'WARNING',
      observed: gitHead || 'n/a',
      commit_date: gitDate,
      commit_subject: gitSubject,
      impact: 'Rastreabilidade commit → implantação'
    },
    {
      id: 'frontend_version',
      status: 'PASS',
      observed: pkg.version || 'n/a',
      impact: 'Versão package frontend'
    },
    {
      id: 'backend_version',
      status: 'PASS',
      observed: backendPkg.version || 'n/a',
      impact: 'Versão package backend'
    }
  ];

  let overall = 'PASS';
  if (checks.some((c) => c.status === 'FAIL')) overall = 'FAIL';
  else if (checks.some((c) => c.status === 'WARNING')) overall = 'WARNING';

  return Object.freeze({
    classification: overall,
    dist_mtime: distStat ? distStat.mtime.toISOString() : null,
    git_head: gitHead,
    git_commit_date: gitDate,
    wms_dist_chunks: wmsChunks,
    checks
  });
}

module.exports = { validateBuild };
