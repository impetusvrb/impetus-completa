'use strict';

/**
 * SEC-VISUAL-INTELLIGENCE-001 — Motor de Inteligência de Evidências por Origem
 *
 * Resolve evidências de segurança para um item selecionável do observatório
 * (país, origem desconhecida, etc.) reutilizando o cache do dashboard (30s)
 * sem novo I/O de disco ou queries SQL extras.
 *
 * Fonte da verdade: arrays geo-enriquecidos já presentes no payload do dashboard.
 * Nenhum pool PostgreSQL próprio. Nenhum tailFile() extra.
 */

const dashboardSvc = require('./adminPortalSecurityDashboardService');

// ─── Nomes de países conhecidos ─────────────────────────────────────────────
const SPECIAL_LABELS = Object.freeze({
  '??': 'Origem Não Determinada',
  'LO': 'Rede Local / Privada'
});

// ─── Camadas de proteção da plataforma (inventário real auditado) ────────────
const LAYER_DEFINITIONS = [
  { id: 'NGINX',       name: 'Firewall de Rede (Nginx)',           telemetry: 'nginx_access_log' },
  { id: 'FAIL2BAN',    name: 'Proteção Automática (fail2ban)',      telemetry: 'fail2ban' },
  { id: 'UFW',         name: 'Firewall de Host (UFW)',              telemetry: 'ufw' },
  { id: 'CLOUDFLARE',  name: 'Filtragem IP/Geoloc (Cloudflare)',   telemetry: 'nginx_conf' },
  { id: 'RATE_LIMIT',  name: 'Rate Limiting (Nginx)',               telemetry: 'nginx_error_log + nginx_conf' },
  { id: 'AUTH_GUARD',  name: 'Autenticação e Controle de Acesso',  telemetry: 'threat_watch + admin_logs' },
  { id: 'BOT_DETECT',  name: 'Detecção Anti-Bot (Turnstile)',      telemetry: 'admin_logs' },
  { id: 'RBAC',        name: 'RBAC e Permissões',                  telemetry: 'internal_guard' },
  { id: 'INPUT_VAL',   name: 'Validação de Entradas (Backend)',    telemetry: 'application_middleware' },
  { id: 'INJECT_PROT', name: 'Proteção Contra Injeção (SQL/NoSQL)', telemetry: 'application_middleware' },
  { id: 'TLS',         name: 'Criptografia de Dados (TLS 1.3)',    telemetry: 'openssl' },
  { id: 'TENANT_ISO',  name: 'Isolamento de Tenants (RLS)',        telemetry: 'postgresql_rls' },
  { id: 'OBSERVATORY', name: 'Monitoramento Contínuo (SEC-01)',    telemetry: 'security_observatory' },
  { id: 'CORRELATION', name: 'Análise Comportamental (SEC-02)',    telemetry: 'sec02_correlation' },
  { id: 'BACKUP',      name: 'Backup Automático e Imutável',       telemetry: 'backup_system' },
  { id: 'INTEGRITY',   name: 'Controle de Integridade',            telemetry: 'threat_watch' },
  { id: 'DB_PROTECT',  name: 'Proteção do Banco de Dados (RLS)',   telemetry: 'postgresql' },
  { id: 'AUDIT',       name: 'Auditoria e Logs Imutáveis',         telemetry: 'admin_logs + threat_watch' },
  { id: 'INCIDENT',    name: 'Resposta Automática a Incidentes',   telemetry: 'fail2ban' },
  { id: 'GOVERNANCE',  name: 'Governança e Melhorias Contínuas',   telemetry: 'security_governance' }
];

// Status possíveis (com rigor — diferencia "não acionou" de "sem telemetria")
const STATUS = Object.freeze({
  ATUOU:          'ATUOU',          // evidência confirmada de ação
  OBSERVADA:      'OBSERVADA',      // presente e operacional, não precisou agir
  SEM_TELEMETRIA: 'SEM_TELEMETRIA', // existe mas não há dados por origem
  NAO_APLICAVEL:  'NAO_APLICAVEL',  // não relevante para origem externa
  INDETERMINADO:  'INDETERMINADO'   // estado não pode ser determinado
});

