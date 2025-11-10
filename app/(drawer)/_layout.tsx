import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomDrawer from "../components/customdrawer";

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
    <Drawer
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: true,

        header: ({ navigation }) => (
          <View
            style={{
              borderBottomWidth: 1,
              elevation: 4,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 4,
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
              paddingTop: insets.top,
              paddingBottom: 4,
            }}
          >
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
                <Ionicons name="menu" size={24} color={theme.text} />
              </TouchableOpacity>

              <Text style={[styles.headerText, { color: theme.text }]}>ReCap</Text>

              <View style={{ width: 40 }} />
            </View>
          </View>
        ),

        sceneContainerStyle: {
          backgroundColor: theme.bg,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Drawer.Screen name="dashboardscreen" options={{ title: "Dashboard" }} />
      <Drawer.Screen name="teams" options={{ title: "Teams" }} />
      <Drawer.Screen name="recording" options={{ title: "Record" }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "700",
    flexGrow: 1,
    marginLeft: 10,
  },
  menuButton: {
    padding: 6,
  },
});
