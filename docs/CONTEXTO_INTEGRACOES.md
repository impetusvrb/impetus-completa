# Módulo Integração e Conectividade – contexto atual

**Última atualização:** março 2026

## O que está pronto

- **Frontend** (`frontend/src/pages/AdminIntegrations.jsx` + `AdminIntegrations.css`):
  - Página em `/app/admin/integrations` com layout em duas colunas.
  - **Conectores MES/ERP:** listagem, botão "Novo conector", formulário (nome + URL endpoint), criação via API.
  - **Edge Agent:** formulário para registrar edge (ID + nome), exibição do token retornado.
  - Tratamento de erros e loading; estilo alinhado ao redesign IMPETUS.

- **API no frontend** (`frontend/src/services/api.js`):
  - `integrations.listConnectors()`, `integrations.createConnector(data)`, `integrations.registerEdge(data)`.
  - Também: `getDigitalTwinState()`, `saveDigitalTwinLayout(data)` para uso futuro.

- **Backend** (`backend/src/routes/integrations.js`):
  - Rotas implementadas: GET/POST `/api/integrations/mes-erp/connectors`, POST `/api/integrations/edge/register`, etc.

## Próximos passos (quando retomar)

1. **Confirmar montagem do router no backend**  
   No arquivo principal do Express (ex.: `server.js` ou `app.js`), garantir:
   ```js
   app.use('/api/integrations', require('./routes/integrations'));
   ```
   Ver `docs/ROTAS_REGISTRO.md`.

2. **Testar na tela**  
   Acessar Integração e Conectividade no admin: listar conectores, criar um conector, registrar um edge e conferir se o token aparece (e se não houver 404/403).

3. **Opcional:** Digital Twin na mesma tela ou link; uso de `getDigitalTwinState` e `saveDigitalTwinLayout` se fizer parte do escopo.

## Integração com o resto do software

- Rota no menu: sidebar em `frontend/src/components/Layout.jsx` (Integração e Conectividade).
- Rota no app: `frontend/src/App.jsx` → `/app/admin/integrations` com `AdminRouteGuard`.
- Backend: `backend/src/routes/integrations.js`, serviços `mesErpIntegrationService.js` e `edgeIngestService.js`.

Quando for retomar, basta dizer algo como “continuar o módulo de integrações” ou “terminar integração e conectividade” para seguir a partir deste ponto.
