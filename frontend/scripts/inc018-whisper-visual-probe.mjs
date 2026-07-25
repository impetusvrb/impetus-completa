/**
 * INC-018 — valida posicionamento e semântica visual do whisper persistente.
 * Uso: node scripts/inc018-whisper-visual-probe.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'tmp/inc018-screenshots');

function readCss(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const WIDTH = 1366;
const HEIGHT = 768;
const SIDEBAR = 230;
const TOPBAR = 54;

function buildHtml(semanticTier) {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<style>
${readCss('src/styles/tokens.css')}
${readCss('src/styles.css')}
${readCss('src/components/Layout.css')}
${readCss('src/features/dashboard/centroComando/CentroComando.css')}
${readCss('src/features/dashboard/centroComando/cognitiveEcosystem/cognitivePresence.css')}
body { margin: 0; background: #070c14; }
.layout-sim { display: flex; min-height: ${HEIGHT}px; }
.sidebar-sim { width: ${SIDEBAR}px; flex-shrink: 0; background: #0d1520; border-right: 1px solid rgba(0,212,255,0.12); }
.main-sim { flex: 1; min-width: 0; overflow-y: auto; height: ${HEIGHT}px; }
.content-sim { padding-inline: 10px; }
.topbar-sim { height: ${TOPBAR}px; border-bottom: 1px solid rgba(0,212,255,0.12); display:flex;align-items:center;justify-content:flex-end;padding:0 1rem;gap:0.5rem; }
.topbar-sim__ctrl { width:32px;height:32px;border:1px solid rgba(0,212,255,0.2);border-radius:4px; }
.spacer { height: 2400px; }
</style>
</head>
<body>
<div class="layout-sim">
  <aside class="sidebar-sim"></aside>
  <div class="main-sim" id="scroll-root">
    <div class="topbar-sim"><div class="topbar-sim__ctrl"></div><div class="topbar-sim__ctrl"></div></div>
    <div class="content-sim">
      <div class="cog-presence-root" data-viewport-tier="desktop">
        <div class="cc cc--premium">
          <div class="cc-cognitive-continuity-row">
            <span class="cog-omnipresence-zone__label">ONIPRESENÇA COGNITIVA</span>
            <div class="cog-whispers cog-whispers--multi" id="whispers">
              <span class="cog-whispers__item cog-whispers__item--active cog-whispers__item--semantic-${semanticTier}">Cross-analysis em execução silenciosa…</span>
            </div>
            <button type="button" id="btn-atualizar" class="live-dash-btn">Atualizar</button>
          </div>
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
  const target = row || el;
  if (!target || typeof IntersectionObserver === 'undefined') return;
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
}

async function measure(page) {
  return page.evaluate((topbarH) => {
    const whispers = document.querySelector('.cog-whispers--multi');
    const item = document.querySelector('.cog-whispers__item');
    const topbar = document.querySelector('.topbar-sim');
    const btn = document.getElementById('btn-atualizar');
    const wr = whispers?.getBoundingClientRect();
    const ir = item?.getBoundingClientRect();
    const tr = topbar?.getBoundingClientRect();
    const br = btn?.getBoundingClientRect();
    const cs = item ? getComputedStyle(item) : null;
    const intersect = (a, b) => {
      if (!a || !b) return 0;
      const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return x * y;
    };
    const doc = document.documentElement;
    return {
      pinned: whispers?.classList.contains('cog-whispers--scroll-persist'),
      whisperTop: wr?.top,
      itemColor: cs?.color,
      gapBelowTopbar: tr && wr ? wr.top - tr.bottom : null,
      headerCollision: intersect(wr, tr),
      updateCollision: intersect(wr, br),
      rightMargin: wr ? doc.clientWidth - wr.right : null,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth
    };
  }, TOPBAR);
}

async function runScenario(browser, tier, label) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  await page.setContent(buildHtml(tier), { waitUntil: 'networkidle' });
  const scrollRoot = page.locator('#scroll-root');
  const out = { tier, label, points: {} };

  for (const pct of [0, 50]) {
    const maxScroll = await scrollRoot.evaluate((el) => el.scrollHeight - el.clientHeight);
    await scrollRoot.evaluate((el, y) => { el.scrollTop = y; }, Math.round(maxScroll * pct / 100));
    await page.waitForTimeout(120);
    out.points[`scroll_${pct}`] = await measure(page);
    await page.screenshot({ path: path.join(outDir, `inc018-${label}-scroll-${pct}.png`) });
  }

  await page.close();
  return out;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const normal = await runScenario(browser, 'normal', 'normal');
  const warning = await runScenario(browser, 'warning', 'warning');
  const critical = await runScenario(browser, 'critical', 'critical');
  await browser.close();

  const pinned = normal.points.scroll_50;
  const pass = {
    scroll_0_inline: !normal.points.scroll_0.pinned,
    scroll_50_pinned: pinned.pinned === true,
    gap_below_topbar: pinned.gapBelowTopbar >= 28,
    no_header_collision: pinned.headerCollision === 0,
    no_update_collision: pinned.updateCollision === 0,
    right_margin_ok: pinned.rightMargin >= 12,
    no_overflow: !pinned.scrollWidth > pinned.clientWidth + 1,
    warning_color: warning.points.scroll_50.itemColor.includes('255, 170') || warning.points.scroll_50.itemColor.includes('ffaa'),
    critical_color: critical.points.scroll_50.itemColor.includes('255, 64') || critical.points.scroll_50.itemColor.includes('ff4040')
  };

  console.log(JSON.stringify({ normal, warning, critical, pass, measured: {
    HISTORICAL_POSITION: 'top: 4.5rem; right: 1.25rem',
    CURRENT_SAFE_POSITION: `top: calc(54px + 2.25rem) ≈ ${pinned.whisperTop}px; right: max(12px, 1rem); gapBelowTopbar: ${pinned.gapBelowTopbar}px`
  }}, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
