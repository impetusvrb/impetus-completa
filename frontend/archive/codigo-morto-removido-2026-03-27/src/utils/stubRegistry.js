/**
 * Registo manual de STUB_TEMPORARIO — governança de ciclo de vida.
 * Atualizar este array quando criar/remover stubs; manter alinhado aos comentários nos ficheiros.
 */

const STUB_STALE_DAYS = 30;
/** Acima disto em DEV dispara alerta de quantidade (governança de crescimento). */
const STUB_ALERT_MAX_COUNT = 15;
/** Em DEV: cada stub mais velho gera aviso crítico. */
const STUB_CRITICAL_AGE_DAYS = 45;
/** Em produção (bundle): stubs mais velhos geram aviso não bloqueante. */
const STUB_PROD_STALE_DAYS = 60;

/** @type {Array<{ file: string, route: string | null, created_at: string, owner?: string | null, expected_replacement: string }>} */
const KNOWN_STUBS = [
  {
    file: 'pages/AdminAiIncidents.jsx',
    route: '/app/admin/ai-incidents',
    created_at: '2026-03-27',
    owner: null,
    expected_replacement: 'Integração com API de governança de incidentes de IA (admin-portal / ai-incidents)'
  },
  {
    file: 'pages/UserSettings.jsx',
    route: '/app/settings',
    created_at: '2026-03-27',
    owner: null,
    expected_replacement: 'Módulo de preferências de utilizador, notificações e sessão'
  },
  {
    file: 'pages/AdminIntegrations.jsx',
    route: '/app/admin/integrations',
    created_at: '2026-03-27',
    owner: null,
    expected_replacement: 'Painel administrativo de integrações, webhooks e credenciais'
  },
  {
    file: 'pages/NexusIACustos.jsx',
    route: '/app/admin/nexusia-custos',
    created_at: '2026-03-27',
    owner: null,
    expected_replacement: 'Nexus IA — análise e narrativas de custos ligadas ao backend'
  },
  {
    file: 'pages/AdminEquipmentLibrary.jsx',
    route: '/app/admin/equipment-library',
    created_at: '2026-03-27',
    owner: null,
    expected_replacement: 'CRUD de biblioteca de equipamentos e fichas técnicas'
  },
  {
    file: 'pages/ManuIA.jsx',
    route: '/app/manutencao/manuia',
    created_at: '2026-03-27',
    owner: null,
    expected_replacement: 'Experiência web Manu IA (OS, procedimentos, ligação a serviços de manutenção)'
  },
  {
    file: 'manuia-app/ManuIAExtensionApp.jsx',
    route: '/app/manutencao/manuia-app',
    created_at: '2026-03-27',
    owner: null,
    expected_replacement: 'Shell PWA Manu IA com sincronização de ordens e ajustes de campo'
  },
  {
    file: 'pages/SelectTeamMember.jsx',
    route: '/app/equipe-operacional',
    created_at: '2026-03-27',
    owner: null,
    expected_replacement: 'Fluxo de seleção de membro ativo (factoryTeam / contexto de equipe)'
  },
  {
    file: 'pages/AdminOperationalTeams.jsx',
    route: '/app/admin/equipes-operacionais',
    created_at: '2026-03-27',
    owner: null,
    expected_replacement: 'CRUD administrativo de equipes operacionais e sessão coletiva'
  },
  {
    file: 'pages/AdminAudioLogs.jsx',
    route: '/app/admin/audio-logs',
    created_at: '2026-03-27',
    owner: null,
    expected_replacement: 'Listagem, filtros e reprodução de registos de áudio do sistema'
  },
  {
    file: 'utils/prefetchRoutes.js',
    route: null,
    created_at: '2026-03-27',
    owner: null,
    expected_replacement: 'Prefetch real de chunks por rota (ex.: import dinâmico antecipado no Layout)'
  }
];

function daysSince(isoDate) {
  const start = new Date(`${isoDate}T12:00:00.000Z`);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

/**
 * Metadados estruturados de todos os stubs conhecidos (fonte: lista manual).
 * @returns {typeof KNOWN_STUBS}
 */
export function getAllStubsMetadata() {
  return KNOWN_STUBS.map((entry) => ({ ...entry }));
}

/**
 * Em DEV: registo completo e alerta para stubs com mais de {@link STUB_STALE_DAYS} dias.
 * Não altera UI nem rotas.
 */
export function logStubRegistryInDev() {
  if (!import.meta.env.DEV) return;

  const stubs = getAllStubsMetadata();
  console.warn('[STUB_REGISTRY]', { total: stubs.length, stubs });

  for (const s of stubs) {
    const days_since_creation = daysSince(s.created_at);
    if (days_since_creation > STUB_STALE_DAYS) {
      console.warn('[STUB_OLD]', { file: s.file, days_since_creation });
    }
  }
}

/**
 * Governança ativa: métricas e alertas por limiar (sem lançar erros, sem bloquear build).
 * @returns {{ total_stubs: number, stubs_older_than_30_days: number, stubs_without_owner: number }}
 */
export function validateStubHealth() {
  const stubs = getAllStubsMetadata();
  const total_stubs = stubs.length;

  let stubs_older_than_30_days = 0;
  let stubs_without_owner = 0;
  let total_old_stubs = 0;

  for (const s of stubs) {
    const days_since_creation = daysSince(s.created_at);
    if (days_since_creation > STUB_STALE_DAYS) {
      stubs_older_than_30_days += 1;
    }
    if (s.owner == null || String(s.owner).trim() === '') {
      stubs_without_owner += 1;
    }
    if (days_since_creation > STUB_PROD_STALE_DAYS) {
      total_old_stubs += 1;
    }

    if (import.meta.env.DEV && days_since_creation > STUB_CRITICAL_AGE_DAYS) {
      console.warn('[STUB_CRITICAL]', { file: s.file, days_since_creation });
    }
  }

  if (import.meta.env.DEV) {
    if (total_stubs > STUB_ALERT_MAX_COUNT) {
      console.warn('[STUB_ALERT]', 'Quantidade elevada de stubs');
    }
  }

  // Em produção, não logar no browser (evita ruído no console do utilizador final).
  // Opcional futuro: enviar agregados para backend/telemetria (ex.: total_old_stubs).
  void total_old_stubs;

  return { total_stubs, stubs_older_than_30_days, stubs_without_owner };
}
