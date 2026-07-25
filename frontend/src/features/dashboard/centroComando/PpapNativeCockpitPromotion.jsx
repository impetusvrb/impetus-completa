/**
 * GF-004 — Promoção visual ppap_native Z.23 no Centro de Comando.
 */
import React, { Suspense, useMemo } from 'react';
import {
  PPAP_HUB_COMPONENTS,
  resolveAllPpapHubsForPromotion
} from '../../../cognitiveRuntime/cockpit/ppapNativeCockpitRegistry.js';
import { buildPpapHubContext } from '../../../domains/ppap/cockpit/ppapRuntimeHubAdapter.js';

function HubSkeleton({ label }) {
  return (
    <div className="cc-widget cc-kpi" style={{ minHeight: 120 }}>
      <div className="cc-kpi__header">
        <span>{label}</span>
      </div>
      <p className="cc-widget__empty" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        A carregar módulo PPAP…
      </p>
    </div>
  );
}

export default function PpapNativeCockpitPromotion({
  centers = [],
  companyId,
  runtime,
  signalLoader,
  hubContext: hubContextProp
}) {
  const hubs = resolveAllPpapHubsForPromotion(centers);
  const hubContext = useMemo(
    () =>
      hubContextProp ||
      buildPpapHubContext({
        ppap_cognitive_centers: centers,
        ppap_cognitive_runtime: runtime,
        ppap_signal_loader: signalLoader
      }),
    [hubContextProp, centers, runtime, signalLoader]
  );

  if (!hubs.length) return null;

  return (
    <>
      {hubs.map(({ hubKey, label }) => {
        const Hub = PPAP_HUB_COMPONENTS[hubKey];
        if (!Hub) return null;
        return (
          <div
            key={hubKey}
            className="cc__cell cc__cell--alive"
            data-ppap-native-hub={hubKey}
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
