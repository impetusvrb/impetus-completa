# ADR-004 — Serviços Cognitivos Externos Opcionais

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-ARCHITECTURE-01

---

## Contexto

O IMPETUS Comunica IA integra OpenAI, Claude, Gemini, ANAM, D-ID, SMTP cloud e TTS Google como parte da proposta de valor cognitiva (voz, avatar, chat, visão, painéis). A auditoria forense identificou dependência de egress HTTPS para funcionalidade completa.

Stakeholders confirmaram: Enterprise On-Premise **não deve ser produto offline total**, mas **auto-hospedável com IA externa opcional**.

---

## Problema

Como posicionar serviços cloud na arquitectura Enterprise sem:

1. Exigir internet para operação industrial core (MES, qualidade, Pulse ingestão)?
2. Remover capacidades cognitivas que diferenciam o produto?
3. Bloquear instalações air-gapped que queiram apenas módulos operacionais?

---

## Decisão

Classificar serviços em **Internos Obrigatórios**, **Internos Opcionais** e **Externos Opcionais**:

### Internos Obrigatórios (on-prem, offline-capable)

- PostgreSQL
- Event Backbone (outbox PostgreSQL)
- Controller Cognitivo (runtime; sem LLM se keys ausentes)
- Pulse Cognitivo (ingestão e índices)
- Conversation Context Engine
- Gêmeo Digital (PG + JSON)
- RBAC, Base Estrutural, Dashboard shell

### Externos Opcionais (requerem egress + keys)

- OpenAI, Claude, Gemini — chat, TTS, visão, Realtime
- ANAM — avatar/voz primário
- D-ID, Akool — alternativas avatar
- Google TTS — substituível
- SMTP cloud — substituível por SMTP local

### Política de degradação

- Ausência de API keys → módulos IA retornam estado degradado / mensagem clara
- **Nunca** bloquear login, dashboard operacional, Event Backbone ou Pulse ingestão por falta de IA cloud
- Firewall cliente pode restringir egress; admin configura quais serviços activar

---

## Consequências

### Positivas

- Proposta de produto preservada (cognitivo + voz quando licenciado)
- Instalações restritas podem operar sem cloud
- Paridade com SaaS (mesmas integrações)

### Negativas

- Cliente deve planear egress e gestão de secrets IA
- Experiência reduzida sem ANAM/OpenAI (comunicação explícita no runbook)

---

## Alternativas descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Produto 100% offline | Remove diferencial cognitivo; exige LLM local (fora de scope) |
| IA cloud obrigatória | Bloqueia operação industrial em redes restritas |
| Substituir ANAM por só OpenAI Realtime | Perde contrato voz actual; regressão UX |
| Embutir modelos locais (Ollama) | Certificação futura opcional; não substitui decisão actual |

---

## Referências

- `backend/src/services/anamService.js`, `aiIntegrationsHealthService.js`
- CERT-ONPREM-FORENSICS-01, Parte 7 e 8
- CERT-ONPREM-ARCHITECTURE-01, Parte 4
