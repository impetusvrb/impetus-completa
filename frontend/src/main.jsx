import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import App from './App';
import './styles.css';
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => {}));
    }).catch(() => {});
  });
}

const rootEl = document.getElementById('root');
const bootSplash = document.getElementById('impetus-boot-splash');

function showFatalBootError(message) {
  const esc = String(message || 'Erro desconhecido.')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  if (rootEl) {
    rootEl.innerHTML = `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;box-sizing:border-box;background:#070c14;color:rgba(232,244,255,0.92);font-family:'Share Tech Mono',monospace;font-size:13px;line-height:1.55;max-width:520px;text-align:center;">
    <p style="margin:0 0 12px;color:#ffaa00;text-transform:uppercase;letter-spacing:0.12em;font-size:11px;">Falha ao iniciar</p>
    <p style="margin:0;">${esc}</p>
    <p style="margin:16px 0 0;color:rgba(232,244,255,0.65);font-size:12px;">Se usou login antes, experimente limpar dados deste site para <strong>impetus</strong> ou recarregar com Ctrl+Shift+R (cache).</p>
  </div>`;
  }
}

let reactRoot;
try {
  if (!rootEl) {
    showFatalBootError('Elemento #root em falta no HTML.');
  } else {
    reactRoot = createRoot(rootEl);
    flushSync(() => {
      reactRoot.render(<App />);
    });
  }
} catch (err) {
  console.error('[impetus] boot:', err);
  try {
    reactRoot?.unmount();
  } catch (_) {
    /* ignore */
  }
  showFatalBootError(err?.message || 'Erro ao montar a interface.');
}
bootSplash?.remove();
