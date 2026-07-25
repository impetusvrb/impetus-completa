/** OPM-003 — GAPs conhecidos (sem alteração WMS-003 APIs). */
export const RECEIVING_GAP_REGISTRY = Object.freeze([
  {
    id: 'GAP-OPM-RCV-001',
    area: 'ASN metadata PATCH',
    description: 'Actualização de metadata ASN via PATCH dedicado — actualmente só POST create + PATCH status',
    severity: 'medium',
    workaround: 'Persistir ASN completo em metadata no create; transições via status'
  },
  {
    id: 'GAP-OPM-RCV-002',
    area: 'Quality PPAP',
    description: 'Integração PPAP/inspeção Qualidade — contrato apenas nesta fase',
    severity: 'low',
    targetPhase: 'OPM-003+'
  },
  {
    id: 'GAP-OPM-RCV-003',
    area: 'Dock IoT telemetry',
    description: 'Telemetria doca / IoT — preparado via painel docas, integração futura',
    severity: 'low',
    targetPhase: 'OPM-007'
  }
]);
