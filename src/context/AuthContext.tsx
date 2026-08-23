import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  isPinConfigured,
  verifyAppPin,
  isBiometricEnabled,
  getAutoLockTimeout,
  setAppPin as setPinInStorage,
} from '../security/pin';
import { authenticateWithBiometrics } from '../security/biometric';
import { getDatabase } from '../db/client';

interface AuthContextType {
  isReady: boolean;
  hasPin: boolean;
  isLocked: boolean;
  biometricSupported: boolean;
  biometricActive: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
  lockApp: () => void;
  checkStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [biometricActive, setBiometricActive] = useState(false);

  const backgroundTimestampRef = useRef<number | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const pinExists = await isPinConfigured();
      setHasPin(pinExists);
      const bioEnabled = await isBiometricEnabled();
      setBiometricActive(bioEnabled);

      if (!pinExists) {
        // First launch - no PIN yet
        setIsLocked(false);
      } else {
        setIsLocked(true);
      }
    } catch {
      // Error checking status
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Handle AppState changes (Auto-Lock on background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestampRef.current = Date.now();
      } else if (nextState === 'active') {
        if (backgroundTimestampRef.current && hasPin) {
          const elapsedMinutes = (Date.now() - backgroundTimestampRef.current) / (1000 * 60);
          const timeoutMinutes = await getAutoLockTimeout();

          if (elapsedMinutes >= timeoutMinutes) {
            setIsLocked(true);
          }
        }
        backgroundTimestampRef.current = null;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hasPin]);

  const unlockWithPin = async (pin: string): Promise<boolean> => {
    const isValid = await verifyAppPin(pin);
    if (isValid) {
      // Pre-warm database
      await getDatabase();
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const unlockWithBiometrics = async (): Promise<boolean> => {
    if (!biometricActive) return false;
    const success = await authenticateWithBiometrics();
    if (success) {
      await getDatabase();
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const setupPin = async (pin: string): Promise<void> => {
    await setPinInStorage(pin);
    setHasPin(true);
    setIsLocked(false);
    // Initialize DB on first PIN setup
    await getDatabase();
  };

  const lockApp = () => {
    if (hasPin) {
      setIsLocked(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isReady,
        hasPin,
        isLocked,
        biometricSupported: true,
        biometricActive,
        unlockWithPin,
        unlockWithBiometrics,
        setupPin,
        lockApp,
        checkStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
