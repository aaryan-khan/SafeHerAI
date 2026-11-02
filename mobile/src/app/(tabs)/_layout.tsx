import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Icon, theme, type IconName } from '@/ui';

const tabIcon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) => <Icon name={name} size={24} color={color} />;

/**
 * The bottom tab bar shown after login.
 * Only features that actually work get a tab; Map, Contacts etc. are added as they are built.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundDeep,
          borderTopColor: theme.colors.border,
          height: 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: theme.fonts.medium, fontSize: 12 },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
