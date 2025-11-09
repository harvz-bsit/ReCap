// app/(drawer)/teams/[id].tsx
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { onValue, ref } from "firebase/database";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { teams as staticTeams } from "../../../data/mockData";
import { db } from "../../../firebase/firebaseConfig";

// --- Types ---
interface Team {
  id: string;
  name: string;
  tasks: Task[];
  meetings: Meeting[];
  members: { name: string; role: string; department: string }[];
}

interface Task {
  id: string;
  title: string;
  deadline: string;
  status: "Pending" | "Completed";
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
}

// --- Helpers ---
const formatDate = (dateStr: string) => {
  try {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const date = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  } catch {
    return dateStr;
  }
};

const getTheme = (isDark: boolean) => ({
  bg: isDark ? "#121212" : "#F4F8FB",
  card: isDark ? "#1E1E1E" : "#FFFFFF",
  text: isDark ? "#FFFFFF" : "#000000",
  secondary: isDark ? "#B0BEC5" : "#444",
  blue: "#1976D2",
  accent: isDark ? "#1565C0" : "#2196F3",
  lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
  iconBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
  iconBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
});

const StatCard = ({ icon, color, number, label, theme }: any) => (
  <View style={[styles.statCard, { backgroundColor: theme.lightCard }]}>
    <View style={[styles.iconWrapper, { backgroundColor: theme.iconBg, borderColor: theme.iconBorder }]}>
      <MaterialIcons name={icon} size={26} color={color} />
    </View>
    <Text style={[styles.statNumber, { color: theme.text }]}>{number}</Text>
    <Text style={[styles.statLabel, { color: theme.secondary }]}>{label}</Text>
  </View>
);

