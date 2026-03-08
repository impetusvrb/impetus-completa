/**
 * Script de ofuscação do backend
 * Processa todos os .js em src/ e gera dist/ ofuscado
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC = path.join(__dirname, '..', 'src');
const DIST = path.join(__dirname, '..', 'dist');

const OBFS_OPTS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  renameGlobals: false,
  selfDefending: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

function obfuscate(source) {
  try {
    return JavaScriptObfuscator.obfuscate(source, OBFS_OPTS).getObfuscatedCode();
  } catch (e) {
    console.error('[Obfuscate Error]', e.message);
    return source;
  }
}

function processDir(srcDir, distDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(distDir, { recursive: true });
  const items = fs.readdirSync(srcDir);
  for (const item of items) {
    const srcPath = path.join(srcDir, item);
    const distPath = path.join(distDir, item);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      processDir(srcPath, distPath);
    } else if (item.endsWith('.js')) {
      const code = fs.readFileSync(srcPath, 'utf8');
      fs.writeFileSync(distPath, obfuscate(code));
      console.log('[Obfuscate]', srcPath, '->', distPath);
    } else {
      fs.copyFileSync(srcPath, distPath);
      console.log('[Copy]', srcPath);
    }
  }
}

if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
processDir(SRC, DIST);
console.log('[Obfuscate] Backend concluído em dist/');
