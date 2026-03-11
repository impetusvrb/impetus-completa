];

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  IMPETUS COMUNICA IA - Migrations');
  console.log('═══════════════════════════════════════════════════════\n');

  const modelsDir = path.join(__dirname, '../src/models');

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const m = MIGRATIONS[i];
    const sqlPath = path.join(modelsDir, m.file);

    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Arquivo não encontrado: ${m.file}`);
      process.exit(1);
    }

    console.log(`[${i + 1}/${MIGRATIONS.length}] Executando: ${m.name}...`);

    try {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await db.query(sql);
      console.log(`    ✓ ${m.name} OK\n`);
    } catch (err) {
      console.error(`    ✗ Erro em ${m.file}:`, err.message);
      console.error('\nDetalhes:', err.detail || err);
      process.exit(1);
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✓ Todas as migrations executadas com sucesso!');
  console.log('═══════════════════════════════════════════════════════\n');
  process.exit(0);
}

run();
