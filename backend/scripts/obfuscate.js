#!/usr/bin/env node
'use strict';

/**
 * Build ofuscado — wrapper mínimo para javascript-obfuscator.
 * Uso: npm run build:obfuscated
 */

const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../dist-obfuscated');
const srcDir = path.join(__dirname, '../dist');

if (!fs.existsSync(srcDir)) {
  console.error('[obfuscate] Diretório dist/ não encontrado. Execute build antes.');
  process.exit(1);
}

let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require('javascript-obfuscator');
} catch (e) {
  console.error('[obfuscate] javascript-obfuscator não instalado:', e.message);
  process.exit(1);
}

function walkJs(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkJs(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

fs.mkdirSync(targetDir, { recursive: true });
const files = walkJs(srcDir);
let count = 0;

for (const file of files) {
  const rel = path.relative(srcDir, file);
  const dest = path.join(targetDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const code = fs.readFileSync(file, 'utf8');
  const obfuscated = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    stringArray: true,
    stringArrayThreshold: 0.5
  }).getObfuscatedCode();
  fs.writeFileSync(dest, obfuscated);
  count++;
}

console.log(`[obfuscate] OK — ${count} ficheiro(s) → ${targetDir}`);
