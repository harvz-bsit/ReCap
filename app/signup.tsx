import { Picker } from "@react-native-picker/picker";
import bcrypt from "bcryptjs";
import { useRouter } from "expo-router";
import { equalTo, get, orderByChild, push, query, ref, set } from "firebase/database";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";
import { db } from "../firebase/firebaseConfig";

const { width } = Dimensions.get("window");
const WORK_TYPES = ["Professional", "Student", "Business Owner", "Other"];

export default function SignupScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  // ----------------- FORM STATE -----------------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [workType, setWorkType] = useState("Professional");
  const [loading, setLoading] = useState(false);

  // ----------------- OTP STATE -----------------
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // ----------------- PASSWORD TOAST -----------------
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showToast, setShowToast] = useState(false);
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const theme = {
    bg: isDark ? "#121212" : "#F4F8FB",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
    inputBg: isDark ? "#2A2A2A" : "#FFF",
    button: "#1976D2",
  };

  const handlePasswordBlur = () => {
    if (password && !passwordRegex.test(password)) {
      setShowToast(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setShowToast(false));
      }, 2500);
    }
  };

  // ----------------- SEND OTP -----------------
  const sendOtp = async () => {
    setOtpLoading(true);
    try {
      const response = await fetch("https://recap-1.onrender.com/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json(); // fixed JSON parsing
      if (data.success) {
        setOtpSent(true);
        setOtpModalVisible(true);
        Alert.alert("OTP Sent", "Check your email for the OTP");
      } else {
        throw new Error(data.error || "Failed to send OTP");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setOtpLoading(false);
    }
  };

  // ----------------- VERIFY OTP -----------------
  const verifyOtp = async () => {
    setOtpLoading(true);
    try {
      const response = await fetch("https://recap-1.onrender.com/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otpCode }),
      });

      const data = await response.json(); // fixed JSON parsing
      if (data.success) {
        setOtpModalVisible(false);
        completeSignup();
      } else {
        throw new Error(data.error || "Invalid OTP");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setOtpLoading(false);
    }
  };

  // ----------------- COMPLETE SIGNUP -----------------
  const completeSignup = async () => {
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !password || !confirmPassword || !firstName || !lastName || !nickname) {
        return Alert.alert("Error", "Please fill all fields");
      }
      if (!passwordRegex.test(password)) {
        return Alert.alert(
          "Weak Password",
          "Password must be at least 8 characters, include 1 uppercase, 1 number, and 1 symbol."
        );
      }
      if (password !== confirmPassword) return Alert.alert("Error", "Passwords do not match");

      const emailQuery = query(ref(db, "users"), orderByChild("email"), equalTo(trimmedEmail));
      const snap = await get(emailQuery);
      if (snap.exists()) return Alert.alert("Error", "Email already exists");

      const uid = push(ref(db, "users")).key as string;
      const hashedPassword = bcrypt.hashSync(password, 10);

      await set(ref(db, `users/${uid}`), {
        id: uid,
        email: trimmedEmail,
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim(),
        workType,
        department: "IT",
      });

      Alert.alert("Success", "Account created successfully!");
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ----------------- INITIAL SIGNUP BUTTON -----------------
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
    if (password !== confirmPassword) return Alert.alert("Error", "Passwords do not match");

    await sendOtp();
  };

  // ----------------- UI -----------------
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>Sign Up</Text>

          <TextInput placeholder="First Name" placeholderTextColor={isDark ? "#888" : "#aaa"} style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} value={firstName} onChangeText={setFirstName} />

          <TextInput placeholder="Last Name" placeholderTextColor={isDark ? "#888" : "#aaa"} style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} value={lastName} onChangeText={setLastName} />

          <TextInput placeholder="Nickname" placeholderTextColor={isDark ? "#888" : "#aaa"} style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} value={nickname} onChangeText={setNickname} />

          <TextInput placeholder="Email" placeholderTextColor={isDark ? "#888" : "#aaa"} style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

          <TextInput placeholder="Password" placeholderTextColor={isDark ? "#888" : "#aaa"} style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} secureTextEntry value={password} onChangeText={setPassword} onBlur={handlePasswordBlur} />

          <TextInput placeholder="Confirm Password" placeholderTextColor={isDark ? "#888" : "#aaa"} style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

          <View style={[styles.pickerContainer, { backgroundColor: theme.inputBg }]}>
            <Picker selectedValue={workType} onValueChange={(value) => setWorkType(value)} style={{ color: theme.text }}>
              {WORK_TYPES.map((type) => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity style={[styles.button, { backgroundColor: theme.button }]} onPress={handleSignup} disabled={loading || otpLoading}>
            <Text style={styles.buttonText}>{otpLoading ? "Sending OTP..." : loading ? "Creating..." : "Sign Up"}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/")} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.text, textAlign: "center" }}>
              Already have an account? <Text style={{ fontWeight: "bold", color: theme.button }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {showToast && (
          <Animated.View style={[styles.toast, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
            <Text style={styles.toastText}>Password must include:{"\n"}• 8+ chars • 1 uppercase • 1 number • 1 symbol</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* OTP Modal */}
      <Modal visible={otpModalVisible} animationType="fade" transparent>
        <View style={styles.otpModalOverlay}>
          <View style={[styles.otpModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.title, { color: theme.text, fontSize: 20, marginBottom: 12 }]}>Enter OTP</Text>
            <TextInput
              placeholder="OTP Code"
              placeholderTextColor={isDark ? "#888" : "#aaa"}
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
              keyboardType="number-pad"
              value={otpCode}
              onChangeText={setOtpCode}
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: theme.button }]} onPress={verifyOtp} disabled={otpLoading}>
              <Text style={styles.buttonText}>{otpLoading ? "Verifying..." : "Verify OTP"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  toast: { position: "absolute", bottom: 50, backgroundColor: "#E53935", padding: 12, borderRadius: 8 },
  toastText: { color: "#fff", fontSize: 14, textAlign: "center" },
  otpModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  otpModalContent: { width: "85%", borderRadius: 16, padding: 24 },
});
