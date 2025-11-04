import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  useColorScheme,
  Linking,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { teams, Team, Task, Meeting } from "../../../data/mockData";

// --- Helper function for date formatting (Existing Implementation) ---
const formatDate = (dateStr: string): string => {
  // dateStr is expected to be in "YYYY-MM-DD" format from mockData
  try {
    const dateParts = dateStr.split('-');
    if (dateParts.length !== 3) return dateStr;
    
    // Create a Date object (using UTC to prevent timezone shifts from altering the date)
    const date = new Date(Date.UTC(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])));

    // Format the date to "Month Day, Year" (e.g., "Dec 25, 2024")
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        timeZone: 'UTC' 
    });
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateStr;
  }
};
// ----------------------------------------------------------------

// --- Reusable Theming Hooks (simplified for example) ---
const getTheme = (isDark: boolean) => ({
  bg: isDark ? "#121212" : "#F4F8FB",
  card: isDark ? "#1E1E1E" : "#FFFFFF",
  text: isDark ? "#FFFFFF" : "#000000",
  secondary: isDark ? "#B0BEC5" : "#444",
  blue: "#1976D2",
  accent: isDark ? "#1565C0" : "#2196F3",
  lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
});

// =================================================================
// 🧱 Extracted Component Structure
// =================================================================

// 1. StatCard Component
const StatCard = ({ icon, color, number, label, theme }: { icon: string, color: string, number: number, label: string, theme: any }) => (
  <View style={[styles.statCard, { backgroundColor: theme.lightCard }]}>
    <MaterialIcons name={icon as "pending-actions" | "check-circle"} size={24} color={color} />
    <Text style={[styles.statNumber, { color: theme.text }]}>
      {number}
    </Text>
    <Text style={[styles.statLabel, { color: theme.secondary }]}>
      {label}
    </Text>
  </View>
);

// 2. TaskItem Component
const TaskItem = ({ task, theme, toggleTaskStatus }: { task: Task, theme: any, toggleTaskStatus: (id: string) => void }) => {
  const isCompleted = task.status === "Completed";
  const cardStyle = { backgroundColor: isCompleted ? theme.lightCard : theme.card };
  const textStyle = { color: isCompleted ? "#16A34A" : theme.text, textDecorationLine: isCompleted ? "line-through" : "none" as const };
  const iconName = isCompleted ? "refresh-outline" : "checkbox-outline";
  const iconColor = isCompleted ? "#16A34A" : theme.blue;
  const deadlineText = isCompleted ? `Completed: ${formatDate(task.deadline)}` : `Deadline: ${formatDate(task.deadline)}`;

  return (
    <View key={task.id} style={[styles.taskCard, cardStyle]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskTitle, textStyle]}>
          {task.title}
        </Text>
        <Text style={[styles.taskDeadline, { color: theme.secondary }]}>
          {deadlineText}
        </Text>
      </View>
      <TouchableOpacity onPress={() => toggleTaskStatus(task.id)}>
        <Ionicons name={iconName} size={26} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
};

// 3. MeetingItem Component
const MeetingItem = ({ meeting, theme, getMeetingStatus }: { meeting: Meeting, theme: any, getMeetingStatus: (date: string, time: string) => string }) => {
  const status = getMeetingStatus(meeting.date, meeting.time);
  const statusColor = status === "Missed" ? "#E53935" : "#16A34A";
  const formattedDate = formatDate(meeting.date);

  return (
    <View
      key={meeting.id}
      style={[styles.meetingCard, { backgroundColor: theme.card }]}
    >
      <FontAwesome5
        name={status === "Missed" ? "calendar-times" : "calendar-alt"}
        size={18}
        color={theme.blue}
      />
      <View style={{ marginLeft: 8 }}>
        <Text style={[styles.meetingTitle, { color: theme.text }]}>
          {meeting.title}
        </Text>
        <Text style={[styles.meetingInfo, { color: theme.secondary }]}>
          {formattedDate} • {meeting.time}
        </Text>
        <Text
          style={{ color: statusColor, fontWeight: "600", fontSize: 13 }}
        >
          {status}
        </Text>
      </View>
    </View>
  );
};

// =================================================================
// 🚀 Main TeamDetailsScreen Component
// =================================================================

