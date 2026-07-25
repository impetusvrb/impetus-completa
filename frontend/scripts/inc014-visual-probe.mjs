/**
 * INC-014 — validação visual faixa compacta única (Playwright).
 * node scripts/inc014-visual-probe.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'tmp/inc014-screenshots');

function readCss(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function buildDesktopHtml() {
  const engines = [
    ['Core', 'PRESENCE'],
    ['Behavior', 'AWAITING_DATA'],
    ['Analysis', 'DISABLED'],
    ['Sync', '—'],
    ['Awareness', 'ONLINE'],
    ['Predictive', 'STANDBY']
  ]
    .map(
      ([l, v]) =>
        `<span class="cog-core-rail__cell"><span class="cog-core-rail__cell-label">${l}</span><strong class="cog-core-rail__cell-val">${v}</strong></span>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"/>
<style>
${readCss('src/styles/tokens.css')}
${readCss('src/styles.css')}
${readCss('src/features/dashboard/centroComando/CentroComando.css')}
${readCss('src/features/dashboard/centroComando/cognitiveEcosystem/cognitivePresence.css')}
${readCss('src/features/dashboard/centroComando/cognitiveEcosystem/cognitiveEcosystem.css')}
html,body{margin:0;background:#070c14;color:#e8f4ff}
.main{padding:1rem;max-width:1366px}
.live-dash-unified--exec h1{font-size:1.1rem;margin:0;padding:1rem 0}
</style></head><body>
<div class="cog-presence-root" data-viewport-tier="desktop">
  <div class="cog-presence-content">
    <div class="cc cc--premium">
      <div class="cc-top-cognitive-presence">
        <div class="cog-global-strip cog-global-strip--desktop-compact-single">
          <div class="cog-core-rail">
            <div class="cog-core-rail__identity">
              <span class="cog-global-strip__pulse"></span>
              <span class="cog-global-strip__brand">IMPETUS COGNITIVE CORE</span>
              <span class="cog-core-rail__status">PRESENÇA ATIVA</span>
            </div>
            <div class="cog-core-rail__engines">${engines}</div>
            <button type="button" class="cog-core-rail__awareness-icon" id="awareness-btn" aria-label="Consciência Total" title="Consciência Total">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="cog-omnipresence-zone">
        <span class="cog-omnipresence-zone__label">ONIPRESENÇA COGNITIVA</span>
        <div class="cog-whispers cog-whispers--multi"><span class="cog-whispers__item">Presença cognitiva observando operação.</span></div>
      </div>
      <div class="live-dash-unified live-dash-unified--exec"><h1>Operação em tempo real · IA &amp; orquestração</h1></div>
      <div class="cc__cognitive-collapsible"><button class="cc__cognitive-toggle">▶ Ecossistema cognitivo vivo</button></div>
    </div>
  </div>
</div>
<script>
document.getElementById('awareness-btn')?.addEventListener('click', () => {
  document.body.setAttribute('data-awareness-open', 'true');
});
</script>
</body></html>`;
}

function buildMobileHtml() {
  return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"/>
<style>
${readCss('src/styles/tokens.css')}
${readCss('src/features/dashboard/centroComando/cognitiveEcosystem/cognitiveEcosystem.css')}
body{margin:0;background:#070c14;padding:.75rem}
</style></head><body>
<div class="cog-mobile-summary cog-mobile-summary--compact">
  <div class="cog-mobile-summary__left"><span class="cog-mobile-summary__title">COGNITIVE CORE</span></div>
  <div class="cog-mobile-summary__actions"><button class="cog-mobile-summary__btn">Ver detalhes</button></div>
</div>
</body></html>`;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // Desktop A/B
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const htmlPath = path.join(outDir, 'desktop.html');
  fs.writeFileSync(htmlPath, buildDesktopHtml());
  await page.goto(`file://${htmlPath}`);

  const desktop = await page.evaluate(() => {
    const strip = document.querySelector('.cc-top-cognitive-presence');
    const rail = document.querySelector('.cog-core-rail');
    const enginesPanel = document.querySelector('.cog-global-strip__engines-panel');
    const metrics = document.querySelector('.cog-mobile-summary__metrics');
    const textBtn = document.querySelector('.cog-mobile-summary__btn--awareness');
    const iconBtn = document.querySelector('.cog-core-rail__awareness-icon');
    const cells = [...document.querySelectorAll('.cog-core-rail__cell')];
    const omni = document.querySelector('.cog-omnipresence-zone');
    const live = document.querySelector('.live-dash-unified--exec');

    const verticalCells = cells.filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return cs.writingMode !== 'horizontal-tb' || (r.height > r.width * 2 && r.width < 20);
    });

    const stripRect = strip?.getBoundingClientRect() ?? { height: 0 };
    const omniTop = omni?.getBoundingClientRect().top ?? 0;
    const liveTop = live?.getBoundingClientRect().top ?? 0;

    return {
      stripHeight: stripRect.height,
      engineCellCount: cells.length,
      separateEngineRow: !!enginesPanel,
      confSyncAwareMetrics: !!metrics,
      textAwarenessBtn: !!textBtn,
      iconAwarenessBtn: !!iconBtn,
      iconAria: iconBtn?.getAttribute('aria-label') ?? null,
      verticalCellCount: verticalCells.length,
      omniBeforeLive: omniTop < liveTop,
      railFlexDirection: rail ? getComputedStyle(rail).flexDirection : null
    };
  });

  await page.screenshot({ path: path.join(outDir, 'A-viewport-top.png') });
  await page.locator('.cog-core-rail').screenshot({ path: path.join(outDir, 'B-core-closeup.png') });

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: path.join(outDir, 'C-narrow-desktop.png') });

  await page.click('#awareness-btn');
  const clickOk = await page.evaluate(() => document.body.getAttribute('data-awareness-open') === 'true');

  // Mobile D
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobilePath = path.join(outDir, 'mobile.html');
  fs.writeFileSync(mobilePath, buildMobileHtml());
  await mobilePage.goto(`file://${mobilePath}`);
  const mobile = await mobilePage.evaluate(() => ({
    hasVerDetalhes: !!document.querySelector('.cog-mobile-summary__btn')?.textContent?.includes('Ver detalhes')
  }));
  await mobilePage.screenshot({ path: path.join(outDir, 'D-mobile.png') });

  await browser.close();

  const prevHeight = 107;
  const newHeight = desktop.stripHeight;
  const reductionPx = prevHeight - newHeight;
  const reductionPct = ((reductionPx / prevHeight) * 100).toFixed(1);

  const pass =
    desktop.engineCellCount === 6 &&
    !desktop.separateEngineRow &&
    !desktop.confSyncAwareMetrics &&
    !desktop.textAwarenessBtn &&
    desktop.iconAwarenessBtn &&
    desktop.iconAria === 'Consciência Total' &&
    desktop.verticalCellCount === 0 &&
    desktop.omniBeforeLive &&
    newHeight <= 95 &&
    newHeight < prevHeight &&
    clickOk &&
    mobile.hasVerDetalhes;

  const report = {
    pass,
    desktop,
    mobile,
    heights: {
      previousPx: prevHeight,
      newPx: newHeight,
      reductionPx,
      reductionPercent: Number(reductionPct)
    },
    clickTest: clickOk ? 'PASS' : 'FAIL',
    screenshots: outDir
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
