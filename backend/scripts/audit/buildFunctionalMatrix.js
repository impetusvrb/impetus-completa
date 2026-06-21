#!/usr/bin/env node
/**
 * IMPETUS — Gerador da Matriz Funcional Real (CERT-01.1)
 *
 * Metodologia: backend/docs/MANUAL_MATRIZ_FUNCIONAL_REAL.md
 *
 * NATUREZA: read-only. Não altera nenhum arquivo de produção; apenas lê o
 * código-fonte e emite artefatos de inventário/matriz em backend/docs.
 *
 * O QUE FAZ (análise estática, sem dependências externas):
 *   1. Frontend  — parseia frontend/src/App.jsx: imports (lazy/eager) + <Route>
 *      (incluindo rotas aninhadas dos domínios), extraindo
 *      rota → tela → guards de acesso.
 *   2. Backend   — parseia backend/src/server.js (useRoute / app.use) e cada
 *      arquivo de rota, extraindo endpoint (método + path), guards e serviços
 *      candidatos. Best-effort: tabelas e flags (process.env) referenciadas.
 *   3. Cruzamento — extrai os endpoints chamados pelo cliente central
 *      frontend/src/services/api.js e marca quais endpoints backend são
 *      referenciados pelo frontend.
 *   4. Status preliminar — atribui status ESTÁTICO conservador. NUNCA marca
 *      VERDE (VERDE exige evidência de execução E2E — ver Parte 7 do manual).
 *
 * SAÍDAS:
 *   - backend/docs/inventory/FRONTEND_INVENTORY.json
 *   - backend/docs/inventory/BACKEND_INVENTORY.json
 *   - backend/docs/FUNCTIONAL_MATRIX.json
 *   - backend/docs/FUNCTIONAL_MATRIX.md
 *
 * USO:
 *   node backend/scripts/audit/buildFunctionalMatrix.js
 *   node backend/scripts/audit/buildFunctionalMatrix.js --json   (só imprime resumo JSON)
 *
 * LIMITAÇÕES CONHECIDAS (documentadas, não defeitos):
 *   - O parser é heurístico (não usa AST Babel para evitar dependências).
 *     Casos exóticos são marcados com confidence:"low" em vez de silenciados.
 *   - A ligação fina tela→endpoint (qual botão chama qual método) é v2:
 *     requer rastreio por componente. Aqui produzimos os catálogos e o
 *     cruzamento por padrão de path.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ----------------------------------------------------------------------------
// Localização da raiz do repositório (este arquivo vive em backend/scripts/audit)
// ----------------------------------------------------------------------------
const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..', '..');
const BACKEND_SRC = path.join(REPO_ROOT, 'backend', 'src');
const FRONTEND_SRC = path.join(REPO_ROOT, 'frontend', 'src');
const DOCS_DIR = path.join(REPO_ROOT, 'backend', 'docs');
const INVENTORY_DIR = path.join(DOCS_DIR, 'inventory');

const APP_JSX = path.join(FRONTEND_SRC, 'App.jsx');
const SERVER_JS = path.join(BACKEND_SRC, 'server.js');
const API_CLIENT = path.join(FRONTEND_SRC, 'services', 'api.js');

// Componentes definidos no próprio App.jsx que atuam como GUARDS (não são telas).
// Detectados dinamicamente também (ver collectLocalGuardNames), esta lista cobre
// nomes canônicos conhecidos para classificação imediata.
const KNOWN_GUARD_HINTS = [
  'PrivateRoute', 'SetupGuard', 'RoleGuard', 'CEORouteGuard', 'ColaboradorRouteGuard',
  'AdminRouteGuard', 'StrictAdminRouteGuard', 'DirectorOrCEORouteGuard', 'PulseRhRouteGuard',
  'FactoryTeamMemberGate', 'SettingsAccessGuard', 'ExecutiveAccessGuard', 'Suspense',
  'BuildVersionGuard', 'ErrorBoundary', 'NotificationProvider', 'EnterpriseLocaleProvider',
  'ImpetusVoiceProvider',
  // Componentes de apoio/UI que NÃO são telas (evita serem escolhidos como screen):
  'PageLoader', 'Navigate'
];

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

// ----------------------------------------------------------------------------
// Utilitários de leitura
// ----------------------------------------------------------------------------
function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (_e) {
    return null;
  }
}

function exists(file) {
  try {
    fs.accessSync(file);
    return true;
  } catch (_e) {
    return false;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// ----------------------------------------------------------------------------
// FRONTEND — imports
// ----------------------------------------------------------------------------
/**
 * Constrói o mapa "nome do componente → { file, kind }".
 * Cobre imports lazy (const X = lazy(() => import('...'))), incluindo o padrão
 * lazy(...).then(m => ({ default: m.Nome })), e imports estáticos.
 */
