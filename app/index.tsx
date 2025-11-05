import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  useColorScheme,
  Dimensions,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const LOGO_SOURCE = require("./images/recap-logo.png"); // Assuming this is correct
const { width } = Dimensions.get("window");

// --- Helper for Email Validation ---
const isValidEmail = (email: string) => {
  // Simple regex check for email format: local@domain.tld
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// --- Theme Helper ---
const getTheme = (isDark: boolean) => ({
  bg: isDark ? "#121212" : "#F4F8FB",
  card: isDark ? "#1E1E1E" : "#FFFFFF",
  text: isDark ? "#FFFFFF" : "#000000",
  blue: "#1976D2",
  secondary: isDark ? "#B0BEC5" : "#444",
  lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
  accent: "#1976D2",
  error: "#DC2626", // Red error color
});

export default function LoginScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = getTheme(isDark);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  
  // ✅ NEW: State for storing validation errors
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError(""); // Clear previous errors

    if (email.trim() === "" || password.trim() === "") {
      setError("Please enter both email and password.");
      return;
    }

    // ✅ NEW: Email Format Validation
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    
    // ✅ NEW: Basic Password Length Check (Good practice)
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }

    // --- Authentication successful (in a real app, you'd call an API here) ---
    router.replace("./(drawer)/dashboardscreen");
  };

  // Determine border color based on focus AND error state
  const getBorderColor = (isFocused: boolean) => {
    if (error && (emailFocus || passwordFocus)) return theme.error;
    if (isFocused) return theme.accent;
    return theme.secondary;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo Wrapper */}
        <View style={[styles.logoWrapper, { backgroundColor: theme.blue }]}>
          <Image source={LOGO_SOURCE} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Login Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>Welcome to ReCap</Text>
          <Text style={[styles.subtitle, { color: theme.secondary }]}>
            Minutes, Tasks, and Progress, All Connected.
          </Text>

          {/* Email Input */}
          <View
            style={[
              styles.inputContainer,
              { 
                borderColor: emailFocus && !error ? theme.accent : error ? theme.error : theme.secondary,
                backgroundColor: theme.lightCard,
                marginBottom: error ? 8 : 12,
              }
            ]}
          >
            <Ionicons name="mail-outline" size={20} color={emailFocus && !error ? theme.accent : error ? theme.error : theme.secondary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Email Address"
              placeholderTextColor={theme.secondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => { setEmail(text); if (error) setError(""); }} // Clear error on change
              onFocus={() => setEmailFocus(true)}
              onBlur={() => setEmailFocus(false)}
            />
          </View>
          
          {/* Password Input */}
          <View
            style={[
              styles.inputContainer,
              { 
                borderColor: passwordFocus && !error ? theme.accent : error ? theme.error : theme.secondary,
                backgroundColor: theme.lightCard,
                marginBottom: error ? 8 : 12,
              }
            ]}
          >
            <Ionicons name="lock-closed-outline" size={20} color={passwordFocus && !error ? theme.accent : error ? theme.error : theme.secondary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Password"
              placeholderTextColor={theme.secondary}
              secureTextEntry
              value={password}
              onChangeText={(text) => { setPassword(text); if (error) setError(""); }} // Clear error on change
              onFocus={() => setPasswordFocus(true)}
              onBlur={() => setPasswordFocus(false)}
            />
          </View>

          {/* ✅ NEW: Error Message Display */}
          {error ? (
            <Text style={[styles.errorText, { color: theme.error }]}>
              <Ionicons name="alert-circle-outline" size={14} color={theme.error} /> {error}
            </Text>
          ) : null}

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={{ color: theme.blue, fontSize: 13, fontWeight: '600' }}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.blue }]}
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>

          <Text style={[styles.orText, { color: theme.secondary }]}>or</Text>

          {/* Google Sign In */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              {
                backgroundColor: isDark ? theme.lightCard : theme.card,
                borderColor: theme.secondary,
              }
            ]}
            onPress={() =>
              Alert.alert("Google Sign In", "Google sign-in clicked")
            }
          >
            <Ionicons name="logo-google" size={20} color={theme.blue} />
            <Text style={[styles.googleText, { color: theme.text }]}>
              Sign up with Google
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  logo: {
    width: '80%',
    height: '80%',
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  errorText: { // ✅ NEW Style for Error Message
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'left',
    marginBottom: 10,
    marginTop: 5,
    paddingLeft: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 15,
  },
  loginButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  orText: {
    textAlign: "center",
    marginVertical: 16,
    fontSize: 14,
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
  registerContainer: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  }
});