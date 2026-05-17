/**
 * Enterprise Runtime Stability — Static Smoke Tests
 * Valida ausência de render recursion, menu rebuild storm, route loops
 * e instabilidade referencial nos módulos críticos do frontend.
 * Execução: node --experimental-vm-modules .../enterpriseRuntimeStabilityScenarios.mjs
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let passed = 0;
let failed = 0;

function ok(label, condition, detail) {
  if (condition) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function section(title) {
  console.log(`\nenterprise-runtime-stability — ${title}`);
}

/* ──────────────────────────────────────────────────────────────────────
   HELPERS: importar módulos ES sem contexto browser
   ────────────────────────────────────────────────────────────────────── */

async function loadSidebarNavHelpers() {
  const mod = await import('../../utils/sidebarNavHelpers.js');
  return mod;
}

async function loadQualityMenuEngine() {
  // Mock import.meta.env para os feature-flag helpers
  const mod = await import('../../domains/quality/navigation/qualityMenuPublicationEngine.js');
  return mod;
}

/* ──────────────────────────────────────────────────────────────────────
   1. sidebarNavHelpers — sem throw, sem recursão
   ────────────────────────────────────────────────────────────────────── */
section('sidebarNavHelpers — referential stability');

const helpers = await loadSidebarNavHelpers();
const { isSidebarMenuItemActive, sidebarNavItemKey, dedupeSidebarMenuItems } = helpers;

// Não deve lançar com path undefined
ok('isSidebarMenuItemActive tolerates undefined path', (() => {
  try { return typeof isSidebarMenuItemActive(undefined, '/app', '') === 'boolean'; }
  catch { return false; }
})());

// Não deve lançar com path null
ok('isSidebarMenuItemActive tolerates null path', (() => {
  try { return typeof isSidebarMenuItemActive(null, '/app', '') === 'boolean'; }
  catch { return false; }
})());

// Active state correto para path exato
ok('isSidebarMenuItemActive exact match', isSidebarMenuItemActive('/app', '/app', ''));

// Active state correto para path com query e view present
ok('isSidebarMenuItemActive path mismatch', !isSidebarMenuItemActive('/app/quality', '/app', ''));

// Sem loop — chamadas repetidas produzem o mesmo resultado (referential purity)
{
  const r1 = isSidebarMenuItemActive('/app/quality/operational', '/app/quality/operational', '');
  const r2 = isSidebarMenuItemActive('/app/quality/operational', '/app/quality/operational', '');
  ok('isSidebarMenuItemActive is deterministic (no side-effects)', r1 === r2);
}

// sidebarNavItemKey não lança com item parcial
ok('sidebarNavItemKey safe with partial item', (() => {
  try {
    const k = sidebarNavItemKey({ path: '/app' }, 0);
    return typeof k === 'string' && k.length > 0;
  } catch { return false; }
})());

// sidebarNavItemKey quality item usa manifest id
ok('sidebarNavItemKey quality item key uses manifest id', (() => {
  try {
    const k = sidebarNavItemKey({ path: '/app/quality/op', _quality_manifest_id: 'quality_operational' }, 0);
    return k.includes('quality_operational');
  } catch { return false; }
})());

// dedupe: sem redução de array para itens sem path duplicado
{
  const items = [
    { path: '/app' },
    { path: '/app/proacao' },
    { path: '/app/chatbot' }
  ];
  const deduped = dedupeSidebarMenuItems(items);
  ok('dedupeSidebarMenuItems preserves distinct paths', deduped.length === 3);
}

// dedupe: elimina duplicatas com mesmo path
{
  const items = [
    { path: '/app' },
    { path: '/app' },
    { path: '/app/chatbot' }
  ];
  const deduped = dedupeSidebarMenuItems(items);
  ok('dedupeSidebarMenuItems removes duplicate paths', deduped.length === 2);
}

