/**
 * Copia a logo Impetus para a pasta public
 * Execute: node scripts/copy-logo.js
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');
const cursorAssets = path.join(
  process.env.USERPROFILE || process.env.HOME,
  '.cursor', 'projects', 'g-Meu-Drive-impetus-complete', 'assets',
  'g__Meu_Drive_impetus_complete_IMG-20260210-WA0013.jpg'
);
const sources = [
  path.join(projectRoot, 'assets', 'g__Meu_Drive_impetus_complete_IMG-20260210-WA0013.jpg'),
  path.join(projectRoot, 'assets', 'IMG-20260210-WA0013.jpg'),
  path.join(projectRoot, 'assets', 'logo-impetus.jpg'),
  cursorAssets,
];

const dest = path.join(__dirname, '../public/logo-impetus.jpg');
const publicDir = path.dirname(dest);

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

for (const src of sources) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Logo copiada com sucesso para', dest);
    process.exit(0);
  }
}

console.warn('Arquivo da logo não encontrado. Copie manualmente a imagem para frontend/public/logo-impetus.jpg');
process.exit(1);
