# Instalação Industrial IMPETUS

Guia para implantar o software **limpo** numa fábrica nova: o cliente cadastra empresa, estrutura, utilizadores e equipamentos.

---

## Pré-requisitos

| Componente | Versão mínima |
|------------|---------------|
| Node.js | 20.x |
| PostgreSQL | 14+ |
| PM2 | 5+ |
| Nginx | 1.18+ (reverso proxy) |

---

## Instalação automática

```bash
cd /var/www/impetus-completa
sudo bash backend/scripts/ops/install-industrial.sh
```

O script executa: `npm install`, build frontend, migrações BD, flags de produção limpa, nginx, PM2, testes e smoke.

---

## Flags obrigatórias (instalação limpa)

No `backend/.env`:

```env
NODE_ENV=production
IMPETUS_COGNITIVE_LIVING_ENRICHMENT=false
IMPETUS_INDUSTRIAL_LAB_ENABLED=false
IMPETUS_INDUSTRIAL_LAB_AUTO_E2E_ON_BOOT=false
```

- **LIVING_ENRICHMENT=false** — sem KPIs/twin/feed sintéticos quando não há dados.
- **INDUSTRIAL_LAB=false** — sem simuladores MQTT/Modbus a injectar telemetria falsa.

Processos lab PM2 (`impetus-lab-*`, `impetus-edge-agent-lab`) devem ficar **parados** em produção.

---

## Jornada do cliente (primeiro dia)

```
1. Login (conta criada pelo integrador ou POST /api/companies)
2. Alterar senha + Setup Empresa (/setup-empresa)
3. Base Estrutural (/app/admin/structural)
   — departamentos, setores, cargos (company_roles)
4. Utilizadores (/app/admin/users) — cada um com company_role_id
5. Equipamentos / biblioteca (conforme módulos contratados)
6. Validar dashboard e menu por cargo
```

Estados vazios mostram mensagens técnicas — **não** números inventados.

---

## Verificação pós-instalação

```bash
# Health
curl -s http://127.0.0.1:4000/health

# Smoke instalação limpa
node backend/scripts/ops/smoke-clean-install.js

# Governança
cd backend && npm run test:contextual-modules && npm run test:domain-isolation
```

---

## Nginx

Config canónica: `/etc/nginx/sites-available/impetus`  
Upstream: backend `127.0.0.1:4000`, frontend `127.0.0.1:3000`.

```bash
nginx -t && systemctl reload nginx
```

---

## Critérios de aceite (go-live industrial)

| # | Critério |
|---|----------|
| 1 | PM2 backend/frontend online, restarts estáveis (<5/dia) |
| 2 | `smoke-clean-install.js` OK |
| 3 | CEO vê menu executivo, **sem** ManuIA/Quality se não contratado |
| 4 | RH vê módulos RH, **sem** financeiro se `hidden_themes` |
| 5 | Dashboard vazio = mensagem honesta, `data_state: empty` |
| 6 | Base Estrutural completa para todos os utilizadores activos |
| 7 | Lab industrial desligado |

---

## Suporte

Matriz funcional: `backend/docs/FUNCTIONAL_MATRIX.md`  
Blueprint: `backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/`

*OPS · Instalação industrial v1.0 · 2026-06-30*
