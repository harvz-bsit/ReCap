import AsyncStorage from "@react-native-async-storage/async-storage";
import bcrypt from "bcryptjs";
import { useRouter } from "expo-router";
import { child, get, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { db } from "../firebase/firebaseConfig";

const LOGO = require("../app/images/recap-logo.png");
const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showPassword, setShowPassword] = useState(false);


  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleLogin = async () => {
    if (!email || !password)
      return Alert.alert("Error", "Please fill all fields");

    setLoading(true);

    try {
      const snapshot = await get(child(ref(db), "users"));
      const data = snapshot.val();

      const foundUser = data
        ? Object.entries(data).find(([_, user]: any) => user.email === email)
        : null;

      if (!foundUser) {
        Alert.alert("Error", "Invalid email or password");
        return;
      }

      const [uid, userObj]: any = foundUser;
      const passwordMatch = bcrypt.compareSync(password, userObj.password);

      if (!passwordMatch) {
        Alert.alert("Error", "Invalid email or password");
        return;
      }

      await AsyncStorage.setItem(
        "loggedInUser",
        JSON.stringify({
          uid,
          email: userObj.email,
          firstName: userObj.firstName,
          lastName: userObj.lastName,
          nickname: userObj.nickname,
          workType: userObj.workType,
          department: userObj.department || "IT",
        })
      );

      Alert.alert("Success", "Logged in successfully!");
      router.replace("/(drawer)/dashboardscreen");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const theme = {
    bg: isDark ? "#121212" : "#F4F8FB",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
    inputBg: isDark ? "#2A2A2A" : "#FFF",
    button: "#1976D2",
    quote: isDark ? "#CCCCCC" : "#555",
  };

  return (
<KeyboardAvoidingView
  style={{ flex: 1, backgroundColor: theme.bg }}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: keyboardHeight + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Login Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
<View style={styles.logoWrapper}>
  <Image source={LOGO} style={styles.logo} />
</View>




          {/* Quote Inside Card */}
          <Text style={[styles.quoteText, { color: theme.quote }]}>
            AI-powered meeting summaries and task extraction, all in one place.
          </Text>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>Login to ReCap</Text>

          {/* Email Input */}
          <TextInput
            placeholder="Email"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            style={[
              styles.input,
              { backgroundColor: theme.inputBg, color: theme.text },
            ]}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

{/* Password Input with Show/Hide Toggle */}
<View style={{ width: "100%", position: "relative" }}>
  <TextInput
    placeholder="Password"
    placeholderTextColor={isDark ? "#888" : "#aaa"}
    style={[
      styles.input,
      {
        backgroundColor: theme.inputBg,
        color: theme.text,
        paddingRight: 45, // space for eye icon
      },
    ]}
    secureTextEntry={!showPassword}
    value={password}
    onChangeText={setPassword}
  />

  {/* Eye Icon */}
  <TouchableOpacity
    onPress={() => setShowPassword(!showPassword)}
    style={{
      position: "absolute",
      right: 12,
      top: 22,
      padding: 4,
    }}
  >
    <Ionicons
      name={showPassword ? "eye" : "eye-off"}
      size={22}
      color={isDark ? "#bbb" : "#555"}
    />
  </TouchableOpacity>
</View>


          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.button }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Logging in..." : "Login"}
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <TouchableOpacity
            onPress={() => router.push("/signup")}
            style={{ marginTop: 20 }}
          >
            <Text style={{ color: theme.text, textAlign: "center" }}>
              Don’t have an account?{" "}
              <Text style={{ fontWeight: "bold", color: theme.button }}>
                Sign Up
              </Text>
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
logoWrapper: {
  backgroundColor: "#1976D2",   // Blue branding color
  borderRadius: 20,
  padding: 18,
  width: width * 0.55,
  height: width * 0.3,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 25,
  shadowColor: "#000",
shadowOpacity: 0.15,
shadowRadius: 8,
elevation: 5,

},

  quoteText: {
    fontSize: 15,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 20,
    opacity: 0.9,
    paddingHorizontal: 10,
  },
title: {
  fontSize: 26,
  fontWeight: "700",
  marginBottom: 20,
},

  input: {
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
    fontSize: 16,
    width: "100%",
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 17,
    textAlign: "center",
  },

logo: {
  width: "90%",
  height: "90%",
  resizeMode: "contain",
},



});