function extractPath(detail) {
  const m = String(detail || '').match(/(?:GET|POST|PUT|DELETE|PATCH)\s+(\S+)/i);
  if (m) return m[1];
  const p = String(detail || '').match(/(\/[\w.%~@!$()*+,;:-]+)/);
  return p ? p[1] : null;
}

function getCountryLabel(cc, evidence) {
  if (SPECIAL_LABELS[cc]) return SPECIAL_LABELS[cc];
  const pt = (evidence.world_map?.points || []).find((p) => p.country_code === cc);
  return pt?.country || cc;
}

function countAlertsForCountry(alerts, cc) {
  return (alerts || []).filter((a) => a.country_code === cc).length;
}

function buildIndexDecomposition(cc, attackOrigins, blockedIps, alertsAnalytical) {
  const nginxWeight = (attackOrigins || [])
    .filter((o) => o.country_code === cc)
    .reduce((s, o) => s + (o.count || 1), 0);
  const blockedWeight = (blockedIps || [])
    .filter((b) => b.country_code === cc)
    .length * 2;
  const alertsWeight = countAlertsForCountry(alertsAnalytical, cc);
  return {
    nginx_hits_x1: nginxWeight,
    blocked_ips_x2: blockedWeight,
    threat_alerts_x1: alertsWeight,
    total: nginxWeight + blockedWeight + alertsWeight
  };
}

function buildTimeline(recentAlerts, criticalEvents) {
  const raw = [
    ...recentAlerts.map((a) => ({
      ts: a.at, ip: a.ip,
      label: a.type || 'ALERTA',
      severity: a.severity || 'MEDIUM',
      source: 'threat-watch',
      detail: a.detail
    })),
    ...criticalEvents.map((e) => ({
      ts: e.at, ip: e.ip,
      label: e.type || 'EVENTO_CRÍTICO',
      severity: e.severity || 'HIGH',
      source: 'critical-events',
      detail: e.detail
    }))
  ]
    .filter((e) => e.ts)
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));

  if (raw.length === 0) return [];

  const milestones = [];

  milestones.push({ ...raw[0], milestone: 'first_occurrence', label_pt: 'Primeiro evento registado' });

  if (raw.length > 2) {
    // Pico: janela de 5 min com mais eventos
    const windowMs = 5 * 60 * 1000;
    let maxCount = 0;
    let peakCenter = raw[0];
    for (const anchor of raw) {
      const anchorT = new Date(anchor.ts).getTime();
      const inWindow = raw.filter((e) => Math.abs(new Date(e.ts).getTime() - anchorT) <= windowMs);
      if (inWindow.length > maxCount) {
        maxCount = inWindow.length;
        peakCenter = anchor;
      }
    }
    if (peakCenter !== raw[0] && peakCenter !== raw[raw.length - 1]) {
      milestones.push({ ...peakCenter, milestone: 'peak_activity', label_pt: `Pico de actividade (${maxCount} eventos/5min)` });
    }
  }

  if (raw.length > 1) {
    milestones.push({ ...raw[raw.length - 1], milestone: 'last_occurrence', label_pt: 'Último evento registado' });
  }

  return milestones.slice(0, 6);
}

