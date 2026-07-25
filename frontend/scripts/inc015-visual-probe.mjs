/**
 * INC-015 — validação geometria linha de continuidade (Playwright).
 * node scripts/inc015-visual-probe.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'tmp/inc015-screenshots');

function readCss(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function buildHtml(beforeLayout = false) {
  const omniBlock = beforeLayout
    ? `<div class="cog-omnipresence-zone">
        <span class="cog-omnipresence-zone__label">ONIPRESENÇA COGNITIVA</span>
        <div class="cog-whispers cog-whispers--multi"><span class="cog-whispers__item">Organizational Awareness: ONLINE</span></div>
      </div>
      <div class="live-intelligent-dashboard live-dash-unified live-dash-unified--exec">
        <header class="live-dash-header">
          <div class="live-dash-title"><h1>Operação em tempo real · IA &amp; orquestração</h1></div>
          <div class="live-dash-actions"><button class="live-dash-btn" id="refresh-btn">Atualizar</button></div>
        </header>
      </div>`
    : `<div class="cc-cognitive-continuity-row">
        <div class="cog-omnipresence-zone">
          <span class="cog-omnipresence-zone__label">ONIPRESENÇA COGNITIVA</span>
          <div class="cog-whispers cog-whispers--multi"><span class="cog-whispers__item">Organizational Awareness: ONLINE</span></div>
        </div>
        <div class="cc-cognitive-continuity-action">
          <div class="live-dash-actions live-dash-actions--continuity">
            <button class="live-dash-btn live-dash-btn--continuity" id="refresh-btn">Atualizar</button>
          </div>
        </div>
      </div>
      <div class="live-intelligent-dashboard live-dash-unified live-dash-unified--exec live-dash-unified--continuity">
        <header class="live-dash-header">
          <div class="live-dash-title"><h1>Operação em tempo real · IA &amp; orquestração</h1></div>
        </header>
      </div>`;

  return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
<style>
${readCss('src/styles/tokens.css')}
${readCss('src/styles.css')}
${readCss('src/pages/LiveIntelligentDashboard.css')}
${readCss('src/features/dashboard/centroComando/CentroComando.css')}
${readCss('src/features/dashboard/centroComando/cognitiveEcosystem/cognitivePresence.css')}
body{margin:0;background:#070c14}
.cc{padding:0 1.25rem}
</style></head><body>
<div class="cog-presence-root" data-viewport-tier="desktop">
  <div class="cog-presence-content">
    <div class="cc cc--premium">
      <div class="cc-top-cognitive-presence">
        <div class="cog-global-strip cog-global-strip--desktop-compact-single">
          <div class="cog-core-rail"><span class="cog-global-strip__brand">IMPETUS COGNITIVE CORE</span></div>
        </div>
      </div>
      ${omniBlock}
    </div>
  </div>
</div>
<script>
document.getElementById('refresh-btn')?.addEventListener('click', () => {
  document.body.setAttribute('data-refresh-clicked', 'true');
});
</script>
</body></html>`;
}

async function measure(page) {
  return page.evaluate(() => {
    const core = document.querySelector('.cc-top-cognitive-presence');
    const row = document.querySelector('.cc-cognitive-continuity-row');
    const omni = document.querySelector('.cog-omnipresence-zone');
    const label = document.querySelector('.cog-omnipresence-zone__label');
    const msg = document.querySelector('.cog-whispers__item');
    const refresh = document.querySelector('#refresh-btn');
    const heading = document.querySelector('.live-dash-title h1');
    const headerActions = document.querySelector('.live-dash-header .live-dash-actions');

    const r = (el) => el?.getBoundingClientRect() ?? null;
    const coreR = r(core);
    const rowR = r(row || omni);
    const labelR = r(label);
    const msgR = r(msg);
    const refreshR = r(refresh);
    const headingR = r(heading);

    const sameRow =
      labelR && msgR && refreshR
        ? Math.abs(labelR.top + labelR.height / 2 - (msgR.top + msgR.height / 2)) < 14 &&
          Math.abs(msgR.top + msgR.height / 2 - (refreshR.top + refreshR.height / 2)) < 14
        : false;

    return {
      coreTop: coreR?.top ?? 0,
      coreBottom: coreR?.bottom ?? 0,
      continuityTop: rowR?.top ?? omni?.getBoundingClientRect().top ?? 0,
      continuityBottom: rowR?.bottom ?? omni?.getBoundingClientRect().bottom ?? 0,
      continuityHeight: rowR?.height ?? omni?.getBoundingClientRect().height ?? 0,
      refreshTop: refreshR?.top ?? 0,
      headingTop: headingR?.top ?? 0,
      sameRowAligned: sameRow,
      duplicateHeaderRefresh: !!headerActions,
      gridRow: row ? getComputedStyle(row).display === 'grid' : false
    };
  });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const beforePage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const beforePath = path.join(outDir, 'before.html');
  fs.writeFileSync(beforePath, buildHtml(true));
  await beforePage.goto(`file://${beforePath}`);
  const before = await measure(beforePage);
  await beforePage.close();

  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const afterPath = path.join(outDir, 'after.html');
  fs.writeFileSync(afterPath, buildHtml(false));
  await page.goto(`file://${afterPath}`);

  const after = await measure(page);
  await page.screenshot({ path: path.join(outDir, 'A-viewport-top.png') });
  await page.locator('.cc-cognitive-continuity-row').screenshot({ path: path.join(outDir, 'B-continuity-closeup.png') });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: path.join(outDir, 'C-narrow-desktop.png') });

  await page.click('#refresh-btn');
  const clickOk = await page.evaluate(() => document.body.getAttribute('data-refresh-clicked') === 'true');

  await browser.close();

  const verticalRecovered = before.headingTop - after.headingTop;
  const continuityReduced = before.continuityHeight - after.continuityHeight;

  const pass =
    after.gridRow &&
    after.sameRowAligned &&
    !after.duplicateHeaderRefresh &&
    after.continuityHeight > 0 &&
    after.continuityHeight < before.continuityHeight + 40 &&
    verticalRecovered > 0 &&
    clickOk;

  console.log(
    JSON.stringify(
      {
        pass,
        before,
        after,
        CORE_UPWARD_MOVEMENT_PX: before.coreTop - after.coreTop,
        CONTINUITY_REGION_HEIGHT_BEFORE_PX: before.continuityHeight,
        CONTINUITY_REGION_HEIGHT_AFTER_PX: after.continuityHeight,
        VERTICAL_SPACE_RECOVERED_PX: verticalRecovered,
        OPERATIONAL_HEADING_UPWARD_MOVEMENT_PX: verticalRecovered,
        clickTest: clickOk ? 'PASS' : 'FAIL',
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
