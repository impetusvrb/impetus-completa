# ManuIA — App de extensao da manutencao

Referencia tecnica. Migrations sao aditivas (sem reset de dados).

## Caminhos principais

- API: `backend/src/routes/manuiaApp.js` em `/api/manutencao-ia/app`
- Fachada: `backend/src/services/manuiaApp/index.js`
- Ingestao de eventos: `manuiaInboxIngestService.js`
- Regras silencio/plantao: `manuiaAvailabilityService.js` + `manuiaAlertDecisionService.js`
- Push Web: `manuiaWebPushService.js` (env `MANUIA_VAPID_*`)

## Frontend PWA

- `/app/manutencao/manuia-app`
- `frontend/public/manuia-app-manifest.json`, `manuia-sw.js`
- Cliente: `manuiaApp` em `frontend/src/services/api.js`

## Variaveis

Ver `backend/.env.example` (secao ManuIA).

## Roadmap

Integrar `ingest.ingestForUser` em workers industriais; escalonamento automatico; app nativo reutilizando os mesmos endpoints.
