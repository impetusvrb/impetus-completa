/**
 * INC-019 — probe arbitragem de foco whisper × card.
 * Uso: node scripts/inc019-focus-probe.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'tmp/inc019-screenshots');

function readCss(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const WIDTH = 1366;
const HEIGHT = 768;
const SIDEBAR = 230;
const TOPBAR = 54;

const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<style>
${readCss('src/styles/tokens.css')}
${readCss('src/styles.css')}
${readCss('src/features/dashboard/centroComando/CentroComando.css')}
${readCss('src/features/dashboard/centroComando/cognitiveEcosystem/cognitivePresence.css')}
body { margin: 0; background: #070c14; }
.layout-sim { display: flex; min-height: ${HEIGHT}px; }
.sidebar-sim { width: ${SIDEBAR}px; flex-shrink: 0; background: #0d1520; }
.main-sim { flex: 1; min-width: 0; overflow-y: auto; height: ${HEIGHT}px; }
.content-sim { padding-inline: 10px; }
.topbar-sim { height: ${TOPBAR}px; border-bottom: 1px solid rgba(0,212,255,0.12); }
.cc.cc--premium { padding: 0; max-width: none; }
.card-zone { height: 1800px; padding-top: 0.5rem; }
.impetus-card { min-height: 120px; margin-bottom: 1rem; cursor: pointer; }
#card-overlap { margin-top: 0; min-height: 140px; }
#card-distant { margin-top: 900px; }
</style>
</head>
<body>
<div class="layout-sim">
  <aside class="sidebar-sim"></aside>
  <div class="main-sim" id="scroll-root">
    <div class="topbar-sim"></div>
    <div class="content-sim">
      <div class="cog-presence-root" data-viewport-tier="desktop">
        <div class="cc cc--premium">
          <div class="cc-cognitive-continuity-row">
            <span class="cog-omnipresence-zone__label">ONIPRESENÇA</span>
            <div class="cog-whispers cog-whispers--multi" id="whispers">
              <span class="cog-whispers__item cog-whispers__item--active cog-whispers__item--semantic-normal">Cross-analysis em execução silenciosa…</span>
            </div>
            <button type="button" id="btn-atualizar">Atualizar</button>
          </div>
          <div class="card-zone">
            <article class="impetus-card" id="card-overlap">Card sob whisper</article>
            <article class="impetus-card" id="card-distant">Card distante</article>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<script type="module">
import { rectsIntersect, resolveWhisperFocusSurface } from './src/features/dashboard/centroComando/cognitiveEcosystem/whisperFocusUtils.js';

(function () {
  const el = document.getElementById('whispers');
  const row = document.querySelector('.cc-cognitive-continuity-row');
  const root = document.querySelector('.cc.cc--premium');
  let focusMode = 'foreground';
  let focusedSurface = null;

  const io = new IntersectionObserver(([entry]) => {
    const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    el.classList.toggle('cog-whispers--scroll-persist', scrolledPast);
    el.dataset.whisperPinned = scrolledPast ? 'true' : 'false';
    if (!scrolledPast) {
      focusMode = 'foreground';
      focusedSurface = null;
      el.classList.remove('cog-whispers--focus-yielding');
      el.dataset.whisperFocusMode = 'inline';
    } else {
      el.dataset.whisperFocusMode = focusMode;
    }
  }, { threshold: 0 });
  io.observe(row);

  function evaluate(surface) {
    if (!el.classList.contains('cog-whispers--scroll-persist') || !surface) {
      focusMode = 'foreground';
      focusedSurface = null;
    } else if (rectsIntersect(el.getBoundingClientRect(), surface.getBoundingClientRect())) {
      focusMode = 'yielding';
      focusedSurface = surface;
    } else {
      focusMode = 'foreground';
      focusedSurface = null;
    }
    el.classList.toggle('cog-whispers--focus-yielding', focusMode === 'yielding');
    el.dataset.whisperFocusMode = focusMode;
    window.__whisperFocusMode = focusMode;
  }

  root.addEventListener('pointerdown', (e) => evaluate(resolveWhisperFocusSurface(e.target)), true);
  document.addEventListener('pointerdown', (e) => {
    if (focusMode !== 'yielding' || !focusedSurface) return;
    if (focusedSurface.contains(e.target)) return;
    evaluate(null);
  }, true);
})();
</script>
</body>
</html>`;

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  // Inline utils for probe (Playwright setContent can't import modules easily)
  const probeHtml = html.replace(
    '<script type="module">',
    `<script>`
  ).replace(
    `import { rectsIntersect, resolveWhisperFocusSurface } from './src/features/dashboard/centroComando/cognitiveEcosystem/whisperFocusUtils.js';\n\n`,
    `${fs.readFileSync(path.join(root, 'src/features/dashboard/centroComando/cognitiveEcosystem/whisperFocusUtils.js'), 'utf8')
      .replace(/export function/g, 'function')
      .replace(/export const WHISPER_FOCUS_SURFACE_SELECTOR =/g, 'const WHISPER_FOCUS_SURFACE_SELECTOR =')
      .replace(/export function resolveWhisperFocusSurface/g, 'function resolveWhisperFocusSurface')}\n`
  );

  await page.setContent(probeHtml, { waitUntil: 'networkidle' });
  const scrollRoot = page.locator('#scroll-root');

  // scroll to pin whisper
  await scrollRoot.evaluate((el) => { el.scrollTop = 120; });
  await page.waitForTimeout(150);

  const pinned = await page.evaluate(() => document.getElementById('whispers').dataset.whisperPinned);
  const foregroundOpacity = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.cog-whispers__item')).opacity
  );

  // click distant card
  await page.locator('#card-distant').click({ force: true });
  await page.waitForTimeout(80);
  const afterDistant = await page.evaluate(() => window.__whisperFocusMode);

  // scroll back to overlap card
  await scrollRoot.evaluate((el) => { el.scrollTop = 80; });
  await page.waitForTimeout(120);
  await page.locator('#card-overlap').click({ force: true });
  await page.waitForTimeout(80);
  const afterOverlap = await page.evaluate(() => ({
    mode: window.__whisperFocusMode,
    opacity: getComputedStyle(document.querySelector('.cog-whispers__item')).opacity,
    yieldingClass: document.getElementById('whispers').classList.contains('cog-whispers--focus-yielding'),
  }));

  // click outside
  await page.locator('.topbar-sim').click({ position: { x: 200, y: 20 } });
  await page.waitForTimeout(80);
  const afterOutside = await page.evaluate(() => window.__whisperFocusMode);

  await page.screenshot({ path: path.join(outDir, 'inc019-yielding.png') });
  await browser.close();

  const pass = {
    pinned,
    foreground_default: pinned === 'true' && Number(foregroundOpacity) > 0.9,
    distant_click: afterDistant === 'foreground',
    overlap_click: afterOverlap.mode === 'yielding' && afterOverlap.yieldingClass,
    yielding_dimmed: Number(afterOverlap.opacity) < 0.5,
    outside_restore: afterOutside === 'foreground',
  };

  console.log(JSON.stringify({ pass, afterOverlap, foregroundOpacity }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
