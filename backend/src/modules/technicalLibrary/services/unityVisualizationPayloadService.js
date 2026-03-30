/**
 * Serviço unificado: transforma análises técnicas (alarme, campo, resultado IA)
 * em payload visual normalizado para o Unity WebGL / ManuIA.
 *
 * Reutiliza: modelResolverService, payloadBuilderService
 * Fallback: 1 exato → 2 similar/procedural biblioteca → 3 template genérico IA → 4 aproximação mínima
 */
'use strict';

const modelResolver = require('./modelResolverService');
const payloadBuilder = require('./payloadBuilderService');

const RENDER_MODES = new Set(['normal', 'exploded', 'xray', 'xray_exploded', 'fault_focus']);

/** Mapeia tipo semântico de ativo → modelId genérico estável (níveis 3–4) */
const ASSET_TYPE_GENERIC_MODEL = {
  electric_motor: 'motor_flange_generic_01',
  motor: 'motor_flange_generic_01',
  pump: 'pump_centrifugal_generic_01',
  valve: 'valve_gate_generic_01',
  bearing: 'bearing_generic_01',
  panel: 'panel_electrical_generic_01',
  gearbox: 'gearbox_generic_01',
  compressor: 'compressor_generic_01',
  generic: 'industrial_asset_generic_01',
  industrial: 'industrial_asset_generic_01'
};

function slugAssetType(t) {
  const s = String(t || 'generic')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return s || 'generic';
}

function genericModelIdForAssetType(assetType) {
  const key = slugAssetType(assetType);
  return ASSET_TYPE_GENERIC_MODEL[key] || ASSET_TYPE_GENERIC_MODEL[assetType] || `industrial_${key}_generic_01`;
}

function normalizeRenderMode(raw) {
  if (!raw) return 'fault_focus';
  const s = String(raw).toLowerCase().trim();
  if (RENDER_MODES.has(s)) return s;
  if (s === 'model' || s === 'default') return 'normal';
  if (s.includes('xray') && s.includes('explod')) return 'xray_exploded';
  if (s.includes('xray') || s === 'ray') return 'xray';
  if (s.includes('explod')) return 'exploded';
  if (s.includes('fault') || s.includes('focus')) return 'fault_focus';
  return 'fault_focus';
}

function normalizeSeverity(s) {
  const x = String(s || 'medium').toLowerCase();
  if (['low', 'medium', 'high', 'critical'].includes(x)) return x;
  if (x === 'baixa' || x === 'baixo') return 'low';
  if (x === 'média' || x === 'media') return 'medium';
  if (x === 'alta') return 'high';
  if (x === 'crítica' || x === 'critica') return 'critical';
  return 'medium';
}

function toHighlightPartsArray(ai, internalPayload) {
  if (Array.isArray(ai?.highlightParts) && ai.highlightParts.length) {
    return ai.highlightParts.map((p) => String(p));
  }
  const hp = internalPayload?.highlightParts;
  if (Array.isArray(hp)) {
    if (hp.length && typeof hp[0] === 'object') {
      return hp.map((p) => String(p.code || p.name || p.id || 'part'));
    }
    return hp.map((p) => String(p));
  }
  return [];
}

function buildLabels(ai, highlightParts, defaultText) {
  const text = ai?.faultType || ai?.recommendation || defaultText || 'Foco técnico';
  if (Array.isArray(ai?.labels) && ai.labels.length) {
    return ai.labels.map((l) => ({
      part: String(l.part || l.partId || 'component'),
      text: String(l.text || text)
    }));
  }
  const parts = highlightParts.length ? highlightParts : ['suspect-region'];
  return parts.slice(0, 8).map((p) => ({
    part: String(p),
    text: String(text)
  }));
}

/**
 * Enriquece o payload interno (modelo/procedural) com o contrato Unity e modelId.
 */
