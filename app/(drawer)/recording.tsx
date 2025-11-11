import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

// Import Firebase config
import { db } from "@/firebase/firebaseConfig"; // Assuming your firebaseConfig is in this path

// ✅ Correct Safe Area Context
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// =================================================================
// 🚨 TYPE DEFINITION (Replaced mockData import)
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

// ✅ Universal Adaptive Padding
const useAdaptivePadding = () => {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;

  const sizeFactor =
    screenHeight < 700
      ? 0.85 // Small Android phones
      : screenHeight > 820
      ? 1.15 // Tablets / big phones
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
  // ✅ NEW STATE: Firebase/User Data
  // =================================================================
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]); // Real teams array

  const [status, setStatus] = useState<"ready" | "recording" | "paused" | "review">(
    "ready"
  );
  const [transcriptionText, setTranscriptionText] = useState(
    "Tap the record button to start transcribing your meeting or voice note. Real-time text will appear here."
  );
  const [seconds, setSeconds] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
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
  // ✅ LOGIC: Fetch User UID (Runs once on load)
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
  // ✅ LOGIC: Real-time Teams Listener (Runs when UID changes)
  // =================================================================
  useEffect(() => {
    if (!currentUserUid) return;

    const teamsRef = ref(db, "teams");

    const listener = onValue(teamsRef, (snapshot) => {
      const teamsData = snapshot.val() || {};
      const teamList: Team[] = [];

      Object.entries(teamsData).forEach(([id, data]: [string, any]) => {
        // Filter: Only include teams where the current user is a member
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

    // Cleanup listener on unmount
    return () => off(teamsRef, "value", listener);
  }, [currentUserUid]);
  
  // =================================================================
  // ✅ Timer Logic (Original)
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

  const handleRecordResume = () => {
    if (status === "ready") {
      setSeconds(0);
      setTranscriptionText("Listening for speech... Transcribing...");
      setStatus("recording");
    } else if (status === "paused") {
      setTranscriptionText((prev) => prev + "\n\n--- Recording Resumed ---");
      setStatus("recording");
    }
  };

  const handlePause = () => {
    if (status === "recording") {
      setStatus("paused");
      setTranscriptionText((prev) => prev + "\n\n--- Recording Paused ---");
    }
  };

  const handleFinish = () => {
    if (status === "recording" || status === "paused") {
      setStatus("review");
      setTranscriptionText(
        (prev) =>
          prev +
          "\n\n--- Recording Finished. Review your transcription before saving. ---"
      );
    }
  };

  const handleCheckAndSave = () => {
    if (status === "review") {
      if (teams.length === 0) {
        Alert.alert(
          "No Teams Found",
          "You must be a member of at least one team to save a meeting summary.",
          [{ text: "OK" }]
        );
        handleCancelSave(); // Reset state
      } else {
        setShowSaveModal(true);
      }
    }
  };

  const handleSaveToTeam = (team: Team) => {
    // 🚨 TODO: Implement Firebase logic here to push the transcription/summary
    // to team.meetings or a separate 'summaries' collection under the team ID.
    
    // For now, simulate save:
    setShowSaveModal(false);
    setSeconds(0);
    setStatus("ready");
    setTranscriptionText(
      `✅ Successfully saved meeting summary to **${team.name}**. Tap the record button to start a new transcription.`
    );
  };

  const handleCancelSave = () => {
    setShowSaveModal(false);
    setSeconds(0);
    setStatus("ready");
    setTranscriptionText("Recording cancelled. Tap the record button to start a new transcription.");
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

  // ✅ Controls
  const renderRecordingControls = () => (
    <View
      style={[
        styles.controlArea,
        {
          backgroundColor: theme.card,
          padding: adaptive.block,
          marginBottom: adaptive.bottom, // ✅ lifts controls above nav bar
        },
      ]}
    >
      <Text style={[styles.statusText, { color: statusColor }]}>
        • {statusText} •
      </Text>

      {(status === "recording" || status === "paused") && (
        <Text style={[styles.timerText, { color: theme.text }]}>
          {formatTime(seconds)}
        </Text>
      )}

      <View style={styles.buttonRow}>
        {/* Pause */}
        <TouchableOpacity
          style={[
            styles.smallButton,
            { backgroundColor: status === "recording" ? theme.red : theme.greyed },
          ]}
          onPress={status === "recording" ? handlePause : undefined}
          disabled={status !== "recording"}
        >
          <Ionicons name="pause" size={24} color="#FFF" />
        </TouchableOpacity>

        {/* Record */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            {
              backgroundColor:
                status === "ready" || status === "paused"
                  ? theme.blue
                  : theme.greyed,
            },
          ]}
          onPress={
            status === "ready" || status === "paused"
              ? handleRecordResume
              : undefined
          }
          disabled={!(status === "ready" || status === "paused")}
        >
          <Ionicons name="play" size={36} color="#FFF" />
        </TouchableOpacity>

        {/* Stop / Check */}
        <TouchableOpacity
          style={[
            styles.smallButton,
            {
              backgroundColor:
                status === "recording" ||
                status === "paused" ||
                status === "review"
                  ? theme.green
                  : theme.greyed,
            },
          ]}
          onPress={
            status === "review"
              ? handleCheckAndSave
              : status === "recording" || status === "paused"
              ? handleFinish
              : undefined
          }
          disabled={
            !(
              status === "recording" ||
              status === "paused" ||
              status === "review"
            )
          }
        >
          <Ionicons
            name={status === "review" ? "checkmark" : "stop"}
            size={26}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>

      <Text style={[styles.buttonLabel, { color: theme.text }]}>
        {status === "recording"
          ? "Tap to Pause or Stop"
          : status === "paused"
          ? "Tap to Resume"
          : status === "review"
          ? "Review transcription, then tap Check to Save"
          : "Start New Recording"}
      </Text>
    </View>
  );

  // ✅ Save Modal Content
  const renderSaveInterfaceModalContent = () => (
    <View style={styles.modalOverlayCenter}>
      <View
        style={[
          styles.modalContent,
          {
            backgroundColor: theme.card,
            padding: adaptive.block,
          },
        ]}
      >
        <Text style={[styles.modalTitle, { color: theme.text }]}>
          Save Meeting Summary
        </Text>

        <Text
          style={[
            styles.statusText,
            { color: theme.secondary, marginBottom: 15 },
          ]}
        >
          Select a team folder to save the summarized transcription.
        </Text>

        <ScrollView style={styles.teamListScroll}>
          {teams.length === 0 ? (
            <Text style={{ color: theme.secondary, textAlign: 'center', padding: 20 }}>
                You are not currently a member of any team.
            </Text>
          ) : (
            teams.map((team) => (
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
            ))
          )}
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
            Live Transcription:
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
    alignItems: "center",
  },

  transcriptionCard: {
    flex: 1,
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
  },

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

  controlArea: {
    width: "100%",
    borderRadius: 16,
    alignItems: "center",
  },

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

  teamListScroll: {
    maxHeight: 250,
    width: "100%",
    marginBottom: 10,
  },

  teamSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },

  teamSelectText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },

  cancelButton: { marginTop: 10, padding: 10 },

  cancelButtonText: { fontSize: 15, fontWeight: "600" },
});