/**
 * GF-027 — Promoção visual supply_native Z.23 no Centro de Comando.
 */
import React, { Suspense, useMemo } from 'react';
import {
  SUPPLY_HUB_COMPONENTS,
  resolveAllSupplyHubsForPromotion
} from '../../../cognitiveRuntime/cockpit/supplyNativeCockpitRegistry.js';
import { isSupplyMenuVisible } from '../../../domains/supply/config/supplyFeatureFlags.js';

function HubSkeleton({ label }) {
  return (
    <div className="cc-widget cc-kpi" style={{ minHeight: 120 }}>
      <div className="cc-kpi__header"><span>{label}</span></div>
      <p className="cc-widget__empty" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        A carregar módulo Supply…
      </p>
    </div>
  );
}

export default function SupplyNativeCockpitPromotion({
  centers = [],
  runtime,
  signalLoader
}) {
  if (!isSupplyMenuVisible()) return null;
  if (runtime?.promotion_applied !== true && runtime?.consolidation_applied !== true) {
    return null;
  }

  const hubs = resolveAllSupplyHubsForPromotion(centers);
  const hubContext = useMemo(
    () => ({
      supply_cognitive_centers: centers,
      supply_cognitive_runtime: runtime,
      supply_signal_loader: signalLoader
    }),
    [centers, runtime, signalLoader]
  );

  if (!hubs.length) return null;

  return (
    <>
      {hubs.map(({ hubKey, label, component }) => {
        const Hub = SUPPLY_HUB_COMPONENTS[hubKey];
        if (!Hub) return null;
        return (
          <Suspense key={hubKey} fallback={<HubSkeleton label={label} />}>
            <div data-supply-native-hub={hubKey} data-hub-context={JSON.stringify(hubContext?.supply_cognitive_runtime?.runtime_id || '')}>
              <Hub />
            </div>
          </Suspense>
        );
      })}
    </>
  );
}
