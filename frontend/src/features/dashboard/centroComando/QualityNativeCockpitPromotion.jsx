/**
 * INC-024 — Monta hubs quality existentes promovidos pelo runtime Z.23.
 * Sem novos widgets/KPIs — apenas lazy-load dos módulos já implementados.
 */
import React, { Suspense } from 'react';
import {
  QUALITY_HUB_COMPONENTS,
  resolvePromotedQualityHubs
} from '../../../cognitiveRuntime/cockpit/qualityNativeCockpitRegistry.js';

function HubSkeleton({ label }) {
  return (
    <div className="cc-widget cc-kpi" style={{ minHeight: 120 }}>
      <div className="cc-kpi__header">
        <span>{label}</span>
      </div>
      <p className="cc-widget__empty" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        A carregar módulo de qualidade…
      </p>
    </div>
  );
}

/**
 * @param {{ centers?: object[], companyId?: string|number, runtime?: object }} props
 */
export default function QualityNativeCockpitPromotion({ centers = [], companyId, runtime }) {
  const hubs = resolvePromotedQualityHubs(centers);
  if (!hubs.length) return null;

  return (
    <>
      {hubs.map(({ hubKey, label }) => {
        const Hub = QUALITY_HUB_COMPONENTS[hubKey];
        if (!Hub) return null;
        return (
          <div
            key={hubKey}
            className="cc__cell cc__cell--alive"
            data-quality-native-hub={hubKey}
            data-whisper-focus-surface
            style={{ gridColumn: 'span 2' }}
          >
            <Suspense fallback={<HubSkeleton label={label} />}>
              <Hub companyId={companyId} />
            </Suspense>
          </div>
        );
      })}
      {runtime?.centers?.length > hubs.length ? (
        <div
          className="cc__cell cc__cell--alive"
          style={{ gridColumn: 'span 2', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}
        >
          RUNTIME Z.23 · {runtime.centers.length} centers · modo {runtime.cockpit_mode || 'quality_native'}
        </div>
      ) : null}
    </>
  );
}
