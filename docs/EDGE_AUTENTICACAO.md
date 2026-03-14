# Autenticação Edge Agent (IMPETUS)

## Fluxo

1. **Registro** – Admin chama `POST /api/integrations/edge/register` com `{ edge_id, name }`
2. **Token** – Servidor retorna `{ edge_id, token }`. O token só é mostrado uma vez; armazene em `.env` no edge
3. **Ingest** – Edge envia `POST /api/integrations/edge/ingest` com `edge_id`, `company_id`, `token` e `readings`

## Quando o token é obrigatório

- Se o edge foi registrado via `/edge/register`, a tabela `edge_agents` terá `token_hash`
- Nesse caso, o campo `token` no payload de ingest **é obrigatório**
- Se o token for omitido ou inválido → erro 400 "token obrigatório" ou "token inválido"

## Quando o token não é necessário

- Edge não registrado em `edge_agents` → ingest aceito sem token (modo aberto, ambiente dev)
- `edge_agents.token_hash` é NULL → ingest aceito sem token

## Exemplo de uso

```bash
# 1. Registrar (admin autenticado)
curl -X POST http://localhost:4000/api/integrations/edge/register \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"edge_id":"edge-fabrica-01","name":"Edge Linha 1"}'
# Resposta: {"ok":true,"edge_id":"edge-fabrica-01","token":"a1b2c3..."}

# 2. No .env do edge agent:
EDGE_ID=edge-fabrica-01
EDGE_TOKEN=a1b2c3...
EDGE_COMPANY_ID=<uuid-da-empresa>

# 3. Enviar leituras
curl -X POST http://localhost:4000/api/integrations/edge/ingest \
  -H "Content-Type: application/json" \
  -d '{"edge_id":"edge-fabrica-01","company_id":"<uuid>","token":"a1b2c3...","readings":[{"machine_identifier":"EQ-001","temperature":52.1,"status":"running"}]}'
```

## Script exemplo

`backend/scripts/edge-agent-example.js` – configure `EDGE_ID`, `EDGE_COMPANY_ID`, `EDGE_TOKEN` no `.env` e execute para simular envio de leituras.
