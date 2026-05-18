# ENVIRONMENT Shadow Activation Deploy

Deploy controlado — **sem FULL rollout**, sem rebuild estrutural pesado.

## 1. Backup leve

```bash
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BK=backend/backups/environment-shadow-activation-$STAMP
mkdir -p "$BK"/{env,dist,reports}
cp backend/.env "$BK/env/backend.env" 2>/dev/null || true
cp frontend/.env.production "$BK/env/frontend.env.production" 2>/dev/null || true
cp -a frontend/dist "$BK/dist/frontend-dist-snapshot" 2>/dev/null || true
pm2 jlist > "$BK/reports/pm2-snapshot.json" 2>/dev/null || true
```

## 2. Flags backend

```env
IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=true
IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_ACTIVATION_STAGE=shadow
```

Opcional (camadas): governance, cognitive, telemetry, executive runtimes conforme maturidade do tenant.

## 3. Flags frontend

```env
VITE_IMPETUS_ENVIRONMENT_NAVIGATION_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_OPERATIONAL_VISIBILITY_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_GOVERNANCE_VISIBILITY_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_EXECUTIVE_VISIBILITY_ENABLED=true
```

## 4. Validação pré-reload

```bash
cd backend && npm run test:environment-publication-runtime
cd backend && npm run test:environment-shadow-stabilization
cd frontend && npm run test:environment-publication-runtime
```

## 5. Reload controlado

```bash
pm2 reload impetus-backend --update-env
# rebuild frontend apenas se flags VITE alteradas
```

## 6. Rollback

Restaurar `.env` e `dist` do backup; `pm2 reload` com env anterior.

## GO / NO-GO

**GO** quando todos os testes Etapa 6 passam e `publication_allowed` responde em shadow sem erros 5xx em `/api/environment-navigation/context`.
