import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { addScreenCaptureListener, removeScreenCaptureListener } from 'react-native-screen-capture-secure';

type Props = {
  intervalMs?: number;
  onCompromiseDetected: (reason: string) => void;
};

/**
 * Real-time device security watcher.
 * Runs continuous checks for root/jailbreak, dev mode, debug mode, and screen capture.
 */
export const useRealtimeDeviceSecurity = ({
  intervalMs = 10000,
  onCompromiseDetected,
}: Props) => {
  const appState = useRef<AppStateStatus>('active');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const runSecurityChecks = async () => {
    try {
      const [isRooted, isEmulator, isDeveloperMode] = await Promise.all([
        DeviceInfo.isDeviceRooted?.(),
        DeviceInfo.isEmulator?.(),
        DeviceInfo.isDeveloperMode?.(),
      ]);

      const isDebug = __DEV__;

      if (isRooted) return onCompromiseDetected('Device is rooted');
      if (isEmulator) return onCompromiseDetected('Running on emulator');
      if (isDeveloperMode) return onCompromiseDetected('Developer mode enabled');
      if (isDebug) return onCompromiseDetected('Debugger detected');
    } catch (error) {
      console.error('Realtime device check error:', error);
    }
  };

  useEffect(() => {
    runSecurityChecks();
    intervalRef.current = setInterval(runSecurityChecks, intervalMs);

    const appStateSub = AppState.addEventListener('change', (next) => {
      appState.current = next;
      if (next === 'active') runSecurityChecks();
    });

    const captureListener = addScreenCaptureListener(() => {
      onCompromiseDetected('Screen capture detected');
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      appStateSub.remove();
      removeScreenCaptureListener(captureListener);
    };
  }, []);
};
