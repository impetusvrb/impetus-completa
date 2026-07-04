# SEC-03 — Threat Model

## Threat Profile DTO (`threat_profile_v1`)

| Campo | Descrição |
|-------|-----------|
| `threatProfileId` | ID único do perfil |
| `incidentId` | Referência ao incidente SEC-02 |
| `confidence` | 0–1 confiança global |
| `originAssessment` | Avaliação de origem (hipótese, não identidade) |
| `campaignAssessment` | Campanha isolada ou relacionada |
| `persistenceAssessment` | Persistência temporal |
| `intentAssessment` | Intenção provável |
| `targetAssessment` | Alvos/componentes |
| `historicalSimilarity` | Comparação com histórico |
| `affectedAssets` | Componentes afectados |
| `threatIndicators` | Indicadores determinísticos |
| `recommendations` | Recomendações consultivas |
| `riskLevel` | Low / Medium / High / Critical |
| `primaryAssessment` | Tipo principal de ameaça |

## Assessments primários

BACKGROUND_INTERNET_NOISE, GENERIC_SCANNER, CLOUD_SCANNER, CREDENTIAL_SCANNER, RECON_CAMPAIGN, PERSISTENT_ENUMERATION, OPERATIONAL_ACCESS, CRAWLER, UNKNOWN, SUSPICIOUS

## Disclaimer obrigatório

Cada perfil inclui: *"Não infere identidade nem número de actores."*
