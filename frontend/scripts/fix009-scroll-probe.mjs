/**
 * FIX-009 — auditoria scroll ownership (Centro Comando + Voice Overlay/SmartPanel).
 * Uso: node scripts/fix009-scroll-probe.mjs [--scenario=centro|overlay] [--viewport=1366x768]
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const scenario = (process.argv.find((a) => a.startsWith('--scenario='))?.split('=')[1] || 'both');
const vpArg = process.argv.find((a) => a.startsWith('--viewport='));
const [width, height] = vpArg
  ? vpArg.split('=')[1].split('x').map(Number)
  : [1366, 768];

function readCss(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function buildCentroHtml() {
  return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"/>
<style>
${readCss('src/styles/tokens.css')}
${readCss('src/styles.css')}
${readCss('src/components/Layout.css')}
${readCss('src/pages/LiveIntelligentDashboard.css')}
${readCss('src/features/dashboard/centroComando/CentroComando.css')}
${readCss('src/features/dashboard/centroComando/cognitiveEcosystem/cognitivePresence.css')}
${readCss('src/features/dashboard/centroComando/cognitiveEcosystem/cognitiveEcosystem.css')}
html,body{margin:0;height:100%;overflow:hidden}
</style></head><body>
<div class="layout" id="layout">
  <aside class="sidebar open" style="width:230px;min-height:100vh"></aside>
  <div class="main-content">
    <header class="topbar header" style="height:54px"></header>
    <main class="content" id="page-scroll" data-scroll-owner="page">
      <div class="cog-presence-root" data-viewport-tier="desktop">
        <div class="cog-whispers cog-whispers--multi"><span class="cog-whispers__item">Cognitive Core observando operação</span></div>
        <div class="cog-presence-content">
          <div class="cc cc--premium">
            <div class="live-intelligent-dashboard live-dash-unified live-dash-unified--exec">
              <header class="live-dash-header"><div class="live-dash-title"><h1>Operação em tempo real</h1></div>
              <div class="live-dash-actions"><button class="live-dash-btn" id="btn-atualizar">Atualizar</button></div></header>
            </div>
            <div class="cc__body" style="display:grid;grid-template-columns:1fr 280px;gap:1rem">
              <div class="cc__main" id="main-col">
                ${Array.from({ length: 24 }, (_, i) => `<div class="cc__cell cc__cell--alive" style="min-height:120px;margin-bottom:1rem;border:1px solid rgba(0,212,255,.15);padding:1rem">Widget ${i + 1}</div>`).join('')}
              </div>
              <aside class="cc__rail" id="rail-scroll" data-scroll-owner="rail">
                ${Array.from({ length: 12 }, (_, i) => `<div class="cc__cell" style="min-height:100px;margin-bottom:1rem;border:1px solid rgba(0,212,255,.12);padding:.75rem">Rail ${i + 1}</div>`).join('')}
              </aside>
            </div>
          </div>
        </div>
      </div>
      <div style="height:400px" id="page-bottom-marker">PAGE_BOTTOM</div>
    </main>
  </div>
</div>
</body></html>`;
}

function buildOverlayHtml() {
  return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"/>
<style>
${readCss('src/styles/tokens.css')}
${readCss('src/components/ImpetusVoiceOverlay.css')}
${readCss('src/features/smartPanel/SmartPanel.css')}
html,body{margin:0;height:100%;overflow:hidden;background:#050d1a}
</style></head><body>
<div class="impetus-voice-overlay" id="overlay" role="dialog">
  <div class="impetus-voice-overlay__panel">
    <div class="impetus-voice-overlay__topbar"><div class="impetus-voice-overlay__brand">IMPETUS</div></div>
    <div class="impetus-voice-overlay__grid">
      <section class="impetus-voice-overlay__left"><div style="height:400px"></div></section>
      <section class="impetus-voice-overlay__right">
        <div class="impetus-voice-overlay__dynamic-body impetus-voice-overlay__dynamic-body--visual-only">
          <div class="impetus-voice-overlay__stream-wrap">
            <div class="smart-panel smart-panel--voice-only smart-panel--visual-canvas impetus-voice-overlay__smart-panel">
              <div class="smart-panel__visual-stage" id="panel-scroll" data-scroll-owner="smartpanel">
                ${Array.from({ length: 40 }, (_, i) => `<p style="margin:0 0 12px;font-size:.85rem;color:#dceef8">Linha relatório IA ${i + 1} — conteúdo longo para overflow no painel direito.</p>`).join('')}
                <div id="panel-bottom-marker">PANEL_BOTTOM</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</div>
</body></html>`;
}

async function auditScroll(page, name) {
  const data = await page.evaluate(() => {
    const scrollables = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const cs = getComputedStyle(el);
      const oy = cs.overflowY;
      if (!['auto', 'scroll', 'overlay'].includes(oy)) continue;
      if (el.scrollHeight <= el.clientHeight + 2) continue;
      scrollables.push({
        id: el.id || null,
        className: (el.className || '').toString().slice(0, 80),
        dataOwner: el.dataset?.scrollOwner || null,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflowY: oy,
        position: cs.position,
        maxHeight: cs.maxHeight,
        height: cs.height
      });
    }
    return scrollables;
  });

  async function wheelAt(selector, deltaY) {
    const before = await page.evaluate(() => {
      const targets = {};
      document.querySelectorAll('[data-scroll-owner], .content, .smart-panel__visual-stage, .cc__rail').forEach((el) => {
        const key = el.id || el.className?.toString?.().slice(0, 40) || 'node';
        targets[key] = el.scrollTop;
      });
      return targets;
    });

    const loc = page.locator(selector).first();
    const count = await loc.count();
    if (!count) return { moved: [], before, after: before };
    const box = await loc.boundingBox();
    if (!box) return { moved: [], before, after: before };
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 40));
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(120);

    const after = await page.evaluate(() => {
      const targets = {};
      document.querySelectorAll('[data-scroll-owner], .content, .smart-panel__visual-stage, .cc__rail').forEach((el) => {
        const key = el.id || el.className?.toString?.().slice(0, 40) || 'node';
        targets[key] = el.scrollTop;
      });
      return targets;
    });

    const moved = [];
    for (const k of Object.keys(after)) {
      if ((after[k] || 0) !== (before[k] || 0)) moved.push({ key: k, delta: after[k] - before[k] });
    }
    return { moved, before, after };
  }

  const outsideWheel = await wheelAt('#page-scroll', 400);
  const panelWheel = name === 'overlay' ? await wheelAt('#panel-scroll', 400) : null;
  const railWheel = name === 'centro' ? await wheelAt('#rail-scroll', 400) : null;

  const endKey = await page.keyboard.press('End').then(() => page.waitForTimeout(100));
  const endState = await page.evaluate(() => ({
    page: document.getElementById('page-scroll')?.scrollTop,
    panel: document.getElementById('panel-scroll')?.scrollTop,
    rail: document.getElementById('rail-scroll')?.scrollTop,
    pageBottomVisible: !!document.getElementById('page-bottom-marker')?.getBoundingClientRect &&
      document.getElementById('page-bottom-marker').getBoundingClientRect().top < window.innerHeight,
    panelBottomVisible: (() => {
      const el = document.getElementById('panel-bottom-marker');
      return el ? el.getBoundingClientRect().top < window.innerHeight : null;
    })()
  }));

  await page.keyboard.press('Home');
  await page.waitForTimeout(80);

  const visibleBars = await page.evaluate(() => {
    let count = 0;
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (['auto', 'scroll'].includes(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) count += 1;
      }
    });
    return count;
  });

  return { scrollables: data, outsideWheel, panelWheel, railWheel, endState, visibleBars };
}

const outDir = path.join(root, '..', 'backend', 'docs', 'evidence', 'stabilization');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = {};

for (const sc of scenario === 'both' ? ['centro', 'overlay'] : [scenario]) {
  const html = sc === 'centro' ? buildCentroHtml() : buildOverlayHtml();
  const htmlPath = path.join(outDir, `FIX_009_probe_${sc}_${width}x${height}.html`);
  fs.writeFileSync(htmlPath, html);
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`file://${htmlPath}`);
  await page.waitForTimeout(200);
  results[`${sc}_${width}x${height}`] = await auditScroll(page, sc);
  await page.close();
}

await browser.close();
console.log(JSON.stringify({ viewport: `${width}x${height}`, results }, null, 2));
