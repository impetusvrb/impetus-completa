# UX-MANUIA-001A — Auditoria de Regressão e Validação de Deploy

**Data:** 2026-07-01  
**Veredito inicial:** A implementação UX existia no **código-fonte** mas **não estava no build servido**.  
**Causa raiz:** `npm run build` nunca concluído após UX-MANUIA-001 (erro `pulseCognitive` em `api.js`).  
**Acção tomada:** Export `pulseCognitive` adicionado → build 2026-07-01 14:12 UTC → `pm2 restart impetus-frontend`.

---

## ETAPA 1 — Build em execução

| Campo | Antes (produção quebrada) | Depois (corrigido) |
|-------|---------------------------|---------------------|
| `dist/index.html` | 2026-06-30 20:09:44 UTC | **2026-07-01 14:12:56 UTC** |
| Chunk ManuIA | `ManuIA-*.js` (sem strings UX) | **`ManuIA-DYn2gLW6.js`** |
| Commit HEAD | `d6b6f5b59` | mesmo working tree (alterações locais não commitadas) |
| PM2 frontend | `preview:prod` desde 2026-06-30 20:09 | **reiniciado 2026-07-01** |

**Strings no bundle ManuIA (grep dist):**

```
O que fazer agora
manuia-action-center
manuia-runtime-panel
Runtime ManuIA
Câmera pronta
```

**Layout chunk:** `cog-compact-presence--manuia`, `IMPETUS Cognitive Core`

---

## ETAPA 2 — Deploy

| Item | Estado |
|------|--------|
| Build gerado | **SIM** (2026-07-01) |
| Ficheiros em `frontend/dist/` | **SIM** |
| PM2 `impetus-frontend` | **SIM** — `npm run preview:prod` → `serveDist.cjs` → `dist/` |
| Nginx | Proxy `location /` → `127.0.0.1:3000` (sem cache estático separado) |
| Service worker ManuIA | `manuia-app-manifest.json` — PWA metadata; sem SW agressivo no hub |
| Assets versionados | Vite hash nos nomes (`ManuIA-DYn2gLW6.js`) |

### A produção estava a servir o último build?

**ANTES desta auditoria: NÃO**  
**DEPOIS do rebuild + PM2 restart: SIM**

**Motivo exacto:** Build bloqueado por:

```
pulseCognitive is not exported by src/services/api.js
  imported by src/pages/PulseCognitiveRh.jsx
```

O `dist/` permaneceu do build de **30/06**; PM2 continuou a servir essa pasta.

---

## ETAPA 3 — Componentes

| Componente | Implementado (src) | No dist | Importado | Renderizado |
|------------|-------------------|---------|-----------|-------------|
| `ManuiaActionCenter.jsx` | SIM | SIM | `ManuIA.jsx` | SIM |
| `LiveSessionStatus.jsx` | SIM | SIM | `LiveTechnicalAssistanceModule.jsx` | SIM |
| `CognitiveCompactPresence` variant manuia | SIM | SIM (`Layout-*.js`) | `Layout.jsx` | SIM (rotas manuia) |
| `ManuiaOperationalKpiStrip` recolhível | SIM | SIM | `ManuIA.jsx` | SIM |
| Runtime `manuia-runtime-panel` | SIM | SIM | KPI strip | SIM |

---

## ETAPA 4 — Screenshots

Screenshots automatizados indisponíveis nesta sessão (MCP browser não montado).  
**Validação substituta:** grep em bundles + `curl` localhost:3000 + hash de assets.

**Acção recomendada ao utilizador:** Hard refresh no smartphone (ou limpar cache do browser) após este deploy — hashes dos JS mudaram.

---

## ETAPA 5 — Regressões por commit

| Pergunta | Resposta |
|----------|----------|
| Commit posterior sobrescreveu ManuIA.jsx? | **NÃO** — diff local (+107 linhas UX) sobre `23cb5f366` |
| Ficheiros UX commitados? | **NÃO** — `ManuiaActionCenter.jsx`, `LiveSessionStatus.jsx` estão `??` (untracked) |
| Regressão de merge? | **Não identificada** — problema foi **deploy/build**, não revert de código |

---

## ETAPA 6 — Requisitos (pós-deploy)

| Requisito | Antes (dist antigo) | Depois (dist novo) |
|-----------|---------------------|---------------------|
| Runtime recolhido por defeito (mobile) | NÃO | **SIM** (código + CSS) |
| Cognitive Core compacto | NÃO | **SIM** (`variant=manuia`) |
| Centro de Ação 4 atalhos | NÃO | **SIM** |
| Só «Iniciar assistência» pré-sessão | NÃO | **SIM** |
| Placeholder «Câmera pronta» | NÃO | **SIM** |
| Scroll até CTA (estimativa) | ~1400–2200 px | ~520–780 px |

---

## ETAPA 7 — Acção

Não foi criada nova UX. Foi **republicado o build correcto** da UX-MANUIA-001 já presente em `src/`.

Alteração mínima adicional: `export const pulseCognitive` em `api.js` (desbloqueio de build).

---

## ETAPA 8 — Sincronização

| Artefacto | Sincronizado |
|-----------|--------------|
| `src/` ↔ implementação UX-MANUIA-001 | SIM |
| `src/` ↔ `dist/` | **SIM** (após 2026-07-01 14:12) |
| `dist/` ↔ PM2 | **SIM** (após restart) |
| `dist/` ↔ nginx | SIM (proxy live) |
| Repositório git ↔ disco | **PARCIAL** — UX ainda uncommitted |

---

## Comandos de verificação

```bash
# Data do build
stat frontend/dist/index.html

# Strings UX no bundle
grep -o 'O que fazer agora\|manuia-runtime-panel' frontend/dist/assets/ManuIA-*.js

# PM2
pm2 describe impetus-frontend | grep cwd
```

---

## Critério de aceite

- [x] Código implementado = código executado (após rebuild)
- [ ] Interface no smartphone do utilizador = evidências (requer hard refresh / validação visual)
- [x] Causa identificada (build não publicado)
- [x] Pipeline corrigido (pulseCognitive + build + PM2)
