# Multi-Domain Publication — Relatório

**Motor:** `multiDomainPublicationValidator`

## Domínios validados

| Domínio | Verificação |
|---------|-------------|
| QUALITY | flags + manifest routes |
| SAFETY | flags + shadow publication |
| LOGISTICS | flags + shadow publication |
| IA | `/app/chatbot` preservado |
| Chat | `/chat` preservado |
| Dashboard | `/app` preservado |

## Pipeline

Ordem: `quality → safety → logistics` (safe merges)

## Frontend

`enterprisePublicationPipelineStability.js` — valida não-shrink, sem publicação recursiva.

## Estabilidade

`publication_stable` requer: sem conflitos cross-domain · mounts OK · legacy coexistence
