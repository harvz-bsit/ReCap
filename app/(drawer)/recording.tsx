import { db } from "@/firebase/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { off, onValue, push, ref, set } from "firebase/database";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// =================================================================
// 🚨 TYPE DEFINITION
// =================================================================
type Team = {
  id: string;
  name: string;
  overview?: string;
  members: Record<string, any>;
  tasks?: Record<string, any>;
  meetings?: Record<string, any>;
  joinCode?: string;
  creatorUID?: string;
};

// ✅ Adaptive Padding
const useAdaptivePadding = () => {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get("window").height;

  const sizeFactor =
    screenHeight < 700 ? 0.85 : screenHeight > 820 ? 1.15 : 1;

  return {
    top: Math.max(insets.top, 12) * sizeFactor,
    bottom: Math.max(insets.bottom, 14) * sizeFactor,
    horizontal: Platform.OS === "ios" ? 16 : 14 * sizeFactor,
    block: Platform.OS === "ios" ? 20 * sizeFactor : 16 * sizeFactor,
  };
};

/// =================================================================
// 🧠 HELPER: Levenshtein Distance + Similarity
// =================================================================
function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

function similarity(a: string, b: string) {
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

function findClosestMember(
  assigneeName: string,
  members: Record<string, any>
) {
  assigneeName = assigneeName.toLowerCase().trim();
  const threshold = 0.7; // 70% similarity required
  let bestMatch: { uid: string; name: string } | null = null;
  let bestScore = 0;

  for (const [uid, member] of Object.entries(members)) {
    const memberName = member.name.toLowerCase().trim();

    // Split into first and last names
    const assigneeParts = assigneeName.split(" ");
    const memberParts = memberName.split(" ");

    // Compare against full name and individual parts
    const namesToCompare = [memberName, ...memberParts];

    for (const name of namesToCompare) {
      const score = similarity(assigneeName, name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { uid, name: member.name };
      }
    }
  }

  return bestScore >= threshold ? bestMatch : null;
}


// =================================================================
// 🚀 MAIN COMPONENT
// =================================================================
export default function RecordScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const adaptive = useAdaptivePadding();


  // STATE
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [status, setStatus] = useState<"ready" | "recording" | "paused" | "review">("ready");
  const [transcriptionText, setTranscriptionText] = useState("Tap record to start your meeting recording.");
  const [seconds, setSeconds] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isSummaryReady, setIsSummaryReady] = useState(false);
  const [summaryData, setSummaryData] = useState<{ summary: string; tasks: any[] }>({
    summary: "",
    tasks: [],
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      const data = snapshot.val() || {};
      const list: Team[] = [];
      Object.entries(data).forEach(([id, teamData]: [string, any]) => {
 // Only show teams where the user is the creator
if (teamData.creatorUID === currentUserUid) {
  list.push({
    id,
    name: teamData.name,
    overview: teamData.overview,
    members: teamData.members,
    tasks: teamData.tasks || {},
    meetings: teamData.meetings || {},
    joinCode: teamData.joinCode,
    creatorUID: teamData.creatorUID,
  });
}

      });
      setTeams(list);
    });
    return () => off(teamsRef, "value", listener);
  }, [currentUserUid]);

  // =================================================================
  // ✅ Timer
  // =================================================================
  useEffect(() => {
    if (status === "recording") {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [status]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // =================================================================
  // ✅ Recording Logic
  // =================================================================
  const handleRecordResume = async () => {
    try {
      setSeconds(0);
      setTranscriptionText("Recording in progress...");
      setStatus("recording");
      setIsSummaryReady(false);

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
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
      setIsSummaryReady(false);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      const formData = new FormData();
      formData.append("file", { uri, type: "audio/m4a", name: "recording.m4a" } as any);

      const response = await fetch("https://recap-buz6.onrender.com/transcribe", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.summary) {
        setSummaryData({ summary: result.summary, tasks: result.tasks || [] });
        setTranscriptionText(result.summary);
        setIsSummaryReady(true);
      } else {
        setTranscriptionText(`❌ Failed to summarize: ${result.error || "Unknown error"}`);
      }
      setRecording(null);
    } catch (error) {
      console.error("Finish error:", error);
      Alert.alert("Error", "Failed to finish recording or generate summary.");
    }
  };

  // =================================================================
  // ✅ Save to Firebase with Full Name Fallback
  // =================================================================
  const handleSaveToTeam = async (team: Team) => {
  try {
    if (!summaryData.summary) return;

    // -------------------------------
    // 1️⃣ Save Meeting Summary
    // -------------------------------
    const newMeetingRef = push(ref(db, `teams/${team.id}/meetings`));
    await set(newMeetingRef, {
      createdBy: currentUserUid,
      createdAt: Date.now(),
      status: "completed",
      summary: summaryData.summary,
    });

    // -------------------------------
    // 2️⃣ Save Tasks
    // -------------------------------
    // -------------------------------
// 2️⃣ Save Tasks
// -------------------------------
if (summaryData.tasks && summaryData.tasks.length > 0) {
  for (const task of summaryData.tasks) {
    // Assign to everyone if "everyone" mentioned
    if (task.assigneeName?.toLowerCase().includes("everyone")) {
      for (const [uid, member] of Object.entries(team.members)) {
        const taskRef = push(ref(db, `teams/${team.id}/tasks`));
        await set(taskRef, {
          task: task.text,
          status: "pending",
          assignee: uid,
          assigneeName: member.name,
          createdAt: Date.now(),
        });
      }
      continue;
    }

    // Assign to closest matching member
    let assigned: { uid: string; name: string } | null = null;
    if (task.assigneeName) {
      assigned = findClosestMember(task.assigneeName, team.members);
    }

    const taskRef = push(ref(db, `teams/${team.id}/tasks`));
    await set(taskRef, {
      task: task.text,
      status: "pending",
      createdAt: Date.now(),
      assignee: assigned?.uid || null,
      assigneeName: assigned?.name || null, // <-- null if no match
    });
  }
}

    setShowSaveModal(false);
    setSeconds(0);
    setStatus("ready");
    setIsSummaryReady(false);
    setTranscriptionText(`✅ Saved meeting summary and tasks to ${team.name}.`);
  } catch (error) {
    console.error("Error saving to RTDB:", error);
    Alert.alert("Error", "Failed to save meeting and tasks to database.");
  }
};


  const handleCancelSave = () => {
    setShowSaveModal(false);
    setSeconds(0);
    setStatus("ready");
    setIsSummaryReady(false);
    setTranscriptionText("Recording cancelled. Tap record to start again.");
  };

  // =================================================================
  // ✅ UI (UNCHANGED)
  // =================================================================
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

  const renderRecordingControls = () => (
    <View style={[styles.controlArea, { backgroundColor: theme.card, padding: adaptive.block, marginBottom: adaptive.bottom }]}>
      <Text style={[styles.statusText, { color: statusColor }]}>• {statusText} •</Text>
      {(status === "recording" || status === "paused") && (
        <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(seconds)}</Text>
      )}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.recordButton, { backgroundColor: status === "ready" ? theme.blue : theme.greyed }]}
          onPress={status === "ready" ? handleRecordResume : undefined}
          disabled={status !== "ready"}
        >
          <Ionicons name="mic" size={36} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: status === "recording" ? theme.green : theme.greyed }]}
          onPress={status === "recording" ? handleFinish : undefined}
          disabled={status !== "recording"}
        >
          <Ionicons name="stop" size={26} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: status === "review" && isSummaryReady ? theme.green : theme.greyed }]}
          onPress={status === "review" && isSummaryReady ? () => setShowSaveModal(true) : undefined}
          disabled={!(status === "review" && isSummaryReady)}
        >
          <Ionicons name="checkmark" size={26} color="#FFF" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.buttonLabel, { color: theme.text }]}>
        {status === "recording"
          ? "Tap stop to finish recording"
          : status === "review"
          ? isSummaryReady
            ? "Review transcription before saving"
            : "Generating summary..."
          : "Start new recording"}
      </Text>
    </View>
  );

  const renderSaveInterfaceModalContent = () => (
    <View style={styles.modalOverlayCenter}>
      <View style={[styles.modalContent, { backgroundColor: theme.card, padding: adaptive.block }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>Save Meeting Summary</Text>
        <Text style={[styles.statusText, { color: theme.secondary, marginBottom: 15 }]}>
          Select a team folder to save the summarized transcription.
        </Text>

        <ScrollView style={styles.teamListScroll}>
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[styles.teamSelectButton, { backgroundColor: theme.lightCard, borderColor: theme.border }]}
              onPress={() => handleSaveToTeam(team)}
            >
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
          <Text style={[styles.transcriptionTitle, { color: theme.blue }]}>Summarization:</Text>
          <ScrollView style={styles.transcriptScroll}>
            <Text style={[styles.transcriptText, { color: theme.text, opacity: status === "ready" ? 0.7 : 1 }]}>
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
// ✅ Styles (UNCHANGED)
// =================================================================
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
  smallButton: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginHorizontal: 10 },
  buttonLabel: { marginTop: 10, fontSize: 14, fontWeight: "500" },
  modalOverlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  teamListScroll: { maxHeight: 320, width: "100%" },
  teamSelectButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  teamSelectText: { fontSize: 16, fontWeight: "600" },
  cancelButton: { marginTop: 10, alignSelf: "center" },
  cancelButtonText: { fontSize: 14, fontWeight: "600" },
});
