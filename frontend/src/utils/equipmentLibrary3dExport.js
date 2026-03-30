/**
 * Ponto de extensão para exportação / integração com simulações (futuro).
 * Mantém um contrato estável sem acoplar o UI ao motor de simulação.
 */

export function buildSimulationExportPayload(modelRecord) {
  if (!modelRecord || typeof modelRecord !== 'object') return null;
  return {
    schemaVersion: 1,
    modelId: modelRecord.id,
    sourceUrl: modelRecord.storage_path,
    format: modelRecord.format,
    originalFilename: modelRecord.original_filename,
    versionSeq: modelRecord.version_seq,
    versionLabel: modelRecord.version_label,
    assetId: modelRecord.asset_id,
    sparePartId: modelRecord.spare_part_id,
    isPrimary: modelRecord.is_primary,
    notes: modelRecord.notes
  };
}

export function summarizeModelForDownload(modelRecord) {
  const payload = buildSimulationExportPayload(modelRecord);
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}
