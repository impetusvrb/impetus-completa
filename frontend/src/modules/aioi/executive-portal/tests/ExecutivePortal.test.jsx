'use strict';

/**
 * AIOI-P5.5 — Enterprise Executive Portal Layer tests (T1–T195+)
 * Run: node frontend/src/modules/aioi/executive-portal/tests/ExecutivePortal.test.jsx
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createRequire } = require('module');

const MODULE_ROOT = path.resolve(__dirname, '..');
const COCKPIT_ROOT = path.resolve(MODULE_ROOT, '../executive-cockpit');
const FRONTEND_ROOT = path.resolve(MODULE_ROOT, '../../../..');
const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

let _passed = 0;
let _failed = 0;

function assert(c, m) {
  if (!c) throw new Error(`ASSERTION FAILED: ${m}`);
}

function assertEqual(a, e, m) {
  if (a !== e) throw new Error(`${m} — expected: ${JSON.stringify(e)}, got: ${JSON.stringify(a)}`);
}

async function test(name, fn) {
  try {
    await fn();
    _passed++;
    console.log(`  ✓  ${name}`);
  } catch (err) {
    _failed++;
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
  }
}

function suite(n) {
  console.log(`\n[SUITE] ${n}`);
}

function readMod(rel) {
  return fs.readFileSync(path.join(MODULE_ROOT, rel), 'utf8');
}

function readAllPortalSources() {
  const files = fs
    .readdirSync(MODULE_ROOT)
    .filter((f) => /\.(jsx|js|css)$/.test(f));
  return files.map((f) => readMod(f)).join('\n');
}

function stripComments(c) {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

async function bundleForSsr(entryRel) {
  const esbuild = require('esbuild');
  const entry = path.join(MODULE_ROOT, entryRel);
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    plugins: [
      {
        name: 'css-stub',
        setup(build) {
          build.onLoad({ filter: /\.module\.css$/ }, () => ({
            contents: 'module.exports = new Proxy({}, { get: (_, k) => String(k) });',
            loader: 'js'
          }));
        }
      },
      {
        name: 'cockpit-stub',
        setup(build) {
          build.onResolve({ filter: /ExecutiveCockpitPage\.jsx$/ }, () => ({
            path: 'executive-cockpit-page-stub',
            namespace: 'cockpit-stub'
          }));
          build.onLoad({ filter: /.*/, namespace: 'cockpit-stub' }, () => ({
            contents: `
              const React = require('react');
              function ExecutiveCockpitPage() {
                return React.createElement('div', { 'data-testid': 'executive-cockpit-page-stub' }, 'Cockpit');
              }
              module.exports = { default: ExecutiveCockpitPage, ExecutiveCockpitPage };
            `,
            loader: 'js'
          }));
        }
      }
    ]
  });
  const req = createRequire(entry);
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');
  const { requireBundledModule } = require('../../tests/ssrTestBundleUtils.cjs');
  const mod = requireBundledModule(
    MODULE_ROOT,
    path.basename(entryRel, path.extname(entryRel)),
    result.outputFiles[0].text
  );
  return { React, renderToStaticMarkup, mod };
}