// dedupe: não lança com array vazio
ok('dedupeSidebarMenuItems handles empty array', (() => {
  try { return Array.isArray(dedupeSidebarMenuItems([])); } catch { return false; }
})());

// dedupe: não lança com non-array
ok('dedupeSidebarMenuItems handles non-array input', (() => {
  try { return Array.isArray(dedupeSidebarMenuItems(null)); } catch { return false; }
})());

/* ──────────────────────────────────────────────────────────────────────
   2. safeMergeQualityPublicationIntoMenu — barreira anticrash
   ────────────────────────────────────────────────────────────────────── */
section('safeMergeQualityPublicationIntoMenu — crash barrier');

const { safeMergeQualityPublicationIntoMenu, mergeQualityPublicationIntoMenu } = await loadQualityMenuEngine();

const BASE_MENU = [
  { path: '/app', label: 'Dashboard' },
  { path: '/app/chatbot', label: 'Impetus IA', aiIcon: true },
  { path: '/chat', label: 'Chat', chatIcon: true },
  { path: '/app/proacao', label: 'Pró-Ação' }
];

// Com ctx null → devolve base intacto
{
  const result = safeMergeQualityPublicationIntoMenu(BASE_MENU, null);
  ok('safeMerge preserves base on null ctx', Array.isArray(result) && result.length === BASE_MENU.length);
}

// Com ctx corrompido → devolve base intacto
{
  const result = safeMergeQualityPublicationIntoMenu(BASE_MENU, { modulesLoading: null, visibleModules: 'BROKEN' });
  ok('safeMerge preserves base on corrupt ctx', Array.isArray(result) && result.length >= BASE_MENU.length);
}

// Com modulesLoading=true → devolve base sem modificação
{
  const ctx = { modulesLoading: true, user: null, visibleModules: [] };
  const result = safeMergeQualityPublicationIntoMenu(BASE_MENU, ctx);
  ok('safeMerge returns base when modulesLoading=true', result.length === BASE_MENU.length);
}

// Nunca encolhe o menu
{
  const ctx = { modulesLoading: false, user: { role: 'coordenador' }, visibleModules: [] };
  const result = safeMergeQualityPublicationIntoMenu(BASE_MENU, ctx);
  ok('safeMerge never shrinks base menu', result.length >= BASE_MENU.length);
}

// IA e Chat sempre presentes depois do merge
{
  const ctx = { modulesLoading: false, user: { role: 'coordenador' }, visibleModules: [] };
  const result = safeMergeQualityPublicationIntoMenu(BASE_MENU, ctx);
  const hasIA = result.some((i) => i.path === '/app/chatbot');
  const hasChat = result.some((i) => i.path === '/chat');
  ok('safeMerge preserves IA item', hasIA);
  ok('safeMerge preserves Chat item', hasChat);
}

// Sem duplicatas de path base após merge
{
  const ctx = { modulesLoading: false, user: { role: 'diretor' }, visibleModules: ['quality'] };
  const result = safeMergeQualityPublicationIntoMenu(BASE_MENU, ctx);
  const paths = result.map((i) => String(i.path || '').split('?')[0]);
  const uniquePaths = new Set(paths);
  // paths com query param (quality items) podem repetir o base path — ok
  // mas o path /app não deve aparecer duplicado sem query param
  const basePathsOnly = paths.filter((p) => !p.includes('?'));
  const uniqueBase = new Set(basePathsOnly);
  ok('safeMerge no duplicate base paths', basePathsOnly.length === uniqueBase.size);
}

/* ──────────────────────────────────────────────────────────────────────
   3. qualityNavDebug — nunca lança, nunca logga em prod silencioso
   ────────────────────────────────────────────────────────────────────── */
section('qualityNavDebug — zero-throw guarantee');

const { qualityNavDebug } = await import('../../utils/qualityNavDebug.js');

ok('qualityNavDebug does not throw with normal args', (() => {
  try { qualityNavDebug('[TEST]', { x: 1 }); return true; } catch { return false; }
})());

