# SEC-03 — Campaign Analysis

## Perguntas respondidas

- É incidente isolado?
- Pode fazer parte da mesma campanha?
- Existe evidência suficiente?
- Existe apenas hipótese?

## Níveis de evidência

| Nível | Significado |
|-------|-------------|
| Confirmed | Evidência forte (ex.: operador autorizado, scanner UA conhecido) |
| Likely | Padrões consistentes (IP, ASN, classificação, alvo) |
| Possible | Similaridade parcial |
| Unknown | Evidência insuficiente |

## Regra Gustavo

Dois IPs de cloud providers **diferentes** não implica "dois hackers". O sistema reporta:

- "Campanhas independentes possíveis" (Possible), ou
- "Evidência insuficiente" (Unknown)

Nunca: "2 atacantes confirmados".

## Campaign ID

Derivado deterministicamente de classificação + provider + incidentes relacionados — uso interno para agrupamento dashboard.
