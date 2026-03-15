# Rotas Indústria 4.0 - Registro no App

As rotas de integração (MES/ERP, Edge, Digital Twin, Produção) estão definidas em `backend/src/routes/integrations.js`. Para que funcionem, o router **deve ser montado** no app Express.

## Registro obrigatório

No arquivo que configura o Express (ex.: `app.js`, `server.js` ou equivalente), adicione:

```javascript
const integrationsRouter = require('./routes/integrations');

app.use('/api/integrations', integrationsRouter);
```

## Rotas disponíveis após registro

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /api/integrations/mes-erp/push | company_id no body | Webhook MES/ERP |
| GET | /api/integrations/mes-erp/connectors | Bearer | Lista conectores |
| POST | /api/integrations/mes-erp/connectors | Bearer + IndustrialAdmin | Cadastra conector |
| POST | /api/integrations/production/shift | Bearer | Registra produção turno |
| GET | /api/integrations/production/shift | Bearer | Consulta produção |
| POST | /api/integrations/edge/ingest | edge_id, company_id, token? | Ingest do Edge |
| POST | /api/integrations/edge/register | Bearer + IndustrialAdmin | Registra Edge agent |
| GET | /api/integrations/digital-twin/state | Bearer | Estado Digital Twin |
| PUT | /api/integrations/digital-twin/layout | Bearer + IndustrialAdmin | Salva layout planta |

## Verificação

Se o router não estiver montado, chamadas como `POST /api/integrations/edge/ingest` retornarão 404. Verifique se existe `app.use('/api/integrations', ...)` no ponto de entrada da aplicação.
