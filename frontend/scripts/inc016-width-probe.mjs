/**
 * INC-016 — auditoria geometria horizontal workspace (Playwright).
 * node scripts/inc016-width-probe.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'tmp/inc016-screenshots');
const VIEWPORT = { width: 1366, height: 768 };
const SIDEBAR_W = 230;

function readCss(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function buildHtml(after = false) {
  const contentPad = after ? 10 : 32;
  const ccPad = after ? 0 : 20;
  const ccMax = after ? 'none' : '1680px';
  const liveMax = after ? 'none' : '1200px';
  const livePadX = after ? 0 : 24;

  return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"/>
<style>
* { box-sizing: border-box; }
body { margin: 0; background: #070c14; color: #e8f4ff; font-family: sans-serif; }
.layout { display: flex; min-height: 100vh; }
.sidebar { width: ${SIDEBAR_W}px; flex-shrink: 0; background: #0a1520; border-right: 1px solid rgba(0,212,255,.15); }
.main-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.content { flex: 1; padding: 24px ${contentPad}px; overflow-x: hidden; }
.cc { padding: 0 ${ccPad}px 2rem; max-width: ${ccMax}; margin: 0 auto; width: 100%; }
.cc-cognitive-continuity-row { display: grid; grid-template-columns: auto 1fr auto; gap: .5rem; padding: 0 ${after ? 0 : 12}px; margin-bottom: .35rem; }
.live-intelligent-dashboard { max-width: ${liveMax}; margin: 0 auto; padding: 1.25rem ${livePadX}px 2rem; width: 100%; }
.cc__grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; }
.cc__cell { min-height: 80px; border: 1px solid rgba(0,212,255,.12); padding: .5rem; }
.cog-core-rail { border: 1px solid rgba(0,212,255,.2); padding: .5rem; width: 100%; }
</style></head><body>
<div class="layout">
  <aside class="sidebar"></aside>
  <div class="main-content">
    <main class="content">
      <div class="cc cc--premium">
        <div class="cc-top-cognitive-presence"><div class="cog-core-rail" id="core">COGNITIVE CORE</div></div>
        <div class="cc-cognitive-continuity-row" id="continuity"><span>ONIPRESENÇA</span><span>msg</span><button>Atualizar</button></div>
        <div class="live-intelligent-dashboard live-dash-unified live-dash-unified--exec" id="live">
          <h1 id="heading">Operação em tempo real</h1>
          <div class="live-dash-timebar" id="timebar">Máquina do Tempo</div>
        </div>
        <div class="cc__grid" id="grid"><div class="cc__cell">A</div><div class="cc__cell">B</div><div class="cc__cell">C</div><div class="cc__cell">D</div></div>
        <div class="cc__cognitive-collapsible" id="eco">Ecossistema cognitivo vivo</div>
      </div>
    </main>
  </div>
</div>
</body></html>`;
}

async function measure(page) {
  return page.evaluate((sidebarW) => {
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    const cc = document.querySelector('.cc');
    const core = document.querySelector('#core');
    const grid = document.querySelector('#grid');
    const eco = document.querySelector('#eco');
    const r = (el) => el?.getBoundingClientRect();
    const sb = r(sidebar);
    const ct = r(content);
    const ccR = r(cc);
    const coreR = r(core);
    const gridR = r(grid);
    const ecoR = r(eco);
    const liveR = r(document.querySelector('#live'));
    const docW = document.documentElement.scrollWidth;
    const clientW = document.documentElement.clientWidth;
    return {
      viewportWidth: clientW,
      sidebarRight: sb?.right ?? sidebarW,
      mainWorkspaceLeft: ct?.left ?? 0,
      mainWorkspaceRight: ct?.right ?? 0,
      mainWorkspaceWidth: ct?.width ?? 0,
      effectiveLeftGutter: (coreR?.left ?? 0) - (sb?.right ?? sidebarW),
      effectiveRightGutter: clientW - (coreR?.right ?? gridR?.right ?? 0),
      cognitiveCoreWidth: coreR?.width ?? 0,
      operationalGridWidth: gridR?.width ?? 0,
      bottomEcosystemWidth: ecoR?.width ?? 0,
      ccWidth: ccR?.width ?? 0,
      documentOverflow: docW > clientW + 1
    };
  }, SIDEBAR_W);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const beforePage = await browser.newPage({ viewport: VIEWPORT });
  const beforePath = path.join(outDir, 'before.html');
  fs.writeFileSync(beforePath, buildHtml(false));
  await beforePage.goto(`file://${beforePath}`);
  const before = await measure(beforePage);
  await beforePage.close();

  const page = await browser.newPage({ viewport: VIEWPORT });
  const afterPath = path.join(outDir, 'after.html');
  fs.writeFileSync(afterPath, buildHtml(true));
  await page.goto(`file://${afterPath}`);
  const after = await measure(page);

  await page.screenshot({ path: path.join(outDir, 'A-full-top.png'), fullPage: false });
  await page.locator('.cc__grid').screenshot({ path: path.join(outDir, 'B-operational-grid.png') });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: path.join(outDir, 'C-narrow-desktop.png') });

  await browser.close();

  const gain = after.mainWorkspaceWidth - before.mainWorkspaceWidth;
  const coreGain = after.cognitiveCoreWidth - before.cognitiveCoreWidth;
  const gridGain = after.operationalGridWidth - before.operationalGridWidth;
  const ecoGain = after.bottomEcosystemWidth - before.bottomEcosystemWidth;
  const totalRecovered =
    before.effectiveLeftGutter -
    after.effectiveLeftGutter +
    (before.effectiveRightGutter - after.effectiveRightGutter);

  const pass =
    totalRecovered > 40 &&
    after.effectiveLeftGutter >= 8 &&
    after.effectiveLeftGutter <= 14 &&
    after.effectiveRightGutter >= 8 &&
    after.effectiveRightGutter <= 14 &&
    !after.documentOverflow &&
    coreGain > 0 &&
    gridGain > 0;

  console.log(
    JSON.stringify(
      {
        pass,
        before,
        after,
        WORKSPACE_WIDTH_GAIN_PX: gain,
        LEFT_SPACE_RECOVERED_PX: before.effectiveLeftGutter - after.effectiveLeftGutter,
        RIGHT_SPACE_RECOVERED_PX: before.effectiveRightGutter - after.effectiveRightGutter,
        TOTAL_HORIZONTAL_SPACE_RECOVERED_PX: totalRecovered,
        COGNITIVE_CORE_WIDTH_GAIN_PX: coreGain,
        OPERATIONAL_PANEL_WIDTH_GAIN_PX: gridGain,
        BOTTOM_ECOSYSTEM_WIDTH_GAIN_PX: ecoGain,
        ACCUMULATED_INSET_BEFORE_PX: before.effectiveLeftGutter + before.effectiveRightGutter,
        screenshots: outDir
      },
      null,
      2
    )
  );
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
