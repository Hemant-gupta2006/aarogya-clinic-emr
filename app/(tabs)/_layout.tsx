import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/constants/theme';
import { LayoutDashboard, Users, BarChart3, Settings } from 'lucide-react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  const tabHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.cardBorder,
        },
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 17,
          color: theme.colors.text,
        },
        headerTintColor: theme.colors.primaryDark,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.cardBorder,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'AarogyaEMR Clinical Workspace',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          headerTitle: 'Patient Directory',
          tabBarIcon: ({ color, size }) => <Users size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          headerTitle: 'Clinical Practice Reports',
          tabBarIcon: ({ color, size }) => <BarChart3 size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Clinic Settings & Backup',
          tabBarIcon: ({ color, size }) => <Settings size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