const TaskItem = ({ task, theme, toggleTaskStatus }: any) => {
  const isCompleted = task.status === "Completed";
  return (
    <View style={[styles.taskCard, { backgroundColor: theme.card }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskTitle, { color: isCompleted ? "#16A34A" : theme.text, textDecorationLine: isCompleted ? "line-through" : "none" }]}>
          {task.title}
        </Text>
        <Text style={[styles.taskDeadline, { color: theme.secondary }]}>
          {isCompleted ? `Completed: ${formatDate(task.deadline)}` : `Deadline: ${formatDate(task.deadline)}`}
        </Text>
      </View>
      <TouchableOpacity onPress={() => toggleTaskStatus(task.id)} style={styles.iconButtonContainer}>
        <View style={[styles.iconSquare, { backgroundColor: theme.iconBg, borderColor: theme.iconBorder }]}>
          <Ionicons name={isCompleted ? "checkbox" : "square-outline"} size={22} color={isCompleted ? "#16A34A" : theme.blue} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const MeetingItem = ({ meeting, theme, getMeetingStatus }: any) => {
  const status = getMeetingStatus(meeting.date, meeting.time);
  const statusColor = status === "Missed" ? "#E53935" : theme.blue;
  return (
    <View style={[styles.meetingCard, { backgroundColor: theme.card }]}>
      <View style={[styles.iconWrapperSmall, { backgroundColor: theme.iconBg, borderColor: theme.iconBorder }]}>
        <MaterialIcons name={status === "Missed" ? "event-busy" : "calendar-today"} size={22} color={theme.blue} />
      </View>
      <View style={{ marginLeft: 10 }}>
        <Text style={[styles.meetingTitle, { color: theme.text }]}>{meeting.title}</Text>
        <Text style={[styles.meetingInfo, { color: theme.secondary }]}>{formatDate(meeting.date)} • {meeting.time}</Text>
        <Text style={{ color: statusColor, fontWeight: "600", fontSize: 13 }}>{status}</Text>
      </View>
    </View>
  );
};

export default function TeamDetailsScreen() {
  const { id, team: teamParam } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = getTheme(isDark);

  // start with param or static
  const initialTeam: Team | undefined = teamParam ? JSON.parse(teamParam as string) : staticTeams.find((t) => t.id === id);
  const [team, setTeam] = useState<Team | undefined>(initialTeam);
  const [taskList, setTaskList] = useState<Task[]>(initialTeam ? [...(initialTeam.tasks || [])] : []);
  const [showMembers, setShowMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // load from firebase if id exists (and keep mock fallback)
  useEffect(() => {
    if (!id) return;
    const teamRef = ref(db, `teams/${id}`);
    const off = onValue(teamRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const fetched: Team = {
          id,
          name: data.name || "Unnamed Team",
          members: data.members || [],
          tasks: data.tasks || [],
          meetings: data.meetings || [],
        };
        setTeam(fetched);
        setTaskList(fetched.tasks || []);
      } else {
        // if no firebase data -> keep initialTeam (mock)
        setTeam(initialTeam);
        setTaskList(initialTeam?.tasks || []);
      }
    });
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useLayoutEffect(() => {
    if (team?.name) navigation.setOptions({ title: team.name });
  }, [navigation, team]);

  if (!team)
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
        <Text style={{ color: theme.text, textAlign: "center", marginTop: 50, fontSize: 18, fontWeight: "700" }}>Your task</Text>
        <Text style={{ color: theme.secondary, textAlign: "center", marginTop: 10 }}>No task yet.</Text>
      </SafeAreaView>
    );

  const now = new Date();
  const getMeetingStatus = (dateStr: string, timeStr: string) => new Date(`${dateStr}T${timeStr}:00`) < now ? "Missed" : "Upcoming";
  const toggleTaskStatus = (taskId: string) => setTaskList((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: t.status === "Completed" ? "Pending" : "Completed" } : t)));
  const handleExport = () => Linking.openURL("https://calendar.google.com/calendar/u/0/r");
  const handleLeaveTeam = () => setShowLeaveConfirm(true);
  const confirmLeaveTeam = () => {
    setShowLeaveConfirm(false);
    setShowMembers(false);
    Alert.alert("Success", `You have left ${team.name}.`);
    router.push("/teams");
  };

  const pendingTasks = (taskList || []).filter((t) => t.status !== "Completed");
  const completedTasks = (taskList || []).filter((t) => t.status === "Completed");

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push("/teams")} style={styles.backButton}>
          <Ionicons name="arrow-back-circle-outline" size={24} color={theme.blue} />
        </TouchableOpacity>
        <Text style={[styles.header, { color: theme.text }]}>{team.name}</Text>
        <TouchableOpacity onPress={() => setShowMembers(true)} style={styles.iconButton}>
          <Ionicons name="information-circle" size={26} color={theme.blue} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatCard icon="assignment" color="#F59E0B" number={pendingTasks.length} label="Pending" theme={theme} />
          <StatCard icon="task-alt" color="#16A34A" number={completedTasks.length} label="Completed" theme={theme} />
          <View style={[styles.statCard, { backgroundColor: theme.lightCard }]}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.iconBg, borderColor: theme.iconBorder }]}>
              <MaterialIcons name="calendar-today" size={26} color={theme.blue} />
            </View>
            <Text style={[styles.statNumber, { color: theme.text }]}>{(team.meetings || []).length}</Text>
            <Text style={[styles.statLabel, { color: theme.secondary }]}>Meetings</Text>
          </View>
        </View>

        {/* Tasks */}
        <Text style={[styles.subHeader, { color: theme.text }]}><MaterialIcons name="assignment" size={18} color={theme.text} /> Tasks</Text>
        {pendingTasks.length > 0 ? pendingTasks.map((t) => <TaskItem key={t.id} task={t} theme={theme} toggleTaskStatus={toggleTaskStatus} />) : <Text style={[styles.noItemsText, { color: theme.secondary }]}>No pending tasks!</Text>}
        {completedTasks.length > 0 && (
          <>
            <Text style={[styles.subHeader, { color: theme.text }]}><MaterialIcons name="task-alt" size={18} color="#16A34A" /> Completed Tasks</Text>
            {completedTasks.map((t) => <TaskItem key={t.id} task={t} theme={theme} toggleTaskStatus={toggleTaskStatus} />)}
          </>
        )}

        {/* Meetings */}
        <Text style={[styles.subHeader, { color: theme.text }]}><MaterialIcons name="event" size={18} color={theme.text} /> Meetings</Text>
        {(team.meetings || []).length > 0 ? (team.meetings || []).map((m) => <MeetingItem key={m.id} meeting={m} theme={theme} getMeetingStatus={getMeetingStatus} />) : <Text style={[styles.noItemsText, { color: theme.secondary }]}>No meetings scheduled.</Text>}

        <TouchableOpacity style={[styles.exportButton, { backgroundColor: theme.accent }]} onPress={handleExport}>
          <Ionicons name="cloud-upload-sharp" size={20} color="#fff" />
          <Text style={styles.exportText}>Export to Google Calendar</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Members Modal */}
      <Modal visible={showMembers} animationType="fade" transparent onRequestClose={() => setShowMembers(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContentCenter, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Team Members</Text>
              <TouchableOpacity onPress={() => setShowMembers(false)}><Ionicons name="close-circle-outline" size={26} color={theme.blue} /></TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {(team.members || []).map((member, idx) => (
                <View key={idx} style={[styles.memberCard, { backgroundColor: theme.lightCard }]}>
                  <Ionicons name="person-circle-sharp" size={32} color={theme.blue} />
                  <View>
                    <Text style={[styles.memberName, { color: theme.text }]}>{member.name}</Text>
                    <Text style={[styles.memberRole, { color: theme.secondary }]}>{member.role} • {member.department}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.leaveTeamButton, { borderColor: theme.secondary, backgroundColor: isDark ? "#333" : "#FEE2E2" }]}
              onPress={handleLeaveTeam}
            >
              <Ionicons name="log-out-outline" size={22} color={isDark ? "#EF4444" : "#DC2626"} />
              <Text style={[styles.leaveTeamButtonText, { color: isDark ? "#EF4444" : "#DC2626" }]}>Leave Team</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Leave Confirmation */}
      <Modal visible={showLeaveConfirm} animationType="fade" transparent onRequestClose={() => setShowLeaveConfirm(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContentCenter, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, textAlign: "center" }]}>Do you want to leave {team.name}?</Text>
            <View style={{ flexDirection: "row", marginTop: 20, justifyContent: "space-between" }}>
              <TouchableOpacity onPress={() => setShowLeaveConfirm(false)} style={[styles.leaveTeamButton, { backgroundColor: theme.lightCard, flex: 1, marginRight: 8 }]}>
                <Text style={[styles.leaveTeamButtonText, { color: theme.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmLeaveTeam} style={[styles.leaveTeamButton, { backgroundColor: isDark ? "#d11a1aff" : "#cc1b1bff", flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.leaveTeamButtonText, { color: "#fff" }]}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles (exactly your original styles) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 16 },
  header: { fontSize: 22, fontWeight: "700", textAlign: "center", flex: 1 },
  iconButton: { padding: 4, marginRight: 13 },
  subHeader: { fontSize: 18, fontWeight: "700", marginTop: 20, marginBottom: 10, paddingLeft: 20 },
  statsContainer: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12, paddingHorizontal: 6, paddingVertical: 4 },
  statCard: { flex: 1, alignItems: "center", padding: 12, borderRadius: 12, marginHorizontal: 4 },
  statNumber: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  statLabel: { fontSize: 12, fontWeight: "500" },
  taskCard: { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: Platform.select({ android: 15 }), marginVertical: 6, paddingLeft: Platform.select({ android: 15 }) },
  taskTitle: { fontSize: 15, fontWeight: "600" },
  taskDeadline: { fontSize: 13 },
  meetingCard: { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: Platform.select({ android: 15 }), marginVertical: 6, paddingLeft: Platform.select({ android: 15 }) },
  meetingTitle: { fontSize: 15, fontWeight: "600" },
  meetingInfo: { fontSize: 13 },
  exportButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 10, marginTop: 24, marginLeft: 14, marginRight: 14 },
  exportText: { color: "#fff", fontWeight: "700", fontSize: 15, marginLeft: 6 },
  modalOverlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContentCenter: { width: "85%", borderRadius: 20, padding: 11, maxHeight: "70%", elevation: 6 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  memberCard: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, marginVertical: 6, gap: 12 },
  memberName: { fontSize: 15, fontWeight: "600" },
  memberRole: { fontSize: 13 },
  leaveTeamButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", padding: 10, borderRadius: 12, marginTop: 14, borderWidth: 1, gap: 6 },
  leaveTeamButtonText: { fontWeight: "700", fontSize: 14 },
  iconWrapper: { padding: 8, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  iconWrapperSmall: { padding: 6, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  iconButtonContainer: { marginLeft: 10 },
  iconSquare: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  noItemsText: { fontSize: 14, fontWeight: "600", paddingLeft: 20, marginVertical: 6 },
});