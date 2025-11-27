import React, {useEffect, useState, useRef} from 'react';
import {StyleSheet, Text, View, Alert, AppState, AppStateStatus} from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import { CaptureProtection } from 'react-native-capture-protection';

const rnBiometrics = new ReactNativeBiometrics();

const PinScreen = () => {
  const [status, setStatus] = useState('Checking authentication availability...');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [timer, setTimer] = useState(10);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  // 🔐 Authentication Flow
  const triggerAuth = async () => {
    try {
      const {available, biometryType} = await rnBiometrics.isSensorAvailable();
      console.log('🔍 Auth availability:', {available, biometryType});

      if (available && biometryType !== null) {
        setStatus(`Biometric available (${biometryType}) — Authenticating...`);

        const {success} = await rnBiometrics.simplePrompt({
          promptMessage: 'Unlock Secure Vault',
          cancelButtonText: 'Cancel',
          allowDeviceCredentials: true,
        });

        if (success) {
          console.log('✅ Authenticated');
          setIsAuthenticated(true);
          setStatus('Authenticated ✅ (Biometric)');
          Alert.alert('Success', 'Authenticated !');
          startAutoLockTimer();
          return;
        } else {
          console.warn('User canceled biometric');
          setStatus('Biometric canceled ❌');
          Alert.alert('Canceled', 'Biometric authentication canceled.');
          return;
        }
      }

      // 🔁 Fallback — Device Credentials
      setStatus('No biometric found, trying device PIN / pattern / password...');
      const {success: deviceSuccess} = await rnBiometrics.simplePrompt({
        promptMessage: 'Unlock Secure Vault',
        cancelButtonText: 'Cancel',
        allowDeviceCredentials: true,
      });

      if (deviceSuccess) {
        console.log('✅ Authenticated ');
        setIsAuthenticated(true);
        setStatus('Authenticated ✅ (PIN / Pattern / Password)');
        Alert.alert('Success', 'Authenticated!');
        startAutoLockTimer();
      } else {
        console.warn('Device credential canceled or failed');
        setStatus('Authentication canceled ❌');
        Alert.alert('Canceled', 'Authentication canceled.');
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setStatus('Authentication failed ❌');
      Alert.alert(
        'Authentication Error',
        err?.message || 'Authentication failed. Please check your device security settings.'
      );
    }
  };

  // 🕒 Auto Lock Timer
  const startAutoLockTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(10);

    // timerRef.current = setInterval(() => {
    //   console.log("HI -------------")
    //   setTimer(prev => {
    //     if (prev <= 1) {
    //       clearInterval(timerRef.current!);
    //       handleAutoLock('timeout');
    //       return 0;
    //     }
    //     return prev - 1;
    //   });
    // }, 1000);
  };

  // 🔒 Lock handler
  const handleAutoLock = (reason: 'timeout' | 'background') => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isAuthenticated) return;

    console.log(`🔒 Vault locked due to ${reason}.`);
    setIsAuthenticated(false);
    setStatus(
      reason === 'timeout'
        ? 'Vault locked 🔒 — Timed out after 10s.'
        : 'Vault locked 🔒 — App minimized or backgrounded.'
    );
    Alert.alert(
      'Locked',
      reason === 'timeout'
        ? 'Vault locked automatically after 10 seconds.'
        : 'Vault locked because the app was minimized or backgrounded.'
    );
  };

  // 📱 Detect app going background or foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appState.current.match(/active/) &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        // If app was active and goes backgrounded, lock instantly
        handleAutoLock('background');
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // 🧹 Cleanup timer when unmounting
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 🚀 Authenticate when screen mounts
  useEffect(() => {
    triggerAuth();
  }, []);

    useEffect(() => {
    // 🔐 Activate protection
    CaptureProtection.prevent({
      screenshot: true,
      record: true,
      appSwitcher: true,
    });

    console.log('🛡️ Capture protection enabled');

    // Optional cleanup on unmount
    return () => {
      CaptureProtection.allow();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Vault Authentication</Text>a
      <Text style={styles.status}>{status}</Text>

      {/* {isAuthenticated && (
        <Text style={styles.timerText}>⏱ Auto-lock in: {timer}s</Text>
      )} */}
    </View>
  );
};

export default PinScreen;

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 20, fontWeight: 'bold', marginBottom: 12},
  status: {fontSize: 16, color: '#444', marginVertical: 8},
  timerText: {fontSize: 16, color: 'red', marginTop: 10},
});
