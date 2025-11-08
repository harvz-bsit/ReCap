import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CustomDrawer from "../components/customdrawer";

// Theme System
const getTheme = (isDark: boolean) => ({
  text: isDark ? "#FFFFFF" : "#000000",
  bg: isDark ? "#121212" : "#F4F8FB",
  card: isDark ? "#1E1E1E" : "#FFFFFF",
  border: isDark ? "#333" : "#ddd",
});

export default function DrawerLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = getTheme(isDark);

  const insets = useSafeAreaInsets();

  return (
    // ✅ WRAP ENTIRE NAVIGATION WITH AUTH PROVIDER\
      <Drawer
        drawerContent={(props) => <CustomDrawer {...props} />}
        screenOptions={{
          headerShown: true,

          // ✅ Custom Header
          header: ({ navigation }) => (
            <View
              style={{
                borderBottomWidth: 1,
                elevation: 4,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 4,
                marginBottom: 3,
                backgroundColor: theme.card,
                borderBottomColor: theme.border,
                paddingTop: insets.top,
                paddingBottom: 4,
              }}
            >
              <View style={styles.headerContainer}>
                <TouchableOpacity
                  onPress={() => navigation.toggleDrawer()}
                  style={[styles.menuButton, { paddingHorizontal: 12 }]}
                >
                  <Ionicons name="menu" size={24} color={theme.text} />
                </TouchableOpacity>

                <Text style={[styles.headerText, { color: theme.text }]}>
                  ReCap
                </Text>

                <View style={{ width: 40 }} />
              </View>
            </View>
          ),

          // ✅ Safe area for screen
          sceneContainerStyle: {
            paddingBottom: insets.bottom,
            backgroundColor: theme.bg,
          },

          drawerContentStyle: {
            backgroundColor: theme.bg,
          },

          drawerContentContainerStyle: {
            paddingBottom: insets.bottom,
          },

          drawerLabelStyle: {
            color: theme.text,
          },
        }}
      >
        <Drawer.Screen name="dashboardscreen" options={{ title: "Dashboard" }} />
        <Drawer.Screen name="teams" options={{ title: "Teams" }} />
        <Drawer.Screen name="recording" options={{ title: "Record" }} />

        {/* Hidden logout screen */}
        <Drawer.Screen
          name="logout"
          options={{
            drawerItemStyle: { height: 0, overflow: "hidden" },
          }}
        />
      </Drawer>
  );
}

// ✅ Static Styles
const styles = StyleSheet.create({
  headerContainer: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  headerText: {
    fontFamily: "Inter-Bold",
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 10,
    flexGrow: 1,
  },

  menuButton: {
    padding: 6,
  },
});
