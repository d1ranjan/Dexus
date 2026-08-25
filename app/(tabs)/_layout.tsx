import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";

export default function TabLayout() {
  const colors = useColors();
  const { isAuthenticated, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  if (loading) return <View style={{ alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View>;
  if (!isAuthenticated) return <Redirect href="/welcome" />;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen name="tasks" options={{ title: "Tasks", tabBarIcon: ({ color }) => <IconSymbol size={26} name="checkmark.circle.fill" color={color} /> }} />
      <Tabs.Screen name="capture" options={{ title: "Capture", tabBarIcon: ({ color }) => <IconSymbol size={30} name="plus.circle.fill" color={color} /> }} />
      <Tabs.Screen name="knowledge" options={{ title: "Knowledge", tabBarIcon: ({ color }) => <IconSymbol size={26} name="book.closed.fill" color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color }) => <IconSymbol size={26} name="square.grid.2x2.fill" color={color} /> }} />
    </Tabs>
  );
}
