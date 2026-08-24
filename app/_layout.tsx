import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../src/constants/theme';

function NavigationGuard() {
  const { isReady, hasPin, isLocked } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isReady) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';

    if (!hasPin) {
      // First time launch: route to PIN setup
      if (segs[1] !== 'pin-setup') {
        router.replace('/(auth)/pin-setup');
      }
    } else if (isLocked) {
      // App is locked: route to unlock screen
      if (segs[1] !== 'unlock') {
        router.replace('/(auth)/unlock');
      }
    } else if (inAuthGroup) {
      // Unlocked: route to main dashboard
      router.replace('/(tabs)');
    }
  }, [isReady, hasPin, isLocked, segments, router]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTitleStyle: { fontWeight: '800', fontSize: 16, color: theme.colors.text },
        headerTintColor: theme.colors.primaryDark,
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="patients/new"
        options={{
          headerShown: true,
          title: 'Register New Patient',
        }}
      />
      <Stack.Screen
        name="patients/[id]/index"
        options={{
          headerShown: true,
          title: 'Patient Profile & Timeline',
        }}
      />
      <Stack.Screen
        name="patients/[id]/edit"
        options={{
          headerShown: true,
          title: 'Edit Patient Demographics',
        }}
      />
      <Stack.Screen
        name="patients/[id]/visit/new"
        options={{
          headerShown: true,
          title: "New Consultation Visit",
        }}
      />
      <Stack.Screen
        name="visits/[id]/edit"
        options={{
          headerShown: true,
          title: 'Edit Consultation Record',
        }}
      />
      <Stack.Screen
        name="backup/create"
        options={{
          headerShown: true,
          title: 'Mobile Storage Backup',
        }}
      />
      <Stack.Screen
        name="backup/restore"
        options={{
          headerShown: true,
          title: 'Restore Mobile Backup',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <NavigationGuard />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
