import { useEffect, useCallback } from 'react';
import { WebHaptics } from 'web-haptics';

let webHapticsInstance: WebHaptics | null = null;

export function useWebHaptics() {
  useEffect(() => {
    if (!webHapticsInstance && typeof window !== 'undefined') {
      try {
        webHapticsInstance = new WebHaptics();
      } catch (err) {
        console.warn('Failed to initialize WebHaptics:', err);
      }
    }
  }, []);

  const trigger = useCallback((type?: string, options?: any) => {
    const hapticsEnabled = localStorage.getItem('momnts_haptics_enabled') !== 'false';
    if (!hapticsEnabled) return;

    if (webHapticsInstance) {
      webHapticsInstance.trigger(type as any, options).catch((err) => {
        console.warn('Haptic trigger failed:', err);
      });
    }
  }, []);

  const cancel = useCallback(() => {
    if (webHapticsInstance) {
      webHapticsInstance.cancel();
    }
  }, []);

  return {
    trigger,
    cancel,
    isSupported: typeof window !== 'undefined' && 'vibrate' in navigator,
  };
}
