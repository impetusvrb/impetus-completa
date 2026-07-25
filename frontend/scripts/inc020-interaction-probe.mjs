/**
 * INC-020 — probe interacção real whisper (Playwright pointerdown).
 * Uso: node scripts/inc020-interaction-probe.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function readCss(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const utilsSrc = fs
  .readFileSync(
    path.join(root, 'src/features/dashboard/centroComando/cognitiveEcosystem/whisperFocusUtils.js'),
    'utf8'
  )
  .replace(/export function/g, 'function')
  .replace(/export const/g, 'const');

const hookLogic = `
let focusMode = 'foreground';
let focusedSurface = null;

function setMode(m) { focusMode = m; window.__whisperFocusMode = m; updateDom(); }
function updateDom() {
  const el = document.getElementById('whispers');
  if (!el) return;
  el.dataset.whisperFocusMode = focusMode;
  el.classList.toggle('cog-whispers--focus-yielding', focusMode === 'yielding');
  el.classList.toggle('cog-whispers--focus-dismissed', focusMode === 'dismissed');
}

function onPointerDown(event) {
  const whisperEl = document.getElementById('whispers');
  if (!whisperEl?.classList.contains('cog-whispers--scroll-persist')) return;
  const root = document.querySelector('.cc.cc--premium');
  const target = event.target;

  if (isWhisperTarget(target)) {
    event.stopPropagation();
    focusedSurface = null;
    setMode('dismissed');
    return;
  }

  const surface = resolveWhisperFocusSurface(target, root);
  if (!surface) {
    if (focusMode === 'dismissed' || focusMode === 'yielding') {
      focusedSurface = null;
      setMode('foreground');
    }
    return;
  }

  if (rectsIntersect(whisperEl.getBoundingClientRect(), surface.getBoundingClientRect())) {
    focusedSurface = surface;
    setMode('yielding');
  } else {
    focusedSurface = null;
    setMode('foreground');
  }
}
`;

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
${readCss('src/styles/tokens.css')}
${readCss('src/styles.css')}
${readCss('src/features/dashboard/centroComando/CentroComando.css')}
body{margin:0;background:#070c14}
.layout{display:flex;height:768px}
.sidebar{width:230px;background:#0d1520}
.main{flex:1;overflow:auto}
.topbar{height:54px;border-bottom:1px solid rgba(0,212,255,.12)}
.card-wide{min-height:220px;margin:0 0 1rem;padding:4.5rem 1rem 1rem;border:1px solid rgba(0,212,255,.2);background:rgba(15,26,40,.9)}
.card-wide h4{margin:0 0 .5rem;color:#00d4ff;font-family:monospace}
.card-wide p{margin:0;color:#8899aa;font-size:.85rem}
.card-wide svg{display:inline;vertical-align:middle}
.card-distant{margin-top:700px}
.neutral{padding:2rem;color:#556}
</style></head>
<body>
<div class="layout">
<aside class="sidebar"></aside>
<div class="main" id="scroll">
<div class="topbar"></div>
<div class="content-sim" style="padding:10px">
<div class="cog-presence-root" data-viewport-tier="desktop">
<div class="cc cc--premium">
<div class="cc-cognitive-continuity-row"><span>ONIPRESENÇA</span>
<div class="cog-whispers cog-whispers--multi" id="whispers"><span class="cog-whispers__item cog-whispers__item--active cog-whispers__item--semantic-normal">Cross-analysis em execução silenciosa…</span></div>
</div>
<article class="live-dash-dynamic-card card-wide" id="card-overlap" data-whisper-focus-surface>
<h4>Card operacional</h4>
<p><span>Valor interno</span> <svg width="16" height="16"><path d="M2 2h12v12H2z" fill="#00d4ff"/></svg></p>
</article>
<article class="live-dash-dynamic-card card-distant" id="card-distant" data-whisper-focus-surface>Card distante</article>
<div class="neutral" id="neutral">Área neutra</div>
</div></div></div></div></div>
<script>${utilsSrc}\n${hookLogic}
(function(){
  const row=document.querySelector('.cc-cognitive-continuity-row');
  const el=document.getElementById('whispers');
  const root=document.querySelector('.cc.cc--premium');
  new IntersectionObserver(([e])=>{
    const past=!e.isIntersecting&&e.boundingClientRect.top<0;
    el.classList.toggle('cog-whispers--scroll-persist',past);
    if(!past){setMode('foreground');}
  },{threshold:0}).observe(row);
  root.addEventListener('pointerdown',onPointerDown,true);
})();
</script>
</body></html>`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.locator('#scroll').evaluate((el) => { el.scrollTop = 90; });
  await page.waitForTimeout(200);

  await page.locator('#card-overlap h4').click();
  await page.waitForTimeout(100);
  const childClick = await page.evaluate(() => window.__whisperFocusMode);

  await page.evaluate(() => { focusMode = 'foreground'; updateDom(); });
  await page.locator('.cog-whispers__item').click();
  await page.waitForTimeout(100);
  const clickWhisper = await page.evaluate(() => window.__whisperFocusMode);

  await page.locator('#neutral').click();
  await page.waitForTimeout(100);
  const neutralRestore = await page.evaluate(() => window.__whisperFocusMode);

  await page.evaluate(() => { focusMode = 'foreground'; updateDom(); });
  await page.locator('#card-distant').click();
  await page.waitForTimeout(100);
  const distantClick = await page.evaluate(() => window.__whisperFocusMode);

  await browser.close();

  const pass = {
    click_whisper_dismissed: clickWhisper === 'dismissed',
    neutral_restore: neutralRestore === 'foreground',
    intersecting_child_yielding: childClick === 'yielding',
    distant_foreground: distantClick === 'foreground',
  };

  console.log(JSON.stringify({ pass, clickWhisper, neutralRestore, childClick, distantClick }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
