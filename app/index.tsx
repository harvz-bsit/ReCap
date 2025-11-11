// LoginScreen.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import bcrypt from "bcryptjs";
import { useRouter } from "expo-router";
import { child, get, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  Alert,
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

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Keyboard listeners
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
        ? Object.entries(data).find(([uid, user]: any) => user.email === email)
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

      // ✅ STORE FULL USER DATA FOR TEAMS SYSTEM
      await AsyncStorage.setItem(
        "loggedInUser",
        JSON.stringify({
          uid,
          email: userObj.email,
          firstName: userObj.firstName,
          lastName: userObj.lastName,
          workType: userObj.workType || "Member",
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
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: keyboardHeight + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
  style={{
    backgroundColor: "#1976D2",
    padding: 11,
    borderRadius: 25,   // ✅ rounded square
    marginBottom: 30,
    marginRight: 20,
    marginLeft: 20,
    marginTop: 20,
    justifyContent: 'center',

    width: 250,
    height: 200,        // ✅ expanded width
    alignItems: "center",


  }}
>
  <Image source={LOGO} style={styles.logo} resizeMode="contain" />
</View>


        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>Login</Text>

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

          <TextInput
            placeholder="Password"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            style={[
              styles.input,
              { backgroundColor: theme.inputBg, color: theme.text },
            ]}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.button }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Logging in..." : "Login"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/signup")}
            style={{ marginTop: 16 }}
          >
            <Text style={{ color: theme.text, textAlign: "center" }}>
              Don't have an account?{" "}
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
    padding: 24,
  },
  logo: {
    width: 150,
    height: 120,
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
    marginBottom: 24,
  },
  input: { borderRadius: 12, padding: 12, marginVertical: 8, fontSize: 16 },
  button: { borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
});
