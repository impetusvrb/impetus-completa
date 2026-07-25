/** Derivações visuais SOC — apenas campos reais do payload certificado. */

export function fmt(n) {
  if (n == null || (typeof n === 'number' && Number.isNaN(n))) return '—';
  if (typeof n === 'number') return n.toLocaleString('pt-BR');
  return String(n);
}

export function buildTopMetrics(data) {
  const score = data?.security_score;
  const wm = data?.phase_b?.world_map;
  const points = (wm?.points || []).filter((p) => p.country_code !== '??');
  const origins = data?.attack_origins || [];

  const uniqueOriginIps = new Set(origins.map((o) => o.ip).filter(Boolean)).size;

  return {
    securityIndex: {
      value: score?.total ?? null,
      suffix: '/1000',
      context: score?.pct != null ? `${score.pct}% maturidade` : null,
      field: 'security_score.total + pct',
      gap: score?.total == null,
    },
    weightedEvents: {
      value: wm?.total_events ?? null,
      context: wm?.total_countries != null ? `${wm.total_countries} territórios indexados` : null,
      field: 'phase_b.world_map.total_events',
      gap: wm?.total_events == null,
    },
    activeOrigins: {
      value: uniqueOriginIps > 0 ? uniqueOriginIps : origins.length || null,
      context: origins.length > 0 ? `${origins.length} registos de origem` : null,
      field: 'attack_origins (IPs únicos)',
      gap: origins.length === 0 && uniqueOriginIps === 0,
    },
    impactedCountries: {
      value: points.length || null,
      context: points.length > 0 ? 'excl. origem ??' : null,
      field: 'phase_b.world_map.points (excl. ??)',
      gap: points.length === 0,
    },
    criticalAlerts: {
      value: data?.summary?.critical_open ?? null,
      context: data?.summary?.alerts_24h != null
        ? `${data.summary.alerts_24h} alertas 24h`
        : null,
      field: 'summary.critical_open',
      gap: data?.summary?.critical_open == null,
    },
  };
}

/** Réplica client-side de buildIndexDecomposition — mesma semântica do badge. */
export function buildIndexDecomposition(cc, attackOrigins, blockedIps, alertsAnalytical) {
  const code = cc || '??';
  const nginxWeight = (attackOrigins || [])
    .filter((o) => o.country_code === code)
    .reduce((s, o) => s + (o.count || 1), 0);
  const blockedWeight = (blockedIps || [])
    .filter((b) => b.country_code === code)
    .length * 2;
  const alertsWeight = (alertsAnalytical || [])
    .filter((a) => a.country_code === code)
    .length;
  return {
    nginx_hits_x1: nginxWeight,
    blocked_ips_x2: blockedWeight,
    threat_alerts_x1: alertsWeight,
    total: nginxWeight + blockedWeight + alertsWeight,
  };
}

export function buildGlobalIndexDecomposition(data) {
  const origins = data?.attack_origins || [];
  const blocked = data?.blocked_ips || [];
  const alerts = data?.recent_alerts || [];
  const nginxWeight = origins.reduce((s, o) => s + (o.count || 1), 0);
  const blockedWeight = blocked.length * 2;
  const alertsWeight = alerts.length;
  return {
    nginx_hits_x1: nginxWeight,
    blocked_ips_x2: blockedWeight,
    threat_alerts_x1: alertsWeight,
    total: nginxWeight + blockedWeight + alertsWeight,
  };
}

export function topOriginsFromMap(points, limit = 7) {
  return (points || [])
    .filter((p) => p.country_code !== '??')
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((p, i) => ({
      rank: i + 1,
      country_code: p.country_code,
      country: p.country,
      count: p.count,
    }));
}

export function eventsByType(baseline) {
  const rows = baseline?.alerts_24h_by_type || [];
  const total = rows.reduce((s, r) => s + (r.count || 0), 0);
  return rows
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((r) => ({
      type: r.type,
      count: r.count,
      pct: total > 0 ? Math.round((r.count / total) * 100) : 0,
    }));
}

export function severityBreakdown(criticalEvents) {
  const buckets = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const e of criticalEvents || []) {
    const sev = String(e.severity || 'MEDIUM').toUpperCase();
    if (buckets[sev] != null) buckets[sev] += 1;
    else buckets.MEDIUM += 1;
  }
  const total = Object.values(buckets).reduce((s, n) => s + n, 0);
  return { buckets, total };
}
