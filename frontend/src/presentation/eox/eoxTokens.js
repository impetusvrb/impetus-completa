/**
 * ARC-003 — Enterprise Operational Experience Standard (EOX) tokens.
 */
export const EOX_PHASE = 'ARC-003';

export const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

export const IMPETUS_ROOT = Object.freeze({
  label: 'IMPETUS',
  path: '/app',
  title: 'Dashboard principal'
});

/** Retorno global padronizado — nunca "Workspace", "Dashboard", "Painel". */
export const COGNITIVE_CENTER_RETURN = Object.freeze({
  label: 'Voltar ao Centro Cognitivo',
  shortLabel: 'Centro Cognitivo',
  path: '/app'
});

/** Ordem canónica da barra de acções EOX. */
export const EOX_STANDARD_ACTIONS = Object.freeze([
  { id: 'refresh', label: 'Atualizar', order: 10 },
  { id: 'export', label: 'Exportar', order: 20 },
  { id: 'help', label: 'Ajuda', order: 30 }
]);
