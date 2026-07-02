#!/usr/bin/env node
'use strict';

/**
 * Gera as 1060 fichas ICEB + registo de progresso.
 * Etapas 1–335: motores | 336–412: telas | 413–439: módulos | 440–462: perfis | 463–1060: endpoints
 *
 * Uso: node backend/scripts/audit/buildBlueprintEtapas.js
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../../..');
const BACKEND = path.join(REPO, 'backend');
const SRC = path.join(BACKEND, 'src');
const ICEB = path.join(BACKEND, 'docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT');
const FICHAS = path.join(ICEB, 'fichas');
const REGISTRY = path.join(ICEB, 'ICEB_ETAPAS_REGISTRY.json');

const TOTAL_ETAPAS = 1060;
const ENDPOINT_OFFSET = 463;
const ENDPOINT_COUNT = TOTAL_ETAPAS - ENDPOINT_OFFSET + 1; // 598

function walk(dir, acc = [], test) {
  if (!fs.existsSync(dir)) return acc;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc, test);
    else if (test(f)) acc.push(p);
  }
  return acc;
}

function slug(s) {
  return String(s)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80);
}

function inferTier(filePath) {
  const p = filePath.toLowerCase();
  if (/decision|policy|truth|orchestrator|council|compliance/.test(p)) return 'T1';
  if (/context|identity|audience|structural|session|axis/.test(p)) return 'T2';
  if (/operational|plc|forecast|machine|industrial|pulse|twin/.test(p)) return 'T3';
  if (/dashboard|panel|chat|voice|live|claude|smart/.test(p)) return 'T4';
  if (/governance|certification|runtime-z|sovereign|safety|audit/.test(p)) return 'T5';
  return 'T5';
}

function motorFicha(relPath, etapa) {
  const base = path.basename(relPath, '.js');
  const tier = inferTier(relPath);
  const id = `motor.${slug(path.dirname(relPath).replace(/^src\//, ''))}.${slug(base)}`;
  return `# Etapa ${etapa} — Motor: ${base}

> ICEB v1.0 · Gerado automaticamente · Revisão humana pendente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | ${etapa} / ${TOTAL_ETAPAS} |
| **ID** | \`${id}\` |
| **Tier** | ${tier} |
| **Classificação** | AB (ficheiro existe) |
| **Ficheiro** | \`backend/${relPath.replace(/\\/g, '/')}\` |

## Propósito

Motor \`${base}\` — ver implementação no ficheiro fonte.

## Gatilho

- **Invocação:** rota HTTP, outro motor ou runtime interno (ver exports do módulo)
- **Quando:** conforme domínio (${tier})

## Entradas

| Fonte | Obrigatório |
|-------|-------------|
| Base Estrutural / tenant | conforme motor |
| BD | conforme queries no ficheiro |
| Env flags | ver \`process.env\` no ficheiro |

## Processamento

Ver lógica em \`backend/${relPath.replace(/\\/g, '/')}\`.

## Saídas

API response, evento interno ou persistência — conforme implementação.

## Regras de IA

Aplicável se o motor chama \`cognitiveOrchestrator\`, \`chatAIService\` ou facades de decisão.

## Adaptação Base Estrutural

Filtragem por \`company_id\`, cargo e \`visible_modules\` quando exposto à UI.

## Evidências

| Tipo | Referência |
|------|------------|
| Código | \`backend/${relPath.replace(/\\/g, '/')}\` |

## Estado CERT

- [ ] Visual  - [ ] API  - [ ] BD  - [ ] Log  - [ ] Tenant  - [ ] Operacional

---
*Etapa ${etapa} · ICEB auto-gen*
`;
}

function telaFicha(row, etapa) {
  const guards = (row.guards || []).join(', ') || '—';
  return `# Etapa ${etapa} — Tela: ${row.screen}

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | ${etapa} / ${TOTAL_ETAPAS} |
| **Rota** | \`${row.route}\` |
| **Componente** | \`${row.screenFile || '—'}\` |
| **Módulo** | ${row.module} |
| **Status CERT** | ${row.status} |
| **Classificação** | AB |

## Propósito

Ecrã \`${row.screen}\` — ${row.notes || row.feature || 'ver FUNCTIONAL_MATRIX'}.

## Guards

${guards}

## Perfis

${row.profiles?.join(', ') || '—'}

## APIs

Ver cruzamento em \`FUNCTIONAL_MATRIX.md\` e \`api.js\` para rota \`${row.route}\`.

## Evidências

${row.evidence ? `- \`${row.evidence}\`` : '- FUNCTIONAL_MATRIX.json'}

---
*Etapa ${etapa} · ICEB auto-gen*
`;
}

function moduloFicha(mod, etapa) {
  return `# Etapa ${etapa} — Módulo: ${mod.module_id}

> ICEB v1.0 · moduleRegistry

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | ${etapa} / ${TOTAL_ETAPAS} |
| **module_id** | \`${mod.module_id}\` |
| **menu_key** | \`${mod.menu_key}\` |
| **Label** | ${mod.label || '—'} |
| **Classificação** | AB |

## Propósito

Módulo contextual visível no menu quando autorizado por Base Estrutural + governança.

## Governança

\`moduleAccessGovernanceEngine\` + \`structuralCadastroModuleResolver\`.

## Evidências

- \`backend/src/contextualModules/moduleRegistry.js\`

---
*Etapa ${etapa} · ICEB auto-gen*
`;
}

function perfilFicha(key, profile, etapa) {
  return `# Etapa ${etapa} — Perfil dashboard: ${key}

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | ${etapa} / ${TOTAL_ETAPAS} |
| **profile_key** | \`${key}\` |
| **Classificação** | AB |

## Configuração

\`\`\`json
${JSON.stringify(profile, null, 2).slice(0, 2000)}
\`\`\`

## Evidências

- \`backend/src/config/dashboardProfiles.js\`

---
*Etapa ${etapa} · ICEB auto-gen*
`;
}

function endpointFicha(ep, etapa) {
  const method = (ep.method || 'GET').toUpperCase();
  const p = ep.path || ep.fullPath || '/';
  return `# Etapa ${etapa} — Endpoint: ${method} ${p}

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | ${etapa} / ${TOTAL_ETAPAS} |
| **Método** | ${method} |
| **Path** | \`${p}\` |
| **Mount** | \`${ep.mount || ep.mountFile || '—'}\` |
| **Classificação** | AB |

## Serviço candidato

${ep.service || ep.services?.join(', ') || '—'}

## Guards

${(ep.guards || []).join(', ') || '—'}

## Referenciado pelo frontend

${ep.referencedByFrontend ? 'sim' : 'não / desconhecido'}

## Evidências

- \`backend/docs/inventory/BACKEND_INVENTORY.json\`
- Ficheiro rota: \`${ep.routeFile || '—'}\`

---
*Etapa ${etapa} · ICEB auto-gen*
`;
}

function main() {
  const now = new Date().toISOString();
  const etapas = [];

  if (fs.existsSync(FICHAS)) fs.rmSync(FICHAS, { recursive: true });

  // Motores 1–335
  const engines = walk(SRC, [], (f) =>
    /Engine\.js$|Facade\.js$|Orchestrator\.js$/.test(f)
  ).sort();
  const motorDir = path.join(FICHAS, 'motores');
  fs.mkdirSync(motorDir, { recursive: true });
  engines.slice(0, 335).forEach((abs, i) => {
    const etapa = i + 1;
    const rel = abs.replace(BACKEND + path.sep, '').replace(/\\/g, '/');
    const out = path.join(motorDir, `${String(etapa).padStart(4, '0')}-${slug(path.basename(abs, '.js'))}.md`);
    fs.writeFileSync(out, motorFicha(rel, etapa), 'utf8');
    etapas.push({ etapa, tipo: 'motor', id: rel, ficheiro: out.replace(ICEB + path.sep, ''), status: 'GERADO' });
  });

  // Telas 336–412
  const matrix = JSON.parse(
    fs.readFileSync(path.join(BACKEND, 'docs/FUNCTIONAL_MATRIX.json'), 'utf8')
  );
  const screens = (matrix.rows || []).slice(0, 77);
  const telaDir = path.join(FICHAS, 'telas');
  fs.mkdirSync(telaDir, { recursive: true });
  screens.slice(0, 77).forEach((row, i) => {
    const etapa = 336 + i;
    const out = path.join(telaDir, `${String(etapa).padStart(4, '0')}-${slug(row.screen)}-${slug(row.route)}.md`);
    fs.writeFileSync(out, telaFicha(row, etapa), 'utf8');
    etapas.push({ etapa, tipo: 'tela', id: row.route, ficheiro: out.replace(ICEB + path.sep, ''), status: 'GERADO' });
  });

  // Módulos 413–439
  const reg = require(path.join(SRC, 'contextualModules/moduleRegistry.js'));
  const modules = (reg.getAllModules?.() || []).slice(0, 27);
  const modDir = path.join(FICHAS, 'modulos');
  fs.mkdirSync(modDir, { recursive: true });
  modules.forEach((mod, i) => {
    const etapa = 413 + i;
    const out = path.join(modDir, `${String(etapa).padStart(4, '0')}-${slug(mod.module_id)}.md`);
    fs.writeFileSync(out, moduloFicha(mod, etapa), 'utf8');
    etapas.push({ etapa, tipo: 'modulo', id: mod.module_id, ficheiro: out.replace(ICEB + path.sep, ''), status: 'GERADO' });
  });

  // Perfis 440–462
  const profilesMod = require(path.join(SRC, 'config/dashboardProfiles.js'));
  const allProfiles =
    profilesMod.getAllProfiles?.() || profilesMod.DASHBOARD_PROFILES || {};
  const profileKeys = Object.keys(allProfiles).slice(0, 23);
  const perfDir = path.join(FICHAS, 'perfis');
  fs.mkdirSync(perfDir, { recursive: true });
  profileKeys.forEach((key, i) => {
    const etapa = 440 + i;
    const out = path.join(perfDir, `${String(etapa).padStart(4, '0')}-${slug(key)}.md`);
    fs.writeFileSync(out, perfilFicha(key, allProfiles[key], etapa), 'utf8');
    etapas.push({ etapa, tipo: 'perfil', id: key, ficheiro: out.replace(ICEB + path.sep, ''), status: 'GERADO' });
  });

  // Endpoints 463–1060
  const inv = JSON.parse(
    fs.readFileSync(path.join(BACKEND, 'docs/inventory/BACKEND_INVENTORY.json'), 'utf8')
  );
  const endpoints = (inv.endpoints || []).slice(0, ENDPOINT_COUNT);
  const epDir = path.join(FICHAS, 'endpoints');
  fs.mkdirSync(epDir, { recursive: true });
  endpoints.forEach((ep, i) => {
    const etapa = ENDPOINT_OFFSET + i;
    const p = ep.path || ep.fullPath || 'unknown';
    const out = path.join(
      epDir,
      `${String(etapa).padStart(4, '0')}-${(ep.method || 'get').toLowerCase()}-${slug(p)}.md`
    );
    fs.writeFileSync(out, endpointFicha(ep, etapa), 'utf8');
    etapas.push({
      etapa,
      tipo: 'endpoint',
      id: `${(ep.method || 'GET').toUpperCase()} ${p}`,
      ficheiro: out.replace(ICEB + path.sep, ''),
      status: 'GERADO',
    });
  });

  const registry = {
    generatedAt: now,
    totalEtapas: TOTAL_ETAPAS,
    concluidas: etapas.length,
    pendentesRevisaoHumana: etapas.length,
    breakdown: {
      motores: engines.slice(0, 335).length,
      telas: screens.slice(0, 77).length,
      modulos: modules.length,
      perfis: profileKeys.length,
      endpoints: endpoints.length,
    },
    etapas,
  };

  fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2), 'utf8');

  // Índice markdown
  const indexMd = `# ICEB — Registo das ${TOTAL_ETAPAS} Etapas

> Gerado: \`${now}\` · \`buildBlueprintEtapas.js\`

## Progresso

| Métrica | Valor |
|---------|-------|
| **Total etapas** | ${TOTAL_ETAPAS} |
| **Fichas geradas** | **${etapas.length}** |
| **Revisão humana** | ${etapas.length} pendentes |

## Mapa de etapas

| Faixa | Tipo | Qtd |
|-------|------|-----|
| 1–335 | Motores / Facades / Orchestrators | ${registry.breakdown.motores} |
| 336–412 | Telas (FUNCTIONAL_MATRIX) | ${registry.breakdown.telas} |
| 413–439 | Módulos contextual | ${registry.breakdown.modulos} |
| 440–462 | Perfis dashboard | ${registry.breakdown.perfis} |
| 463–1060 | Endpoints API (prioridade inventário) | ${registry.breakdown.endpoints} |

## Pastas

- \`fichas/motores/\`
- \`fichas/telas/\`
- \`fichas/modulos/\`
- \`fichas/perfis/\`
- \`fichas/endpoints/\`

## Registo JSON

\`ICEB_ETAPAS_REGISTRY.json\` — lista completa com path de cada ficha.

---

*Regenerar: \`node backend/scripts/audit/buildBlueprintEtapas.js\`*
`;

  fs.writeFileSync(path.join(ICEB, 'ICEB_ETAPAS_INDEX.md'), indexMd, 'utf8');

  console.log('ICEB etapas:', etapas.length, '/', TOTAL_ETAPAS);
  console.log('Registry:', REGISTRY);
  console.log('Breakdown:', registry.breakdown);
}

main();
