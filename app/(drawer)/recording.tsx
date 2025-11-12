// RecordScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { Audio } from "expo-av";
import Constants from "expo-constants";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Team, teams } from "../../data/mockData.js";

// ----------------- EXPO CONFIG EXTRA -----------------
const expoExtra = (Constants as any).expoConfig?.extra as {
  openaiApiKey?: string;
  geminiApiKey?: string;
};

// ----------------- ADAPTIVE PADDING -----------------
const useAdaptivePadding = () => {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;
  const sizeFactor =
    screenHeight < 700 ? 0.85 :
    screenHeight > 820 ? 1.15 :
    1;

  return {
    top: Math.max(insets.top, 12) * sizeFactor,
    bottom: Math.max(insets.bottom, 14) * sizeFactor,
    horizontal: Platform.OS === "ios" ? 16 : 14 * sizeFactor,
    block: Platform.OS === "ios" ? 20 * sizeFactor : 16 * sizeFactor,
  };
};

// ----------------- MAIN SCREEN -----------------
export default function RecordScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const adaptive = useAdaptivePadding();

  const [status, setStatus] = useState<"ready" | "recording" | "paused" | "review">("ready");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("Tap the record button to start transcribing...");
  const [showSaveModal, setShowSaveModal] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const theme = {
    bg: isDark ? "#121212" : "#F4F8FB",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
    blue: "#1976D2",
    red: "#E53935",
    green: "#4CAF50",
    secondary: isDark ? "#B0BEC5" : "#444",
    lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
    border: isDark ? "#333" : "#E0E0E0",
    greyed: "#B0BEC5",
  };

  // ----------------- TIMER -----------------
  useEffect(() => {
    if (status === "recording") {
      intervalRef.current = setInterval(() => setSeconds(prev => prev + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status]);

  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min < 10 ? "0" : ""}${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // ----------------- RECORDING PERMISSIONS -----------------
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow microphone access.");
      }
    })();
  }, []);

  // ----------------- RECORDING CONTROLS -----------------
  const handleRecordResume = async () => {
    if (status === "ready") {
      setSeconds(0);
      setTranscriptionText("Listening for speech... Transcribing...");
      await startRecording();
      setStatus("recording");
    } else if (status === "paused") {
      setTranscriptionText(prev => prev + "\n\n--- Recording Resumed ---");
      setStatus("recording");
    }
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {
      console.error("Failed to start recording", err);
      setStatus("ready");
    }
  };

  const handlePause = () => {
    if (status === "recording") {
      setStatus("paused");
      setTranscriptionText(prev => prev + "\n\n--- Recording Paused ---");
    }
  };

  // ----------------- WHISPER -----------------
  const transcribeWithWhisper = async (fileUri: string) => {
    try {
      const formData = new FormData();
      formData.append("file", { uri: fileUri, name: "recording.wav", type: "audio/wav" } as any);

      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${expoExtra?.openaiApiKey ?? ""}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data.text;
    } catch (err) {
      console.error("Whisper API error:", err);
      return "🎤 Transcription failed.";
    }
  };

  // ----------------- GEMINI -----------------
  const summarizeWithGemini = async (text: string) => {
    try {
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${expoExtra?.geminiApiKey ?? ""}`,
          },
          body: JSON.stringify({
            prompt: `Summarize this meeting and list actionable tasks:\n\n${text}`,
            temperature: 0.7,
            candidateCount: 1,
            maxOutputTokens: 500,
          }),
        }
      );
      const data = await resp.json();
      return data.candidates?.[0]?.output ?? "📝 Gemini summary failed.";
    } catch (err) {
      console.error("Gemini API error:", err);
      return "📝 Gemini summary failed.";
    }
  };

  // ----------------- FINISH RECORDING -----------------
  const handleFinish = async () => {
    if (!recording) return;
    setStatus("review");
    setTranscriptionText(prev => prev + "\n\n--- Processing transcription ---");

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        const transcription = await transcribeWithWhisper(uri);
        setTranscriptionText(transcription);

        const summary = await summarizeWithGemini(transcription);
        console.log("Gemini Summary / Tasks:", summary);
      }
    } catch (err) {
      console.error("Error finishing recording:", err);
      setTranscriptionText("Transcription failed.");
    }
  };

  // ----------------- SAVE -----------------
  const handleCheckAndSave = () => status === "review" && setShowSaveModal(true);
  const handleSaveToTeam = (team: Team) => {
    setShowSaveModal(false);
    setSeconds(0);
    setStatus("ready");
    setTranscriptionText(`✅ Successfully saved meeting summary to **${team.name}**. Tap record to start again.`);
  };
  const handleCancelSave = () => {
    setShowSaveModal(false);
    setSeconds(0);
    setStatus("ready");
    setTranscriptionText("Recording cancelled. Tap record to start again.");
  };

  // ----------------- RENDER -----------------
  const renderRecordingControls = () => (
    <View style={[styles.controlArea, { backgroundColor: theme.card, padding: adaptive.block, marginBottom: adaptive.bottom }]}>
      <Text style={[styles.statusText, { color: status === "recording" ? theme.red : status === "paused" ? theme.secondary : status === "review" ? theme.green : theme.blue }]}>
        • {status === "recording" ? "LIVE RECORDING" : status === "paused" ? "PAUSED" : status === "review" ? "REVIEW TRANSCRIPTION" : "READY TO START"} •
      </Text>

      {(status === "recording" || status === "paused") && (
        <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(seconds)}</Text>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.smallButton, { backgroundColor: status === "recording" ? theme.red : theme.greyed }]} onPress={status === "recording" ? handlePause : undefined} disabled={status !== "recording"}>
          <Ionicons name="pause" size={24} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.recordButton, { backgroundColor: status === "ready" || status === "paused" ? theme.blue : theme.greyed }]} onPress={status === "ready" || status === "paused" ? handleRecordResume : undefined} disabled={!(status === "ready" || status === "paused")}>
          <Ionicons name="play" size={36} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.smallButton, { backgroundColor: status === "review" ? theme.green : theme.greyed }]} onPress={status === "review" ? handleCheckAndSave : handleFinish} disabled={!(status === "recording" || status === "paused" || status === "review")}>
          <Ionicons name={status === "review" ? "checkmark" : "stop"} size={26} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSaveInterfaceModalContent = () => (
    <View style={styles.modalOverlayCenter}>
      <View style={[styles.modalContent, { backgroundColor: theme.card, padding: adaptive.block }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>Save Meeting Summary</Text>
        <Text style={[styles.statusText, { color: theme.secondary, marginBottom: 15 }]}>Select a team folder to save the summarized transcription.</Text>
        <ScrollView style={styles.teamListScroll}>
          {teams.map(team => (
            <TouchableOpacity key={team.id} style={[styles.teamSelectButton, { backgroundColor: theme.lightCard, borderColor: theme.border }]} onPress={() => handleSaveToTeam(team)}>
              <Ionicons name="folder-open-outline" size={24} color={theme.blue} />
              <Text style={[styles.teamSelectText, { color: theme.text }]}>{team.name}</Text>
              <Ionicons name="save-outline" size={20} color={theme.green} />
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSave}>
          <Text style={[styles.cancelButtonText, { color: theme.secondary }]}>Cancel & Discard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg, paddingTop: adaptive.top, paddingBottom: adaptive.bottom }]} edges={["top", "bottom"]}>
      <View style={[styles.container, { paddingHorizontal: adaptive.horizontal }]}>
        <View style={[styles.transcriptionCard, { backgroundColor: theme.card, borderColor: theme.border, padding: adaptive.block, marginBottom: adaptive.block }]}>
          <Text style={[styles.transcriptionTitle, { color: theme.blue }]}>Live Transcription:</Text>
          <ScrollView style={styles.transcriptScroll}>
            <Text style={[styles.transcriptText, { color: theme.text, opacity: status === "ready" ? 0.7 : 1 }]}>{transcriptionText}</Text>
          </ScrollView>
        </View>
        {renderRecordingControls()}
      </View>
      <Modal visible={showSaveModal} animationType="fade" transparent>
        {renderSaveInterfaceModalContent()}
      </Modal>
    </SafeAreaView>
  );
}

// ----------------- STYLES -----------------
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, alignItems: "center" },
  transcriptionCard: { flex: 1, width: "100%", borderRadius: 16, borderWidth: 1 },
  transcriptionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  transcriptScroll: { flex: 1 },
  transcriptText: { fontSize: 16, lineHeight: 24, minHeight: 150 },
  controlArea: { width: "100%", borderRadius: 16, alignItems: "center" },
  statusText: { fontSize: 14, fontWeight: "800", marginBottom: 8, letterSpacing: 1.5 },
  timerText: { fontSize: 20, fontWeight: "700", marginBottom: 15 },
  buttonRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", width: "100%", marginVertical: 8 },
  recordButton: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginHorizontal: 20 },
  smallButton: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" },
  buttonLabel: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  modalOverlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", maxWidth: 400, borderRadius: 20, alignItems: "center" },
  modalTitle: { fontSize: 22, fontWeight: "800", marginBottom: 10 },
  teamListScroll: { maxHeight: 250, width: "100%", marginBottom: 10 },
  teamSelectButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  teamSelectText: { flex: 1, fontSize: 16, fontWeight: "600", marginLeft: 10 },
  cancelButton: { marginTop: 10, padding: 10 },
  cancelButtonText: { fontSize: 15, fontWeight: "600" },
});
