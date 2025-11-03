import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  useColorScheme,
} from "react-native";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { teams, Team, TeamTask, TeamMeeting } from "../../data/mockData";

// --- Helper Functions ---
const getRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((inputDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatTimeForDisplay = (time24hr: string): string => {
  try {
    const [hours, minutes] = time24hr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return time24hr;
  }
};

// --- Component ---
export default function TeamsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const currentUser = "Alyssa Quinones";

  const theme = {
    bg: isDark ? "#121212" : "#F4F8FB",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
    secondary: isDark ? "#B0BEC5" : "#555",
    blue: "#1976D2",
    lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
    border: isDark ? "#333" : "#E0E0E0",
  };

  const now = new Date();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: theme.text }]}>Teams Overview</Text>

        {teams.map((team: Team) => {
          const userTasks: TeamTask[] = team.tasks.filter(
            (t) => t.assignedTo === currentUser
          );

          const allMeetings: (TeamMeeting & { status: string })[] = team.meetings.map(
            (m) => {
              const meetingDate = new Date(`${m.date} ${m.time}`);
              return { ...m, status: meetingDate >= now ? "Upcoming" : "Missed" };
            }
          );

          return (
            <TouchableOpacity
              key={`team-${team.id}`}
              style={[styles.teamCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => router.push(`/(drawer)/teams/${team.id}`)}
            >
              {/* --- TEAM HEADER --- */}
              <View style={styles.teamHeader}>
                <View style={styles.teamTitleContainer}>
                  <Ionicons name="people-outline" size={26} color={theme.blue} />
                  <Text style={[styles.teamName, { color: theme.text }]}>{team.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
              </View>

              {/* --- YOUR TASKS --- */}
              {userTasks.length > 0 && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons name="task-alt" size={18} color={theme.blue} />
                    <Text style={[styles.subHeader, { color: theme.blue }]}>
                      Your Tasks
                    </Text>
                  </View>

                  {userTasks.map((task) => (
                    <View
                      key={`task-${team.id}-${task.id}`}
                      style={[styles.taskItem, { backgroundColor: theme.lightCard }]}
                    >
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
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text
                          style={[styles.taskTitle, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                        <Text style={[styles.deadline, { color: theme.secondary }]}>
                          Due:{" "}
                          <Text style={{ fontWeight: "600" }}>
                            {getRelativeDate(task.deadline)}
                          </Text>
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* --- MEETINGS --- */}
              {allMeetings.length > 0 && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <FontAwesome5 name="calendar-alt" size={16} color={theme.blue} />
                    <Text style={[styles.subHeader, { color: theme.blue }]}>
                      Meetings
                    </Text>
                  </View>

                  {allMeetings.map((meet) => {
                    const formattedDate = getRelativeDate(meet.date);
                    const formattedTime = formatTimeForDisplay(meet.time);

                    return (
                      <View
                        key={`meeting-${team.id}-${meet.id}`}
                        style={[styles.meetingItem, { backgroundColor: theme.lightCard }]}
                      >
                        <Ionicons
                          name={
                            meet.status === "Missed"
                              ? "close-circle-outline"
                              : "videocam-outline"
                          }
                          size={20}
                          color={
                            meet.status === "Missed" ? "#E53935" : theme.blue
                          }
                        />
                        <View style={{ marginLeft: 10 }}>
                          <Text style={[styles.meetingText, { color: theme.text }]}>
                            {meet.title}
                          </Text>
                          <Text
                            style={[
                              styles.meetingStatus,
                              {
                                color:
                                  meet.status === "Missed" ? "#E53935" : "#16A34A",
                              },
                            ]}
                          >
                            {formattedDate} • {formattedTime} ({meet.status})
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 14,
    textAlign: "center",
  },
  teamCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  teamTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamName: { fontSize: 18, fontWeight: "700" },
  sectionBlock: { marginTop: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  subHeader: { fontSize: 15, fontWeight: "600" },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
  },
  taskTitle: { fontSize: 14, fontWeight: "600" },
  deadline: { fontSize: 12, marginTop: 2 },
  meetingItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
  },
  meetingText: { fontSize: 14, fontWeight: "600" },
  meetingStatus: { fontSize: 12, marginTop: 2, fontWeight: "500" },
});
