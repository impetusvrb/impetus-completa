# ManuIA — Mapa de arquitetura (Impetus)

Documento interno: alinha nomes do código com os prompts “3D Vision” e “Gestão de Ativos”.

## Rotas da aplicação

- **Página:** `/app/manutencao/manuia` → `frontend/src/pages/ManuIA.jsx`
- **Query string (consumo único, depois removida da URL com `replace`):**
  - **`q`** — texto da pesquisa por equipamento (nome/código para a IA e para o campo de busca). Mínimo 3 caracteres para disparar pesquisa automática.
  - **`mid`** — (opcional) UUID de `manuia_machines`. Vindo da Gestão de Ativos (“Abrir cadastro” no detalhe do gêmeo): associa o fluxo ao equipamento cadastrado (sessão `POST /sessions` com `machine_id`, e **Diagnóstico 3D** com `machineId` correto). Deve ir acompanhado de um `q` com o nome (ou fallback) do equipamento; não use só UUID em `q` para a pesquisa por texto.
  - Exemplo: `/app/manutencao/manuia?q=Bomba+linha+3&mid=<uuid>`

## APIs backend (Express)

| Prefixo | Ficheiro | Notas |
|---------|----------|--------|
| `/api/manutencao-ia` | `backend/src/routes/manutencao-ia.js` | Feature flag `ENABLE_MANUIA` em `server.js`. Exige perfil de manutenção (código ou nome contendo `maintenance` / `manutencao`). |
| `/api/vision` | `backend/src/routes/vision.js` | `ANTHROPIC_API_KEY`. Mesmo `requireAuth` que o resto da API. |
| `/api/asset-management` | `backend/src/routes/assetManagement.js` | Gêmeos/OS/estoque via `assetManagementService.js`; fallback mock se tabelas ausentes. |

## 3D Vision (frontend)

- **Módulo raiz:** `frontend/src/modules/vision-3d/Vision3DModule.jsx`
- **Viewer Three.js (equivalente a “ThreeViewer” nos PDFs):** `Vision3DViewer.jsx`
- **Modelo procedural:** `MachineModel.js` (`buildMachineModel`, `applyHeatmap`, `heatColor`)
- **Chat e passos clicáveis (equivalente a “StepCard”):** `chat/CopilotChat.jsx` (cartões de passo inline)
- **Histórico IndexedDB:** `services/historyService.js` (chave `manuia:history:{machineId}`)
- **Cliente IA:** `services/claudeApi.js` → `fetch(POST /api/vision)` com `Authorization: Bearer`

## Gestão de Ativos (frontend)

- **Módulo:** `frontend/src/modules/asset-management/AssetManagementModule.jsx`
- **Aba no ManuIA:** definida em `ManuIA.jsx` (tab “Gestão de Ativos”)

## Migrações PostgreSQL relevantes

- `backend/src/models/manuia_migration.sql` — máquinas, sensores, sessões, `work_orders` base
- `backend/src/models/manuia_asset_inventory_migration.sql` — `manuia_spare_parts` (opcional)

## OS geradas pelo módulo de ativos

Título com prefixo `ManuIA-Asset:` em `work_orders`. Linha `MANUIA_MACHINE_ID:{uuid}` na descrição. Aprovação P1/P2: `status` `waiting_support` → `open`.

## Desmontagem 3D (v1.1)

- Lógica de animação: `utils/disassemblyAnimation.js` (inclui pausa ~500 ms após a fase de saída antes de `onComplete`).
