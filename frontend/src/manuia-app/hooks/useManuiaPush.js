/**
 * Web Push (PWA): VAPID + Service Worker + POST /app/devices.
 */
import { useCallback, useEffect, useState } from 'react';
import { manuiaApp } from '../../services/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function useManuiaPush() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window
    );
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported || typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return Notification.requestPermission();
  }, [supported]);

  /**
   * Regista SW, obtém chave VAPID, subscreve push e envia subscription ao backend.
   */
  const subscribeAndRegister = useCallback(async () => {
    if (!supported) return { ok: false, reason: 'unsupported' };
    const perm = await requestPermission();
    if (perm !== 'granted') return { ok: false, reason: perm };

    await navigator.serviceWorker.register('/manuia-sw.js', { scope: '/' });
    const reg = await navigator.serviceWorker.ready;

    const keyRes = await manuiaApp.getVapidPublicKey();
    const publicKey = keyRes.data?.publicKey;
    if (!publicKey) {
      return { ok: false, reason: 'no_vapid', detail: keyRes.data?.error };
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    await manuiaApp.registerDevice({
      subscription: sub.toJSON(),
      platform: 'web',
      device_label: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 120) : undefined
    });

    return { ok: true };
  }, [supported, requestPermission]);

  return { supported, requestPermission, subscribeAndRegister };
}
