# ManuIA — Mapa de arquitetura (Impetus)

Documento interno: alinha nomes do código com os prompts “3D Vision” e “Gestão de Ativos”.

## Rotas da aplicação

- **Página:** `/app/manutencao/manuia` → `frontend/src/pages/ManuIA.jsx`
- **Query string (consumo único, depois removida da URL com `replace`):**
  - **`q`** — texto da pesquisa por equipamento (nome/código para a IA e para o campo de busca). Mínimo 3 caracteres para disparar pesquisa automática.
  - **`mid`** — (opcional) UUID de `manuia_machines`. Vindo da Gestão de Ativos (“Abrir cadastro” no detalhe do gêmeo): associa o fluxo ao equipamento cadastrado (sessão `POST /sessions` com `machine_id`, e **Assistência Técnica ao Vivo** com `machineId` correto). Deve ir acompanhado de um `q` com o nome (ou fallback) do equipamento; não use só UUID em `q` para a pesquisa por texto.
  - Exemplo: `/app/manutencao/manuia?q=Bomba+linha+3&mid=<uuid>`

## APIs backend (Express)

| Prefixo | Ficheiro | Notas |
|---------|----------|--------|
| `/api/manutencao-ia` | `backend/src/routes/manutencao-ia.js` | Feature flag `ENABLE_MANUIA` em `server.js`. Exige perfil de manutenção (código ou nome contendo `maintenance` / `manutencao`). Inclui **Assistência Técnica ao Vivo**: `POST /live-assistance/analyze-frame`, `POST /live-assistance/chat`, `POST /live-assistance/save-session` (orquestração em `manuiaLiveAssistanceService.js`: visão Gemini + pesquisa `equipmentResearchService` + copiloto OpenAI). |
| `/api/vision` | `backend/src/routes/vision.js` | `ANTHROPIC_API_KEY`. Mesmo `requireAuth` que o resto da API. |
| `/api/asset-management` | `backend/src/routes/assetManagement.js` | Gêmeos/OS/estoque via `assetManagementService.js`; fallback mock se tabelas ausentes. |

## Viewer 3D oficial — Unity WebGL (frontend)

- **Componente:** `frontend/src/components/manu-ia/ManuIAUnityViewer.jsx` (aba Pesquisa e painel “Abrir 3D” na **Assistência Técnica ao Vivo**)
- **Ponte JS:** `frontend/src/services/unity/unityBridge.js` (`SendMessage` → GameObject `MachineController` no Unity)
- **Roteador de intenções visuais (IA):** `frontend/src/services/unity/aiVisualCommandRouter.js` — após cada resposta do Claude em `useVisionChat`, chama-se `applyVisualIntentsFromClaudePayload` (campo opcional `visualIntents` no JSON + campos legados `highlight` / `explode` / `animationTarget`).
- **Catálogo / assets:** `frontend/src/config/machineCatalog.js`, `frontend/src/config/viewerAssetsConfig.js`
- **Build público:** `frontend/public/unity/manu-ia-viewer/` (copiar export WebGL do Unity; ver `README.md` na pasta)
- **Script C# de referência:** `unity/MachineController.cs.example`

## Assistência Técnica ao Vivo (substitui o antigo “Diagnóstico 3D” na aba correspondente)

- **Módulo raiz:** `frontend/src/modules/live-assistance/LiveTechnicalAssistanceModule.jsx` — câmera, loop de frames, upload, copiloto, dossiê, Unity quando houver modelo na biblioteca.
- **Backend:** `backend/src/services/manuiaLiveAssistanceService.js` (Gemini visão + dossiê interno + chat GPT-4o-mini contextualizado).

## 3D Vision (legado no repositório — não usado na aba principal)

- **Módulo legado (referência):** `frontend/src/modules/vision-3d/Vision3DModule.jsx` (Claude via `/api/vision`)
- **Cliente IA legado:** `services/claudeApi.js` → `fetch(POST /api/vision)` com `Authorization: Bearer`

## Gestão de Ativos (frontend)

- **Módulo:** `frontend/src/modules/asset-management/AssetManagementModule.jsx`
- **Aba no ManuIA:** definida em `ManuIA.jsx` (tab “Gestão de Ativos”)

## Migrações PostgreSQL relevantes

- `backend/src/models/manuia_migration.sql` — máquinas, sensores, sessões, `work_orders` base
- `backend/src/models/manuia_asset_inventory_migration.sql` — `manuia_spare_parts` (opcional)

## OS geradas pelo módulo de ativos

Título com prefixo `ManuIA-Asset:` em `work_orders`. Linha `MANUIA_MACHINE_ID:{uuid}` na descrição. Aprovação P1/P2: `status` `waiting_support` → `open`.

## Desmontagem / inspeção visual

- Controlada no projeto Unity (animações de desmontagem, transparência, foco). O frontend envia comandos via `unityBridge`; ver `MachineController.cs.example`.
