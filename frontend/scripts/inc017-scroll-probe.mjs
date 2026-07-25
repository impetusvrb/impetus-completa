/**
 * INC-017 — valida persistência de scroll da Onipresença (desktop).
 * Uso: node scripts/inc017-scroll-probe.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'tmp/inc017-screenshots');

function readCss(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const WIDTH = 1366;
const HEIGHT = 768;
const SIDEBAR = 230;

const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${WIDTH}, initial-scale=1" />
<style>
${readCss('src/styles/tokens.css')}
${readCss('src/styles.css')}
${readCss('src/components/Layout.css')}
${readCss('src/features/dashboard/centroComando/CentroComando.css')}
${readCss('src/features/dashboard/centroComando/cognitiveEcosystem/cognitivePresence.css')}
${readCss('src/pages/LiveIntelligentDashboard.css')}
body { margin: 0; background: #070c14; }
.layout-sim { display: flex; min-height: ${HEIGHT}px; }
.sidebar-sim { width: ${SIDEBAR}px; flex-shrink: 0; background: #0d1520; border-right: 1px solid rgba(0,212,255,0.12); }
.main-sim { flex: 1; min-width: 0; overflow-y: auto; height: ${HEIGHT}px; }
.content-sim { padding-inline: 10px; }
.topbar-sim { height: 56px; border-bottom: 1px solid rgba(0,212,255,0.12); }
.spacer { height: 2400px; background: linear-gradient(180deg, transparent, rgba(0,212,255,0.03)); }
</style>
</head>
<body>
<div class="layout-sim">
  <aside class="sidebar-sim"></aside>
  <div class="main-sim" id="scroll-root">
    <div class="topbar-sim"></div>
    <div class="content-sim">
      <div class="cog-presence-root" data-viewport-tier="desktop" data-cog-mood="stable">
        <div class="cc cc--premium">
          <div class="cc-top-cognitive-presence"><div style="height:48px;border:1px solid rgba(0,212,255,0.2);margin-bottom:0.35rem">Core rail sim</div></div>
          <div class="cc-cognitive-continuity-row">
            <span class="cog-omnipresence-zone__label">ONIPRESENÇA COGNITIVA</span>
            <div class="cog-whispers cog-whispers--multi" id="whispers" aria-live="polite">
              <span class="cog-whispers__item cog-whispers__item--active">Cross-analysis em execução silenciosa…</span>
            </div>
            <div class="cc-cognitive-continuity-action"><button type="button" id="btn-atualizar" class="live-dash-btn live-dash-btn--continuity">Atualizar</button></div>
          </div>
          <div class="live-intelligent-dashboard live-dash-unified--continuity"><h2>Operação em tempo real</h2></div>
          <div class="spacer"></div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
(function () {
  const el = document.getElementById('whispers');
  const row = document.querySelector('.cc-cognitive-continuity-row');
  const root = document.getElementById('scroll-root');
  const target = row || el;
  if (!target || !root || typeof IntersectionObserver === 'undefined') return;
  const io = new IntersectionObserver(([entry]) => {
    const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    if (el) {
      el.classList.toggle('cog-whispers--scroll-persist', scrolledPast);
      el.dataset.whisperPinned = scrolledPast ? 'true' : 'false';
    }
  }, { root: null, threshold: 0 });
  io.observe(target);
})();
</script>
</body>
</html>`;

async function measure(page) {
  return page.evaluate(() => {
    const whispers = document.querySelector('.cog-whispers--multi');
    const btn = document.getElementById('btn-atualizar');
    const wr = whispers?.getBoundingClientRect();
    const br = btn?.getBoundingClientRect();
    const cs = whispers ? getComputedStyle(whispers) : null;
    const intersect = (a, b) => {
      if (!a || !b) return 0;
      const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return x * y;
    };
    const doc = document.documentElement;
    return {
      whisperPosition: cs?.position,
      whisperPinned: whispers?.dataset?.whisperPinned === 'true',
      whisperRect: wr ? { x: wr.x, y: wr.y, w: wr.width, h: wr.height } : null,
      btnRect: br ? { x: br.x, y: br.y, w: br.width, h: br.height } : null,
      intersectionArea: intersect(wr, br),
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth > doc.clientWidth + 1
    };
  });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  await page.setContent(html, { waitUntil: 'networkidle' });

  const scrollRoot = page.locator('#scroll-root');
  const results = {};

  for (const pct of [0, 25, 50, 75]) {
    const maxScroll = await scrollRoot.evaluate((el) => el.scrollHeight - el.clientHeight);
    await scrollRoot.evaluate((el, y) => { el.scrollTop = y; }, Math.round(maxScroll * pct / 100));
    await page.waitForTimeout(120);
    results[`scroll_${pct}`] = await measure(page);
    await page.screenshot({ path: path.join(outDir, `inc017-scroll-${pct}.png`), fullPage: false });
  }

  await scrollRoot.evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(120);
  results.return_to_top = await measure(page);

  await browser.close();

  const pass = {
    scroll_0: results.scroll_0.whisperPosition === 'static' && !results.scroll_0.whisperPinned,
    scroll_25: results.scroll_25.whisperPinned === true || results.scroll_25.whisperPosition === 'fixed',
    scroll_50: results.scroll_50.whisperPosition === 'fixed',
    scroll_75: results.scroll_75.whisperPosition === 'fixed',
    return_to_top: results.return_to_top.whisperPosition === 'static' && !results.return_to_top.whisperPinned,
    no_overflow: !results.scroll_50.overflow,
    no_collision_at_scroll: results.scroll_50.intersectionArea === 0
  };

  console.log(JSON.stringify({ results, pass }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
