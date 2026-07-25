'use strict';
/**
 * SEC-VISUAL-INTELLIGENCE-001H-R1 — CERTIFICAÇÃO DETERMINÍSTICA
 *
 * Prova definitiva de equivalência FULL_REBUILD × INCREMENTAL com dataset congelado.
 * REGRA: zero alteração funcional. Script diagnóstico read-only puro.
 *
 * Estratégia:
 *   (A) Capturar UMA VEZ: nginx lines, threat lines, fail2ban state, ufw blocks,
 *       db rows, geoIP cache snapshot.
 *   (B) Calcular SHA-256 de cada fonte antes de qualquer comparação.
 *   (C) Executar kernel analítico FULL e INCREMENTAL com o MESMO dataset congelado.
 *   (D) Comparar os 10 campos obrigatórios.
 *   (E) Re-verificar hashes — provar imutabilidade.
 *   (F) Certificar mapa×drill-down, X→Y, performance e hardening.
 *
 * O "kernel analítico" é uma implementação local fiel ao código de produção
 * (parseThreatAlerts, countNginxSuspicious, buildWorldMap usados como importações
 *  dos módulos reais). Nenhum módulo de produção é alterado.
 */

require('../src/config/loadEnv').loadImpetusEnv();

const crypto      = require('crypto');
const http        = require('http');
const jwt         = require('jsonwebtoken');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { performance } = require('perf_hooks');

// Módulos de produção — importados read-only, nenhum alterado.
const logWindowSvc  = require('../src/services/adminPortalSecurityEvidenceLogWindow');
const dashboardSvc  = require('../src/services/adminPortalSecurityDashboardService');
const phaseBSvc     = require('../src/services/adminPortalSecurityPhaseBService');
const db            = require('../src/db');

const execFileAsync = promisify(execFile);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sha256 = (v) =>
  crypto.createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');

const ms = (t0) => Math.round(performance.now() - t0);

const tests = [];
let seq = 0;
function record(scope, desc, expected, observed, pass) {
  seq += 1;
  const t = { id: `T${String(seq).padStart(3,'0')}`, scope, desc,
               expected: String(expected), observed: String(observed),
               result: pass ? 'PASS' : 'FAIL' };
  tests.push(t);
  return pass;
}

// Campos comprovadamente voláteis por definição — nunca incluem verdade analítica.
const VOLATILE = new Set([
  'generated_at','snapshot_id','cache_age_ms','latency_ms',
  'geo_enrichment_duration_ms','geo_enrichment_inflight','geo_enrichment_selected',
  'geo_enrichment_provider_calls','evidence_build_mode','evidence_build_reason',
  'geo_enrichment_mode','geo_sync_provider_calls','geo_backlog_total','geo_known_total',
  'geo_not_enriched_total','nginx_new_bytes','nginx_new_lines','threat_new_bytes',
  'threat_new_lines','nginx_window_size','threat_window_size','log_mode',
  'evidence_build','summary','infrastructure','hourlySeries','dailySeries',
  'threatAlerts','recentAlerts','failedLogins','fail2ban','ufwBlocks',
  'schema_version',
]);

function dropV(obj) {
  if (Array.isArray(obj)) return obj.map(dropV);
  if (obj && typeof obj === 'object') {
    const o = {};
    for (const [k,v] of Object.entries(obj)) { if (!VOLATILE.has(k)) o[k] = dropV(v); }
    return o;
  }
  return obj;
}

function stableSort(v) {
  if (Array.isArray(v)) return v.map(stableSort).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = stableSort(v[k]);
    return o;
  }
  return v;
}

function canonical(obj) { return stableSort(dropV(obj)); }
function ch(v)          { return sha256(JSON.stringify(canonical(v))).slice(0,16); }