function buildImportMap(appSrc) {
  const map = new Map();

  // lazy: const Name = lazy(() => import('path')  ... )
  const lazyRe = /const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = lazyRe.exec(appSrc))) {
    map.set(m[1], { file: m[2], loader: 'lazy' });
  }

  // estático: import Name from 'path';  /  import Name, { ... } from 'path';
  const staticRe = /import\s+([A-Za-z0-9_]+)\s*(?:,\s*\{[^}]*\})?\s*from\s*['"]([^'"]+)['"]/g;
  while ((m = staticRe.exec(appSrc))) {
    if (!map.has(m[1])) map.set(m[1], { file: m[2], loader: 'static' });
  }

  return map;
}

/** Nomes de componentes locais (definidos no App.jsx) — tratados como guards/wrappers. */
function collectLocalGuardNames(appSrc) {
  const names = new Set(KNOWN_GUARD_HINTS);
  const fnRe = /function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g;
  const constRe = /const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>/g;
  let m;
  while ((m = fnRe.exec(appSrc))) {
    if (/Guard|Route|Gate|Entry|Provider|Boundary/.test(m[1])) names.add(m[1]);
  }
  while ((m = constRe.exec(appSrc))) {
    if (/Guard|Route|Gate|Entry|Provider|Boundary/.test(m[1])) names.add(m[1]);
  }
  return names;
}

/** Classifica o módulo a partir do caminho do arquivo da tela. */
function moduleFromFile(file) {
  if (!file) return 'Desconhecido';
  const f = file.toLowerCase();
  if (f.includes('/domains/quality') || f.includes('quality')) return 'Quality';
  if (f.includes('/domains/safety') || f.includes('safety')) return 'SST';
  if (f.includes('/domains/environment') || f.includes('environment')) return 'ESG';
  if (f.includes('/domains/logistics') || f.includes('logistic')) return 'Logistics';
  if (f.includes('/modules/aioi') || f.includes('executive')) return 'AIOI/Executive';
  if (f.includes('manuia') || f.includes('manutencao')) return 'ManuIA';
  if (f.includes('/domains/admin') || f.includes('/admin')) return 'Admin';
  if (f.includes('pulse')) return 'Pulse';
  if (f.includes('custos') || f.includes('billing') || f.includes('nexusia')) return 'Custos/Billing';
  if (f.includes('biblioteca') || f.includes('library')) return 'Biblioteca';
  if (f.includes('chat') || f.includes('aichat')) return 'Chat/IA';
  return 'Core';
}

// ----------------------------------------------------------------------------
// FRONTEND — varredura de <Route>
// ----------------------------------------------------------------------------
/**
 * Localiza o índice em que a tag de abertura iniciada em `start` termina,
 * respeitando strings e profundidade de chaves (para ignorar `>` dentro de
 * element={...}). Retorna { end, selfClosing }.
 */
