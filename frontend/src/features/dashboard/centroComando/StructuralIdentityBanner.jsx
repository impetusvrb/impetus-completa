/**
 * Banner de identidade organizacional (Base Estrutural) no Centro de Comando.
 */
import React from 'react';

export default function StructuralIdentityBanner({ structuralProfile, moduleGovernance }) {
  const sp = structuralProfile;
  const gov = moduleGovernance;
  if (!sp?.cargo && !sp?.departamento && gov?.structural_complete !== true) return null;

  const dept =
    sp?.departamento_oficial && sp?.setor_oficial
      ? `${sp.departamento_oficial} · ${sp.setor_oficial}`
      : sp?.departamento || '—';
  const complete = gov?.structural_complete ?? sp?.structural_complete;
  const modCount = typeof gov?.allowed_count === 'number' ? gov.allowed_count : null;

  return (
    <div
      className="cc__structural-banner"
      role="status"
      aria-label="Identidade organizacional Base Estrutural"
    >
      <div className="cc__structural-banner-inner">
        <span className="cc__structural-tag">BASE ESTRUTURAL</span>
        <span className="cc__structural-cargo">{sp?.cargo || 'Colaborador'}</span>
        <span className="cc__structural-sep">·</span>
        <span className="cc__structural-dept">{dept}</span>
        {complete === true && (
          <span className="cc__structural-badge cc__structural-badge--ok">perfil ativo</span>
        )}
        {complete === false && (
          <span className="cc__structural-badge cc__structural-badge--warn">
            complete o cargo na Base Estrutural
          </span>
        )}
        {modCount != null && (
          <span className="cc__structural-meta">{modCount} módulos liberados</span>
        )}
      </div>
    </div>
  );
}