export default function TeamDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [showMembers, setShowMembers] = useState(false);
  const [taskList, setTaskList] = useState(() => {
    const team = teams.find((t) => t.id === id);
    return team ? [...team.tasks] : [];
  });

  const theme = getTheme(isDark);

  const team: Team | undefined = teams.find((t) => t.id === id);

  if (!team) {
    return (
      <View style={styles.center}>
        <Text>Team not found.</Text>
      </View>
    );
  }

  const now = new Date();

  // Logic functions
  const getMeetingStatus = (meetingDateStr: string, meetingTimeStr: string) => {
    const meetingDate = new Date(`${meetingDateStr}T${meetingTimeStr}:00`);
    return meetingDate < now ? "Missed" : "Upcoming";
  };

  const handleExport = () => {
    Linking.openURL("https://calendar.google.com/calendar/u/0/r");
  };

  const toggleTaskStatus = (taskId: string) => {
    setTaskList((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === "Completed" ? "Pending" : "Completed",
            }
          : task
      )
    );
  };

  const handleLeaveTeam = () => {
    Alert.alert("Confirm Leave", `Are you sure you want to leave ${team.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        onPress: () => {
          setShowMembers(false);
          Alert.alert("Success", `You have left ${team.name}.`);
          router.push("/teams");
        },
        style: "destructive",
      },
    ]);
  };

  const pendingTasks = taskList.filter((t) => t.status !== "Completed");
  const completedTasks = taskList.filter((t) => t.status === "Completed");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.push("/teams")}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={theme.blue} />
          <Text style={[styles.backText, { color: theme.blue }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.header, { color: theme.text }]}>{team.name}</Text>

        {/* Info (Members) */}
        <TouchableOpacity
          onPress={() => setShowMembers(true)}
          style={styles.iconButton}
        >
          <Ionicons
            name="information-circle-outline"
            size={26}
            color={theme.blue}
          />
        </TouchableOpacity>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="pending-actions"
            color="#F59E0B"
            number={pendingTasks.length}
            label="Pending"
            theme={theme}
          />
          <StatCard
            icon="check-circle"
            color="#16A34A"
            number={completedTasks.length}
            label="Completed"
            theme={theme}
          />
          <View style={[styles.statCard, { backgroundColor: theme.lightCard }]}>
            <FontAwesome5 name="calendar-alt" size={22} color={theme.blue} />
            <Text style={[styles.statNumber, { color: theme.text }]}>
              {team.meetings.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondary }]}>
              Meetings
            </Text>
          </View>
        </View>

        {/* Tasks */}
        <Text style={[styles.subHeader, { color: theme.text }]}>🗒️ Tasks</Text>
        {pendingTasks.map((task) => (
          <TaskItem key={task.id} task={task} theme={theme} toggleTaskStatus={toggleTaskStatus} />
        ))}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <>
            <Text style={[styles.subHeader, { color: theme.text }]}>
              ✅ Completed Tasks
            </Text>
            {completedTasks.map((task) => (
              <TaskItem key={task.id} task={task} theme={theme} toggleTaskStatus={toggleTaskStatus} />
            ))}
          </>
        )}

        {/* Meetings */}
        <Text style={[styles.subHeader, { color: theme.text }]}>📅 Meetings</Text>
        {team.meetings.map((meeting) => (
          <MeetingItem 
            key={meeting.id} 
            meeting={meeting} 
            theme={theme} 
            getMeetingStatus={getMeetingStatus} 
          />
        ))}

        {/* Export */}
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: theme.accent }]}
          onPress={handleExport}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.exportText}>Export to Google Calendar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Members Modal */}
      <Modal
        visible={showMembers}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMembers(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View
            style={[styles.modalContentCenter, { backgroundColor: theme.card }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Team Members
              </Text>
              <TouchableOpacity onPress={() => setShowMembers(false)}>
                <Ionicons name="close-circle" size={26} color={theme.blue} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {team.members.map((member, index) => (
                <View
                  key={index}
                  style={[
                    styles.memberCard,
                    { backgroundColor: theme.lightCard },
                  ]}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={30}
                    color={theme.blue}
                  />
                  <View>
                    <Text style={[styles.memberName, { color: theme.text }]}>
                      {member.name}
                    </Text>
                    <Text
                      style={[styles.memberRole, { color: theme.secondary }]}
                    >
                      {member.role} • {member.department}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.leaveTeamButton,
                {
                  borderColor: theme.secondary,
                  backgroundColor: isDark ? "#333" : "#FEE2E2",
                },
              ]}
              onPress={handleLeaveTeam}
            >
              <Ionicons
                name="exit-outline"
                size={20}
                color={isDark ? "#EF4444" : "#DC2626"}
              />
              <Text
                style={[
                  styles.leaveTeamButtonText,
                  { color: isDark ? "#EF4444" : "#DC2626" },
                ]}
              >
                Leave Team
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =================================================================
// 🎨 Stylesheet
// =================================================================

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { fontWeight: "600" },
  header: { fontSize: 22, fontWeight: "700", textAlign: "center", flex: 1 },
  iconButton: { padding: 4 },
  subHeader: { fontSize: 18, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statNumber: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  statLabel: { fontSize: 12, fontWeight: "500" },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
  },
  taskTitle: { fontSize: 15, fontWeight: "600" },
  taskDeadline: { fontSize: 13 },
  meetingCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
  },
  meetingTitle: { fontSize: 15, fontWeight: "600" },
  meetingInfo: { fontSize: 13 },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    marginTop: 24,
  },
  exportText: { color: "#fff", fontWeight: "700", fontSize: 15, marginLeft: 6 },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContentCenter: {
    width: "85%",
    borderRadius: 20,
    padding: 16,
    maxHeight: "70%",
    elevation: 6,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  memberName: { fontWeight: "600", fontSize: 16 },
  memberRole: { fontSize: 13 },
  leaveTeamButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
  },
  leaveTeamButtonText: {
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
});