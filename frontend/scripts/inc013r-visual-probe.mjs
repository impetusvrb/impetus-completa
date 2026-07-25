/**
 * INC-013R — validação visual desktop (Playwright + HTML estático).
 * node scripts/inc013r-visual-probe.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'tmp/inc013r-screenshots');

function readCss(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function buildHtml() {
  const engines = [
    ['Core', 'PRESENCE'],
    ['Behavior', 'AWAITING_DATA'],
    ['Analysis', 'DISABLED'],
    ['Awareness', 'ONLINE'],
    ['Predictive', 'STANDBY']
  ]
    .map(
      ([l, v]) =>
        `<span class="cog-global-strip__chip"><span class="cog-global-strip__chip-label">${l}</span><strong>${v}</strong></span>`
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
html,body{margin:0;background:#070c14;color:#e8f4ff;font-family:Rajdhani,sans-serif}
.main-content{padding:1rem;max-width:1200px}
</style></head><body>
<div class="cog-presence-root" data-viewport-tier="desktop">
  <div class="cog-presence-content">
    <div class="cc cc--premium">
      <div class="cc-top-cognitive-presence">
        <div class="cog-global-strip cog-global-strip--desktop-summary cog-global-strip--top-exposed">
          <div class="cog-mobile-summary cog-mobile-summary--compact">
            <div class="cog-mobile-summary__left">
              <span class="cog-mobile-summary__orb"></span>
              <div>
                <p class="cog-mobile-summary__title">IMPETUS COGNITIVE CORE</p>
                <p class="cog-mobile-summary__status">Status: PRESENÇA ATIVA</p>
              </div>
            </div>
            <div class="cog-mobile-summary__actions">
              <button type="button" class="cog-mobile-summary__btn cog-mobile-summary__btn--awareness">Consciência total</button>
            </div>
          </div>
          <div class="cog-global-strip__engines-panel">${engines}</div>
        </div>
      </div>
      <div class="cog-omnipresence-zone">
        <span class="cog-omnipresence-zone__label">ONIPRESENÇA COGNITIVA</span>
        <div class="cog-whispers cog-whispers--multi">
          <span class="cog-whispers__item cog-whispers__item--active">Presença cognitiva a observar operação ambiental.</span>
        </div>
      </div>
      <div class="live-dash-unified live-dash-unified--exec">
        <header class="live-dash-header"><h1>Operação em tempo real · IA &amp; orquestração</h1></header>
      </div>
      <div class="cc__cognitive-collapsible"><button class="cc__cognitive-toggle">▶ Ecossistema cognitivo vivo</button></div>
    </div>
  </div>
</div>
</body></html>`;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const html = buildHtml();
  const htmlPath = path.join(outDir, 'fixture.html');
  fs.writeFileSync(htmlPath, html);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(`file://${htmlPath}`);

  const checks = await page.evaluate(() => {
    const strip = document.querySelector('.cc-top-cognitive-presence');
    const omni = document.querySelector('.cog-omnipresence-zone');
    const live = document.querySelector('.live-dash-unified--exec');
    const chips = [...document.querySelectorAll('.cog-global-strip__chip')];

    const stripRect = strip?.getBoundingClientRect() ?? { height: 0 };
    const omniRect = omni?.getBoundingClientRect() ?? { height: 0, top: 0 };
    const liveTop = live?.getBoundingClientRect().top ?? 0;

    const verticalChips = chips.filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        cs.writingMode !== 'horizontal-tb' ||
        (r.height > r.width * 2 && r.width < 24)
      );
    });

    const stickyLayer = document.querySelector('.cc-top-cognitive-layer');

    return {
      stripHeight: stripRect.height,
      omniTop: omniRect.top,
      liveTop,
      omniBeforeLive: omniRect.top < liveTop,
      verticalChipCount: verticalChips.length,
      hasStickyWrapper: !!stickyLayer,
      corePosition: strip ? getComputedStyle(strip).position : null,
      omniPosition: omni ? getComputedStyle(omni).position : null
    };
  });

  await page.screenshot({ path: path.join(outDir, 'A-viewport-top.png'), fullPage: false });
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.screenshot({ path: path.join(outDir, 'B-scrolled.png'), fullPage: false });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.screenshot({ path: path.join(outDir, 'C-bottom.png'), fullPage: false });

  await browser.close();

  const pass =
    checks.stripHeight > 0 &&
    checks.stripHeight < 400 &&
    checks.omniBeforeLive &&
    checks.verticalChipCount === 0 &&
    !checks.hasStickyWrapper &&
    checks.corePosition !== 'sticky' &&
    checks.corePosition !== 'fixed';

  console.log(JSON.stringify({ pass, checks, screenshots: outDir }, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
