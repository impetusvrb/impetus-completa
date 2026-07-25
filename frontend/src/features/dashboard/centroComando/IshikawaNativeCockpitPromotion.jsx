/**
 * GF-018 — Promoção visual ishikawa_native Z.23 no Centro de Comando.
 */
import React, { Suspense, useMemo } from 'react';
import {
  ISHIKAWA_HUB_COMPONENTS,
  resolveAllIshikawaHubsForPromotion
} from '../../../cognitiveRuntime/cockpit/ishikawaNativeCockpitRegistry.js';
import { buildIshikawaHubContext } from '../../../domains/ishikawa/cockpit/ishikawaRuntimeHubAdapter.js';

function HubSkeleton({ label }) {
  return (
    <div className="cc-widget cc-kpi" style={{ minHeight: 120 }}>
      <div className="cc-kpi__header">
        <span>{label}</span>
      </div>
      <p className="cc-widget__empty" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        A carregar módulo Ishikawa…
      </p>
    </div>
  );
}

export default function IshikawaNativeCockpitPromotion({
  centers = [],
  companyId,
  runtime,
  signalLoader,
  hubContext: hubContextProp
}) {
  if (runtime?.promotion_applied !== true) {
    return null;
  }

  const hubs = resolveAllIshikawaHubsForPromotion(centers);
  const hubContext = useMemo(
    () =>
      hubContextProp ||
      buildIshikawaHubContext({
        ishikawa_cognitive_centers: centers,
        ishikawa_cognitive_runtime: runtime,
        ishikawa_signal_loader: signalLoader
      }),
    [hubContextProp, centers, runtime, signalLoader]
  );

  if (!hubs.length) return null;

  return (
    <>
      {hubs.map(({ hubKey, label }) => {
        const Hub = ISHIKAWA_HUB_COMPONENTS[hubKey];
        if (!Hub) return null;
        return (
          <div
            key={hubKey}
            className="cc__cell cc__cell--alive"
            data-ishikawa-native-hub={hubKey}
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
