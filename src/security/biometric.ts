import * as LocalAuthentication from 'expo-local-authentication';

export async function checkBiometricHardware(): Promise<{
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: string[];
}> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supportedTypesEnums = await LocalAuthentication.supportedAuthenticationTypesAsync();

  const supportedTypes = supportedTypesEnums.map((type) => {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'Fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'Face Recognition';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Iris';
      default:
        return 'Biometric';
    }
  });

  return { hasHardware, isEnrolled, supportedTypes };
}

export async function authenticateWithBiometrics(
  promptMessage: string = 'Unlock Aarogya Clinic EMR'
): Promise<boolean> {
  const { hasHardware, isEnrolled } = await checkBiometricHardware();
  if (!hasHardware || !isEnrolled) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Use PIN',
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: true,
  });

  return result.success;
}
