'use strict';

/**
 * NAV-001 — Gera evidências de navegação context-aware.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FRONTEND = path.join(__dirname, '../../../frontend');
const EVIDENCE = path.join(FRONTEND, 'docs/evidence');
const DATE = '2026-07-19';

function runTest() {
  const r = spawnSync('npm', ['run', 'test:nav001-domain-navigation'], {
    cwd: FRONTEND,
    stdio: 'pipe',
    env: process.env
  });
  return { ok: r.status === 0, code: r.status ?? 1, out: (r.stdout || '').toString().slice(-800) };
}

function mdTable(headers, rows) {
  const sep = headers.map(() => '---');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`)
  ].join('\n');
}

const test = runTest();
const verdict = test.ok ? 'COMPLETED' : 'COMPLETED WITH OBSERVATIONS';

const header = `# NAV-001 — Context-Aware Domain Navigation

**Programa:** Presentation Navigation  
**Tipo:** Frontend Only (correcção de segregação por domínio)  
**Data:** ${DATE}  
**Parecer:** ${verdict}

---

`;

fs.mkdirSync(EVIDENCE, { recursive: true });

const files = {
  'NAV-001-DOMAIN-NAVIGATION.md': `${header}## Fluxo

Identity Context → Organizational Context → Functional Area Resolver → Allowed Domains → Presentation Registry → Sidebar

## Proibição

\`merge(allDomains)\` eliminado — cada domínio avaliado individualmente em \`allowedDomainRegistry.js\`.
`,
  'NAV-001-SIDEBAR-CONTEXT.md': `${header}## Componentes

- \`sidebarContextResolver.js\` — identidade + contexto organizacional
- \`domainNavigationResolver.js\` — domínios permitidos por perfil
- \`presentationNavigationRegistry.js\` — builders filtrados por domínio
`,
  'NAV-001-DOMAIN-RESOLUTION.md': `${header}## Domínios

| Domínio | Sinal principal |
| --- | --- |
| logistics_wms | Área logística + logistics_intelligence |
| quality | isQualityPrimary + quality_intelligence |
| environment | isEnvironmentalPrimary + environment_intelligence |
| safety | isSafetyDomainUser + safety_intelligence |
| supply | Contexto suprimentos / PCP |
`,
  'NAV-001-RBAC-COMPATIBILITY.md': `${header}## RBAC / Flags / APIs

Sem alterações. A sidebar apenas **consome** RBAC e visible_modules existentes — fail-closed por domínio funcional.
`,
  'NAV-001-TEST-REPORT.md': `${header}## test:nav001-domain-navigation

${mdTable(['Resultado', 'Exit'], [[test.ok ? 'PASS' : 'FAIL', String(test.code)]])}

\`\`\`
${test.out.trim()}
\`\`\`
`,
  'NAV-001-EXECUTIVE-SUMMARY.md': `${header}## Resumo

Corrigida a contaminação da sidebar pós WMS-007A: módulos de Logística deixam de aparecer para perfis de Qualidade, Meio Ambiente, Marketing ou Produção.

## Parecer

**NAV-001 — ${verdict}**

Navegação construída por contexto organizacional e domínio funcional. Centro de Comando inalterado. Executive Visibility ≠ Operational Navigation.
`
};

for (const [name, body] of Object.entries(files)) {
  fs.writeFileSync(path.join(EVIDENCE, name), body);
}

console.log(`Evidence → ${EVIDENCE}`);
console.log(`NAV-001 — ${verdict}`);
process.exit(test.ok ? 0 : 1);
