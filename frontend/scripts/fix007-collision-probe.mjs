/**
 * FIX-007 — mede interseção botão Atualizar × overlay cognitivo (CSS real).
 * Uso: node scripts/fix007-collision-probe.mjs [--broken] [--viewport=1366x768]
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const broken = process.argv.includes('--broken');
const mobile = process.argv.includes('--mobile');
const vpArg = process.argv.find((a) => a.startsWith('--viewport='));
const [width, height] = vpArg
  ? vpArg.split('=')[1].split('x').map(Number)
  : [1366, 768];

function readCss(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${width}, initial-scale=1" />
<style>
${readCss('src/styles/tokens.css')}
${readCss('src/styles.css')}
${readCss('src/pages/LiveIntelligentDashboard.css')}
${readCss('src/features/dashboard/centroComando/cognitiveEcosystem/cognitivePresence.css')}
/* Simula área útil com sidebar aberta (230px) */
.layout-sim {
  width: ${width - 230}px;
  margin: 0 auto;
  padding: 0;
  background: var(--bg-primary, #070c14);
  min-height: ${height}px;
  box-sizing: border-box;
}
.topbar-sim {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 1.25rem;
  border-bottom: 1px solid rgba(0, 212, 255, 0.15);
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: rgba(7, 12, 20, 0.95);
  position: sticky;
  top: 0;
  z-index: 10;
}
.cc-sim {
  padding: 1rem 1.25rem 2rem;
}
${broken ? `
/* Pré UI-DESKTOP-005 — reproduz colisão fixed */
.cog-presence-root[data-viewport-tier='desktop'] .cog-whispers {
  position: fixed !important;
  top: 4.5rem !important;
  right: 1.25rem !important;
  z-index: 3 !important;
  width: auto !important;
  max-width: 320px !important;
  margin: 0 !important;
  padding: 0 !important;
}
` : ''}
</style>
</head>
<body>
<div class="layout-sim">
  <div class="topbar-sim">Centro de Comando · IMPETUS</div>
  <div class="cc-sim">
  <div class="cog-presence-root" data-viewport-tier="${mobile ? 'mobile' : 'desktop'}" data-cog-mood="stable">
    <div class="cog-whispers cog-whispers--multi" aria-live="polite">
      <span class="cog-whispers__item cog-whispers__item--active cog-whispers__item--low">
        Neural correlation em tempo real — Cognitive Core observando operação industrial
      </span>
    </div>
    <div class="cog-presence-content">
      <div class="live-intelligent-dashboard live-dash-unified live-dash-unified--exec">
        <header class="live-dash-header">
          <div class="live-dash-title">
            <div>
              <h1>Operação em tempo real · IA &amp; orquestração</h1>
              <p class="live-dash-sub">Cartões e métricas vêm do seu perfil Impetus (cargo + setor + hierarquia).</p>
            </div>
          </div>
          <div class="live-dash-actions">
            <button type="button" class="live-dash-btn" id="btn-atualizar">Atualizar</button>
          </div>
        </header>
      </div>
    </div>
  </div>
  </div>
</div>
</body>
</html>`;

const outDir = path.join(root, '..', 'backend', 'docs', 'evidence', 'stabilization');
fs.mkdirSync(outDir, { recursive: true });
const htmlPath = path.join(outDir, `FIX_007_probe_${broken ? 'before' : 'after'}_${width}x${height}.html`);
fs.writeFileSync(htmlPath, html);

function intersect(a, b) {
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return x * y;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(`file://${htmlPath}`);
await page.waitForTimeout(300);

const data = await page.evaluate(() => {
  const btn = document.querySelector('.live-dash-btn');
  const overlay = document.querySelector('.cog-whispers');
  const br = btn.getBoundingClientRect();
  const or = overlay.getBoundingClientRect();
  const cx = br.left + br.width / 2;
  const cy = br.top + br.height / 2;
  const elAtCenter = document.elementFromPoint(cx, cy);
  const whisperStyle = getComputedStyle(overlay);
  return {
    buttonRect: { x: br.x, y: br.y, w: br.width, h: br.height },
    overlayRect: { x: or.x, y: or.y, w: or.width, h: or.height },
    whisperPosition: whisperStyle.position,
    whisperZ: whisperStyle.zIndex,
    pointerAtButtonCenter: elAtCenter?.id || elAtCenter?.className || elAtCenter?.tagName,
    scrollY: window.scrollY
  };
});

const btnArea = data.buttonRect.w * data.buttonRect.h;
const inter = intersect(
  {
    left: data.buttonRect.x,
    right: data.buttonRect.x + data.buttonRect.w,
    top: data.buttonRect.y,
    bottom: data.buttonRect.y + data.buttonRect.h
  },
  {
    left: data.overlayRect.x,
    right: data.overlayRect.x + data.overlayRect.w,
    top: data.overlayRect.y,
    bottom: data.overlayRect.y + data.overlayRect.h
  }
);
const visiblePct = btnArea > 0 ? Math.max(0, ((btnArea - inter) / btnArea) * 100) : 100;
const clickable =
  inter === 0
    ? 'YES'
    : inter >= btnArea * 0.5
      ? 'NO'
      : 'PARTIAL';

const screenshotPath = path.join(outDir, `FIX_007_${broken ? 'BEFORE' : 'AFTER'}_${width}x${height}.png`);
await page.screenshot({ path: screenshotPath, fullPage: false });

await browser.close();

const result = {
  viewport: `${width}x${height}`,
  mode: broken ? 'broken_simulation' : 'current_css',
  tier: mobile ? 'mobile' : 'desktop',
  BUTTON_RECT: data.buttonRect,
  OVERLAY_RECT: data.overlayRect,
  INTERSECTION_AREA: Math.round(inter * 100) / 100,
  BUTTON_VISIBLE_PERCENT: Math.round(visiblePct * 10) / 10,
  BUTTON_CLICKABLE: clickable,
  POINTER_EVENT_OWNER: data.pointerAtButtonCenter,
  WHISPER_POSITION: data.whisperPosition,
  WHISPER_Z_INDEX: data.whisperZ,
  COLLIDING_COMPONENT: 'CognitiveOmniPresence / .cog-whispers.cog-whispers--multi',
  screenshot: path.basename(screenshotPath)
};

console.log(JSON.stringify(result, null, 2));
