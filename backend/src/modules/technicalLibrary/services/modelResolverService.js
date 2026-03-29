/**
 * Resolução de modelo para visualização — biblioteca interna primeiro; externo e procedural reservados.
 */
'use strict';

const repo = require('../repositories/technicalLibraryRepository');
const payloadBuilder = require('./payloadBuilderService');
const { isValidUUID } = require('../../../utils/security');

async function resolve(companyId, body, publicBaseUrl) {
  const b = body || {};
  const equipmentId = b.equipment_id && isValidUUID(b.equipment_id) ? b.equipment_id : null;
  const machineCode = (b.machine_id || b.internal_machine_code || '').trim() || null;
  const query = (b.query || b.q || '').trim().toLowerCase() || null;

  let equipment = null;
  let models = [];
  let parts = [];

  if (equipmentId) {
    equipment = await repo.findEquipmentById(companyId, equipmentId);
    if (equipment) {
      models = await repo.listModels(companyId, equipmentId);
      parts = await repo.listParts(companyId, equipmentId);
    }
  } else if (machineCode) {
    equipment = await repo.findEquipmentByInternalMachineCode(companyId, machineCode);
    if (equipment) {
      models = await repo.listModels(companyId, equipment.id);
      parts = await repo.listParts(companyId, equipment.id);
    }
  } else if (query) {
    const raw = (b.query || b.q || '').trim();
    const row = await repo.findBestEquipmentMatchForLibrarySearch(companyId, raw);
    if (row?.id) {
      const { match_rank: _mr, ...eqClean } = row;
      equipment = await repo.findEquipmentById(companyId, eqClean.id);
      if (equipment) {
        models = await repo.listModels(companyId, equipment.id);
        parts = await repo.listParts(companyId, equipment.id);
      }
    }
  }

  if (equipment) {
    const primary = models.find((m) => m.is_primary) || models[0];
    if (primary) {
      const detail = {
        equipment: { ...equipment, model_count: models.length, has_primary_model: !!primary, has_manual_doc: false, part_count: parts.length, keyword_count: 0 },
        models,
        parts,
        documents: [],
        keywords: []
      };
      return {
        source: 'library',
        equipment_id: equipment.id,
        message: 'Modelo encontrado na biblioteca técnica do cliente.',
        unityPayload: payloadBuilder.buildUnityPayload(
          {
            equipment: detail.equipment,
            models: detail.models,
            parts: detail.parts
          },
          publicBaseUrl
        )
      };
    }
    return {
      source: 'library_no_model',
      equipment_id: equipment.id,
      message: 'Equipamento cadastrado sem arquivo 3D — use modo procedural ou anexe modelo.',
      proceduralPayload: payloadBuilder.buildProceduralPayload({
        equipment: { ...equipment, model_count: 0, has_primary_model: false, has_manual_doc: false, part_count: parts.length, keyword_count: 0 },
        models: [],
        parts,
        documents: [],
        keywords: []
      })
    };
  }

  return {
    source: 'not_found',
    message: 'Não encontrado na biblioteca interna. Reservado: fontes externas aprovadas e fallback IA.',
    nextSteps: ['external_catalog_lookup', 'procedural_from_manual_context']
  };
}

module.exports = { resolve };
