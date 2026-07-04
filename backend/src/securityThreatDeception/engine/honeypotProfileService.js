'use strict';

/**
 * SEC-16 — Honeypot Profile Manager.
 * Modelos certificados — nenhum recurso existe fisicamente.
 */

const HONEYPOT_PROFILES = Object.freeze([
  'fake_env',
  'fake_git',
  'fake_backup',
  'fake_api',
  'fake_admin',
  'fake_config',
  'fake_upload',
  'fake_database'
]);

const PROFILE_DEFINITIONS = Object.freeze({
  fake_env: {
    profileId: 'fake_env',
    label: 'Fake .env exposure',
    decoyPath: '/.env.decoy',
    description: 'Modelo certificado — simula ficheiro .env falso',
    physicalResource: false,
    riskLevel: 'HIGH'
  },
  fake_git: {
    profileId: 'fake_git',
    label: 'Fake .git exposure',
    decoyPath: '/.git/HEAD.decoy',
    description: 'Modelo certificado — simula repositório git exposto',
    physicalResource: false,
    riskLevel: 'HIGH'
  },
  fake_backup: {
    profileId: 'fake_backup',
    label: 'Fake backup archive',
    decoyPath: '/backup/db.sql.decoy',
    description: 'Modelo certificado — simula backup falso',
    physicalResource: false,
    riskLevel: 'MEDIUM'
  },
  fake_api: {
    profileId: 'fake_api',
    label: 'Fake internal API',
    decoyPath: '/api/internal/v2/decoy',
    description: 'Modelo certificado — simula API interna falsa',
    physicalResource: false,
    riskLevel: 'MEDIUM'
  },
  fake_admin: {
    profileId: 'fake_admin',
    label: 'Fake admin panel',
    decoyPath: '/admin/decoy/login',
    description: 'Modelo certificado — simula painel admin falso',
    physicalResource: false,
    riskLevel: 'HIGH'
  },
  fake_config: {
    profileId: 'fake_config',
    label: 'Fake config file',
    decoyPath: '/config/app.yml.decoy',
    description: 'Modelo certificado — simula configuração falsa',
    physicalResource: false,
    riskLevel: 'MEDIUM'
  },
  fake_upload: {
    profileId: 'fake_upload',
    label: 'Fake upload endpoint',
    decoyPath: '/uploads/decoy/upload',
    description: 'Modelo certificado — simula endpoint de upload falso',
    physicalResource: false,
    riskLevel: 'MEDIUM'
  },
  fake_database: {
    profileId: 'fake_database',
    label: 'Fake database dump',
    decoyPath: '/db/export.decoy.sql',
    description: 'Modelo certificado — simula dump de base de dados falso',
    physicalResource: false,
    riskLevel: 'HIGH'
  }
});

function getProfile(profileId) {
  return PROFILE_DEFINITIONS[profileId] || null;
}

function getAllProfiles() {
  return HONEYPOT_PROFILES.map((id) => ({
    ...PROFILE_DEFINITIONS[id],
    certified: true,
    deployed: false,
    disclaimer: 'Modelo only — nenhum recurso físico exposto'
  }));
}

function matchProfileToPath(path) {
  const p = String(path || '').toLowerCase();
  if (p.includes('.env')) return 'fake_env';
  if (p.includes('.git')) return 'fake_git';
  if (p.includes('backup') || p.includes('.sql')) return 'fake_backup';
  if (p.includes('/admin')) return 'fake_admin';
  if (p.includes('/api/')) return 'fake_api';
  if (p.includes('config')) return 'fake_config';
  if (p.includes('upload')) return 'fake_upload';
  if (p.includes('database') || p.includes('/db/')) return 'fake_database';
  return null;
}

function recommendProfilesFromIncidents(incidents) {
  const matched = new Set();
  for (const inc of incidents || []) {
    for (const comp of inc.affectedComponents || []) {
      const profile = matchProfileToPath(comp);
      if (profile) matched.add(profile);
    }
    if (inc.classification === 'CREDENTIAL_SCAN') matched.add('fake_admin');
    if (inc.classification === 'PATH_ENUMERATION') matched.add('fake_env');
    if (inc.classification === 'API_ENUMERATION') matched.add('fake_api');
  }
  return [...matched].map((id) => getProfile(id)).filter(Boolean);
}

module.exports = {
  HONEYPOT_PROFILES,
  PROFILE_DEFINITIONS,
  getProfile,
  getAllProfiles,
  matchProfileToPath,
  recommendProfilesFromIncidents
};
