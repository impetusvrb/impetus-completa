#!/usr/bin/env node
/**
 * Setup completo para ativação comercial
 * Executa: migrations + seed (internal_admin)
 * Uso: npm run setup:ativacao
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..');

console.log('═══════════════════════════════════════════════════════');
console.log('  IMPETUS - Setup Ativação Comercial');
console.log('═══════════════════════════════════════════════════════\n');

try {
  process.chdir(backendDir);
} catch (e) {
  console.error('Erro ao mudar diretório:', e.message);
  process.exit(1);
}

const dotenvPath = path.join(backendDir, 'node_modules', 'dotenv');
if (!fs.existsSync(dotenvPath)) {
  console.log('[0/3] Dependências não encontradas. Executando npm install...');
  execSync('npm install', { stdio: 'inherit', cwd: backendDir });
  console.log('');
}

try {
  console.log('[1/2] Executando migrations...');
  execSync('node scripts/run-all-migrations.js', {
    stdio: 'inherit',
    cwd: backendDir
  });

  console.log('\n[2/2] Executando seed (internal_admin)...');
  execSync('node scripts/seed-initial.js', {
    stdio: 'inherit',
    cwd: backendDir
  });
} catch (err) {
  console.error('\nErro:', err.message);
  process.exit(1);
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('  ✓ Setup concluído!');
console.log('═══════════════════════════════════════════════════════');
console.log('\nPróximos passos:');
console.log('  1. Configure SMTP no .env (opcional) para envio de emails');
console.log('  2. Faça login como comercial@impetus.local / Impetus@Comercial2025!');
console.log('  3. Use POST /api/internal/sales/activate-client\n');
process.exit(0);