function finalizeUnityContract({
  internalPayload,
  fallbackLevel,
  matchedEquipmentId,
  ai,
  overlayData
}) {
  const renderMode = normalizeRenderMode(ai?.recommendedRenderMode || internalPayload?.renderMode);
  const severity = normalizeSeverity(ai?.severity);
  const highlightParts = toHighlightPartsArray(ai, internalPayload);
  const cameraFocus = String(ai?.cameraFocus || highlightParts[0] || 'suspect-region');
  const labels = buildLabels(ai, highlightParts, ai?.faultType);

  let modelId;
  if (fallbackLevel === 1 && matchedEquipmentId) {
    modelId = `mdl_${matchedEquipmentId}`;
  } else if (fallbackLevel === 2 && matchedEquipmentId) {
    modelId = `proc_eq_${matchedEquipmentId}`;
  } else {
    modelId = genericModelIdForAssetType(ai?.assetType || internalPayload?.metadata?.category);
  }

  const overlay = Object.assign({}, overlayData || {});
  if (ai?.faultType && overlay.fault_hint == null) overlay.fault_hint = ai.faultType;

  const contract = {
    modelId,
    renderMode,
    highlightParts,
    severity,
    cameraFocus,
    labels,
    overlayData: overlay,
    fallbackLevel,
    assetType: ai?.assetType || internalPayload?.metadata?.category || null,
    assetSubtype: ai?.assetSubtype || null,
    suspectedComponent: ai?.suspectedComponent || null,
    faultType: ai?.faultType || null,
    modelUrl: internalPayload.modelUrl != null ? internalPayload.modelUrl : null,
    equipmentId: internalPayload.equipmentId != null ? internalPayload.equipmentId : matchedEquipmentId,
    transform: internalPayload.transform,
    proceduralParts: internalPayload.proceduralParts,
    metadata: internalPayload.metadata,
    unityMetadata: internalPayload.unityMetadata,
    iaHints: internalPayload.iaHints,
    recommendedRenderMode: ai?.recommendedRenderMode || renderMode
  };

  return contract;
}

/**
 * Núcleo: resultado do modelResolver + hints de IA (ou heurística) → payload de visualização.
 */
function mergeResolverAndAiHints(resolverOut, ai, context) {
  const machineLabel = (context && context.machineLabel) || null;
  const sector = (context && context.sector) || null;
  let fallbackLevel = 4;
  let unityInternal = null;
  let matchedEquipmentId = null;

  const overlay = {
    machineLabel: machineLabel || undefined,
    sector: sector || undefined
  };

  if (resolverOut.source === 'library' && resolverOut.unityPayload) {
    fallbackLevel = 1;
    const up = resolverOut.unityPayload;
    unityInternal = Object.assign({}, up, {
      renderMode: ai.recommendedRenderMode || up.renderMode || 'model',
      severity: ai.severity,
      highlightParts: ai.highlightParts || [],
      labels: (ai.highlightParts || []).map((p) => ({ part: String(p), text: ai.faultType || 'Foco técnico' })),
      overlayData: overlay,
      cameraFocus: ai.cameraFocus
    });
    matchedEquipmentId = resolverOut.equipment_id;
  } else if (resolverOut.source === 'library_no_model' && resolverOut.proceduralPayload) {
    fallbackLevel = 2;
    unityInternal = Object.assign({}, resolverOut.proceduralPayload, {
      recommendedRenderMode: ai.recommendedRenderMode,
      severity: ai.severity,
      labels: [{ part: 'principal', text: ai.recommendation || ai.faultType || '' }],
      overlayData: overlay,
      fallbackLevel: 2
    });
    matchedEquipmentId = resolverOut.equipment_id;
  } else {
    const hints = {
      assetLabel: machineLabel || ai.assetType,
      assetType: ai.assetType,
      assetSubtype: ai.assetSubtype,
      suspectedComponent: ai.suspectedComponent,
      recommendedRenderMode: ai.recommendedRenderMode,
      severity: ai.severity,
      highlightParts: ai.highlightParts,
      cameraFocus: ai.cameraFocus,
      labels: [{ part: 'suspect-region', text: ai.recommendation || ai.faultType || 'Análise de campo' }],
      overlayData: overlay,
      fallbackLevel: 3,
      notes: ai.notes
    };
    unityInternal = payloadBuilder.buildFallbackProceduralFromFieldAnalysis(hints);
    fallbackLevel = unityInternal.fallbackLevel || 3;
  }

  if (!unityInternal || Object.keys(unityInternal).length === 0) {
    unityInternal = payloadBuilder.buildFallbackProceduralFromFieldAnalysis({
      assetLabel: machineLabel || 'Equipamento',
      assetType: ai.assetType,
      severity: ai.severity,
      recommendedRenderMode: 'fault_focus',
      fallbackLevel: 4,
      notes: ai.notes
    });
    fallbackLevel = 4;
  }

  const contract = finalizeUnityContract({
    internalPayload: unityInternal,
    fallbackLevel,
    matchedEquipmentId,
    ai,
    overlayData: overlay
  });

  return {
    unityPayload: contract,
    fallbackLevel,
    matchedEquipmentId,
    diagnostic: {
      assetType: ai.assetType,
      assetSubtype: ai.assetSubtype,
      suspectedComponent: ai.suspectedComponent,
      faultType: ai.faultType,
      confidence: ai.confidence
    }
  };
}

