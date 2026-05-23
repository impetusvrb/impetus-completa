/**
 * Pré-visualização de módulos liberados pelo cadastro do cargo (fiel à Base Estrutural).
 */
import React, { useEffect, useState, useRef } from 'react';
import { adminStructural } from '../../services/api';
import { splitLines } from './RoleIdentityForm';

function formToPreviewPayload(form) {
  if (!form) return {};
  return {
    department_id: form.department_id || null,
    sector_id: form.sector_id || null,
    dashboard_functional_hint: form.dashboard_functional_hint || null,
    operational_scope: form.operational_scope || null,
    recommended_permissions: splitLines(form.recommended_permissions),
    visible_themes: splitLines(form.visible_themes),
    approval_domains: splitLines(form.approval_domains),
    hidden_themes: splitLines(form.hidden_themes),
    access_strategic_data: !!form.access_strategic_data,
    access_financial_data: !!form.access_financial_data,
    access_hr_data: !!form.access_hr_data,
    access_critical_indicators: !!form.access_critical_indicators
  };
}

export default function RoleCadastroModulePreview({ form }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await adminStructural.roles.previewModules(formToPreviewPayload(form));
        setPreview(r?.data?.data || r?.data || null);
      } catch {
        setPreview(null);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    form?.department_id,
    form?.sector_id,
    form?.dashboard_functional_hint,
    form?.operational_scope,
    form?.recommended_permissions,
    form?.visible_themes,
    form?.approval_domains,
    form?.hidden_themes,
    form?.access_strategic_data,
    form?.access_financial_data,
    form?.access_hr_data,
    form?.access_critical_indicators
  ]);

  if (!form?.department_id && !form?.recommended_permissions && !form?.visible_themes) {
    return null;
  }

  const complete = preview?.structural_complete;
  const modules = preview?.modules || [];

  return (
    <div className="role-cadastro-preview" role="region" aria-label="Módulos liberados pelo cadastro">
      <h4 className="structural-form-section-title">Módulos liberados (cadastro fiel)</h4>
      <p className="role-cadastro-preview__hint">
        Lista calculada apenas a partir deste cargo: permissões, temas, flags e escopo — sem perfil
        genérico do sistema.
      </p>
      {loading && <p className="role-cadastro-preview__meta">A calcular…</p>}
      {!loading && preview && (
        <>
          <p
            className={
              complete
                ? 'role-cadastro-preview__status role-cadastro-preview__status--ok'
                : 'role-cadastro-preview__status role-cadastro-preview__status--warn'
            }
          >
            {complete
              ? `${modules.length} módulo(s) contextual(is) + universais (Dashboard, Pró-Ação, etc.)`
              : preview.message || 'Cadastro incompleto — preencha departamento, setor e governança.'}
          </p>
          {modules.length > 0 && (
            <ul className="role-cadastro-preview__list">
              {modules.map((m) => (
                <li key={m.menu_key}>
                  <code>{m.menu_key}</code>
                  <span>{m.label}</span>
                </li>
              ))}
            </ul>
          )}
          {preview.blocked_menu_keys?.length > 0 && (
            <p className="role-cadastro-preview__blocked">
              Bloqueados por temas ocultos: {preview.blocked_menu_keys.join(', ')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
