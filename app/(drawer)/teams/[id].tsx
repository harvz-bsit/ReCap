import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  useColorScheme,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { teams, Team } from "../../../data/mockData";

export default function TeamDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const theme = {
    bg: isDark ? "#121212" : "#F4F8FB",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
    secondary: isDark ? "#B0BEC5" : "#444",
    blue: "#1976D2",
    accent: isDark ? "#1565C0" : "#2196F3",
    lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
  };

  const team: Team | undefined = teams.find((t) => t.id === id);

  if (!team) {
    return (
      <View style={styles.center}>
        <Text>Team not found.</Text>
      </View>
    );
  }

  const now = new Date();

  const getMeetingStatus = (meetingDateStr: string, meetingTimeStr: string) => {
    const meetingDate = new Date(`${meetingDateStr}T${meetingTimeStr}:00`);
    return meetingDate < now ? "Missed" : "Upcoming";
  };

  const handleExport = () => {
    Linking.openURL("https://calendar.google.com/calendar/u/0/r");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header + Back Button */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push("/teams")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={theme.blue} />
          <Text style={[styles.backText, { color: theme.blue }]}>Back</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Ionicons name="people-outline" size={26} color={theme.blue} />
          <Text style={[styles.header, { color: theme.text }]}>{team.name}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.lightCard }]}>
            <MaterialIcons name="pending-actions" size={24} color="#F59E0B" />
            <Text style={[styles.statNumber, { color: theme.text }]}>
              {team.tasks.filter((t) => t.status === "Pending").length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondary }]}>Pending</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.lightCard }]}>
            <MaterialIcons name="check-circle" size={24} color="#16A34A" />
            <Text style={[styles.statNumber, { color: theme.text }]}>
              {team.tasks.filter((t) => t.status === "Completed").length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondary }]}>Completed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.lightCard }]}>
            <FontAwesome5 name="calendar-alt" size={22} color={theme.blue} />
            <Text style={[styles.statNumber, { color: theme.text }]}>{team.meetings.length}</Text>
            <Text style={[styles.statLabel, { color: theme.secondary }]}>Meetings</Text>
          </View>
        </View>

        {/* Members */}
        <Text style={[styles.subHeader, { color: theme.text }]}>👥 Team Members</Text>
        {team.members.map((member, idx) => (
          <View
            key={idx}
            style={[styles.memberCard, { backgroundColor: theme.card, shadowColor: theme.text }]}
          >
            <Ionicons name="person-circle-outline" size={28} color={theme.blue} />
            <View>
              <Text style={[styles.memberName, { color: theme.text }]}>{member.name}</Text>
              <Text style={[styles.memberRole, { color: theme.secondary }]}>
                {member.role} • {member.department}
              </Text>
            </View>
          </View>
        ))}

        {/* Tasks */}
        <Text style={[styles.subHeader, { color: theme.text }]}>🗒️ Tasks</Text>
        {team.tasks.map((task) => (
          <View key={task.id} style={[styles.taskCard, { backgroundColor: theme.card }]}>
            <MaterialIcons
              name={
                task.status === "Completed"
                  ? "check-circle"
                  : task.status === "In Progress"
                  ? "autorenew"
                  : "pending-actions"
              }
              size={20}
              color={
                task.status === "Completed"
                  ? "#16A34A"
                  : task.status === "In Progress"
                  ? "#0288D1"
                  : "#F59E0B"
              }
            />
            <View style={{ marginLeft: 8 }}>
              <Text style={[styles.taskTitle, { color: theme.text }]}>{task.title}</Text>
              <Text style={[styles.taskDeadline, { color: theme.secondary }]}>
                Deadline: {task.deadline}
              </Text>
            </View>
          </View>
        ))}

        {/* Meetings */}
        <Text style={[styles.subHeader, { color: theme.text }]}>📅 Meetings</Text>
        {team.meetings.map((meeting) => {
          const status = getMeetingStatus(meeting.date, meeting.time);
          const statusColor = status === "Missed" ? "#E53935" : "#16A34A";
          return (
            <View key={meeting.id} style={[styles.meetingCard, { backgroundColor: theme.card }]}>
              <FontAwesome5
                name={status === "Missed" ? "calendar-times" : "calendar-alt"}
                size={18}
                color={theme.blue}
              />
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.meetingTitle, { color: theme.text }]}>{meeting.title}</Text>
                <Text style={[styles.meetingInfo, { color: theme.secondary }]}>
                  {meeting.date} • {meeting.time}
                </Text>
                <Text style={{ color: statusColor, fontWeight: "600", fontSize: 13 }}>{status}</Text>
              </View>
            </View>
          );
        })}

        {/* Export */}
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: theme.accent }]}
          onPress={handleExport}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.exportText}>Export to Google Calendar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { marginBottom: 8 },
  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  backText: { marginLeft: 6, fontWeight: "600" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  header: { fontSize: 22, fontWeight: "700" },
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
    elevation: 2,
  },
  statNumber: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  statLabel: { fontSize: 12, fontWeight: "500" },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    gap: 10,
    elevation: 1,
  },
  memberName: { fontWeight: "600", fontSize: 16 },
  memberRole: { fontSize: 13 },

  taskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
    elevation: 1,
  },
  taskTitle: { fontSize: 15, fontWeight: "600" },
  taskDeadline: { fontSize: 13, marginTop: 2 },

  meetingCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
    elevation: 1,
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
    elevation: 3,
  },
  exportText: { color: "#fff", fontWeight: "700", fontSize: 15, marginLeft: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
