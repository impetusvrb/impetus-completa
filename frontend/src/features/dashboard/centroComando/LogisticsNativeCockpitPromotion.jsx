/**
 * INC-042 — Promoção visual logistics_native Z.23 no Centro de Comando.
 */
import React, { Suspense, useMemo } from 'react';
import {
  LOGISTICS_HUB_COMPONENTS,
  resolveAllLogisticsHubsForPromotion
} from '../../../cognitiveRuntime/cockpit/logisticsNativeCockpitRegistry.js';
import { buildLogisticsHubContext } from '../../../domains/logistics/cockpit/logisticsRuntimeHubAdapter.js';

function HubSkeleton({ label }) {
  return (
    <div className="cc-widget cc-kpi" style={{ minHeight: 120 }}>
      <div className="cc-kpi__header">
        <span>{label}</span>
      </div>
      <p className="cc-widget__empty" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        A carregar módulo logístico…
      </p>
    </div>
  );
}

/**
 * @param {{ centers?: object[], companyId?: string|number, runtime?: object, signalLoader?: object, hubContext?: object }} props
 */
export default function LogisticsNativeCockpitPromotion({
  centers = [],
  companyId,
  runtime,
  signalLoader,
  hubContext: hubContextProp
}) {
  const hubs = resolveAllLogisticsHubsForPromotion(centers);
  const hubContext = useMemo(
    () =>
      hubContextProp ||
      buildLogisticsHubContext({
        logistics_cognitive_centers: centers,
        logistics_cognitive_runtime: runtime,
        logistics_signal_loader: signalLoader
      }),
    [hubContextProp, centers, runtime, signalLoader]
  );

  if (!hubs.length) return null;

  return (
    <>
      {hubs.map(({ hubKey, label }) => {
        const Hub = LOGISTICS_HUB_COMPONENTS[hubKey];
        if (!Hub) return null;
        return (
          <div
            key={hubKey}
            className="cc__cell cc__cell--alive"
            data-logistics-native-hub={hubKey}
            data-whisper-focus-surface
            style={{ gridColumn: 'span 2' }}
          >
            <Suspense fallback={<HubSkeleton label={label} />}>
              <Hub hubContext={hubContext} companyId={companyId} />
            </Suspense>
          </div>
        );
      })}
    </>
  );
}
