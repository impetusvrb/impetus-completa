#!/usr/bin/env node
/**
 * Teste manual de fluxo no navegador
 * Executa: npx playwright test scripts/browser-flow-test.spec.mjs --project=chromium
 * Ou: node scripts/browser-flow-test.mjs (standalone)
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const CREDS = { email: 'admin@impetus.local', password: 'Impetus@2025!' };
const results = [];

function log(step, status, detail) {
  const r = { step, status, detail };
  results.push(r);
  console.log(`\n[${status.toUpperCase()}] ${step}`);
  if (detail) console.log('  ', detail);
}

async function run() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    // 1. Navegar para localhost
    try {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const title = await page.title();
      const hasLogin = await page.locator('form').count() > 0 || await page.locator('input[type="email"], input[name="email"]').count() > 0;
      log('1. Navegação para ' + BASE, 'ok', `Título: ${title || '(vazio)'}, Form login visível: ${hasLogin}`);
    } catch (e) {
      log('1. Navegação', 'falhou', e.message);
      throw e;
    }

    // 2. Login
    try {
      const emailSel = 'input[type="email"], input[name="email"]';
      const passSel = 'input[type="password"], input[name="password"]';
      const hasForm = await page.locator(emailSel).count() > 0;
      if (!hasForm) {
        const loc = page.url();
        if (loc.includes('/app') || loc.includes('/setup')) {
          log('2. Login', 'ok', 'Já autenticado (redirect para app/setup)');
        } else {
          log('2. Login', 'falhou', 'Form de login não encontrado');
        }
      } else {
        await page.fill(emailSel, CREDS.email);
        await page.fill(passSel, CREDS.password);
        await page.click('button[type="submit"], form button');
        await page.waitForTimeout(3000);
        const url = page.url();
        const errMsg = await page.locator('.error-message, [role="alert"]').textContent().catch(() => null);
        if (errMsg) {
          log('2. Login', 'falhou', `Erro: ${errMsg}`);
        } else if (url.includes('/') && !url.includes('/app') && !url.includes('/setup')) {
          log('2. Login', 'falhou', `Possível falha - URL: ${url}`);
        } else {
          log('2. Login', 'ok', `Redirect para ${url}`);
        }
      }
    } catch (e) {
      log('2. Login', 'falhou', e.message);
    }

    // 3. Configurações - /app/configuracoes ou /app/settings
    try {
      await page.goto(BASE + '/app/configuracoes', { waitUntil: 'domcontentloaded', timeout: 8000 });
      await page.waitForTimeout(1500);
      const url = page.url();
      const isLoginRedirect = url.includes('/') && !url.includes('/app');
      if (isLoginRedirect) {
        log('3. Configurações /app/configuracoes', 'falhou', 'Redirect para login - sem permissão ou não autenticado');
      } else {
        const hasConfig = await page.locator('h1, .page-title').filter({ hasText: /configura/i }).count() > 0;
        log('3. Configurações', 'ok', `URL: ${url}, Título Config: ${hasConfig}`);
      }
    } catch (e) {
      log('3. Configurações', 'falhou', e.message);
    }

    // 4. Aba Comunicação - "App Impetus"
    try {
      await page.goto(BASE + '/app/configuracoes?tab=comunicacao', { waitUntil: 'domcontentloaded', timeout: 8000 });
      await page.waitForTimeout(1500);
      const url = page.url();
      const hasAppImpetus = await page.locator('text=App Impetus').count() > 0;
      const hasComunicacao = await page.locator('text=Comunicação').count() > 0;
      if (url.includes('/app/configuracoes') || url.includes('/app/settings')) {
        log('4. Aba Comunicação', hasAppImpetus ? 'ok' : 'falhou', hasAppImpetus ? 'Texto "App Impetus" encontrado' : 'Texto "App Impetus" NÃO encontrado');
      } else {
        log('4. Aba Comunicação', 'falhou', 'Não está na tela de configurações');
      }
    } catch (e) {
      log('4. Aba Comunicação', 'falhou', e.message);
    }

    // 5. Aba POPs/Manuais
    try {
      await page.click('button:has-text("POPs"), .stab:has-text("POPs")').catch(() => page.goto(BASE + '/app/configuracoes?tab=pops', { waitUntil: 'domcontentloaded' }));
      await page.waitForTimeout(2000);
      const hasPops = await page.locator('text=POPs, text=Procedimentos Operacionais').count() > 0;
      await page.click('button:has-text("Manuais"), .stab:has-text("Manuais")').catch(() => page.goto(BASE + '/app/configuracoes?tab=manuals', { waitUntil: 'domcontentloaded' }));
      await page.waitForTimeout(1500);
      const hasManuals = await page.locator('text=Manuais').count() > 0;
      log('5. Aba POPs/Manuais', (hasPops || hasManuals) ? 'ok' : 'falhou', `POPs: ${hasPops}, Manuais: ${hasManuals}`);
    } catch (e) {
      log('5. Aba POPs/Manuais', 'falhou', e.message);
    }

    // 6. Chat
    try {
      await page.goto(BASE + '/chat', { waitUntil: 'domcontentloaded', timeout: 8000 });
      await page.waitForTimeout(2000);
      const url = page.url();
      const isLoginRedirect = url === BASE + '/' || (url.endsWith('/') && !url.includes('/chat'));
      const hasChat = await page.locator('[class*="chat"], [data-testid*="chat"], text=Chat, text=Mensagens').count() > 0;
      log('6. Chat /chat', isLoginRedirect ? 'falhou' : 'ok', isLoginRedirect ? 'Redirect para login' : `Elemento chat: ${hasChat}`);
    } catch (e) {
      log('6. Chat', 'falhou', e.message);
    }

    // 7. App Mobile /m
    try {
      await page.goto(BASE + '/m', { waitUntil: 'domcontentloaded', timeout: 8000 });
      await page.waitForTimeout(2000);
      const url = page.url();
      const isLoginRedirect = url === BASE + '/' || (url.endsWith('/') && !url.includes('/m'));
      const hasMobile = await page.locator('text=Mobile, text=App, [class*="mobile"]').count() > 0 || url.includes('/m');
      log('7. App Mobile /m', isLoginRedirect ? 'falhou' : 'ok', isLoginRedirect ? 'Redirect para login' : `URL: ${url}, conteúdo: ${hasMobile ? 'ok' : 'verificar'}`);
    } catch (e) {
      log('7. App Mobile', 'falhou', e.message);
    }

  } catch (err) {
    console.error('Erro geral:', err);
  } finally {
    if (browser) await browser.close();
  }

  console.log('\n\n=== RESUMO ===');
  results.forEach(({ step, status, detail }) => {
    console.log(`${status === 'ok' ? '✓' : '✗'} ${step}: ${status}`);
  });
  return results;
}

run().then(r => process.exit(r.some(x => x.status === 'falhou') ? 1 : 0));
