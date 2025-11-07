import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useColorScheme,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "../auth/GoogleAuth";

const LOGO_SOURCE = require("./images/recap-logo.png");
const { width } = Dimensions.get("window");

const getTheme = (isDark: boolean) => ({
  bg: isDark ? "#121212" : "#F4F8FB",
  card: isDark ? "#1E1E1E" : "#FFFFFF",
  text: isDark ? "#FFFFFF" : "#000000",
  blue: "#1976D2",
  secondary: isDark ? "#B0BEC5" : "#444",
  lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
  accent: "#1976D2",
  error: "#DC2626",
});

export default function LoginScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = getTheme(isDark);
  const router = useRouter();

  // ✅ useAuth INSIDE the component (correct place)
  const { signInWithGoogle, user, loading } = useAuth();

  // ✅ Redirect if already logged in
  if (user) {
    router.replace("(drawer)/dashboardscreen");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.bg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={[styles.logoWrapper, { backgroundColor: theme.blue }]}>
          <Image
            source={LOGO_SOURCE}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Login Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            Welcome to ReCap
          </Text>
          <Text style={[styles.subtitle, { color: theme.secondary }]}>
            Minutes, Tasks, and Progress, All Connected.
          </Text>

          {/* Google Sign In */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              {
                backgroundColor: isDark ? theme.lightCard : theme.card,
                borderColor: theme.secondary,
              },
            ]}
            onPress={signInWithGoogle}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color={theme.blue} />
            <Text style={[styles.googleText, { color: theme.text }]}>
              {loading ? "Please wait..." : "Sign up with Google"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logoWrapper: {
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  logo: {
    width: "80%",
    height: "80%",
  },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
  },
  googleText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
