# Template — Motor / Engine

> Copiar para Volume IV ou anexo de Volume I. Preencher todos os campos. Classificação obrigatória: **AB** | **N** | **R**

---

## Identificação

| Campo | Valor |
|-------|-------|
| **ID** | `motor.<dominio>.<nome>` |
| **Nome canónico** | |
| **Tier** | T1 Decisão · T2 Contexto · T3 Operacional · T4 Exposição · T5 Governança |
| **Classificação** | AB / N / R |
| **Versão doc** | ICEB v1.0 |

---

## Propósito

(Uma frase: que problema industrial resolve.)

---

## Gatilho

- **Quem invoca:** (rota HTTP, cron, evento, outro motor)
- **Quando:** (login, /dashboard/me, poll 8s, ingest PLC, …)

---

## Entradas

| Fonte | Tipo | Obrigatório |
|-------|------|-------------|
| Base Estrutural | `company_roles`, contexto org | sim/não |
| BD | tabelas | |
| API externa | | |
| Evento / fila | | |
| Env flags | | |

---

## Processamento

1. (passo)
2. (passo)

**Ficheiro(s) principal(is):** `backend/src/...`

**Dependências:** (outros motores)

---

## Saídas

| Destino | Formato |
|---------|---------|
| API response | |
| UI | |
| Log / telemetria | |
| Outbox / evento | |

---

## Regras de IA (se aplicável)

- Modelo(s):
- Grounding:
- Deny / firewall:
- Explicabilidade:

---

## Adaptação Base Estrutural

Como cargo / área / hierarquia altera o comportamento:

---

## Flags de ambiente

| Variável | Default | Efeito |
|----------|---------|--------|
| | | |

---

## Excepções e edge cases

---

## Evidências (obrigatório se AB)

| Tipo | Referência |
|------|------------|
| Código | |
| Rota | |
| Tabela | |
| Teste | |

---

## Estado CERT / VERDE

- [ ] Visual  - [ ] API  - [ ] BD  - [ ] Log  - [ ] Tenant  - [ ] Operacional

---

*Template ICEB v1.0*
