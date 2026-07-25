/**
 * ENT-001 — Candidatos à evolução (derivado do conhecimento consolidado).
 */
import { FIN_GAP_ANALYSIS } from '../audit/finance/finAud001GapAnalysis.js';
import { REG_RECOVERY_PLAN } from '../audit/regression/reg001RecoveryPlan.js';
import { REG_002_RESOLVED_DEAD_CLICKS } from '../audit/regression/reg002DeadClickMatrix.js';
import { COGNITIVE_ADAPTER_REGISTRY } from '../cognitive/registry/cognitivePlatformRegistry.js';
import { ENT_PLATFORM_HEATMAP } from './ent001PlatformHeatmap.js';
import { ENT_001_PHASE } from './ent001Constants.js';

const REG002_COMPLETED_IDS = Object.freeze(['R1', 'R2', 'R3', 'R4', 'R5']);

function _buildDomainCandidates() {
  return ENT_PLATFORM_HEATMAP.map((h) => {
    let recommendation = 'defer';
    let action = 'Aguardar baseline — avaliar após reunião de arquitectura';

    if (h.maturity === 'not_started') {
      recommendation = 'develop';
      action = 'Desenvolvimento novo — confirmar ausência de capacidades ocultas';
    } else if (h.maturity === 'discovered' || h.maturity === 'partial') {
      recommendation = 'integrate';
      action = 'Integrar / activar capacidades existentes antes de rebuild';
    } else if (h.maturity === 'certified' || h.maturity === 'mature') {
      recommendation = 'preserve';
      action = 'Preservar — evolução incremental apenas com escopo explícito';
    }

    if (h.domainId === 'finance') {
      recommendation = 'integrate_then_develop';
      action =
        'Fase 1: reutilizar industrial costs + leakage + Nexus; Fase 2: finance_native GREENFIELD';
    }

    return Object.freeze({
      domainId: h.domainId,
      label: h.label,
      maturity: h.maturity,
      recommendation,
      action,
      whatExists: _whatExistsForDomain(h.domainId),
      whatNeedsIntegration: _whatNeedsIntegration(h.domainId),
      whatMustBeDeveloped: _whatMustBeDeveloped(h.domainId)
    });
  });
}

function _whatExistsForDomain(domainId) {
  const map = {
    logistics_wms: ['WMS 8 módulos', 'OPM cognitive stack', 'CPL logistics_adapter'],
    finance: FIN_GAP_ANALYSIS.whatIsConsolidated,
    quality: ['Operational runtime GF-027', 'Cognitive hub', 'quality_adapter'],
    safety: ['SST operational', 'Cognitive hub', 'safety_adapter'],
    environment: ['Ambiental operational', 'Cognitive runtime', 'environment_adapter'],
    command_center: ['Centro Comando widgets', 'Smart Panel', 'dashboard profiles'],
    ppap: ['Native cockpit promotion CC'],
    msa: ['Native cockpit promotion CC'],
    ishikawa: ['Native cockpit promotion CC']
  };
  return Object.freeze(map[domainId] || ['Ver catálogos ENT-001']);
}

function _whatNeedsIntegration(domainId) {
  const map = {
    finance: [
      'Confirmar endpoints forecasting em falta (REG-001 centro_previsao)',
      'CPL finance_adapter quando domínio existir'
    ],
    supply: ['Activar consumidor EOX OPM-008'],
    ppap: ['Ligar EOX entry + operational routes'],
    msa: ['Ligar EOX entry + operational routes'],
    ishikawa: ['Ligar EOX entry + operational routes'],
    executive: ['Consolidar AIOI widgets vs páginas dedicadas']
  };
  return Object.freeze(map[domainId] || []);
}

function _whatMustBeDeveloped(domainId) {
  if (domainId === 'finance') return FIN_GAP_ANALYSIS.whatMustBeDeveloped;
  if (['maintenance', 'hr', 'production'].includes(domainId)) {
    return Object.freeze([`Domínio ${domainId} — GREENFIELD confirmado na baseline`]);
  }
  return Object.freeze([]);
}

/** Itens REG ainda pendentes (exclui R1–R5 concluídos em REG-002) */
function _buildRecoveryCandidates() {
  return REG_RECOVERY_PLAN.filter((item) => !REG002_COMPLETED_IDS.includes(item.id)).map((item) =>
    Object.freeze({
      id: item.id,
      label: item.feature,
      priority: item.priority,
      status: 'pending',
      action: item.minimalFix,
      source: 'REG-001 recovery plan — não coberto por REG-002'
    })
  );
}

/** Adapters CPL planeados */
function _buildCplCandidates() {
  return COGNITIVE_ADAPTER_REGISTRY.filter((a) => a.status !== 'active').map((a) =>
    Object.freeze({
      id: a.adapterId,
      label: a.label,
      domain: a.targetDomain,
      status: a.status,
      action: `Implementar adapter quando domínio ${a.targetDomain} evoluir`,
      source: 'CPL-002/003 adapter registry'
    })
  );
}

export const ENT_EVOLUTION_CANDIDATES = Object.freeze({
  phase: ENT_001_PHASE,
  principle: 'CONSOLIDATE BEFORE EVOLVE — decisão de domínio após reunião de arquitectura',
  reg002Completed: Object.freeze([...REG_002_RESOLVED_DEAD_CLICKS]),
  financeGapSummary: FIN_GAP_ANALYSIS.summary,
  domainCandidates: _buildDomainCandidates(),
  recoveryPending: _buildRecoveryCandidates(),
  cplAdaptersPending: _buildCplCandidates(),
  prioritizedDomains: Object.freeze([
    Object.freeze({
      rank: 1,
      domainId: 'finance',
      rationale: 'FIN-AUD completo — maior volume de capacidades parciais reutilizáveis',
      approach: 'integrate_then_develop'
    }),
    Object.freeze({
      rank: 2,
      domainId: 'supply',
      rationale: 'Consumidor EOX parcial — OPM-008 handoff',
      approach: 'integrate'
    }),
    Object.freeze({
      rank: 3,
      domainId: 'production',
      rationale: 'Referências MES/ERP — confirmar antes de GREENFIELD',
      approach: 'audit_first'
    }),
    Object.freeze({
      rank: 4,
      domainId: 'ppap',
      rationale: 'Cockpit maduro desconectado — padrão REG',
      approach: 'integrate'
    }),
    Object.freeze({
      rank: 5,
      domainId: 'maintenance',
      rationale: 'Não iniciado — menor evidência existente',
      approach: 'develop'
    })
  ])
});

export function getEvolutionCandidates() {
  return ENT_EVOLUTION_CANDIDATES;
}

export function validateEvolutionCandidates() {
  const issues = [];
  if (ENT_EVOLUTION_CANDIDATES.domainCandidates.length < 10) {
    issues.push('incomplete domain candidates');
  }
  if (!ENT_EVOLUTION_CANDIDATES.prioritizedDomains.find((d) => d.domainId === 'finance')) {
    issues.push('finance must be in prioritized list');
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: ENT_001_PHASE,
    domainCount: ENT_EVOLUTION_CANDIDATES.domainCandidates.length,
    reg002Resolved: ENT_EVOLUTION_CANDIDATES.reg002Completed.length
  };
}