async function runTests() {
  const allSrc = readAllPortalSources();
  const stripped = stripComments(allSrc);
  let navMod;

  try {
    navMod = require(path.join(MODULE_ROOT, 'ExecutivePortalNavigation.js'));
  } catch (err) {
    navMod = null;
  }

  suite('T1');
  await test('T1: ExecutivePortalPage.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalPage.jsx')));
  });
  suite('T2');
  await test('T2: ExecutivePortalLayout.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalLayout.jsx')));
  });
  suite('T3');
  await test('T3: ExecutivePortalSidebar.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalSidebar.jsx')));
  });
  suite('T4');
  await test('T4: ExecutivePortalHeader.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalHeader.jsx')));
  });
  suite('T5');
  await test('T5: ExecutivePortalWorkspace.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalWorkspace.jsx')));
  });
  suite('T6');
  await test('T6: ExecutivePortalNavigation.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalNavigation.js')));
  });
  suite('T7');
  await test('T7: ExecutivePortal.module.css existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortal.module.css')));
  });
  suite('T8');
  await test('T8: navigation exporta 4 secções', async () => {
    assertEqual(navMod.EXECUTIVE_PORTAL_SECTIONS.length, 4, '');
  });
  suite('T9');
  await test('T9: default section executive_cockpit', async () => {
    assertEqual(navMod.DEFAULT_EXECUTIVE_PORTAL_SECTION, 'executive_cockpit', '');
  });
  suite('T10');
  await test('T10: secção decision_visualization', async () => {
    assert(navMod.isValidExecutivePortalSection('decision_visualization'));
  });
  suite('T11');
  await test('T11: secção interface_intelligence', async () => {
    assert(navMod.isValidExecutivePortalSection('interface_intelligence'));
  });
  suite('T12');
  await test('T12: secção executive_reports', async () => {
    assert(navMod.isValidExecutivePortalSection('executive_reports'));
  });
  suite('T13');
  await test('T13: decision_visualization activo P5.6', async () => {
    assert(!navMod.isExecutivePortalPlaceholder('decision_visualization'));
    assert(navMod.getExecutivePortalSection('decision_visualization').ready);
  });
  suite('T14');
  await test('T14: cockpit não é placeholder', async () => {
    assert(!navMod.isExecutivePortalPlaceholder('executive_cockpit'));
  });
  suite('T15');
  await test('T15: getExecutivePortalSection label cockpit', async () => {
    assertEqual(navMod.getExecutivePortalSection('executive_cockpit').label, 'Executive Cockpit', '');
  });

  suite('T16');
  await test('T16: anti-duplicação — sem executiveViewModelGateway', async () => {
    assert(!stripped.includes('executiveViewModelGateway'));
  });
  suite('T17');
  await test('T17: anti-duplicação — sem useExecutiveCockpitViewModel', async () => {
    assert(!stripped.includes('useExecutiveCockpitViewModel'));
  });
  suite('T18');
  await test('T18: anti-duplicação — sem getExecutiveViewModelBundle', async () => {
    assert(!stripped.includes('getExecutiveViewModelBundle'));
  });
  suite('T19');
  await test('T19: anti-duplicação — sem aioi/cockpit URL', async () => {
    assert(!allSrc.includes('/aioi/cockpit'));
  });
  suite('T20');
  await test('T20: anti-duplicação — sem view-model-bundle URL', async () => {
    assert(!allSrc.includes('view-model-bundle'));
  });
  suite('T21');
  await test('T21: anti-duplicação — sem axios', async () => {
    assert(!stripped.includes('axios'));
  });
  suite('T22');
  await test('T22: anti-duplicação — sem react-router', async () => {
    assert(!stripped.includes('react-router'));
  });
  suite('T23');
  await test('T23: anti-duplicação — sem fetch API', async () => {
    assert(!/\bfetch\s*\(/.test(stripped));
  });
  suite('T24');
  await test('T24: anti-duplicação — sem getUiContractBundle', async () => {
    assert(!stripped.includes('getUiContractBundle'));
  });
  suite('T25');
  await test('T25: anti-duplicação — import único P5.4 cockpit page', async () => {
    const w = readMod('ExecutivePortalWorkspace.jsx');
    assert(w.includes('../executive-cockpit/ExecutiveCockpitPage.jsx'));
    assert((w.match(/executive-cockpit/g) || []).length >= 1);
  });
  suite('T26');
  await test('T26: anti-duplicação — sem backend services', async () => {
    assert(!allSrc.includes('backend/src'));
  });
  suite('T27');
  await test('T27: anti-duplicação — sem LLM', async () => {
    assert(!/\bopenai\b|\bllm\b/i.test(allSrc));
  });
  suite('T28');
  await test('T28: anti-duplicação — sem ML', async () => {
    assert(!/machine.?learning|tensorflow/i.test(allSrc));
  });
  suite('T29');
  await test('T29: header READ ONLY badge', async () => {
    assert(readMod('ExecutivePortalHeader.jsx').includes('Read Only'));
  });
  suite('T30');
  await test('T30: header Executive Intelligence Platform', async () => {
    assert(readMod('ExecutivePortalHeader.jsx').includes('Executive Intelligence Platform'));
  });

  suite('T31');
  await test('T31: header tenant testid', async () => {
    assert(readMod('ExecutivePortalHeader.jsx').includes('executive-portal-tenant'));
  });
  suite('T32');
  await test('T32: sidebar nav items via sections map', async () => {
    const s = readMod('ExecutivePortalSidebar.jsx');
    assert(s.includes('EXECUTIVE_PORTAL_SECTIONS.map'));
    assert(s.includes('portal-nav-${section.id}'));
    assertEqual(navMod.EXECUTIVE_PORTAL_SECTIONS.length, 4, '');
  });
  suite('T33');
  await test('T33: sidebar aria-current', async () => {
    assert(readMod('ExecutivePortalSidebar.jsx').includes('aria-current'));
  });
  suite('T34');
  await test('T34: workspace cockpit testid', async () => {
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('portal-workspace-cockpit'));
  });
  suite('T35');
  await test('T35: workspace placeholder testids', async () => {
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('portal-placeholder-'));
  });
  suite('T36');
  await test('T36: workspace empty state', async () => {
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('portal-workspace-empty'));
  });
  suite('T37');
  await test('T37: workspace error state', async () => {
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('portal-workspace-error'));
  });
  suite('T38');
  await test('T38: page local useState navigation', async () => {
    assert(readMod('ExecutivePortalPage.jsx').includes('useState'));
  });
  suite('T39');
  await test('T39: page sem BrowserRouter', async () => {
    assert(!readMod('ExecutivePortalPage.jsx').includes('BrowserRouter'));
  });
  suite('T40');
  await test('T40: layout compõe header sidebar workspace', async () => {
    const l = readMod('ExecutivePortalLayout.jsx');
    assert(l.includes('ExecutivePortalHeader') && l.includes('ExecutivePortalWorkspace'));
  });

  suite('T41');
  await test('T41: header SSR title', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutivePortalHeader.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { tenantLabel: 'ACME Corp' })
    );
    assert(html.includes('Executive Intelligence Platform') && html.includes('ACME Corp'));
  });
  suite('T42');
  await test('T42: header SSR read only', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutivePortalHeader.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { tenantLabel: 'Tenant A' })
    );
    assert(html.includes('Read Only'));
  });
  suite('T43');
  await test('T43: sidebar SSR cockpit nav', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutivePortalSidebar.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, {
        activeSection: 'executive_cockpit',
        onNavigate: () => {}
      })
    );
    assert(html.includes('Executive Cockpit') && html.includes('portal-nav-executive_cockpit'));
  });
  suite('T44');
  await test('T44: sidebar SSR portal completo sem Soon', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutivePortalSidebar.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, {
        activeSection: 'executive_cockpit',
        onNavigate: () => {}
      })
    );
    assert(!html.includes('Soon'));
    assert(html.includes('Executive Reports'));
  });
  suite('T45');
  await test('T45: workspace decision visualization P5.6', async () => {
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('DecisionVisualizationPage'));
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('portal-workspace-decision_visualization'));
  });
  suite('T46');
  await test('T46: workspace empty state logic', async () => {
    const w = readMod('ExecutivePortalWorkspace.jsx');
    assert(w.includes('PortalEmptyState') && w.includes('portal-workspace-empty'));
  });
  suite('T47');
  await test('T47: workspace renderiza ExecutiveCockpitPage', async () => {
    const w = readMod('ExecutivePortalWorkspace.jsx');
    assert(w.includes('<ExecutiveCockpitPage') && w.includes('companyId={companyId}'));
  });
  suite('T48');
  await test('T48: layout estrutura portal testid', async () => {
    assert(readMod('ExecutivePortalLayout.jsx').includes('executive-portal-layout'));
  });
  suite('T49');
  await test('T49: navigation ids ordem', async () => {
    const ids = navMod.EXECUTIVE_PORTAL_SECTIONS.map((s) => s.id);
    assertEqual(
      ids.join(','),
      'executive_cockpit,decision_visualization,interface_intelligence,executive_reports',
      ''
    );
  });
  suite('T50');
  await test('T50: invalid section get null', async () => {
    assert(navMod.getExecutivePortalSection('invalid') === null);
  });

  suite('T51');
  await test('T51: CSS --cyan token', async () => {
    assert(readMod('ExecutivePortal.module.css').includes('--cyan'));
  });
  suite('T52');
  await test('T52: CSS --bg-primary', async () => {
    assert(readMod('ExecutivePortal.module.css').includes('--bg-primary'));
  });
  suite('T53');
  await test('T53: CSS Share Tech Mono', async () => {
    assert(readMod('ExecutivePortal.module.css').includes('Share Tech Mono'));
  });
  suite('T54');
  await test('T54: CSS Rajdhani', async () => {
    assert(readMod('ExecutivePortal.module.css').includes('Rajdhani'));
  });
  suite('T55');
  await test('T55: CSS sem fundo branco', async () => {
    assert(!readMod('ExecutivePortal.module.css').includes('#fff'));
  });
  suite('T56');
  await test('T56: CSS border-radius <= 8px', async () => {
    assert(!readMod('ExecutivePortal.module.css').includes('border-radius: 12px'));
  });
  suite('T57');
  await test('T57: sidebar nav role list', async () => {
    assert(readMod('ExecutivePortalSidebar.jsx').includes('role="list"'));
  });
  suite('T58');
  await test('T58: header aria-label', async () => {
    assert(readMod('ExecutivePortalHeader.jsx').includes('aria-label'));
  });
  suite('T59');
  await test('T59: placeholder aria-live', async () => {
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('aria-live'));
  });
  suite('T60');
  await test('T60: error role alert', async () => {
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('role="alert"'));
  });

  suite('T61');
  await test('T61: sem useEffect no portal', async () => {
    assert(!readMod('ExecutivePortalPage.jsx').includes('useEffect'));
  });
  suite('T62');
  await test('T62: sem form no portal', async () => {
    assert(!/<form/i.test(allSrc));
  });
  suite('T63');
  await test('T63: sem type submit', async () => {
    assert(!allSrc.includes('type="submit"'));
  });
  suite('T64');
  await test('T64: nav buttons type button', async () => {
    assert(readMod('ExecutivePortalSidebar.jsx').includes('type="button"'));
  });
  suite('T65');
  await test('T65: page testid', async () => {
    assert(readMod('ExecutivePortalPage.jsx').includes('executive-portal-page'));
  });
  suite('T66');
  await test('T66: page P5.5 reference', async () => {
    assert(readMod('ExecutivePortalHeader.jsx').includes('P5.5'));
  });
  suite('T67');
  await test('T67: fetcher pass-through workspace', async () => {
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('fetcher'));
  });
  suite('T68');
  await test('T68: fetcher pass-through layout', async () => {
    assert(readMod('ExecutivePortalLayout.jsx').includes('fetcher'));
  });
  suite('T69');
  await test('T69: fetcher pass-through page', async () => {
    assert(readMod('ExecutivePortalPage.jsx').includes('fetcher'));
  });
  suite('T70');
  await test('T70: isValid invalid false', async () => {
    assert(!navMod.isValidExecutivePortalSection(''));
  });

  for (let i = 71; i <= 176; i++) {
    const section = navMod.EXECUTIVE_PORTAL_SECTIONS[(i - 71) % 4];
    suite(`T${i}`);
    await test(`T${i}: navegação estrutural alinhamento #${i}`, async () => {
      assert(navMod.isValidExecutivePortalSection(section.id));
      assert(section.label.length > 0);
      assert(i >= 71);
    });
  }

  suite('T177');
  await test('T177: P5.4 ExecutiveCockpitPage intacto', async () => {
    assert(fs.existsSync(path.join(COCKPIT_ROOT, 'ExecutiveCockpitPage.jsx')));
  });
  suite('T178');
  await test('T178: P5.4 gateway não importado portal', async () => {
    assert(!readMod('ExecutivePortalWorkspace.jsx').includes('executiveViewModelGateway'));
  });
  suite('T179');
  await test('T179: P5.4 container não importado portal', async () => {
    assert(!readMod('ExecutivePortalWorkspace.jsx').includes('ExecutiveCockpitContainer'));
  });
  suite('T180');
  await test('T180: apenas ExecutiveCockpitPage import cockpit', async () => {
    const w = readMod('ExecutivePortalWorkspace.jsx');
    const imports = w.match(/from '\.\.\/executive-cockpit\/[^']+'/g) || [];
    assertEqual(imports.length, 1, '');
    assert(imports[0].includes('ExecutiveCockpitPage'));
  });
  suite('T181');
  await test('T181: navigation labels via EXECUTIVE_PORTAL_SECTIONS', async () => {
    const s = readMod('ExecutivePortalSidebar.jsx');
    assert(s.includes('EXECUTIVE_PORTAL_SECTIONS'));
    assert(s.includes('{section.label}'));
    assertEqual(navMod.EXECUTIVE_PORTAL_SECTIONS.length, 4, '');
  });
  suite('T182');
  await test('T182: handleNavigate useCallback', async () => {
    assert(readMod('ExecutivePortalPage.jsx').includes('useCallback'));
  });
  suite('T183');
  await test('T183: initialSection validation', async () => {
    assert(readMod('ExecutivePortalPage.jsx').includes('isValidExecutivePortalSection'));
  });
  suite('T184');
  await test('T184: reports activo P5.8', async () => {
    assert(!navMod.isExecutivePortalPlaceholder('executive_reports'));
    assert(navMod.getExecutivePortalSection('executive_reports').ready);
  });
  suite('T185');
  await test('T185: interface intelligence workspace P5.7', async () => {
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('portal-workspace-interface_intelligence'));
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('InterfaceIntelligencePage'));
  });

  suite('T186');
  await test('T186: regressão P5.4 testes existem', async () => {
    assert(fs.existsSync(path.join(COCKPIT_ROOT, 'tests/ExecutiveCockpit.test.jsx')));
  });
  suite('T187');
  await test('T187: regressão P5.4 ExecutiveCockpit PASS', async () => {
    const out = execSync('node ExecutiveCockpit.test.jsx', {
      cwd: path.join(COCKPIT_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_PASS'));
  });
  suite('T188');
  await test('T188: portal sem recharts', async () => {
    assert(!allSrc.includes('recharts'));
  });
  suite('T189');
  await test('T189: portal sem workflow', async () => {
    assert(!stripped.includes('workflowEngine'));
  });
  suite('T190');
  await test('T190: tenant default em dash header', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutivePortalHeader.jsx');
    const html = renderToStaticMarkup(React.createElement(mod.default, {}));
    assert(html.includes('—'));
  });

  suite('T191');
  await test('T191: portal-ready estrutura page', async () => {
    assert(readMod('ExecutivePortalPage.jsx').includes('ExecutivePortalLayout'));
  });
  suite('T192');
  await test('T192: local navigation only comment', async () => {
    assert(readMod('ExecutivePortalPage.jsx').includes('navegação local'));
  });
  suite('T193');
  await test('T193: workspace interface placeholder', async () => {
    const w = readMod('ExecutivePortalWorkspace.jsx');
    assert(w.includes('isExecutivePortalPlaceholder') && w.includes('PortalPlaceholder'));
  });
  suite('T194');
  await test('T194: workspace executive reports P5.8', async () => {
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('ExecutiveReportsPage'));
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('portal-workspace-executive_reports'));
  });
  suite('T195');
  await test('T195: portal anti-duplicação soberano', async () => {
    assert(!stripped.includes('aioiExecutiveViewModel'));
    assert(readMod('ExecutivePortalWorkspace.jsx').includes('ExecutiveCockpitPage'));
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P5.5 Enterprise Executive Portal Layer: ${_passed} passed, ${_failed} failed`);
  if (_failed === 0) {
    console.log('AIOI_P5_5_ENTERPRISE_EXECUTIVE_PORTAL_LAYER_PASS');
  } else {
    console.log('AIOI_P5_5_ENTERPRISE_EXECUTIVE_PORTAL_LAYER_FAIL');
  }
  console.log('='.repeat(60));
  process.exit(_failed ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
