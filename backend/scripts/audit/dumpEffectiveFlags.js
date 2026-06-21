#!/usr/bin/env node
/**
 * IMPETUS CERT — Dump do estado efetivo de flags (Parte 4 do manual).
 * Read-only. Nunca imprime valores de segredos (JWT, API keys, etc.).
 *
 * Saída: backend/docs/FLAG_BASELINE_FROZEN.md
 *
 * Uso: node backend/scripts/audit/dumpEffectiveFlags.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const BACKEND_ROOT = path.join(REPO_ROOT, 'backend');
const ENV_PATH = path.join(BACKEND_ROOT, '.env');
const ENV_EXAMPLE = path.join(BACKEND_ROOT, '.env.example');
const FRONTEND_ENV_PROD = path.join(REPO_ROOT, 'frontend', '.env.production');
const OUT = path.join(BACKEND_ROOT, 'docs', 'FLAG_BASELINE_FROZEN.md');

const SECRET_PATTERNS = [
  /SECRET/i, /PASSWORD/i, /PRIVATE_KEY/i, /API_KEY/i, /TOKEN(?!_TTL)/i,
  /ENCRYPTION_KEY/i, /WEBHOOK/i, /DSN/i, /CREDENTIAL/i, /AUTH_KEY/i
];

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function isSecretKey(key) {
  return SECRET_PATTERNS.some((re) => re.test(key));
}

function truthy(v) {
  if (v == null || v === '') return false;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}

function classifyFlag(name, effective, exampleDefault) {
  const n = name.toUpperCase();
  if (/SHADOW|OBSERVE_ONLY|DRY_RUN/.test(n) && truthy(effective)) return 'SHADOW';
  if (/PILOT|TENANT_LIST|CANARY/.test(n)) return effective ? 'PILOTO' : 'DESATIVADA';
  if (/NODE_ENV|ALLOW_PARTIAL|DEV_BYPASS|LAB_/.test(n)) {
    if (process.env.NODE_ENV === 'production' && /DEV|LAB|BYPASS/.test(n)) return 'EXPERIMENTAL';
  }
  if (truthy(effective)) return 'ATIVA';
  if (effective === '' || effective == null) {
    if (exampleDefault != null && truthy(exampleDefault)) return 'ATIVA (default example)';
    return 'DESATIVADA (ausente)';
  }
  return 'DESATIVADA';
}

function collectCodeDefaults() {
  const srcDir = path.join(BACKEND_ROOT, 'src');
  const defaults = {};
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules') continue;
        walk(p);
      } else if (/\.(js|mjs|cjs)$/.test(ent.name)) {
        const content = fs.readFileSync(p, 'utf8');
        const re = /process\.env\.([A-Z0-9_]+)\s*(?:\|\||\?\?)\s*['"]([^'"]*)['"]/g;
        let m;
        while ((m = re.exec(content))) {
          if (!defaults[m[1]]) defaults[m[1]] = m[2];
        }
      }
    }
  };
  walk(srcDir);
  return defaults;
}

function collectViteFlags() {
  const out = [];
  if (!fs.existsSync(FRONTEND_ENV_PROD)) return out;
  const env = parseEnvFile(FRONTEND_ENV_PROD);
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith('VITE_') && /ENABLED|RUNTIME|VISIBILITY|SHADOW|PREVIEW|MODE/i.test(k)) {
      out.push({ name: k, effective: v, source: 'frontend/.env.production' });
    }
  }
  return out;
}

function main() {
  const effective = { ...process.env, ...parseEnvFile(ENV_PATH) };
  const example = parseEnvFile(ENV_EXAMPLE);
  const codeDefaults = collectCodeDefaults();

  const flagNames = new Set([
    ...Object.keys(example).filter((k) => /_ENABLED|_ACTIVE|_MODE|RLS|GOVERNANCE|AIOI|ORCHESTRATOR|MANUIA|EVENT_GOVERNANCE|IMPETUS_/i.test(k)),
    ...Object.keys(effective).filter((k) => /_ENABLED|_ACTIVE|_MODE|RLS|GOVERNANCE|AIOI|ORCHESTRATOR|MANUIA|EVENT_GOVERNANCE|IMPETUS_/i.test(k))
  ]);

  const rows = [];
  for (const name of [...flagNames].sort()) {
    if (isSecretKey(name)) continue;
    const eff = effective[name] ?? '';
    const ex = example[name];
    const cls = classifyFlag(name, eff, ex);
    rows.push({
      name,
      class: cls,
      effective: eff === '' ? '(ausente)' : eff,
      exampleDefault: ex != null ? ex : (codeDefaults[name] ?? '—'),
      source: effective[name] != null ? '.env/runtime' : (example[name] != null ? '.env.example only' : 'code default')
    });
  }

  const viteFlags = collectViteFlags();
  const now = new Date().toISOString();
  const active = rows.filter((r) => r.class === 'ATIVA' || r.class.startsWith('ATIVA'));
  const disabled = rows.filter((r) => r.class.startsWith('DESATIVADA'));
  const shadow = rows.filter((r) => r.class === 'SHADOW');

  const md = [
    '# FLAG BASELINE FROZEN — IMPETUS',
    '',
    `> Gerado em: **${now}**`,
    `> Script: \`backend/scripts/audit/dumpEffectiveFlags.js\``,
    `> Metodologia: Parte 4 — MANUAL_MATRIZ_FUNCIONAL_REAL.md`,
    '',
    '## Resumo',
    '',
    `| Classe | Quantidade |`,
    `|--------|------------|`,
    `| ATIVA | ${active.length} |`,
    `| DESATIVADA | ${disabled.length} |`,
    `| SHADOW | ${shadow.length} |`,
    `| Flags Vite (frontend prod) | ${viteFlags.length} |`,
    '',
    '## Flags backend (amostra — ver JSON completo no repositório)',
    '',
    '| Flag | Classe | Efetivo | Default example |',
    '|------|--------|---------|-----------------|',
    ...rows.slice(0, 80).map((r) => `| \`${r.name}\` | ${r.class} | \`${r.effective}\` | \`${r.exampleDefault}\` |`),
    rows.length > 80 ? `\n_… e mais ${rows.length - 80} flags. Regenerar para lista completa._` : '',
    '',
    '## Flags Vite (publicação de domínios — frontend produção)',
    '',
    '| Flag | Efetivo |',
    '|------|---------|',
    ...viteFlags.map((f) => `| \`${f.name}\` | \`${f.effective}\` |`),
    '',
    '## Regras de impacto na matriz',
    '',
    '- Flag **DESATIVADA** → funcionalidade controlada = status mínimo **DESABILITADO**.',
    '- Flag **SHADOW** → status mínimo **AMARELO** (observa, não age).',
    '- Flag **PILOTO** → **AMARELO** com lista de tenants.',
    '',
    '---',
    '_Segredos (JWT_SECRET, chaves de IA, etc.) nunca são incluídos neste dump._'
  ].join('\n');

  fs.writeFileSync(OUT, md, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    output: path.relative(REPO_ROOT, OUT),
    backendFlags: rows.length,
    viteFlags: viteFlags.length,
    active: active.length,
    disabled: disabled.length,
    shadow: shadow.length
  }, null, 2));
}

main();