function scanOpenTag(src, start) {
  let i = start;
  let inStr = null;
  let brace = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === inStr && src[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{') brace++;
    else if (c === '}') brace--;
    else if (c === '>' && brace === 0) {
      const selfClosing = src[i - 1] === '/';
      return { end: i, selfClosing };
    }
  }
  return { end: src.length - 1, selfClosing: true };
}

/** Encontra o índice da `</Route>` que fecha a Route aberta cujo conteúdo começa em `from`. */
function findRouteClose(src, from) {
  let depth = 1;
  const re = /<Route\b|<\/Route>/g;
  re.lastIndex = from;
  let m;
  while ((m = re.exec(src))) {
    if (m[0] === '</Route>') {
      depth--;
      if (depth === 0) return m.index;
    } else {
      // Só conta como aninhamento se NÃO for self-closing.
      const { selfClosing } = scanOpenTag(src, m.index);
      if (!selfClosing) depth++;
    }
  }
  return src.length;
}

/** Extrai o atributo path (em profundidade de chave 0) e detecta `index`. */
function extractPathAttr(openTagText) {
  let inStr = null;
  let brace = 0;
  // Procura por path="..." fora de chaves.
  for (let i = 0; i < openTagText.length; i++) {
    const c = openTagText[i];
    if (inStr) {
      if (c === inStr && openTagText[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') { brace++; continue; }
    if (c === '}') { brace--; continue; }
    if (brace === 0 && openTagText.startsWith('path', i) && /\s|=|^/.test(openTagText[i - 1] || ' ')) {
      const rest = openTagText.slice(i);
      const pm = rest.match(/^path\s*=\s*["']([^"']*)["']/);
      if (pm) return { path: pm[1], index: false };
    }
  }
  // index (rota índice)
  if (/(^|\s)index(\s|=|\/|>|$)/.test(openTagText.replace(/\{[^}]*\}/g, ''))) {
    return { path: null, index: true };
  }
  return { path: null, index: false };
}

/** Extrai o conteúdo de element={ ... } (chaves balanceadas). */
function extractElement(openTagText) {
  const idx = openTagText.indexOf('element');
  if (idx === -1) return null;
  const braceStart = openTagText.indexOf('{', idx);
  if (braceStart === -1) return null;
  let brace = 0;
  let inStr = null;
  for (let i = braceStart; i < openTagText.length; i++) {
    const c = openTagText[i];
    if (inStr) {
      if (c === inStr && openTagText[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') brace++;
    else if (c === '}') {
      brace--;
      if (brace === 0) return openTagText.slice(braceStart + 1, i);
    }
  }
  return openTagText.slice(braceStart + 1);
}

/**
 * A partir do JSX do element, identifica:
 *   - screen: primeiro componente do importMap que pareça uma "tela"
 *   - guards: componentes locais (guards) presentes
 *   - redirect: se há <Navigate .../>
 *   - allowedRoles: se há RoleGuard allowedRoles={[...]}
 */
function analyzeElement(elementJsx, importMap, guardNames) {
  if (elementJsx == null) return { screen: null, guards: [], redirect: false, allowedRoles: null, tags: [] };

  const tagRe = /<([A-Z][A-Za-z0-9_]*)/g;
  const tags = [];
  let m;
  while ((m = tagRe.exec(elementJsx))) tags.push(m[1]);

  const redirect = /<Navigate\b/.test(elementJsx);

  let allowedRoles = null;
  const rolesMatch = elementJsx.match(/allowedRoles\s*=\s*\{\s*\[([^\]]*)\]/);
  if (rolesMatch) {
    allowedRoles = rolesMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  const guards = [];
  let screen = null;
  for (const t of tags) {
    if (guardNames.has(t)) {
      if (!guards.includes(t)) guards.push(t);
      continue;
    }
    if (importMap.has(t) && !screen) {
      // Primeiro componente importado (não-guard) é a tela.
      screen = t;
    } else if (importMap.has(t) && screen) {
      // componentes adicionais importados ignorados (ex.: providers aninhados)
    }
  }
  // Se nenhum import "tela" e há componente importado que é guard só, screen fica null.
  return { screen, guards, redirect, allowedRoles, tags };
}

function parseFrontend() {
  const appSrc = read(APP_JSX);
  if (appSrc == null) {
    return { error: `App.jsx não encontrado em ${APP_JSX}`, screens: [] };
  }
  const importMap = buildImportMap(appSrc);
  const guardNames = collectLocalGuardNames(appSrc);

  // Isola a região <Routes>...</Routes> para reduzir ruído.
  const routesStart = appSrc.indexOf('<Routes>');
  const routesEnd = appSrc.lastIndexOf('</Routes>');
  const region = routesStart !== -1 && routesEnd !== -1
    ? appSrc.slice(routesStart, routesEnd)
    : appSrc;

  const screens = [];
  const routeRe = /<Route\b/g;
  // Pilha de rotas-pai abertas: { fullPath, closeIdx }
  const stack = [];
  let m;
  while ((m = routeRe.exec(region))) {
    const startIdx = m.index;

    // Desempilha pais já encerrados.
    while (stack.length && stack[stack.length - 1].closeIdx <= startIdx) stack.pop();

    const { end, selfClosing } = scanOpenTag(region, startIdx);
    const openTagText = region.slice(startIdx, end + 1);

    const { path: rawPath, index: isIndex } = extractPathAttr(openTagText);
    const elementJsx = extractElement(openTagText);
    const analysis = analyzeElement(elementJsx, importMap, guardNames);

    // Resolve caminho completo considerando aninhamento.
    const parent = stack.length ? stack[stack.length - 1] : null;
    let fullPath;
    if (rawPath && rawPath.startsWith('/')) {
      fullPath = rawPath;
    } else if (isIndex) {
      fullPath = parent ? parent.fullPath : '/';
    } else if (rawPath) {
      fullPath = parent ? joinPath(parent.fullPath, rawPath) : '/' + rawPath;
    } else {
      fullPath = parent ? parent.fullPath : '(sem-path)';
    }

    // Se não é self-closing, vira pai: calcula onde fecha.
    let closeIdx = end;
    if (!selfClosing) {
      closeIdx = findRouteClose(region, end + 1);
      stack.push({ fullPath, closeIdx });
    }

    // Só registramos rotas que apontam para uma tela OU são redirect.
    const screenInfo = analysis.screen ? importMap.get(analysis.screen) : null;
    const isLayoutOnly = !selfClosing && analysis.screen && /Layout/.test(analysis.screen);

    if (analysis.screen || analysis.redirect) {
      screens.push({
        route: fullPath,
        screen: analysis.screen || (analysis.redirect ? '(redirect)' : null),
        screenFile: screenInfo ? screenInfo.file : null,
        screenFileExists: screenInfo ? resolveFrontendFileExists(screenInfo.file) : null,
        module: moduleFromFile(screenInfo ? screenInfo.file : analysis.screen),
        guards: analysis.guards,
        allowedRoles: analysis.allowedRoles,
        isRedirect: analysis.redirect && !analysis.screen,
        isLayout: !!isLayoutOnly,
        loader: screenInfo ? screenInfo.loader : null,
      });
    }
  }

  return { screens, importCount: importMap.size, guardNames: [...guardNames] };
}

function joinPath(a, b) {
  const left = a.replace(/\/+$/, '');
  const right = b.replace(/^\/+/, '');
  return `${left}/${right}`;
}

/** Resolve a existência do arquivo de uma tela importada (relativo a frontend/src). */
function resolveFrontendFileExists(importPath) {
  if (!importPath) return null;
  if (importPath.startsWith('.')) {
    const base = path.resolve(FRONTEND_SRC, importPath);
    const candidates = [
      base, `${base}.jsx`, `${base}.js`, `${base}.tsx`, `${base}.ts`,
      path.join(base, 'index.jsx'), path.join(base, 'index.js'),
    ];
    return candidates.some(exists);
  }
  return null; // pacote externo
}

// ----------------------------------------------------------------------------
// BACKEND — mounts (useRoute / app.use) e arquivos de rota
// ----------------------------------------------------------------------------
function parseMounts(serverSrc) {
  const mounts = [];

  // useRoute('/api/x', './routes/x', requireAuth, ...)
  const useRouteRe = /useRoute\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*((?:,\s*[A-Za-z0-9_.]+)*)\)/g;
  let m;
  while ((m = useRouteRe.exec(serverSrc))) {
    const mw = (m[3] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    mounts.push({ mount: m[1], module: m[2], globalMiddlewares: mw, via: 'useRoute' });
  }

  // app.use('/api/x', require('./routes/x'))  — padrão alternativo
  const appUseRe = /app\.use\(\s*['"](\/api[^'"]*)['"]\s*,\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = appUseRe.exec(serverSrc))) {
    mounts.push({ mount: m[1], module: m[2], globalMiddlewares: [], via: 'app.use' });
  }

  return mounts;
}

/** Resolve modulePath (relativo a backend/src) para um arquivo .js existente. */
function resolveRouteFile(modulePath) {
  const base = path.resolve(BACKEND_SRC, modulePath);
  const candidates = [base, `${base}.js`, path.join(base, 'index.js')];
  for (const c of candidates) if (exists(c)) return c;
  return null;
}

/** Detecta o nome da variável do router (express.Router()). */
function detectRouterVar(src) {
  const m = src.match(/(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:express\.)?Router\(\)/);
  return m ? m[1] : 'router';
}

/**
 * Extrai endpoints de um arquivo de rota:
 *   <routerVar>.get('/sub', mw1, mw2, handler)
 * Captura método, subpath e os middlewares/guards textuais antes do handler.
 */
function parseRouteFile(file, routerVar) {
  const src = read(file);
  if (src == null) return { endpoints: [], flags: [], services: [] };

  // Guard de arquivo: router.use(requireAuth) aplica auth a todas as rotas do módulo.
  const fileLevelAuth = new RegExp(`\\b${escapeRe(routerVar)}\\.use\\(\\s*requireAuth\\b`).test(src)
    || /\brouter\.use\(\s*requireAuth\b/.test(src);

  const endpoints = [];
  const methodAlt = HTTP_METHODS.join('|');
  const re = new RegExp(`\\b${escapeRe(routerVar)}\\.(${methodAlt})\\(\\s*['"\`]([^'"\`]+)['"\`]([^\\n]*)`, 'g');
  let m;
  while ((m = re.exec(src))) {
    const method = m[1].toUpperCase();
    const sub = m[2];
    const tail = m[3] || '';
    const guards = detectGuardsInArgs(tail);
    endpoints.push({ method, sub, guards });
  }

  // Flags (process.env.X) referenciadas no arquivo de rota (best-effort).
  const flags = uniq(
    (src.match(/process\.env\.[A-Z0-9_]+/g) || []).map((s) => s.replace('process.env.', ''))
  );

  // Serviços candidatos: require('../services/...').
  const services = uniq(
    (src.match(/require\(\s*['"]([^'"]*services\/[^'"]+)['"]\s*\)/g) || []).map((s) =>
      s.replace(/^require\(\s*['"]/, '').replace(/['"]\s*\)$/, '')
    )
  );

  // Tabelas candidatas: nomes em queries SQL inline neste arquivo (best-effort).
  const tables = uniq(
    (src.match(/(?:FROM|INTO|UPDATE|JOIN)\s+([a-z_][a-z0-9_]*)/gi) || []).map((s) =>
      s.replace(/^(?:FROM|INTO|UPDATE|JOIN)\s+/i, '').toLowerCase()
    )
  );

  return { endpoints, flags, services, tables, fileLevelAuth };
}

function detectGuardsInArgs(tail) {
  const guards = [];
  const known = [
    'requireAuth', 'requireHierarchy', 'requireRole', 'requirePermission',
    'requireTenantAdminRole', 'requireRhManagementAccess', 'requireCompanyId',
    'requireFactoryOperationalMember', 'sameCompanyOnly',
  ];
  for (const g of known) {
    const re = new RegExp(`\\b${g}\\b(\\([^)]*\\))?`);
    const mm = tail.match(re);
    if (mm) guards.push(mm[0]);
  }
  return guards;
}

function parseBackend() {
  const serverSrc = read(SERVER_JS);
  if (serverSrc == null) {
    return { error: `server.js não encontrado em ${SERVER_JS}`, endpoints: [] };
  }
  const mounts = parseMounts(serverSrc);
  const endpoints = [];
  const unresolved = [];

  for (const mnt of mounts) {
    const file = resolveRouteFile(mnt.module);
    if (!file) {
      unresolved.push({ ...mnt, reason: 'arquivo de rota não encontrado' });
      continue;
    }
    const src = read(file);
    const routerVar = detectRouterVar(src || '');
    const parsed = parseRouteFile(file, routerVar);

    const mountHasAuth = mnt.globalMiddlewares.includes('requireAuth');

    for (const ep of parsed.endpoints) {
      const fullPath = joinApiPath(mnt.mount, ep.sub);
      const guards = uniq([
        ...(mountHasAuth ? ['requireAuth (mount)'] : []),
        ...(parsed.fileLevelAuth ? ['requireAuth (router.use)'] : []),
        ...ep.guards,
      ]);
      endpoints.push({
        method: ep.method,
        path: fullPath,
        mount: mnt.mount,
        module: path.relative(BACKEND_SRC, file),
        guards,
        auth: mountHasAuth || parsed.fileLevelAuth || ep.guards.some((g) => g.startsWith('requireAuth')),
        flags: parsed.flags,
        services: parsed.services,
        tables: parsed.tables,
      });
    }
  }

  return { endpoints, mounts: mounts.length, unresolved };
}

function joinApiPath(mount, sub) {
  const left = mount.replace(/\/+$/, '');
  if (sub === '/' || sub === '') return left || '/';
  const right = sub.replace(/^\/+/, '');
  return `${left}/${right}`;
}

// ----------------------------------------------------------------------------
// CRUZAMENTO — endpoints chamados pelo cliente frontend (api.js)
// ----------------------------------------------------------------------------
function parseFrontendApiCalls() {
  const src = read(API_CLIENT);
  if (src == null) return { calls: [], error: `api.js não encontrado em ${API_CLIENT}` };

  // Captura strings de path usadas em chamadas axios: api.get('/x'), api.post(`/x/${id}`)
  const calls = [];
  const re = /\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)[`'"]/g;
  let m;
  while ((m = re.exec(src))) {
    let p = m[2];
    // normaliza template params ${...} → :param
    p = p.replace(/\$\{[^}]+\}/g, ':p');
    if (!p.startsWith('/')) p = '/' + p;
    calls.push({ method: m[1].toUpperCase(), path: p });
  }
  return { calls: dedupeCalls(calls) };
}

/** Marca, para cada endpoint backend, se há chamada equivalente no frontend. */
function crossReference(backendEndpoints, frontendCalls) {
  const norm = (p) => '/api' + p.replace(/^\/api/, '').replace(/:[A-Za-z0-9_]+/g, ':p').replace(/\/+$/, '');
  const feSet = new Set(frontendCalls.map((c) => `${c.method} ${norm(c.path.startsWith('/api') ? c.path : '/api' + c.path)}`));
  // api.js usa baseURL "/api"; os paths chamados são relativos (ex.: '/dashboard/kpis')
  const feRelSet = new Set(frontendCalls.map((c) => `${c.method} ${('/api' + c.path).replace(/:[A-Za-z0-9_]+/g, ':p').replace(/\/+$/, '')}`));

  let referenced = 0;
  for (const ep of backendEndpoints) {
    const key = `${ep.method} ${ep.path.replace(/:[A-Za-z0-9_]+/g, ':p').replace(/\/+$/, '')}`;
    ep.calledFromFrontend = feRelSet.has(key) || feSet.has(key);
    if (ep.calledFromFrontend) referenced++;
  }
  return { referenced };
}

function dedupeCalls(calls) {
  const seen = new Set();
  const out = [];
  for (const c of calls) {
    const k = `${c.method} ${c.path}`;
    if (!seen.has(k)) { seen.add(k); out.push(c); }
  }
  return out;
}

// ----------------------------------------------------------------------------
// STATUS preliminar (estático e conservador)
// ----------------------------------------------------------------------------
/**
 * Regras (NUNCA atribui VERDE — VERDE exige E2E, ver manual Parte 6/7):
 *   - REDIRECT     : rota é só <Navigate>
 *   - INCOMPLETO   : tela mapeada mas arquivo não encontrado
 *   - DESABILITADO : (não inferível estaticamente com segurança aqui — fica p/ flags)
 *   - NAO_VALIDADO : estrutura íntegra, aguarda validação E2E (estado padrão saudável)
 */
function preliminaryScreenStatus(s) {
  if (s.isRedirect) return 'REDIRECT';
  if (s.screenFileExists === false) return 'INCOMPLETO';
  return 'NAO_VALIDADO';
}

// ----------------------------------------------------------------------------
// helpers genéricos
// ----------------------------------------------------------------------------
function uniq(arr) { return [...new Set(arr)]; }
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ----------------------------------------------------------------------------
// Geração de saída
// ----------------------------------------------------------------------------
function buildMatrix(frontend, backend, apiCalls) {
  const rows = frontend.screens.map((s) => ({
    module: s.module,
    screen: s.screen,
    route: s.route,
    profiles: rolesFromGuards(s),
    screenFile: s.screenFile,
    guards: s.guards,
    status: preliminaryScreenStatus(s),
    isLayout: s.isLayout,
    loader: s.loader,
    evidence: null,
    notes: buildNotes(s),
    lastValidatedAt: null,
  }));
  return rows;
}

function rolesFromGuards(s) {
  if (s.allowedRoles && s.allowedRoles.length) return s.allowedRoles;
  const g = s.guards || [];
  if (g.includes('StrictAdminRouteGuard')) return ['admin (strict)'];
  if (g.includes('AdminRouteGuard')) return ['admin'];
  if (g.includes('DirectorOrCEORouteGuard')) return ['ceo', 'diretor'];
  if (g.includes('CEORouteGuard')) return ['ceo', '+demais (bloqueia colaborador simples)'];
  if (g.includes('PulseRhRouteGuard')) return ['rh', 'hr_management'];
  if (g.includes('ColaboradorRouteGuard')) return ['todos exceto colaborador-simples restrito'];
  if (g.includes('PrivateRoute')) return ['autenticado'];
  return ['(sem guard explícito)'];
}

function buildNotes(s) {
  const notes = [];
  if (s.isLayout) notes.push('layout com rotas filhas');
  if (s.guards.includes('FactoryTeamMemberGate')) notes.push('exige membro de equipe operacional');
  if (s.loader === 'lazy') notes.push('lazy-loaded');
  return notes.join('; ') || '';
}

function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function mdEscape(s) { return String(s == null ? '' : s).replace(/\|/g, '\\|'); }

function buildMarkdown(matrix, backend, apiCalls, stats) {
  const byModule = new Map();
  for (const r of matrix) {
    if (!byModule.has(r.module)) byModule.set(r.module, []);
    byModule.get(r.module).push(r);
  }

  const lines = [];
  lines.push('# MATRIZ FUNCIONAL REAL — IMPETUS (geração automática)');
  lines.push('');
  lines.push(`> Gerado por \`backend/scripts/audit/buildFunctionalMatrix.js\` em ${new Date().toISOString()}.`);
  lines.push('> **Read-only.** Status preliminares são ESTÁTICOS. `NAO_VALIDADO` = estrutura íntegra aguardando validação E2E (Parte 7 do manual). Nenhuma linha é VERDE sem evidência de execução.');
  lines.push('');
  lines.push('## Resumo');
  lines.push('');
  lines.push(`- Telas/rotas mapeadas (frontend): **${stats.screenCount}**`);
  lines.push(`- Endpoints mapeados (backend): **${stats.endpointCount}** em **${stats.mountCount}** mounts`);
  lines.push(`- Endpoints referenciados pelo frontend (api.js): **${stats.referencedCount}**`);
  lines.push(`- Chamadas de API distintas no cliente (api.js): **${stats.apiCallCount}**`);
  lines.push(`- Mounts não resolvidos: **${stats.unresolvedCount}**`);
  lines.push('');
  lines.push('### Distribuição de status preliminar (telas)');
  lines.push('');
  lines.push('| Status | Qtd |');
  lines.push('|--------|-----|');
  for (const [k, v] of Object.entries(stats.statusDist)) lines.push(`| ${k} | ${v} |`);
  lines.push('');

  lines.push('## Telas por módulo');
  lines.push('');
  const modules = [...byModule.keys()].sort();
  for (const mod of modules) {
    const rows = byModule.get(mod);
    lines.push(`### ${mod} (${rows.length})`);
    lines.push('');
    lines.push('| Tela | Rota | Perfil | Guards | Status | Observações |');
    lines.push('|------|------|--------|--------|--------|-------------|');
    for (const r of rows) {
      lines.push(
        `| ${mdEscape(r.screen)} | \`${mdEscape(r.route)}\` | ${mdEscape((r.profiles || []).join(', '))} | ${mdEscape((r.guards || []).join(' › '))} | ${r.status} | ${mdEscape(r.notes)} |`
      );
    }
    lines.push('');
  }

  lines.push('## Catálogo de endpoints (backend)');
  lines.push('');
  lines.push('| Método | Path | Auth | Arquivo de rota | Chamado pelo FE |');
  lines.push('|--------|------|------|-----------------|-----------------|');
  for (const ep of backend.endpoints.slice().sort((a, b) => a.path.localeCompare(b.path))) {
    lines.push(
      `| ${ep.method} | \`${mdEscape(ep.path)}\` | ${ep.auth ? 'sim' : 'NÃO'} | ${mdEscape(ep.module)} | ${ep.calledFromFrontend ? 'sim' : '—'} |`
    );
  }
  lines.push('');

  if (backend.unresolved && backend.unresolved.length) {
    lines.push('## Mounts não resolvidos (revisar)');
    lines.push('');
    for (const u of backend.unresolved) lines.push(`- \`${u.mount}\` → \`${u.module}\` (${u.reason})`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('### Próximos passos (manual, Partes 4–7)');
  lines.push('- Preencher coluna **Flags** por endpoint com o estado efetivo (`dumpEffectiveFlags.js`).');
  lines.push('- Executar cenários **E2E** por domínio e anexar as 6 evidências.');
  lines.push('- Reclassificar `NAO_VALIDADO` → VERDE/AMARELO/MOCK/INCOMPLETO conforme execução.');
  lines.push('');
  return lines.join('\n');
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
function main() {
  const jsonOnly = process.argv.includes('--json');

  const frontend = parseFrontend();
  const backend = parseBackend();
  const apiCalls = parseFrontendApiCalls();

  if (frontend.error) console.warn('[WARN]', frontend.error);
  if (backend.error) console.warn('[WARN]', backend.error);
  if (apiCalls.error) console.warn('[WARN]', apiCalls.error);

  const xref = crossReference(backend.endpoints || [], apiCalls.calls || []);
  const matrix = buildMatrix(frontend, backend, apiCalls);

  const statusDist = {};
  for (const r of matrix) statusDist[r.status] = (statusDist[r.status] || 0) + 1;

  const stats = {
    screenCount: matrix.length,
    endpointCount: (backend.endpoints || []).length,
    mountCount: backend.mounts || 0,
    referencedCount: xref.referenced,
    apiCallCount: (apiCalls.calls || []).length,
    unresolvedCount: (backend.unresolved || []).length,
    statusDist,
  };

  // Persistência dos artefatos
  writeJson(path.join(INVENTORY_DIR, 'FRONTEND_INVENTORY.json'), {
    generatedAt: new Date().toISOString(),
    source: path.relative(REPO_ROOT, APP_JSX),
    importCount: frontend.importCount || 0,
    guardNames: frontend.guardNames || [],
    screens: frontend.screens || [],
  });

  writeJson(path.join(INVENTORY_DIR, 'BACKEND_INVENTORY.json'), {
    generatedAt: new Date().toISOString(),
    source: path.relative(REPO_ROOT, SERVER_JS),
    mounts: backend.mounts || 0,
    unresolved: backend.unresolved || [],
    apiClientCalls: apiCalls.calls || [],
    endpoints: backend.endpoints || [],
  });

  writeJson(path.join(DOCS_DIR, 'FUNCTIONAL_MATRIX.json'), {
    generatedAt: new Date().toISOString(),
    methodology: 'backend/docs/MANUAL_MATRIZ_FUNCIONAL_REAL.md',
    stats,
    rows: matrix,
  });

  const md = buildMarkdown(matrix, backend, apiCalls, stats);
  ensureDir(DOCS_DIR);
  fs.writeFileSync(path.join(DOCS_DIR, 'FUNCTIONAL_MATRIX.md'), md, 'utf8');

  if (jsonOnly) {
    process.stdout.write(JSON.stringify(stats, null, 2) + '\n');
    return;
  }

  // Resumo legível
  console.log('\n=== MATRIZ FUNCIONAL — RESUMO ===');
  console.log(`Telas/rotas (frontend) ....... ${stats.screenCount}`);
  console.log(`Endpoints (backend) .......... ${stats.endpointCount} em ${stats.mountCount} mounts`);
  console.log(`Endpoints chamados pelo FE ... ${stats.referencedCount}`);
  console.log(`Chamadas distintas em api.js . ${stats.apiCallCount}`);
  console.log(`Mounts não resolvidos ........ ${stats.unresolvedCount}`);
  console.log('Status preliminar das telas:');
  for (const [k, v] of Object.entries(statusDist)) console.log(`  - ${k}: ${v}`);
  console.log('\nArtefatos gerados:');
  console.log(`  - ${path.relative(REPO_ROOT, path.join(INVENTORY_DIR, 'FRONTEND_INVENTORY.json'))}`);
  console.log(`  - ${path.relative(REPO_ROOT, path.join(INVENTORY_DIR, 'BACKEND_INVENTORY.json'))}`);
  console.log(`  - ${path.relative(REPO_ROOT, path.join(DOCS_DIR, 'FUNCTIONAL_MATRIX.json'))}`);
  console.log(`  - ${path.relative(REPO_ROOT, path.join(DOCS_DIR, 'FUNCTIONAL_MATRIX.md'))}`);
  console.log('');
}

main();