ok('qualityNavDebug does not throw with undefined payload', (() => {
  try { qualityNavDebug('[TEST]', undefined); return true; } catch { return false; }
})());

ok('qualityNavDebug does not throw with null tag', (() => {
  try { qualityNavDebug(null, null); return true; } catch { return false; }
})());

/* ──────────────────────────────────────────────────────────────────────
   4. Menu pipeline — sem recursão nem estado global
   ────────────────────────────────────────────────────────────────────── */
section('menu pipeline — no recursion, no global state mutation');

// Chamar safeMerge N vezes seguidamente não cria estado crescente
{
  const ctx = { modulesLoading: false, user: null, visibleModules: [] };
  let len0;
  for (let i = 0; i < 20; i++) {
    const r = safeMergeQualityPublicationIntoMenu(BASE_MENU, ctx);
    if (i === 0) len0 = r.length;
    else if (r.length !== len0) {
      ok('safeMerge 20x produces stable length (no accumulation)', false, `iteration ${i} grew from ${len0} to ${r.length}`);
      break;
    }
    if (i === 19) ok('safeMerge 20x produces stable length (no accumulation)', true);
  }
}

// mergeQualityPublicationIntoMenu é puro — não muta baseMenuItems
{
  const base = [{ path: '/app' }, { path: '/app/chatbot' }];
  const orig = base.length;
  const ctx = { modulesLoading: false, user: { role: 'operador' }, visibleModules: [], modulesLoading: false };
  mergeQualityPublicationIntoMenu(base, ctx);
  ok('mergeQualityPublicationIntoMenu does not mutate baseMenuItems', base.length === orig);
}

/* ──────────────────────────────────────────────────────────────────────
   5. Route resolution determinism
   ────────────────────────────────────────────────────────────────────── */
section('route resolution — determinism');

// isSidebarMenuItemActive chamado N vezes não produz efeitos colaterais
{
  const results = [];
  for (let i = 0; i < 50; i++) {
    results.push(isSidebarMenuItemActive('/app/quality/operational', '/app/quality/operational', ''));
  }
  ok('isSidebarMenuItemActive is idempotent over 50 calls', results.every((r) => r === true));
}

// sidebarNavItemKey chamado N vezes devolve mesma chave
{
  const item = { path: '/app/quality/operational', _quality_manifest_id: 'quality_operational' };
  const keys = Array.from({ length: 20 }, (_, i) => sidebarNavItemKey(item, i));
  ok('sidebarNavItemKey is deterministic', keys.every((k) => k === keys[0]));
}

/* ──────────────────────────────────────────────────────────────────────
   6. useDashboardContext memoization — context object stability
   ────────────────────────────────────────────────────────────────────── */
section('dashboardContextAdapter — no infinite rebuild');

const { buildDashboardContext, SOURCE } = await import('../../features/dashboard/contextAdapter/dashboardContextAdapter.js');

// buildDashboardContext com mesmos inputs produz objecto com mesma source
{
  const args = { engineV2: null, personalizado: null, legacyLayoutFn: null, user: { role: 'operador' } };
  const c1 = buildDashboardContext(args);
  const c2 = buildDashboardContext(args);
  ok('buildDashboardContext source is stable', c1.source === c2.source);
  ok('buildDashboardContext widgets count is stable', c1.widgets.length === c2.widgets.length);
}

// buildDashboardContext nunca lança
{
  let ok_ = true;
  const badArgs = [
    null, undefined, {}, { engineV2: 'BROKEN' }, { user: null }, { personalizado: 'X' }
  ];
  for (const a of badArgs) {
    try { buildDashboardContext(a); } catch { ok_ = false; break; }
  }
  ok('buildDashboardContext never throws on bad input', ok_);
}

/* ──────────────────────────────────────────────────────────────────────
   RESULTADO FINAL
   ────────────────────────────────────────────────────────────────────── */
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
