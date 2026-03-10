/**
 * Pós-build: Ofusca arquivos JS gerados pelo Vite
 * Renomeia variáveis, remove comentários, dificulta engenharia reversa
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const DIST = path.join(__dirname, '..', 'dist');
const ASSETS = path.join(DIST, 'assets');

function obfuscateFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const obfuscated = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 5,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 1,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 2,
    stringArrayWrappersType: 'variable',
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    unicodeEscapeSequence: false
  });
  fs.writeFileSync(filePath, obfuscated.getObfuscatedCode());
}

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) processDir(full);
    else if (item.endsWith('.js')) {
      console.log('[Obfuscate]', full);
      obfuscateFile(full);
    }
  }
}

if (fs.existsSync(ASSETS)) {
  processDir(ASSETS);
  console.log('[Obfuscate] Concluído.');
} else {
  console.warn('[Obfuscate] Pasta dist/assets não encontrada. Execute "npm run build" primeiro.');
}
