# UX-001 — Sidebar

**Sidebar unificada por domínios** via Presentation Navigation Registry.

## Secções

- LOGÍSTICA (WMS-004 quando flags + RBAC)
- SUPPLY (estrutura visual)
- QUALIDADE / SEGURANÇA / MEIO AMBIENTE (resolvers existentes)

## Integração Layout

- `safeMergePresentationNavigationIntoMenu` após pipeline legacy/publication
- Secções: `.nav-section-header` · `.nav-section-divider`
- CEO/Diretor: `suppressDomainSections` preservado
