import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { child, get, push, ref } from "firebase/database";
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
import bcrypt from "react-native-bcrypt";
import { db } from "../firebase/firebaseConfig";

const LOGO = require("../app/images/recap-logo.png");
const { width } = Dimensions.get("window");

export default function SignupScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [workType, setWorkType] = useState("Professional");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !firstName || !lastName || !nickname || !workType) {
      return Alert.alert("Error", "Please fill all fields");
    }
    setLoading(true);

    try {
      // Check if email already exists
      const snapshot = await get(child(ref(db), "users"));
      const data = snapshot.val();
      const emailExists = data
        ? Object.values(data).some((user: any) => user.email === email)
        : false;

      if (emailExists) {
        Alert.alert("Error", "Email already exists");
        return;
      }

      // Hash password
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      // Save to DB
      await push(ref(db, "users"), {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        nickname,
        workType,
      });

      Alert.alert("Success", "Account created successfully!");
      router.replace("/");
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Logo */}
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
            placeholder="Password"
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
              <Picker.Item label="Professional" value="Professional" />
              <Picker.Item label="Student" value="Student" />
              <Picker.Item label="Business Owner" value="Business Owner" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.button }]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "Creating..." : "Sign Up"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/")} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.text, textAlign: "center" }}>
              Already have an account? <Text style={{ fontWeight: "bold", color: theme.button }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  logoWrapper: { width: width * 0.4, height: width * 0.4, marginBottom: 20 },
  logo: { width: "100%", height: "100%" },
  card: { width: "100%", borderRadius: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 6 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 24 },
  input: { borderRadius: 12, padding: 12, marginVertical: 8, fontSize: 16 },
  pickerContainer: { borderRadius: 12, marginVertical: 8 },
  button: { borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16, textAlign: "center" },
});