function buildProtectionLayers(dash, filterData) {
  const {
    blockedIps, recentAlerts, criticalEvents, authAlerts, scanAlerts, enumerationAlerts, attackOrigins,
    rateLimitHits
  } = filterData;

  const infra = dash.infrastructure || {};
  const fail2banActive = !!(dash.fail2ban?.available);
  const rateLimitConfigured = infra.nginx_rate_limit === true;
  // SEC-COVERAGE-001: ufw_active distingue activo-sem-DENY de UFW inactivo
  const ufwActive = dash.ufw_active !== false; // true quando campo ausente (retrocompatível) ou true
  const rateLimitHitsForOrigin = rateLimitHits || [];

  const nginxSuspiciousCount = attackOrigins.reduce((s, o) => s + (o.count || 0), 0);
  const anyBlocked = blockedIps.length > 0;
  const fail2banBlocked = blockedIps.filter((b) => b.source === 'fail2ban');
  const ufwBlocked = blockedIps.filter((b) => b.source === 'ufw');
  const rateLimitEventCount = rateLimitHitsForOrigin.reduce((s, h) => s + (h.count || 1), 0);
  // Eventos da origem (para OBSERVATORY e AUDIT)
  const hasOriginEvents = (recentAlerts.length + criticalEvents.length) > 0;

  return LAYER_DEFINITIONS.map((def) => {
    let status = STATUS.INDETERMINADO;
    let evidence = 'Evidência não disponível para esta origem';

    switch (def.id) {
      case 'NGINX':
        status = nginxSuspiciousCount > 0 ? STATUS.ATUOU : STATUS.OBSERVADA;
        evidence = nginxSuspiciousCount > 0
          ? `${nginxSuspiciousCount} requisições suspeitas identificadas desta origem`
          : 'Nginx operacional — sem actividade suspeita desta origem na janela';
        break;

      case 'FAIL2BAN':
        status = fail2banBlocked.length > 0 ? STATUS.ATUOU
          : fail2banActive ? STATUS.OBSERVADA : STATUS.SEM_TELEMETRIA;
        evidence = fail2banBlocked.length > 0
          ? `${fail2banBlocked.length} IP(s) banidos: ${fail2banBlocked.map((b) => b.ip).slice(0, 3).join(', ')}`
          : fail2banActive ? 'fail2ban activo — sem banimentos desta origem' : 'Estado do fail2ban indeterminado';
        break;

      case 'UFW':
        if (ufwBlocked.length > 0) {
          status = STATUS.ATUOU;
          evidence = `${ufwBlocked.length} regra(s) UFW activas para IPs desta origem`;
        } else if (ufwActive) {
          status = STATUS.OBSERVADA;
          evidence = 'UFW operacional — sem regras específicas para esta origem';
        } else {
          status = STATUS.SEM_TELEMETRIA;
          evidence = 'UFW não activo ou estado indeterminado — telemetria de firewall de host indisponível';
        }
        break;

      case 'CLOUDFLARE':
        status = infra.cloudflare_proxy_guard ? STATUS.OBSERVADA : STATUS.SEM_TELEMETRIA;
        evidence = infra.cloudflare_proxy_guard
          ? 'Cloudflare proxy guard configurado — filtragem de camada de rede activa'
          : 'Configuração Cloudflare não detectada — sem telemetria desta camada';
        break;

      case 'RATE_LIMIT':
        if (rateLimitEventCount > 0) {
          status = STATUS.ATUOU;
          evidence = `${rateLimitEventCount} evento(s) limit_req do Nginx para IP(s) desta origem`
            + ` (${rateLimitHitsForOrigin.map((h) => h.ip).slice(0, 3).join(', ')})`;
        } else if (rateLimitConfigured) {
          status = STATUS.OBSERVADA;
          evidence = 'Rate limiting Nginx (limit_req) configurado e activo — sem evento correlacionado a esta origem na janela de error.log';
        } else {
          status = STATUS.SEM_TELEMETRIA;
          evidence = 'Configuração limit_req não detectada — telemetria de rate limiting indisponível';
        }
        break;

      case 'AUTH_GUARD':
        status = authAlerts.length > 0 ? STATUS.ATUOU : STATUS.OBSERVADA;
        evidence = authAlerts.length > 0
          ? `${authAlerts.length} tentativa(s) de autenticação detectadas e registadas`
          : 'Auth guard operacional — sem tentativas de autenticação desta origem';
        break;

      case 'BOT_DETECT':
        status = infra.turnstile ? STATUS.OBSERVADA : STATUS.SEM_TELEMETRIA;
        evidence = infra.turnstile
          ? 'Turnstile activo — telemetria por origem geográfica não granular'
          : 'Turnstile não configurado — sem telemetria desta camada';
        break;

      case 'RBAC':
        status = STATUS.OBSERVADA;
        evidence = 'RBAC e permissões activos — origens externas não autenticadas não atingem esta camada';
        break;

      case 'INPUT_VAL':
        status = enumerationAlerts.length > 0 ? STATUS.ATUOU : STATUS.OBSERVADA;
        evidence = enumerationAlerts.length > 0
          ? `${enumerationAlerts.length} tentativa(s) de enumeração/injeção detectadas`
          : 'Validação de entradas activa — sem payload malicioso identificado desta origem';
        break;

      case 'INJECT_PROT':
        status = STATUS.OBSERVADA;
        evidence = 'Protecção contra injeção activa — telemetria de injeção SQL/NoSQL não disponível por origem';
        break;

      case 'TLS':
        status = infra.ssl?.valid ? STATUS.OBSERVADA : STATUS.SEM_TELEMETRIA;
        evidence = infra.ssl?.valid
          ? `TLS activo. Certificado válido até ${infra.ssl.expires_at?.slice(0, 10) || 'data indeterminada'}`
          : 'Estado do certificado TLS indeterminado';
        break;

      case 'TENANT_ISO':
        // N/A por escopo do painel (origem externa), não por ausência de RLS no produto.
        status = STATUS.NAO_APLICAVEL;
        evidence = 'RLS multi-tenant existe no produto (piloto) mas não se aplica à análise de origem externa não autenticada';
        break;

      case 'OBSERVATORY':
        // SEC-COVERAGE-001 (GAP-OBS-01): ATUOU exige flag activa E eventos desta origem
        if (infra.security_observatory && hasOriginEvents) {
          status = STATUS.ATUOU;
          evidence = 'SEC-01 Observatory activo — eventos desta origem ingeridos e classificados';
        } else if (infra.security_observatory) {
          status = STATUS.OBSERVADA;
          evidence = 'SEC-01 Observatory activo — sem eventos correlacionados a esta origem na janela';
        } else {
          status = STATUS.OBSERVADA;
          evidence = 'Observatory não activo neste ambiente';
        }
        break;

      case 'CORRELATION':
        status = STATUS.OBSERVADA;
        evidence = 'Motor de correlação SEC-02 activo — telemetria por origem não disponível individualmente';
        break;

      case 'BACKUP':
        // N/A por escopo do painel; backup imutável automático ainda não é pipeline de produção (ADR-018).
        status = STATUS.NAO_APLICAVEL;
        evidence = 'Backup não entra no drill-down de origem externa; pipeline automático imutável não é telemetria deste painel (ADR-018)';
        break;

      case 'INTEGRITY': {
        // INT-01D: Consumo do estado consolidado do Motor de Integridade.
        // A lógica de integridade pertence exclusivamente ao motor — zero recalculo aqui.
        const _intSensorEnabled = process.env.INTEGRITY_SENSOR_ENABLED === 'true';
        let _intState = null;
        if (_intSensorEnabled) {
          try {
            const _IntSS = require('./integrity/IntegrityStateStore');
            _intState = _IntSS.readStateFile();
          } catch { /* fallback abaixo */ }
        }

        const _intAvailable = !!(_intState && _intState.sensor_active && !_intState.stale && !_intState.error);

        if (_intAvailable) {
          if ((_intState.violations || 0) > 0) {
            status = STATUS.ATUOU;
            evidence = `Motor de Integridade: ${_intState.violations} violação(ões) detectada(s) — ${_intState.assets_monitored || 0} activos monitorados (baseline ${_intState.baseline_id || 'n/d'})`;
          } else if (_intState.mode === 'DEGRADED') {
            status = STATUS.SEM_TELEMETRIA;
            evidence = `Motor de Integridade em modo DEGRADED: ${_intState.last_error || 'recurso indisponível'}`;
          } else {
            status = STATUS.OBSERVADA;
            evidence = `Motor de Integridade activo — ${_intState.assets_monitored || 0} activos íntegros (baseline ${_intState.baseline_id || 'n/d'})`;
          }
        } else {
          // Fallback: proxy indirecto via fail2ban (mecanismo certificado preservado).
          status = fail2banActive ? STATUS.OBSERVADA : STATUS.SEM_TELEMETRIA;
          evidence = _intSensorEnabled
            ? 'Motor de Integridade: estado não disponível — usando telemetria proxy via threat-watch'
            : 'Monitoramento de integridade via threat-watch activo (sensor não activado)';
        }
        break;
      }

      case 'DB_PROTECT':
        status = STATUS.OBSERVADA;
        evidence = 'PostgreSQL com RLS em tabelas piloto — origens externas não autenticadas não atingem a camada de dados';
        break;

      case 'AUDIT':
        // SEC-COVERAGE-001 (GAP-AUD-01): ATUOU só quando há eventos desta origem registados
        if (hasOriginEvents) {
          status = STATUS.ATUOU;
          evidence = 'Eventos desta origem registados e auditados em admin_logs e threat-watch';
        } else {
          status = STATUS.OBSERVADA;
          evidence = 'Sistema de auditoria activo — sem eventos desta origem na janela de análise';
        }
        break;

      case 'INCIDENT':
        status = anyBlocked ? STATUS.ATUOU : STATUS.OBSERVADA;
        evidence = anyBlocked
          ? `${blockedIps.length} IP(s) bloqueados automaticamente por fail2ban/UFW`
          : 'Resposta automática preparada — nenhum banimento necessário desta origem';
        break;

      case 'GOVERNANCE':
        status = STATUS.OBSERVADA;
        evidence = 'Ciclo de governança SEC-01..SEC-21 activo — dados desta análise alimentam relatórios periódicos';
        break;

      default:
        status = STATUS.INDETERMINADO;
    }

    return { ...def, status, evidence };
  });
}

