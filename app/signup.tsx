import { Picker } from "@react-native-picker/picker";
import bcrypt from "bcryptjs";
import { useRouter } from "expo-router";
import { push, ref, set } from "firebase/database";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
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

const WORK_TYPES = ["Professional", "Student", "Business Owner", "Other"];

export default function SignupScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [workType, setWorkType] = useState(WORK_TYPES[0]);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !firstName || !lastName || !nickname) {
      return Alert.alert("Error", "Please fill all fields");
    }

    if (password.length < 6) {
      return Alert.alert("Error", "Password should be at least 6 characters");
    }

    setLoading(true);

    try {
      // ✅ Generate a custom unique ID in Realtime Database
      const uid = push(ref(db, "users")).key as string;

      // ✅ Hash password using bcryptjs
      const hashedPassword = bcrypt.hashSync(password, 10);

      // ✅ User data to store in Realtime DB
      const userData = {
        id: uid, // keep for historical reads if needed
        email,
        firstName,
        lastName,
        nickname,
        workType,
        department: "IT",
        password: hashedPassword, // bcrypt hash
      };

      // ✅ Save the user to the database
      await set(ref(db, `users/${uid}`), userData);

      Alert.alert("Success", "Account created successfully!");
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create account");
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoWrapper}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>Sign Up</Text>

          <TextInput
            placeholder="First Name"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            value={firstName}
            onChangeText={setFirstName}
          />

          <TextInput
            placeholder="Last Name"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            value={lastName}
            onChangeText={setLastName}
          />

          <TextInput
            placeholder="Nickname"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            value={nickname}
            onChangeText={setNickname}
          />

          <TextInput
            placeholder="Email"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            placeholder="Password (min 6 characters)"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <View style={[styles.pickerContainer, { backgroundColor: theme.inputBg }]}>
            <Picker
              selectedValue={workType}
              onValueChange={(value) => setWorkType(value)}
              style={{ color: theme.text }}
            >
              {WORK_TYPES.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.button }]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating Account..." : "Sign Up"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/")} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.text, textAlign: "center" }}>
              Already have an account?{" "}
              <Text style={{ fontWeight: "bold", color: theme.button }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles remain exactly the same
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoWrapper: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 20,
  },
  logo: {
    width: "100%",
    height: "100%",
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
  input: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    fontSize: 16,
  },
  pickerContainer: {
    borderRadius: 12,
    marginVertical: 8,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
});