/**
 * Fluxo 2: foto/vídeo / resultado IA já conhecido — resolve biblioteca e monta contrato.
 */
async function buildFromAiAnalysisResult(companyId, ai, context, publicBaseUrl) {
  const ctx = context || {};
  const queryBits = [ctx.machineLabel, ai.assetType, ai.assetSubtype, ai.suspectedComponent]
    .filter(Boolean)
    .join(' ');
  const resolverOut = await modelResolver.resolve(
    companyId,
    {
      query: queryBits || ctx.machineLabel || 'equipamento industrial',
      equipment_id: ctx.equipment_id,
      machine_id: ctx.internal_machine_code,
      internal_machine_code: ctx.internal_machine_code
    },
    publicBaseUrl
  );
  return mergeResolverAndAiHints(resolverOut, ai, {
    machineLabel: ctx.machineLabel,
    sector: ctx.sector
  });
}

/**
 * Fluxo 1: alarme técnico (integração) — heurística + overlay de processo + resolve.
 */
async function buildFromAlarmIntegration(companyId, alarm, publicBaseUrl) {
  const a = alarm || {};
  const machineName = (a.machineName || a.machine || '').trim();
  const sector = (a.sector || '').trim() || null;
  const alarmCode = (a.alarmCode || a.tag || '').trim() || null;
  const alarmDescription = (a.alarmDescription || a.message || '').trim() || '';
  const sev = normalizeSeverity(a.severity);
  const variables = a.variables && typeof a.variables === 'object' ? a.variables : {};

  const textBlob = `${machineName} ${alarmDescription} ${alarmCode || ''}`.toLowerCase();
  let assetType = 'generic';
  if (/motor|motor\b|wegm|w22/.test(textBlob)) assetType = 'electric_motor';
  else if (/bomba|pump|grundfos/.test(textBlob)) assetType = 'pump';
  else if (/válv|valv|valve/.test(textBlob)) assetType = 'valve';
  else if (/painel|painel|panel|quadro|plc/.test(textBlob)) assetType = 'panel';
  else if (/rolamento|bearing|mancal/.test(textBlob)) assetType = 'bearing';

  const ai = {
    assetType,
    assetSubtype: null,
    confidence: 0.55,
    suspectedComponent: 'componente_afetado',
    faultType: alarmDescription ? alarmDescription.slice(0, 120) : 'Alarme técnico',
    severity: sev,
    recommendedRenderMode: /vibrat|temperat|superaquec/.test(textBlob) ? 'xray_exploded' : 'fault_focus',
    highlightParts: ['suspect-region'],
    cameraFocus: 'suspect-region',
    needsHumanValidation: true,
    recommendation: 'Correlacionar com inspeção em campo e histórico do ativo.',
    notes: 'Gerado a partir de alarme (heurística).'
  };

  const query = [machineName, alarmCode, alarmDescription].filter(Boolean).join(' ');
  const resolverOut = await modelResolver.resolve(
    companyId,
    {
      query: query || machineName || 'equipamento industrial',
      machine_id: a.machineCode || a.internal_machine_code,
      internal_machine_code: a.machineCode || a.internal_machine_code
    },
    publicBaseUrl
  );

  const overlayData = Object.assign({}, variables, {
    alarmCode: alarmCode || undefined,
    sector: sector || undefined,
    machineName: machineName || undefined,
    source: a.source || 'integration'
  });

  const merged = mergeResolverAndAiHints(resolverOut, ai, { machineLabel: machineName, sector });
  merged.unityPayload.overlayData = Object.assign(
    {},
    merged.unityPayload.overlayData || {},
    overlayData
  );
  return merged;
}

module.exports = {
  buildFromAiAnalysisResult,
  buildFromAlarmIntegration,
  mergeResolverAndAiHints,
  finalizeUnityContract,
  normalizeRenderMode,
  normalizeSeverity,
  genericModelIdForAssetType,
  RENDER_MODES
};
