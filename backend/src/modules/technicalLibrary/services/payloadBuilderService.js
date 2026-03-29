/**
 * Geração de payloads para Unity (modelo real) e modo procedural — extensível para CDN.
 */
'use strict';

function absUrl(rel, publicBaseUrl) {
  if (!rel) return null;
  if (/^https?:\/\//i.test(rel)) return rel;
  if (!publicBaseUrl) return rel;
  return `${String(publicBaseUrl).replace(/\/$/, '')}${rel.startsWith('/') ? '' : '/'}${rel}`;
}

function buildUnityPayload(detail, publicBaseUrl) {
  const eq = detail.equipment;
  const models = detail.models || [];
  const primary = models.find((m) => m.is_primary) || models[0];
  if (!primary) {
    return {
      renderMode: 'model',
      equipmentId: eq.id,
      machineId: eq.internal_machine_code || null,
      modelUrl: null,
      transform: { scale: 1, rotation: [0, 0, 0] },
      highlightParts: [],
      metadata: {
        manufacturer: eq.manufacturer,
        model: eq.model,
        name: eq.name
      },
      _note: 'Nenhum modelo 3D cadastrado — use payload procedural ou cadastre um arquivo.'
    };
  }
  const rot = [
    Number(primary.rotation_x) || 0,
    Number(primary.rotation_y) || 0,
    Number(primary.rotation_z) || 0
  ];
  return {
    renderMode: 'model',
    equipmentId: eq.id,
    machineId: eq.internal_machine_code || null,
    modelUrl: absUrl(primary.file_url, publicBaseUrl),
    transform: {
      scale: Number(primary.default_scale) || 1,
      rotation: rot,
      position:
        primary.position_x != null
          ? [Number(primary.position_x), Number(primary.position_y) || 0, Number(primary.position_z) || 0]
          : undefined
    },
    highlightParts: (detail.parts || []).map((p) => ({
      id: p.id,
      code: p.part_code,
      name: p.name,
      subsystem: p.subsystem
    })),
    unityMetadata: primary.unity_metadata || {},
    metadata: {
      manufacturer: eq.manufacturer,
      model: eq.model,
      name: eq.name,
      category: eq.category
    }
  };
}

function mapSubsystemToPrimitive(name) {
  const n = (name || '').toLowerCase();
  if (/motor|bomba|compressor|cilindro/.test(n)) return 'cylinder';
  if (/painel|caixa|quadro/.test(n)) return 'box';
  if (/eixo|shaft/.test(n)) return 'cylinder';
  return 'box';
}

function buildProceduralPayload(detail) {
  const eq = detail.equipment;
  const parts = detail.parts || [];
  const proceduralParts = parts.slice(0, 40).map((p, i) => {
    const prim = mapSubsystemToPrimitive(p.subsystem || p.name);
    const y = i * 0.35;
    return {
      id: p.id,
      name: p.name,
      subsystem: p.subsystem,
      primitive: prim,
      position: [0, y, 0],
      scale: prim === 'cylinder' ? [1.2, 2.0, 1.2] : [1.5, 0.4, 1.0]
    };
  });

  if (proceduralParts.length === 0) {
    proceduralParts.push({
      name: 'equipamento',
      primitive: 'box',
      position: [0, 0, 0],
      scale: [2, 1.5, 2]
    });
  }

  return {
    renderMode: 'procedural',
    equipmentId: eq.id,
    machineId: eq.internal_machine_code || null,
    proceduralParts,
    metadata: {
      manufacturer: eq.manufacturer,
      model: eq.model,
      name: eq.name,
      category: eq.category
    },
    iaHints: {
      source: 'library_procedural_stub',
      future: ['pdf_text_extraction', 'ocr_tags', 'keyword_expansion']
    }
  };
}

module.exports = { buildUnityPayload, buildProceduralPayload, absUrl };
