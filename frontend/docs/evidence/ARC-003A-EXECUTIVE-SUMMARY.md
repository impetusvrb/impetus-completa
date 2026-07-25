# ARC-003A — Executive Summary

**Programa:** IMPETUS Presentation Stabilization  
**Entrega:** ARC-003A — Enterprise Presentation Regression Recovery  
**Data:** 2026-07-19

---

## ARC-003A — PRESENTATION REGRESSION RECOVERY

| Critério | Status |
|----------|--------|
| Regressão de Presentation identificada e corrigida | ✅ |
| EOX actua exclusivamente como Enterprise Shell | ✅ |
| Composição original Q/S/E/Logistics restaurada | ✅ |
| Outlet context (companyId) reencaminhado | ✅ |
| Navegação EOX (breadcrumb, retornos) preservada | ✅ |
| Certificações NAV/OPM/WMS intactas | ✅ |
| Testes ARC-003A adicionados | ✅ 10/10 |
| **READY FOR visual validation → OPM-002A** | ⚠️ Após validação manual |

---

## O que aconteceu

ARC-003 unificou correctamente a experiência visual (EOX), mas introduziu um **efeito colateral clássico** de refacção de Presentation: os adapters de navegação quebraram a propagação de contexto React Router entre o shell de domínio e os workspaces.

**Sintoma:** Qualidade, Segurança e Meio Ambiente perdiam dashboards, widgets e painéis específicos — apesar dos testes de arquitectura passarem.

**Correcção:** `EoxDomainNavLayout` — adapter que envolve o EOX Header **sem substituir** o layout interno, reencaminhando obrigatoriamente `companyId` / `stationId`.

---

## Directriz permanente

> O EOX é um **casco corporativo** (Enterprise Shell), nunca um layout substituto. Cada domínio continua dono do seu conteúdo interno.

```
EOX Shell → Domain Adapter → Domain Original Layout → Domain Widgets
```

---

## Posição no roadmap

```
ARC-003 ✅ EOX unificado
ARC-003A ✅ Regressão Presentation corrigida
     ↓
Validação visual manual (Q/S/E/Logistics)
     ↓
OPM-002A Inventory Foundation  ← só após confirmação visual
```

---

## Parecer final

**ARC-003A — COMPLETED**

A plataforma está estabilizada do ponto de vista técnico. Recomendo **validação visual manual** nos quatro domínios antes de autorizar OPM-002A — os testes automatizados agora cobrem composição e context, mas a confirmação humana dos dashboards específicos (SPC, GHE, efluentes, OTIF) fecha o ciclo de confiança iniciado pela sua observação.
