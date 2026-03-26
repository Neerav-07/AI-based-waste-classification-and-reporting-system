import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { AppTheme } from '@/constants/app-theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AppTheme.colors.white,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.68)',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#163527',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Classify',
          tabBarIcon: ({ color }) => <Ionicons color={color} name="leaf-outline" size={22} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => <Ionicons color={color} name="alert-circle-outline" size={22} />,
        }}
      />
      <Tabs.Screen
        name="locality"
        options={{
          title: 'Locality',
          tabBarIcon: ({ color }) => <Ionicons color={color} name="map-outline" size={22} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Ionicons color={color} name="time-outline" size={22} />,
        }}
      />
    </Tabs>
  );
}
