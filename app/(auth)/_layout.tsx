import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="pin-setup" options={{ headerShown: false }} />
      <Stack.Screen name="unlock" options={{ headerShown: false }} />
    </Stack>
  );
}