async function resolveCountryIntelligence(rawCode) {
  const cc = String(rawCode || '??')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z?]/g, '')
    .slice(0, 2) || '??';

  // Caminho crítico: snapshot canónico de evidência — sem score1000 / Phase C
  const evidence = await dashboardSvc.getSecurityEvidence(false);

  const mapPoint = (evidence.world_map?.points || []).find(
    (p) => p.country_code === cc
  );

  const countryLabel = getCountryLabel(cc, evidence);

  const attackOrigins = (evidence.attack_origins || []).filter((o) => o.country_code === cc);
  const blockedIps = (evidence.blocked_ips || []).filter((b) => b.country_code === cc);
  const rateLimitHits = (evidence.rate_limit_hits || []).filter((h) => h.country_code === cc);
  const recentAlertsAnalytical = (evidence.recent_alerts_analytical || []).filter((a) => a.country_code === cc);
  const recentAlertsDisplay = (evidence.recent_alerts_display || []).filter((a) => a.country_code === cc);
  const criticalEvents = (evidence.critical_events || []).filter((e) => e.country_code === cc);

  const indexDecomposition = buildIndexDecomposition(
    cc,
    evidence.attack_origins,
    evidence.blocked_ips,
    evidence.recent_alerts_analytical
  );

  const allIpSet = new Set([
    ...attackOrigins.map((o) => o.ip),
    ...blockedIps.map((b) => b.ip),
    ...recentAlertsAnalytical.map((a) => a.ip).filter(Boolean),
    ...criticalEvents.map((e) => e.ip).filter(Boolean)
  ]);

  const allAlerts = [...recentAlertsAnalytical, ...criticalEvents];

  const scanAlerts = allAlerts.filter((a) =>
    /HTTP_404_FLOOD|SCANNER_UA|HTTP_SCAN|INVASION_SENSITIVE_200/i.test(a.type || '')
  );
  const authAlerts = allAlerts.filter((a) =>
    /HTTP_CREDENTIAL_PROBE|AUTH_ATTEMPT|ADMIN_LOGIN_AFTER_FAILS|SSH_BRUTE/i.test(a.type || '')
  );
  const enumerationAlerts = allAlerts.filter((a) =>
    /HTTP_WRITE_ATTEMPT|ENUMERATION|MULTI_LAYER_BREACH/i.test(a.type || '')
  );

  // ── 4. Superfícies visadas ─────────────────────────────────────────────────
  const pathCounts = new Map();
  for (const e of allAlerts) {
    const path = extractPath(e.detail);
    if (path) pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
  }
  const targetedSurfaces = [...pathCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count, classification: 'OBSERVADO' }));

  // ── 5. Vetores de ataque ───────────────────────────────────────────────────
  const nginxSuspiciousHits = attackOrigins.reduce((s, o) => s + (o.count || 0), 0);

  const attackVectors = [
    {
      id: 'RECONHECIMENTO',
      label: 'Varredura / Reconhecimento',
      description: 'Probes de rotas, 404 em paths sensíveis, scanner UA',
      count: scanAlerts.length + (attackOrigins.filter((o) => o.count > 3).length),
      ips_count: new Set(scanAlerts.map((a) => a.ip).filter(Boolean)).size,
      classification: scanAlerts.length > 0 ? 'OBSERVADO' : (nginxSuspiciousHits > 0 ? 'INFERIDO' : 'NÃO_DETECTADO'),
      source: 'threat-watch / nginx',
      evidence_preview: scanAlerts.slice(0, 2).map((a) => a.detail || a.type)
    },
    {
      id: 'AUTENTICACAO',
      label: 'Tentativas de Autenticação',
      description: 'Credential stuffing, brute-force, login admin',
      count: authAlerts.length,
      ips_count: new Set(authAlerts.map((a) => a.ip).filter(Boolean)).size,
      classification: authAlerts.length > 0 ? 'OBSERVADO' : 'NÃO_DETECTADO',
      source: 'threat-watch / admin_logs',
      evidence_preview: authAlerts.slice(0, 2).map((a) => a.detail || a.type)
    },
    {
      id: 'EXPLORACAO',
      label: 'Exploração de Rotas',
      description: 'Write attempts, enumeração, path traversal',
      count: enumerationAlerts.length,
      ips_count: new Set(enumerationAlerts.map((a) => a.ip).filter(Boolean)).size,
      classification: enumerationAlerts.length > 0 ? 'OBSERVADO' : 'NÃO_DETECTADO',
      source: 'threat-watch',
      evidence_preview: enumerationAlerts.slice(0, 2).map((a) => a.detail || a.type)
    },
    {
      id: 'BLOQUEIO',
      label: 'Bloqueios Activos',
      description: 'IPs banidos por fail2ban / regras UFW aplicadas',
      count: blockedIps.length,
      ips_count: blockedIps.length,
      classification: blockedIps.length > 0 ? 'COMPROVADO' : 'NÃO_ACIONADO',
      source: 'fail2ban / ufw',
      evidence_preview: blockedIps.slice(0, 2).map((b) => `${b.ip} — ${b.source}: ${b.reason}`)
    },
    {
      id: 'IMPACTO',
      label: 'Tentativas de Impacto',
      description: 'Eventos críticos, tentativas de criação/alteração',
      count: criticalEvents.length,
      ips_count: new Set(criticalEvents.map((e) => e.ip).filter(Boolean)).size,
      classification: criticalEvents.length > 0 ? 'OBSERVADO' : 'NÃO_DETECTADO',
      source: 'threat-watch / critical-events',
      evidence_preview: criticalEvents.slice(0, 2).map((e) => e.detail || e.type)
    }
  ];

  // ── 6. Timeline ────────────────────────────────────────────────────────────
  const timeline = buildTimeline(recentAlertsDisplay, criticalEvents);

  const protectionLayers = buildProtectionLayers(evidence, {
    blockedIps, recentAlerts: recentAlertsAnalytical, criticalEvents,
    authAlerts, scanAlerts, enumerationAlerts, attackOrigins, rateLimitHits
  });

  // ── 8. Resultado e conclusão ───────────────────────────────────────────────
  const hasUncontainedCritical = criticalEvents.some(
    (e) => e.severity === 'CRITICAL' && !blockedIps.some((b) => b.ip === e.ip)
  );
  const allOriginIpsBlocked = attackOrigins.length > 0
    && attackOrigins.every((o) => blockedIps.some((b) => b.ip === o.ip));

  let resultLabel, resultColor;
  if (allIpSet.size === 0) {
    resultLabel = 'SEM EVENTOS DESTA ORIGEM NA JANELA ANALISADA';
    resultColor = 'cyan';
  } else if (hasUncontainedCritical) {
    resultLabel = 'AMEAÇA ACTIVA — INVESTIGAÇÃO NECESSÁRIA';
    resultColor = 'red';
  } else if (allOriginIpsBlocked) {
    resultLabel = 'AMEAÇA CONTIDA — SISTEMA OPERACIONAL';
    resultColor = 'green';
  } else {
    resultLabel = 'ACTIVIDADE MONITORADA — SEM COMPROMETIMENTO IDENTIFICADO NA TELEMETRIA';
    resultColor = 'amber';
  }

  // Conclusão determinística
  const conclusionParts = [];
  if (mapPoint) {
    conclusionParts.push(
      `Durante a janela analisada foram observados ${mapPoint.count} eventos ponderados associados a origens geolocalizadas: ${countryLabel} (${cc}).`
    );
    conclusionParts.push(
      `${mapPoint.unique_ips} IP(s) únicos identificados.`
    );
  } else if (allIpSet.size > 0) {
    conclusionParts.push(
      `Foram identificados ${allIpSet.size} IP(s) únicos associados à origem ${countryLabel} (${cc}).`
    );
  } else {
    conclusionParts.push(
      `Nenhum evento associado a ${countryLabel} (${cc}) foi encontrado na janela de análise atual.`
    );
  }
  if (blockedIps.length > 0) {
    const sources = [...new Set(blockedIps.map((b) => b.source))].join(' e ');
    conclusionParts.push(`${blockedIps.length} IP(s) bloqueado(s) automaticamente via ${sources}.`);
  }
  if (authAlerts.length > 0) {
    conclusionParts.push(`${authAlerts.length} tentativa(s) de autenticação detectadas e registadas.`);
  }
  if (!hasUncontainedCritical && allIpSet.size > 0) {
    conclusionParts.push(
      'Não foram identificadas alterações persistentes associadas a estas origens na telemetria correlacionada disponível.'
    );
  }

  // ── 9. Payload final ─────────────────────────────────────────────────────
  const generatedAt = new Date().toISOString();
  const evidenceAge = evidence.generated_at
    ? Math.round((Date.now() - new Date(evidence.generated_at).getTime()) / 1000)
    : null;

  return {
    schema_version: 'security_intelligence_v1',
    generated_at: generatedAt,
    snapshot_id: evidence.snapshot_id,
    evidence_cache_age_sec: evidenceAge,
    from_cache: !!evidence.from_cache,

    selection: {
      type: 'country',
      key: cc,
      label: countryLabel,
      is_unknown: cc === '??',
      is_local: cc === 'LO'
    },

    time_window: {
      nginx_lines_scanned: 4000,
      threat_lines_scanned: 3000,
      unit: 'linhas de log (não tempo fixo — depende do volume de tráfego)',
      note: 'Janela não possui duração temporal fixa: representa as últimas N linhas dos ficheiros de log. Volume de tráfego determina o intervalo real coberto.',
      polling_interval_sec: 30
    },

    summary: {
      total_weighted_events: mapPoint?.count ?? 0,
      unique_ips: mapPoint?.unique_ips ?? allIpSet.size,
      blocked_ips_count: blockedIps.length,
      nginx_suspicious_hits: nginxSuspiciousHits,
      threat_watch_alerts_in_index: recentAlertsAnalytical.length,
      threat_watch_alerts_displayed: recentAlertsDisplay.length,
      critical_events_count: criticalEvents.length,
      auth_attempts: authAlerts.length,
      index_decomposition: indexDecomposition,
      index_matches_badge: indexDecomposition.total === (mapPoint?.count ?? indexDecomposition.total),
      first_seen_ts: timeline[0]?.ts ?? null,
      last_seen_ts: timeline[timeline.length - 1]?.ts ?? null
    },

    attack_vectors: attackVectors,
    targeted_surfaces: targetedSurfaces,

    blocking_activity: {
      fail2ban: {
        count: blockedIps.filter((b) => b.source === 'fail2ban').length,
        ips: blockedIps.filter((b) => b.source === 'fail2ban').map((b) => b.ip)
      },
      ufw: {
        count: blockedIps.filter((b) => b.source === 'ufw').length,
        ips: blockedIps.filter((b) => b.source === 'ufw').map((b) => b.ip)
      },
      total: blockedIps.length
    },

    ips: {
      attack_origins: attackOrigins.map((o) => ({
        ip: o.ip,
        count: o.count,
        isp: o.isp || null,
        is_proxy: o.is_proxy || false
      })),
      blocked: blockedIps.map((b) => ({
        ip: b.ip,
        source: b.source,
        reason: b.reason || b.source
      })),
      alerted: [...new Set(allAlerts.map((a) => a.ip).filter(Boolean))].slice(0, 15)
    },

    timeline,

    protection_layers: protectionLayers,

    // Para origens desconhecidas (??), decomposição semântica explícita por estado GeoIP.
    // Após 001C: cada IP recebe classificação real (GEO_INVALID / GEO_UNRESOLVED / GEO_NOT_ENRICHED).
    unknown_origin_analysis: cc === '??' ? (() => {
      // Construir mapa ip→{count, geo_state} consolidando todas as fontes ??
      const ipInfoMap = new Map();
      const addIp = (ip, cnt, gs) => {
        if (!ip) return;
        const prev = ipInfoMap.get(ip) || { count: 0, geo_state: gs };
        // geo_state mais informativa prevalece: INVALID > UNRESOLVED > NOT_ENRICHED
        const rank = { GEO_INVALID: 3, GEO_UNRESOLVED: 2, GEO_NOT_ENRICHED: 1 };
        const finalState = (rank[gs] || 0) >= (rank[prev.geo_state] || 0) ? gs : prev.geo_state;
        ipInfoMap.set(ip, { count: prev.count + cnt, geo_state: finalState });
      };

      const allSources = [
        ...attackOrigins.map(o  => ({ ip: o.ip, cnt: o.count || 1, gs: o.geo_state || dashboardSvc.getGeoState(o.ip) })),
        ...recentAlertsAnalytical.map(a   => ({ ip: a.ip, cnt: 1,            gs: a.geo_state || dashboardSvc.getGeoState(a.ip) })),
        ...criticalEvents.map(e => ({ ip: e.ip, cnt: 1,            gs: e.geo_state || dashboardSvc.getGeoState(e.ip) })),
        ...blockedIps.map(b     => ({ ip: b.ip, cnt: 2,            gs: b.geo_state || dashboardSvc.getGeoState(b.ip) })),
      ];
      for (const { ip, cnt, gs } of allSources) addIp(ip, cnt, gs);

      // Decompor por estado semântico
      let nInvalid = 0, nUnresolved = 0, nNotEnriched = 0;
      const sampleIps = [];
      for (const [ip, { count, geo_state }] of [...ipInfoMap.entries()].sort((a,b) => b[1].count - a[1].count)) {
        if (geo_state === 'GEO_INVALID')      nInvalid++;
        else if (geo_state === 'GEO_UNRESOLVED') nUnresolved++;
        else nNotEnriched++;
        if (sampleIps.length < 6) sampleIps.push({ ip, count, geo_state });
      }

      return {
        // Decomposição semântica explícita — distingue causa real de cada IP
        semantic_breakdown: {
          GEO_INVALID:      { count: nInvalid,     description: 'IP inválido ou malformado no log' },
          GEO_UNRESOLVED:   { count: nUnresolved,  description: 'GeoIP consultado — sem resultado do provider (timeout/rate-limit/IP reservado)' },
          GEO_NOT_ENRICHED: { count: nNotEnriched, description: 'IP válido — não consultado por limite operacional do ciclo de enriquecimento' }
        },
        total_unresolved_ips: ipInfoMap.size,
        sample_ips: sampleIps   // inclui geo_state individual por IP
      };
    })() : null,

    provenance: {
      sources: ['nginx_access_log', 'threat_watch_log', 'fail2ban', 'ufw', 'admin_logs'],
      geo_provider: 'ip-api.com (cache em memória; TTL 24h resolvidos / 5min falhas)',
      geo_enrichment: {
        mode: 'async_decoupled',
        budget_per_cycle: 30,
        max_concurrency: 5,
        strategy: 'Snapshot imediato com geoCache conhecido; backlog resolvido assincronamente entre snapshots (001H)'
      },
      classification: 'OBSERVADO',
      confidence: allIpSet.size > 3 ? 'MÉDIO' : allIpSet.size > 0 ? 'BAIXO' : 'INDETERMINADO',
      limitations: [
        'Janela temporal não fixa (linhas de log, não segundos)',
        'Top 15 IPs suspeitos (nginx) e top 25 IPs bloqueados (fail2ban/UFW) incluídos no enriquecimento',
        'População analítica de alertas: até 80 itens no índice; apresentação detalhada limitada a 20',
        'Telemetria de rate-limit por origem não disponível',
        'Timestamps de hits nginx individuais não disponíveis no nível de agregação'
      ]
    },

    evidence_build: evidence.evidence_build || null,

    result: {
      label: resultLabel,
      color: resultColor
    },

    conclusion: conclusionParts.join(' ')
  };
}

module.exports = { resolveCountryIntelligence };
