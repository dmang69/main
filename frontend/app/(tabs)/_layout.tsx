import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { StyleSheet, View, Platform } from "react-native";
import { colors } from "@/src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.mutedFg,
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          fontWeight: "700",
          marginBottom: Platform.OS === "ios" ? 0 : 6,
        },
        tabBarStyle: {
          backgroundColor: Platform.OS === "web" ? colors.background : "transparent",
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: Platform.OS === "ios" ? 88 : 70,
          paddingTop: 8,
          ...(Platform.OS !== "web" && { position: "absolute" }),
        },
        tabBarBackground:
          Platform.OS === "web"
            ? undefined
            : () => (
                <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(3,3,5,0.7)" }]} />
                </BlurView>
              ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} />,
          tabBarButtonTestID: "tab-home",
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          title: "Agents",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          tabBarButtonTestID: "tab-agents",
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: "Missions",
          tabBarIcon: ({ color, size }) => <Ionicons name="flash" size={size} color={color} />,
          tabBarButtonTestID: "tab-missions",
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: "Vault",
          tabBarIcon: ({ color, size }) => <Ionicons name="archive" size={size} color={color} />,
          tabBarButtonTestID: "tab-vault",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Command",
          tabBarIcon: ({ color, size }) => <Ionicons name="diamond" size={size} color={color} />,
          tabBarButtonTestID: "tab-command",
        }}
      />
    </Tabs>
  );
}
