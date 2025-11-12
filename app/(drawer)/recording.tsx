import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { off, onValue, ref } from "firebase/database";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

// Firebase
import { db } from "@/firebase/firebaseConfig";

// Safe Area Context
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
// =================================================================
// 🚨 TYPE DEFINITION
// =================================================================
type Team = {
  id: string;
  name: string;
  overview?: string;
  members: Record<string, any>;
  tasks: Record<string, any>;
  meetings: Record<string, any>;
  joinCode?: string;
  creatorUID?: string;
};

// ✅ Adaptive Padding
const useAdaptivePadding = () => {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;

  const sizeFactor =
    screenHeight < 700
      ? 0.85
      : screenHeight > 820
      ? 1.15
      : 1;

  return {
    top: Math.max(insets.top, 12) * sizeFactor,
    bottom: Math.max(insets.bottom, 14) * sizeFactor,
    horizontal: Platform.OS === "ios" ? 16 : 14 * sizeFactor,
    block: Platform.OS === "ios" ? 20 * sizeFactor : 16 * sizeFactor,
  };
};

export default function RecordScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const adaptive = useAdaptivePadding();

  // =================================================================
  // ✅ STATE
  // =================================================================
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [status, setStatus] = useState<"ready" | "recording" | "paused" | "review">("ready");
  const [transcriptionText, setTranscriptionText] = useState("Tap record to start your meeting recording.");
  const [seconds, setSeconds] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const theme = useMemo(
    () => ({
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
    }),
    [isDark]
  );

  // =================================================================
  // ✅ Fetch User UID
  // =================================================================
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const stored = await AsyncStorage.getItem("loggedInUser");
        if (stored) {
          const user = JSON.parse(stored);
          setCurrentUserUid(user.uid || user.id || null);
        }
      } catch (error) {
        console.error("Failed to load user UID:", error);
      }
    };
    fetchUser();
  }, []);

  // =================================================================
  // ✅ Listen for Teams
  // =================================================================
  useEffect(() => {
    if (!currentUserUid) return;

    const teamsRef = ref(db, "teams");

    const listener = onValue(teamsRef, (snapshot) => {
      const teamsData = snapshot.val() || {};
      const teamList: Team[] = [];

      Object.entries(teamsData).forEach(([id, data]: [string, any]) => {
        if (data.members && currentUserUid in data.members) {
          teamList.push({
            id,
            name: data.name || "Unnamed Team",
            overview: data.overview || "",
            members: data.members,
            tasks: data.tasks,
            meetings: data.meetings,
            joinCode: data.joinCode,
            creatorUID: data.creatorUID,
          });
        }
      });
      setTeams(teamList);
    });

    return () => off(teamsRef, "value", listener);
  }, [currentUserUid]);

  // =================================================================
  // ✅ Timer
  // =================================================================
  useEffect(() => {
    if (status === "recording") {
      intervalRef.current = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [status]);

  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min < 10 ? "0" : ""}${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // =================================================================
  // ✅ Recording Logic
  // =================================================================
  const handleRecordResume = async () => {
    try {
      console.log("Starting recording...");
      setSeconds(0);
      setTranscriptionText("Recording in progress...");
      setStatus("recording");

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (error) {
      console.error("Recording error:", error);
      Alert.alert("Error", "Unable to start recording.");
    }
  };

const handleFinish = async () => {
  try {
    if (!recording) return;

    setStatus("review");
    setTranscriptionText("⏳ Uploading audio and generating meeting summary...");

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log("Audio saved at:", uri);

    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "audio/m4a",
      name: "recording.m4a",
    } as any);

    const response = await fetch("http://192.168.100.2:3000/transcribe", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const result = await response.json();
    console.log("Server result:", result);

    if (result.summary) {
      setTranscriptionText(result.summary);
    } else if (result.transcription) {
      setTranscriptionText(result.transcription);
    } else if (result.error) {
      setTranscriptionText(`❌ Transcription failed: ${result.error}`);
    } else {
      setTranscriptionText("❌ No transcription or summary returned from server.");
    }

    setRecording(null);
  } catch (error) {
    console.error("Finish error:", error);
    Alert.alert("Error", "Failed to finish recording or generate summary.");
  }
};



  const handleCheckAndSave = () => {
    if (teams.length === 0) {
      Alert.alert(
        "No Teams Found",
        "You must be a member of at least one team to save a meeting summary.",
        [{ text: "OK" }]
      );
      handleCancelSave();
    } else {
      setShowSaveModal(true);
    }
  };

  const handleSaveToTeam = (team: Team) => {
    setShowSaveModal(false);
    setSeconds(0);
    setStatus("ready");
    setTranscriptionText(`✅ Saved meeting summary to ${team.name}.`);
  };

  const handleCancelSave = () => {
    setShowSaveModal(false);
    setSeconds(0);
    setStatus("ready");
    setTranscriptionText("Recording cancelled. Tap record to start again.");
  };

  const statusText =
    status === "recording"
      ? "LIVE RECORDING"
      : status === "paused"
      ? "PAUSED"
      : status === "review"
      ? "REVIEW TRANSCRIPTION"
      : "READY TO START";

  const statusColor =
    status === "recording"
      ? theme.red
      : status === "paused"
      ? theme.secondary
      : status === "review"
      ? theme.green
      : theme.blue;

  // =================================================================
  // ✅ UI
  // =================================================================
  const renderRecordingControls = () => (
    <View
      style={[
        styles.controlArea,
        {
          backgroundColor: theme.card,
          padding: adaptive.block,
          marginBottom: adaptive.bottom,
        },
      ]}
    >
      <Text style={[styles.statusText, { color: statusColor }]}>• {statusText} •</Text>

      {(status === "recording" || status === "paused") && (
        <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(seconds)}</Text>
      )}

      <View style={styles.buttonRow}>
        {/* Record */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            {
              backgroundColor:
                status === "ready" ? theme.blue : theme.greyed,
            },
          ]}
          onPress={status === "ready" ? handleRecordResume : undefined}
          disabled={status !== "ready"}
        >
          <Ionicons name="mic" size={36} color="#FFF" />
        </TouchableOpacity>

        {/* Stop */}
        <TouchableOpacity
          style={[
            styles.smallButton,
            {
              backgroundColor:
                status === "recording" ? theme.green : theme.greyed,
            },
          ]}
          onPress={status === "recording" ? handleFinish : undefined}
          disabled={status !== "recording"}
        >
          <Ionicons name="stop" size={26} color="#FFF" />
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity
          style={[
            styles.smallButton,
            {
              backgroundColor:
                status === "review" ? theme.green : theme.greyed,
            },
          ]}
          onPress={status === "review" ? handleCheckAndSave : undefined}
          disabled={status !== "review"}
        >
          <Ionicons name="checkmark" size={26} color="#FFF" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.buttonLabel, { color: theme.text }]}>
        {status === "recording"
          ? "Tap stop to finish recording"
          : status === "review"
          ? "Review transcription before saving"
          : "Start new recording"}
      </Text>
    </View>
  );

  const renderSaveInterfaceModalContent = () => (
    <View style={styles.modalOverlayCenter}>
      <View
        style={[
          styles.modalContent,
          { backgroundColor: theme.card, padding: adaptive.block },
        ]}
      >
        <Text style={[styles.modalTitle, { color: theme.text }]}>
          Save Meeting Summary
        </Text>

        <Text
          style={[styles.statusText, { color: theme.secondary, marginBottom: 15 }]}
        >
          Select a team folder to save the summarized transcription.
        </Text>

        <ScrollView style={styles.teamListScroll}>
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamSelectButton,
                {
                  backgroundColor: theme.lightCard,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => handleSaveToTeam(team)}
            >
              <Ionicons name="folder-open-outline" size={24} color={theme.blue} />
              <Text style={[styles.teamSelectText, { color: theme.text }]}>
                {team.name}
              </Text>
              <Ionicons name="save-outline" size={20} color={theme.green} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSave}>
          <Text style={[styles.cancelButtonText, { color: theme.secondary }]}>
            Cancel & Discard
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: theme.bg,
          paddingTop: adaptive.top,
          paddingBottom: adaptive.bottom,
        },
      ]}
      edges={["top", "bottom"]}
    >
      <View style={[styles.container, { paddingHorizontal: adaptive.horizontal }]}>
        <View
          style={[
            styles.transcriptionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              padding: adaptive.block,
              marginBottom: adaptive.block,
            },
          ]}
        >
          <Text style={[styles.transcriptionTitle, { color: theme.blue }]}>
            Summarization:
          </Text>
          <ScrollView style={styles.transcriptScroll}>
            <Text
              style={[
                styles.transcriptText,
                { color: theme.text, opacity: status === "ready" ? 0.7 : 1 },
              ]}
            >
              {transcriptionText}
            </Text>
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

// =================================================================
// ✅ Styles
// =================================================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, alignItems: "center" },
  transcriptionCard: { flex: 1, width: "100%", borderRadius: 16, borderWidth: 1 },
  transcriptionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  transcriptScroll: { flex: 1 },
  transcriptText: { fontSize: 16, lineHeight: 24, minHeight: 150 },
  controlArea: { width: "100%", borderRadius: 16, alignItems: "center" },
  statusText: { fontSize: 14, fontWeight: "800", marginBottom: 8, letterSpacing: 1.5 },
  timerText: { fontSize: 20, fontWeight: "700", marginBottom: 15 },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    marginVertical: 8,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
  },
  smallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonLabel: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 22, fontWeight: "800", marginBottom: 10 },
  teamListScroll: { maxHeight: 250, width: "100%", marginBottom: 10 },
  teamSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  teamSelectText: { flex: 1, fontSize: 16, fontWeight: "600", marginLeft: 10 },
  cancelButton: { marginTop: 10, padding: 10 },
  cancelButtonText: { fontSize: 15, fontWeight: "600" },
});
