/**
 * OPM-002A — GAP registry inventário (lacunas API / UX futuras).
 */
export const INVENTORY_GAPS = Object.freeze([
  {
    id: 'GAP-OPM-INV-001',
    title: 'Série dedicada em balances',
    description: 'API WMS-003 expõe serial_controlled no item; campo série por balance pode requerer evolução backend.',
    phase: 'OPM-002A'
  },
  {
    id: 'GAP-OPM-INV-002',
    title: 'Export server-side',
    description: 'Export CSV/Excel/PDF client-side; endpoint dedicado pode ser adicionado em fase posterior.',
    phase: 'OPM-002A'
  },
  {
    id: 'GAP-OPM-INV-003',
    title: 'IA Cognitiva inventário',
    description: 'Painel preparado para integração CC; predição de ruptura via runtime cognitivo — OPM-008.',
    phase: 'OPM-008'
  }
]);