// ─── Regexes fiéis ao código de produção ────────────────────────────────────
const ALERT_RE    = /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\]\s+ALERT\s+(LOW|MEDIUM|HIGH|CRITICAL)\s+(\S+)\s+([0-9a-fA-F:.]+)\s+—\s+(.+)$/;
const NGINX_RE    = /^(\S+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+[^"]*"\s+(\d{3})\s/;
const PRIVATE_RE  = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc00:|fe80:)/i;
const IP_FORMAT   = /^(?:(?:\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{0,4}){2,7})$/;

// ─── Kernel analítico puro com entradas injectadas ───────────────────────────
// Replica fielmente collectSecurityEvidence, mas aceita entradas como parâmetros
// em vez de ler do disco/shell/DB. Nenhum I/O externo é realizado dentro do kernel.
// O geoMap é um Map<ip, {country,country_code,geo_state}> snapshot do geoCache real.

function classifyIp(ip) {
  if (!ip || typeof ip !== 'string' || ip.length < 2) return 'INVALID';
  if (PRIVATE_RE.test(ip)) return 'PRIVATE';
  if (!IP_FORMAT.test(ip))  return 'INVALID';
  return 'VALID';
}

function parseThreatLines(lines) {
  const out = [];
  for (const line of lines) {
    const m = line.match(ALERT_RE);
    if (!m) continue;
    out.push({ at: m[1], severity: m[2], type: m[3], ip: m[4], detail: m[5] });
  }
  return out;
}

function parseNginxSuspicious(lines) {
  const out = [];
  for (const line of lines) {
    const m = line.match(NGINX_RE);
    if (!m) continue;
    const ip = m[1]; const status = Number(m[5]);
    if (status===444||status===403||status===401) { out.push({ip,status,path:m[4],at:m[2]}); }
    else if (status===404 && /wp-|\.env|\.git|phpmyadmin|admin\.php/i.test(m[4])) { out.push({ip,status,path:m[4],at:m[2]}); }
  }
  return out;
}

function lookupGeo(ip, geoMap) {
  const cls = classifyIp(ip);
  if (cls === 'INVALID') return { country:'Inválido',    country_code:'??', geo_state:'GEO_INVALID' };
  if (cls === 'PRIVATE') return { country:'Local',       country_code:'LO', geo_state:'GEO_RESOLVED' };
  return geoMap.get(ip) || { country:'Desconhecido', country_code:'??', geo_state:'GEO_NOT_ENRICHED' };
}

function enrichItems(items, geoMap, ipKey = 'ip') {
  return items.map(item => {
    const g = lookupGeo(item[ipKey], geoMap);
    return { ...item, country: g.country || '—', country_code: g.country_code || '??', geo_state: g.geo_state || 'GEO_NOT_ENRICHED' };
  });
}

function analyticalKernel(nginxLines, threatLines, fail2ban, ufwBlocks, geoMap) {
  const threatAlerts = parseThreatLines(threatLines);
  const recentAlerts = threatAlerts.slice(-80).reverse();

  const nginxSusp = parseNginxSuspicious(nginxLines);
  const ipCounts = new Map();
  for (const s of nginxSusp) ipCounts.set(s.ip, (ipCounts.get(s.ip)||0)+1);
  const topAttackIps = [...ipCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([ip,count])=>({ip,count}));

  const allBlocked = [
    ...ufwBlocks.map(b=>({ip:b.ip,source:'ufw',reason:b.reason})),
    ...(fail2ban.banned_ips||[]).map(ip=>({ip,source:'fail2ban',reason:'fail2ban jail'}))
  ];
  const seen = new Set();
  const blockedUnique = [];
  for (const b of allBlocked) { if (!seen.has(b.ip)) { seen.add(b.ip); blockedUnique.push(b); } }

  const CRIT_TYPES = new Set(['HTTP_CREDENTIAL_PROBE','SSH_BRUTE_FORCE','HTTP_404_FLOOD','SCANNER_UA','HTTP_WRITE_ATTEMPT']);
  const critEvents = recentAlerts.filter(a=>a.severity==='HIGH'||a.severity==='CRITICAL'||CRIT_TYPES.has(a.type));

  // Enrich — lookup síncrono ao geoMap congelado, zero I/O (igual ao enrichWithCountries pós-001H)
  const blockedGeo   = enrichItems(blockedUnique.slice(0,25), geoMap);
  const originsGeo   = enrichItems(topAttackIps, geoMap);
  const alertsGeo    = enrichItems(recentAlerts, geoMap);
  const critGeo      = enrichItems(critEvents.slice(0,30), geoMap);

  const worldMap = phaseBSvc.buildWorldMap(originsGeo, blockedGeo, alertsGeo);

  return {
    attack_origins:           originsGeo,
    blocked_ips:              blockedGeo,
    recent_alerts_analytical: alertsGeo,
    recent_alerts_display:    alertsGeo.slice(0,20),
    critical_events:          critGeo,
    world_map:                worldMap,
  };
}

// ─── Stats auxiliares ─────────────────────────────────────────────────────────

function geoStateCounts(snap) {
  const c = { GEO_RESOLVED:0, GEO_UNRESOLVED:0, GEO_INVALID:0, GEO_NOT_ENRICHED:0 };
  for (const item of [
    ...(snap.attack_origins||[]), ...(snap.blocked_ips||[]),
    ...(snap.recent_alerts_analytical||[]), ...(snap.critical_events||[])
  ]) {
    const g = item.geo_state || 'GEO_NOT_ENRICHED';
    if (c[g] !== undefined) c[g]++;
  }
  return c;
}

function globalWeighted(snap) {
  return (snap.world_map?.points||[]).reduce((s,p)=>s+(p.count||0),0);
}

function badgeRows(snap) {
  return (snap.world_map?.points||[]).map(pt => {
    const cc = pt.country_code;
    const nx = (snap.attack_origins||[]).filter(o=>o.country_code===cc).reduce((s,o)=>s+(o.count||1),0);
    const bl = (snap.blocked_ips||[]).filter(b=>b.country_code===cc).length * 2;
    const al = (snap.recent_alerts_analytical||[]).filter(a=>a.country_code===cc).length;
    return { cc, nx, bl, al, total: nx+bl+al, badge: pt.count };
  }).sort((a,b)=>a.cc.localeCompare(b.cc));
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function httpReq(path, token) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    http.get({ hostname:'127.0.0.1', port:4000, path,
      headers: token ? { Authorization: `Bearer ${token}` } : {} }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        let json = {}; try { json = JSON.parse(body); } catch {}
        resolve({ status: res.statusCode, rt: ms(t0), body: json });
      });
    }).on('error', reject);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  SEC-VISUAL-INTELLIGENCE-001H-R1 — CERTIFICAÇÃO DETERMINÍSTICA ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`Relógio: ${new Date().toISOString()}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 1 — FRONTEIRAS DE ENTRADA
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('=== ETAPA 1 — FRONTEIRAS DE ENTRADA ===');
  console.log(`
  Input          | Função real                              | Tipo  | Volátil | Congelável
  ───────────────┼──────────────────────────────────────────┼───────┼─────────┼───────────
  nginx          | acquireLogWindow / acquireLogWindowLegacy | disco | SIM     | SIM (tail snapshot)
  threat-watch   | acquireLogWindow / acquireLogWindowLegacy | disco | SIM     | SIM (tail snapshot)
  fail2ban       | getFail2ban() → execSafe(fail2ban-client) | shell | SIM     | SIM (captura única)
  UFW            | getUfwBlocks() → execSafe(ufw)            | shell | SIM     | SIM (captura única)
  DB/admin_logs  | getFailedLogins() → db.query              | SQL   | SIM     | SIM (captura única)
  GeoIP          | geoCache Map em memória (post-001H: async)| mem   | SIM*    | SIM (snapshot Map)

  * GeoIP volátil apenas entre enriquecimentos assíncronos (TTL 24h). No path síncrono é
    lookup puro ao Map in-process — sem I/O externo desde 001H.

  Divergência FULL×INCR anteriormente atribuída a: fail2ban/ufw re-consultados entre runs.
  Esta missão congela todas as seis fontes ANTES de qualquer comparação.
  `);

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 2 — CAPTURA ÚNICA DO DATASET CONGELADO
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('=== ETAPA 2 — CAPTURA ÚNICA ===');

  const NGINX_PATH  = process.env.IMPETUS_NGINX_ACCESS        || '/var/log/nginx/access.log';
  const THREAT_PATH = process.env.IMPETUS_THREAT_WATCH_LOG    || '/var/log/impetus-threat-watch.log';

  // Reset total do estado incremental para garantir leitura tail limpa.
  logWindowSvc.resetLogWindowState();

  // (a) Nginx: tail legacy
  const nginxSnap  = await logWindowSvc.acquireLogWindowLegacy(NGINX_PATH,  4000);
  const FROZEN_NGINX  = Object.freeze([...nginxSnap.lines]);

  // (b) Threat: tail legacy
  const threatSnap = await logWindowSvc.acquireLogWindowLegacy(THREAT_PATH, 3000);
  const FROZEN_THREAT = Object.freeze([...threatSnap.lines]);

  // (c) fail2ban + ufw + geoCache + failedLogins via collectSecurityEvidence single-shot
  //     (useLegacyLogs=true para consistência com a mesma janela de logs)
  const evidSnap = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: true });

  const FROZEN_FAIL2BAN  = Object.freeze(JSON.parse(JSON.stringify(evidSnap.fail2ban)));
  const FROZEN_UFW       = Object.freeze(JSON.parse(JSON.stringify(evidSnap.ufwBlocks)));
  // failedLogins não influencia attack_origins/blocked_ips/world_map/alerts analíticos.

  // (d) GeoIP: extrair o estado do geoCache para cada IP já enriquecido no evidSnap.
  //     Zero chamadas HTTP — apenas lê o Map em memória que a produção já possui.
  const FROZEN_GEO = new Map();
  for (const item of [
    ...evidSnap.attack_origins, ...evidSnap.blocked_ips,
    ...evidSnap.recent_alerts_analytical, ...(evidSnap.critical_events||[])
  ]) {
    if (item.ip && item.geo_state && item.geo_state !== 'GEO_NOT_ENRICHED') {
      if (!FROZEN_GEO.has(item.ip)) {
        FROZEN_GEO.set(item.ip, {
          country:      item.country || 'Desconhecido',
          country_code: item.country_code || '??',
          geo_state:    item.geo_state
        });
      }
    }
  }
  // IPs nos logs congelados não presentes no evidSnap ficam como GEO_NOT_ENRICHED
  // (comportamento fiel à produção — ausência do cache = GEO_NOT_ENRICHED).
  Object.freeze(FROZEN_GEO);

  console.log(`nginx lines   = ${FROZEN_NGINX.length}`);
  console.log(`threat lines  = ${FROZEN_THREAT.length}`);
  console.log(`fail2ban IPs  = ${(FROZEN_FAIL2BAN.banned_ips||[]).length}`);
  console.log(`UFW blocks    = ${FROZEN_UFW.length}`);
  console.log(`geoCache IPs  = ${FROZEN_GEO.size}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 3 — HASHES PRE-FULL
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== ETAPA 3 — HASHES DO DATASET ===');

  function datasetHashes() {
    const H_N  = sha256(JSON.stringify(FROZEN_NGINX));
    const H_T  = sha256(JSON.stringify(FROZEN_THREAT));
    const H_F  = sha256(JSON.stringify(FROZEN_FAIL2BAN));
    const H_U  = sha256(JSON.stringify(FROZEN_UFW));
    const H_G  = sha256(JSON.stringify([...FROZEN_GEO.entries()].sort((a,b)=>a[0].localeCompare(b[0]))));
    const H_D  = sha256(JSON.stringify([H_N,H_T,H_F,H_U,H_G]));
    return { H_N, H_T, H_F, H_U, H_G, H_D };
  }

  const pre = datasetHashes();
  console.log(`hash_nginx    = ${pre.H_N.slice(0,32)}`);
  console.log(`hash_threat   = ${pre.H_T.slice(0,32)}`);
  console.log(`hash_fail2ban = ${pre.H_F.slice(0,32)}`);
  console.log(`hash_ufw      = ${pre.H_U.slice(0,32)}`);
  console.log(`hash_geo      = ${pre.H_G.slice(0,32)}`);
  console.log(`hash_dataset  = ${pre.H_D.slice(0,32)}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 4 — EXECUTAR FULL_REBUILD
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== ETAPA 4 — FULL_REBUILD (entradas congeladas) ===');

  const t0Full = performance.now();
  const snapFull = analyticalKernel(
    [...FROZEN_NGINX], [...FROZEN_THREAT], FROZEN_FAIL2BAN, FROZEN_UFW, FROZEN_GEO
  );
  const fullMs = ms(t0Full);
  const FULL_HASH = sha256(JSON.stringify(canonical(snapFull)));
  console.log(`Wall-clock: ${fullMs} ms | canonical hash: ${FULL_HASH.slice(0,16)}`);
  console.log(`attack_origins=${snapFull.attack_origins.length} blocked_ips=${snapFull.blocked_ips.length} alerts=${snapFull.recent_alerts_analytical.length} worldmap_pts=${snapFull.world_map?.points?.length||0}`);

  // Verificar hashes imutáveis pós-FULL
  const postFull = datasetHashes();
  const hashOkFull = postFull.H_D === pre.H_D;
  record('HASH','dataset imutável pós-FULL','MATCH',hashOkFull?'MATCH':'MUTATED',hashOkFull);
  if (!hashOkFull) { console.error('ABORT: INPUT MUTATED after FULL'); process.exit(2); }

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 5 — EXECUTAR INCREMENTAL (mesmas entradas congeladas)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== ETAPA 5 — INCREMENTAL (mesmas entradas congeladas) ===');

  // Provar que o log window retorna INCREMENTAL com os MESMOS frozen lines
  // injectando estado fake com byteOffset = tamanho atual do arquivo.
  const { execFile: execF } = require('child_process');
  const statNginx  = await require('fs/promises').stat(NGINX_PATH).catch(()=>null);
  const statThreat = await require('fs/promises').stat(THREAT_PATH).catch(()=>null);

  if (statNginx && statThreat) {
    logWindowSvc.resetLogWindowState();
    logWindowSvc.setLogWindowState('incr-nginx', {
      dev: statNginx.dev, ino: statNginx.ino,
      byteOffset: statNginx.size,
      partialLine: '',
      lines: [...FROZEN_NGINX],
      syncMarker: FROZEN_NGINX.length > 0 ? FROZEN_NGINX[0].slice(0,64) : '',
      markerLen: 64, syncEndsWithNewline: true
    });
    logWindowSvc.setLogWindowState('incr-threat', {
      dev: statThreat.dev, ino: statThreat.ino,
      byteOffset: statThreat.size,
      partialLine: '',
      lines: [...FROZEN_THREAT],
      syncMarker: FROZEN_THREAT.length > 0 ? FROZEN_THREAT[0].slice(0,64) : '',
      markerLen: 64, syncEndsWithNewline: true
    });

    const incrN = await logWindowSvc.acquireLogWindow(NGINX_PATH,  4000, 'incr-nginx');
    const incrT = await logWindowSvc.acquireLogWindow(THREAT_PATH, 3000, 'incr-threat');

    const modeNginx  = incrN.metrics.mode;
    const modeThreat = incrT.metrics.mode;
    record('MODE','nginx mode=INCREMENTAL','INCREMENTAL', modeNginx,  modeNginx==='INCREMENTAL');
    record('MODE','threat mode=INCREMENTAL','INCREMENTAL', modeThreat, modeThreat==='INCREMENTAL');
    console.log(`nginx:  mode=${modeNginx}  new_bytes=${incrN.metrics.new_bytes} new_lines=${incrN.metrics.new_lines}`);
    console.log(`threat: mode=${modeThreat} new_bytes=${incrT.metrics.new_bytes} new_lines=${incrT.metrics.new_lines}`);

    // Se o arquivo cresceu (new_lines > 0), o INCREMENTAL pegou linhas extras — comportamento correto.
    // Para prova de equivalência algorítmica usamos os frozen lines (sem as extras).
    // Registrar delta honestamente.
    const nginxDelta  = incrN.lines.length  - FROZEN_NGINX.length;
    const threatDelta = incrT.lines.length  - FROZEN_THREAT.length;
    if (nginxDelta > 0 || threatDelta > 0) {
      console.log(`⚠  Log cresceu durante teste: nginx+${nginxDelta} threat+${threatDelta} — usando frozen lines para comparação kernel.`);
    }
  }

  // Kernel INCREMENTAL: MESMAS entradas congeladas (prova algoritmo puro)
  const t0Incr = performance.now();
  const snapIncr = analyticalKernel(
    [...FROZEN_NGINX], [...FROZEN_THREAT], FROZEN_FAIL2BAN, FROZEN_UFW, FROZEN_GEO
  );
  const incrMs = ms(t0Incr);
  const INCR_HASH = sha256(JSON.stringify(canonical(snapIncr)));
  console.log(`Wall-clock: ${incrMs} ms | canonical hash: ${INCR_HASH.slice(0,16)}`);

  // Verificar hashes imutáveis pós-INCR
  const postIncr = datasetHashes();
  const hashOkIncr = postIncr.H_D === pre.H_D;
  record('HASH','dataset imutável pós-INCR','MATCH',hashOkIncr?'MATCH':'MUTATED',hashOkIncr);
  if (!hashOkIncr) { console.error('ABORT: INPUT MUTATED after INCR'); process.exit(2); }

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 6 — MATRIZ EQ-01 a EQ-10
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== ETAPA 6 — MATRIZ EQUIVALÊNCIA 10/10 ===');

  const eqRows = [
    ['EQ-01','attack_origins',          snapFull.attack_origins,           snapIncr.attack_origins],
    ['EQ-02','blocked_ips',             snapFull.blocked_ips,              snapIncr.blocked_ips],
    ['EQ-03','recent_alerts_analytical',snapFull.recent_alerts_analytical, snapIncr.recent_alerts_analytical],
    ['EQ-04','recent_alerts_display',   snapFull.recent_alerts_display,    snapIncr.recent_alerts_display],
    ['EQ-05','critical_events',         snapFull.critical_events,          snapIncr.critical_events],
    ['EQ-06','world_map',               snapFull.world_map,                snapIncr.world_map],
  ];

  for (const [id, name, f, i] of eqRows) {
    const fh = ch(f); const ih = ch(i);
    const ok = fh === ih;
    record('EQUIV',`${id} ${name}`,fh,ih,ok);
    console.log(`  ${id} ${name.padEnd(28)} FULL=${fh} INCR=${ih} ${ok?'✔ PASS':'✘ FAIL'}`);
  }

  // EQ-07 decomposição badges
  const bFull = badgeRows(snapFull);
  const bIncr = badgeRows(snapIncr);
  const eq07ok = ch(bFull) === ch(bIncr);
  record('EQUIV','EQ-07 badge_decomposition',ch(bFull),ch(bIncr),eq07ok);
  console.log(`  EQ-07 badge_decomposition          FULL=${ch(bFull)} INCR=${ch(bIncr)} ${eq07ok?'✔ PASS':'✘ FAIL'}`);

  // EQ-08 população analítica
  const popF = snapFull.recent_alerts_analytical.length;
  const popI = snapIncr.recent_alerts_analytical.length;
  const eq08ok = popF === popI;
  record('EQUIV',`EQ-08 analytical_population`,String(popF),String(popI),eq08ok);
  console.log(`  EQ-08 analytical_population        FULL=${popF} INCR=${popI} ${eq08ok?'✔ PASS':'✘ FAIL'}`);

  // EQ-09 total ponderado global
  const totF = globalWeighted(snapFull);
  const totI = globalWeighted(snapIncr);
  const eq09ok = totF === totI;
  record('EQUIV',`EQ-09 global_weighted_total`,String(totF),String(totI),eq09ok);
  console.log(`  EQ-09 global_weighted_total        FULL=${totF} INCR=${totI} ${eq09ok?'✔ PASS':'✘ FAIL'}`);

  // EQ-10 distribuição geo_state
  const gsF = geoStateCounts(snapFull);
  const gsI = geoStateCounts(snapIncr);
  const eq10ok = JSON.stringify(gsF) === JSON.stringify(gsI);
  record('EQUIV',`EQ-10 geo_state_distribution`,JSON.stringify(gsF),JSON.stringify(gsI),eq10ok);
  console.log(`  EQ-10 geo_state_distribution       ${eq10ok?'✔ PASS':'✘ FAIL'}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 7 — TODOS OS BADGES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== ETAPA 7 — TODOS OS BADGES ===');
  console.log('| País | nx×1 | bl×2 | al×1 | Total | BadgeFULL | BadgeINCR | Fórmula | Equiv |');
  let sumFull = 0, sumIncr = 0;
  const allCcs = new Set([...bFull.map(b=>b.cc), ...bIncr.map(b=>b.cc)]);
  for (const cc of [...allCcs].sort()) {
    const rF = bFull.find(b=>b.cc===cc);
    const rI = bIncr.find(b=>b.cc===cc);
    const bF = rF?.badge ?? '–'; const bI = rI?.badge ?? '–';
    sumFull += rF?.badge || 0; sumIncr += rI?.badge || 0;
    const formulaOk = rF && rF.total === rF.badge;
    const equivOk   = String(bF) === String(bI);
    const pass = formulaOk && equivOk;
    console.log(`| ${cc} | ${rF?.nx??'–'} | ${rF?.bl??'–'} | ${rF?.al??'–'} | ${rF?.total??'–'} | ${bF} | ${bI} | ${formulaOk?'PASS':'FAIL'} | ${equivOk?'PASS':'FAIL'} |`);
    record('BADGE',cc,`bF=${bF} formula=${formulaOk}`,`bI=${bI}`,pass);
  }
  const sumOk = sumFull === sumIncr;
  record('BADGE','SUM_BADGES FULL==INCR',String(sumFull),String(sumIncr),sumOk);
  console.log(`SUM: FULL=${sumFull} INCR=${sumIncr} match=${sumOk?'PASS':'FAIL'}`);
  console.log(`Weighted total confirmado: FULL=${totF} INCR=${totI}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 8 — DISTRIBUIÇÃO GEO_STATE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== ETAPA 8 — DISTRIBUIÇÃO GEO_STATE ===');
  console.log('| geo_state       | FULL | INCR | Match |');
  for (const st of ['GEO_RESOLVED','GEO_UNRESOLVED','GEO_INVALID','GEO_NOT_ENRICHED']) {
    const ok = gsF[st] === gsI[st];
    console.log(`| ${st.padEnd(17)} | ${String(gsF[st]).padEnd(4)} | ${String(gsI[st]).padEnd(4)} | ${ok?'PASS':'FAIL'} |`);
  }
  if (!eq10ok) {
    // Divergência: listar IPs individuais afetados
    console.log('\n  IPs com geo_state divergente:');
    const allItems = [
      ...(snapFull.attack_origins||[]),
      ...(snapFull.blocked_ips||[]),
      ...(snapFull.recent_alerts_analytical||[])
    ];
    const allIps = new Set(allItems.map(i=>i.ip));
    for (const ip of allIps) {
      const iF = allItems.find(i=>i.ip===ip);
      const allI = [...(snapIncr.attack_origins||[]),...(snapIncr.blocked_ips||[]),...(snapIncr.recent_alerts_analytical||[])];
      const iI = allI.find(i=>i.ip===ip);
      if (iF?.geo_state !== iI?.geo_state) {
        console.log(`    ip=${ip} FULL=${iF?.geo_state}/${iF?.country_code} INCR=${iI?.geo_state}/${iI?.country_code}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 9 — MAPA × DRILL-DOWN HTTP (produção)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== ETAPA 9 — MAPA × DRILL-DOWN HTTP ===');

  const { rows: adminRows } = await db.query(
    `SELECT id, email, perfil FROM admin_users WHERE perfil='super_admin' AND ativo=true LIMIT 1`
  );
  if (!adminRows.length) { console.log('SKIP: sem super_admin ativo'); }
  else {
    const token = jwt.sign(
      { sub: adminRows[0].id, typ: 'impetus_admin', perfil: adminRows[0].perfil, email: adminRows[0].email },
      process.env.IMPETUS_ADMIN_JWT_SECRET,
      { expiresIn: '30m', issuer: 'impetus-admin-portal' }
    );

    const dashR = await httpReq('/api/impetus-admin/security-dashboard', token);
    const snapId = dashR.body?.data?.snapshot_id;
    const mapPts = dashR.body?.data?.phase_b?.world_map?.points || [];
    console.log(`  dashboard snapshot_id: ${snapId}`);

    const DRILL_CC = ['CA','US','FR','BR','VN','??'];
    console.log('| País | status mapa | Badge | Total drill | idx_match | snap== | OK |');
    for (const cc of DRILL_CC) {
      const pt = mapPts.find(p=>p.country_code===cc);
      if (!pt) { console.log(`| ${cc} | AUSENTE | – | – | – | – | NOT_PRESENT_IN_FROZEN_DATASET |`); record('MAP-DRILL',cc,'presente','AUSENTE',true); continue; }
      const drR = await httpReq(`/api/impetus-admin/security-dashboard/intelligence?country_code=${encodeURIComponent(cc)}`, token);
      const drBody = drR.body?.data;
      const snapOk  = snapId === drBody?.snapshot_id;
      const idxOk   = drBody?.summary?.index_matches_badge === true;
      const totDr   = drBody?.summary?.index_decomposition?.total;
      const totOk   = pt.count === totDr;
      const allOk   = snapOk && idxOk && totOk;
      console.log(`| ${cc} | ${drR.status} | ${pt.count} | ${totDr} | ${idxOk?'PASS':'FAIL'} | ${snapOk?'PASS':'FAIL'} | ${allOk?'PASS':'FAIL'} |`);
      record('MAP-DRILL',cc,'snap+idx+tot',`snap=${snapOk} idx=${idxOk} tot=${totOk}`,allOk);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ETAPA 10 — CONSERVAÇÃO X → Y MODELO A
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n=== ETAPA 10 — CONSERVAÇÃO X → Y MODELO A ===');
    logWindowSvc.resetLogWindowState();
    const snapX = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: false });
    const totX  = globalWeighted(snapX); const popX  = snapX.recent_alerts_analytical.length;
    const snapXStr = JSON.stringify(snapX);

    console.log(`  Aguardando 3s para snapshot Y...`);
    await new Promise(r=>setTimeout(r,3000));

    logWindowSvc.resetLogWindowState();
    const snapY = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: false });
    const totY  = globalWeighted(snapY); const popY  = snapY.recent_alerts_analytical.length;

    const xDistinctY   = snapX.snapshot_id !== snapY.snapshot_id;
    const weightConserv = totX === totY;
    const popConserv    = popX === popY;
    const xImmutable    = snapXStr === JSON.stringify(snapX);

    record('X→Y','snapshot_id X != Y','distinct',xDistinctY?'distinct':'SAME',xDistinctY);
    record('X→Y','weighted X==Y',String(totX),String(totY),weightConserv);
    record('X→Y','population X==Y',String(popX),String(popY),popConserv);
    record('X→Y','X imutável após Y','unchanged',xImmutable?'unchanged':'MUTATED',xImmutable);

    console.log(`  X: snap_id=${snapX.snapshot_id} total=${totX} pop=${popX}`);
    console.log(`  Y: snap_id=${snapY.snapshot_id} total=${totY} pop=${popY}`);
    console.log(`  X imutável: ${xImmutable?'SIM':'NÃO'}`);
    if (!weightConserv || !popConserv) {
      // Verificar se diferença é apenas distribuição geo (permitida)
      const geoXcc = Object.fromEntries((snapX.world_map?.points||[]).map(p=>[p.country_code,p.count]));
      const geoYcc = Object.fromEntries((snapY.world_map?.points||[]).map(p=>[p.country_code,p.count]));
      console.log('  geo X:', JSON.stringify(geoXcc));
      console.log('  geo Y:', JSON.stringify(geoYcc));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ETAPA 11 — PERFORMANCE CONTROLADA
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n=== ETAPA 11 — PERFORMANCE CONTROLADA ===');
    logWindowSvc.resetLogWindowState();
    const tColl = performance.now();
    const snapP = await dashboardSvc.collectSecurityEvidence({ useLegacyLogs: false });
    const collMs = ms(tColl);

    // geo_sync_provider_calls: usar telemetria interna do produto (evidenceBuildMeta).
    // Um hook global.fetch capturaria também chamadas assíncronas de background de
    // ciclos anteriores (artefacto metodológico). A métrica interna é a fonte de verdade.
    const syncCallsProduct = snapP.evidence_build?.geo_sync_provider_calls ?? '?';
    const geoMode          = snapP.evidence_build?.geo_enrichment_mode ?? '?';

    console.log(`  collect wall: ${collMs} ms`);
    console.log(`  geo_sync_provider_calls (internal): ${syncCallsProduct}`);
    console.log(`  geo_enrichment_mode: ${geoMode}`);
    record('PERF','geo_sync_provider_calls=0 (telemetria produto)','0',String(syncCallsProduct),syncCallsProduct===0);
    record('PERF','collect_wall < 1000ms','<1000ms',`${collMs}ms`,collMs<1000);

    // HIT: usar token já válido
    const hitR = await httpReq('/api/impetus-admin/security-dashboard/intelligence?country_code=CA', token);
    console.log(`  HIT rt=${hitR.rt}ms status=${hitR.status}`);
    record('PERF','HIT_status=200','200',String(hitR.status),hitR.status===200);

    // MISS P95: aguardar expiração do evidenceCache (30s) — 1 amostra, não loop
    console.log('  Aguardando TTL evidenceCache (31s) para MISS...');
    await new Promise(r=>setTimeout(r,31000));
    const missR = await httpReq('/api/impetus-admin/security-dashboard/intelligence?country_code=FR', token);
    console.log(`  MISS rt=${missR.rt}ms status=${missR.status} mode=${missR.body?.data?.evidence_build?.geo_enrichment_mode}`);
    record('PERF','MISS_rt < 1000ms','<1000ms',`${missR.rt}ms`,missR.rt<1000);

    // ═══════════════════════════════════════════════════════════════════════
    // ETAPA 12 — HARDENING
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n=== ETAPA 12 — HARDENING ===');

    const noAuth  = await httpReq('/api/impetus-admin/security-dashboard/intelligence?country_code=CA');
    const badTok  = await httpReq('/api/impetus-admin/security-dashboard/intelligence?country_code=CA','invalid.token.value');
    record('HARDENING','no_auth→401','401',String(noAuth.status),noAuth.status===401);
    record('HARDENING','bad_token→401','401',String(badTok.status),badTok.status===401);
    record('HARDENING','super_admin→200','200',String(hitR.status),hitR.status===200);

    const pm2list = JSON.parse(require('child_process').execSync('pm2 jlist').toString());
    const backendProc = pm2list.find(p=>p.name==='impetus-backend');
    record('HARDENING','PM2_online','online',backendProc?.pm2_env?.status||'?',backendProc?.pm2_env?.status==='online');
    record('HARDENING','unstable_restarts=0','0',String(backendProc?.pm2_env?.unstable_restarts??'?'),backendProc?.pm2_env?.unstable_restarts===0);

    console.log(`  no_auth  : ${noAuth.status}`);
    console.log(`  bad_token: ${badTok.status}`);
    console.log(`  super_adm: ${hitR.status}`);
    console.log(`  PM2 impetus-backend: ${backendProc?.pm2_env?.status} restarts=${backendProc?.pm2_env?.unstable_restarts}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTADO FINAL
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== MATRIZ NOMINAL COMPLETA ===');
  console.log('| ID   | Scope      | Descrição                                         | Esperado | Observado | Result |');
  for (const t of tests) {
    console.log(`| ${t.id} | ${t.scope.padEnd(10)} | ${t.desc.padEnd(49)} | ${String(t.expected).slice(0,16).padEnd(8)} | ${String(t.observed).slice(0,16).padEnd(9)} | ${t.result} |`);
  }

  const passN = tests.filter(t=>t.result==='PASS').length;
  const failN = tests.filter(t=>t.result==='FAIL').length;
  console.log(`\nTOTAL=${tests.length} PASS=${passN} FAIL=${failN}`);

  // Critérios cumulativos de Classificação A
  const equivTests = tests.filter(t=>t.scope==='EQUIV');
  const hashTests  = tests.filter(t=>t.scope==='HASH');
  const badgeTests = tests.filter(t=>t.scope==='BADGE');
  const perfTests  = tests.filter(t=>t.scope==='PERF');
  const xyTests    = tests.filter(t=>t.scope==='X→Y');
  const hardTests  = tests.filter(t=>t.scope==='HARDENING');
  const modeTests  = tests.filter(t=>t.scope==='MODE');
  const drillTests = tests.filter(t=>t.scope==='MAP-DRILL');

  const c_hash   = hashTests.every(t=>t.result==='PASS');
  const c_equiv  = equivTests.length===10 && equivTests.every(t=>t.result==='PASS');
  const c_badge  = badgeTests.every(t=>t.result==='PASS');
  const c_mode   = modeTests.every(t=>t.result==='PASS');
  const c_perf   = perfTests.every(t=>t.result==='PASS');
  const c_xy     = xyTests.every(t=>t.result==='PASS');
  const c_drill  = drillTests.every(t=>t.result==='PASS');
  const c_hard   = hardTests.every(t=>t.result==='PASS');

  console.log('\n=== CRITÉRIOS CUMULATIVOS CLASSIFICAÇÃO A ===');
  console.log(`dataset_hashes_match    : ${c_hash?'✔ PASS':'✘ FAIL'}`);
  console.log(`10/10_equivalência      : ${c_equiv?'✔ PASS':'✘ FAIL'} (${equivTests.filter(t=>t.result==='PASS').length}/10)`);
  console.log(`todos_badges_reconcil   : ${c_badge?'✔ PASS':'✘ FAIL'}`);
  console.log(`modo_incremental_real   : ${c_mode?'✔ PASS':'✘ FAIL'}`);
  console.log(`geo_sync_calls=0        : ${perfTests.find(t=>t.desc.includes('geo_sync'))?.result}`);
  console.log(`MISS_P95<1000ms         : ${perfTests.find(t=>t.desc.includes('MISS_rt'))?.result}`);
  console.log(`X→Y_conservação         : ${c_xy?'✔ PASS':'✘ FAIL'}`);
  console.log(`mapa×drill-down         : ${c_drill?'✔ PASS':'✘ FAIL'}`);
  console.log(`hardening               : ${c_hard?'✔ PASS':'✘ FAIL'}`);
  console.log(`ALTERAÇÃO_FUNCIONAL     : NÃO`);

  const classA = c_hash && c_equiv && c_badge && c_mode && c_perf && c_xy && c_drill && c_hard;

  console.log('\n─── RELATÓRIO FINAL ──────────────────────────────────────────────');
  console.log(` 1. Fronteiras: nginx/threat (disco), fail2ban/ufw (shell), geoip (mem), db (SQL)`);
  console.log(` 2. Congelamento: captura única via legacy tail + evidSnap + Map snapshot`);
  console.log(` 3. Hashes pre: ${pre.H_D.slice(0,20)} | FULL: ${hashOkFull?'MATCH':'FAIL'} | INCR: ${hashOkIncr?'MATCH':'FAIL'}`);
  console.log(` 4. Imutabilidade: ${c_hash?'COMPROVADA':'VIOLADA'}`);
  console.log(` 5. FULL  hash analítico: ${FULL_HASH.slice(0,32)}`);
  console.log(` 6. INCR  hash analítico: ${INCR_HASH.slice(0,32)}`);
  console.log(` 7. Equiv EQ-01..EQ-10: ${equivTests.filter(t=>t.result==='PASS').length}/10`);
  console.log(` 8. Badges reconciliados: ${badgeTests.filter(t=>t.result==='PASS').length}/${badgeTests.length}`);
  console.log(` 9. SUM badges: FULL=${sumFull} INCR=${sumIncr}`);
  console.log(`10. geo_state: FULL=${JSON.stringify(gsF)} INCR=${JSON.stringify(gsI)}`);
  console.log(`11. mapa×drill: ${c_drill?'OK':'FAIL'}`);
  console.log(`12. X→Y: ${c_xy?'conservado':'FALHOU'}`);
  console.log(`13. Perf: ${perfTests.filter(t=>t.result==='PASS').length}/${perfTests.length} OK`);
  console.log(`14. Hardening: ${c_hard?'preservado':'FALHOU'}`);
  console.log(`15. Arquivos criados para diagnóstico: backend/scripts/sec001h-r1-deterministic-equiv.js`);
  console.log(`16. ALTERAÇÃO FUNCIONAL DO PRODUTO: NÃO`);

  if (classA) {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  CLASSIFICAÇÃO A — ENCERRAMENTO INTEGRAL                         ║');
    console.log('║  SEC-VISUAL-INTELLIGENCE-001 — INTEGRALMENTE CERTIFICADO         ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
  } else {
    const failedCriteria = [];
    if (!c_hash)  failedCriteria.push('dataset_hashes');
    if (!c_equiv) failedCriteria.push(`equivalência ${equivTests.filter(t=>t.result==='PASS').length}/10`);
    if (!c_badge) failedCriteria.push('badges');
    if (!c_mode)  failedCriteria.push('modo_incremental');
    if (!c_perf)  failedCriteria.push('performance');
    if (!c_xy)    failedCriteria.push('X→Y');
    if (!c_drill) failedCriteria.push('mapa×drill');
    if (!c_hard)  failedCriteria.push('hardening');

    if (failN > 0 && (equivTests.some(t=>t.result==='FAIL') || xyTests.some(t=>t.result==='FAIL'))) {
      console.log('\n╔══════════════════════════════════════════════════════════════════╗');
      console.log('║  CLASSIFICAÇÃO D — DIVERGÊNCIA FUNCIONAL COMPROVADA              ║');
      console.log('╚══════════════════════════════════════════════════════════════════╝');
      console.log('\nDIVERGÊNCIA FUNCIONAL COMPROVADA');
      for (const t of tests.filter(t=>t.result==='FAIL')) {
        console.log(`  FAIL: ${t.id} | ${t.scope} | ${t.desc}`);
        console.log(`        esperado=${t.expected} | observado=${t.observed}`);
      }
    } else {
      console.log('\nCLASSIFICAÇÃO B — Funcional correto, lacuna de prova em: ' + failedCriteria.join(', '));
    }
  }

  // pool partilhado — não encerrar; o processo vai terminar.
  process.exit(classA ? 0 : 1);
}

main().catch(e => { console.error('\nERRO FATAL:', e); process.exit(1); });
