import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { equalTo, get, orderByChild, push, query, ref } from "firebase/database";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";

import bcrypt from "bcryptjs";
import { db } from "../firebase/firebaseConfig";

const { width } = Dimensions.get("window");

const WORK_TYPES = ["Professional", "Student", "Business Owner", "Other"];
const LOGO = require("../app/images/recap-logo.png");

export default function SignupScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [workType, setWorkType] = useState("Professional");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const passwordRegex =
    /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  // Show toast only when leaving the password field with invalid password
  const handlePasswordBlur = () => {
    if (password && !passwordRegex.test(password)) {
      setShowToast(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Hide after 2.5 seconds
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowToast(false));
      }, 2500);
    }
  };

  const handleSignup = async () => {
  if (!email || !password || !confirmPassword || !firstName || !lastName || !nickname) {
    return Alert.alert("Error", "Please fill all fields");
  }

  if (!passwordRegex.test(password)) {
    return Alert.alert(
      "Weak Password",
      "Password must be at least 8 characters, include 1 uppercase, 1 number, and 1 symbol."
    );
  }

  if (password !== confirmPassword) {
    return Alert.alert("Error", "Passwords do not match");
  }

  setLoading(true);
  try {
    // Check for existing email
    const emailQuery = query(ref(db, "users"), orderByChild("email"), equalTo(email.trim().toLowerCase()));
    const snap = await get(emailQuery);
    if (snap.exists()) {
      return Alert.alert("Error", "Email already exists");
    }

    const uid = push(ref(db, "users")).key as string;
    const hashedPassword = bcrypt.hashSync(password, 10);

    const userData = {
      id: uid,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nickname: nickname.trim(),
      workType,
      department: "IT",
    };

    await set(ref(db, `users/${uid}`), userData);
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
            placeholder="Password"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onBlur={handlePasswordBlur}
          />

          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
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

        {/* ✅ Toast for Password Standards */}
        {showToast && (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.toastText}>
              Password must include:{"\n"}• 8+ chars • 1 uppercase • 1 number • 1 symbol
            </Text>
          </Animated.View>
        )}
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
