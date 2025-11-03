import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Modal,
  useColorScheme,
  Alert, // Added Alert for feedback on joining
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { teams as initialTeams, Team, TeamTask, TeamMeeting } from "../../data/mockData";

export default function TeamsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [teams, setTeams] = useState<Team[]>(initialTeams);
  
  // New State Variables for Modal Flow
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamOverview, setNewTeamOverview] = useState("");
  const [joinCode, setJoinCode] = useState(""); // New state for join code

  const currentUser = "Alyssa Quinones";

  const theme = {
    bg: isDark ? "#121212" : "#F4F8FB",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
    secondary: isDark ? "#B0BEC5" : "#555",
    blue: "#1976D2",
    lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
    border: isDark ? "#333" : "#E0E0E0",
    accent: isDark ? "#1565C0" : "#2196F3", // Added accent color for buttons
  };

  // --- Handle Create New Team ---
  const handleCreateTeam = () => {
    if (!newTeamName.trim() || !newTeamOverview.trim()) {
      Alert.alert("Missing Information", "Please enter both a team name and an overview.");
      return;
    }

    const newTeam: Team = {
      id: (teams.length + 1).toString(),
      name: newTeamName.trim(),
      overview: newTeamOverview.trim(),
      members: [{ name: currentUser, role: "Leader", department: "IT" }],
      tasks: [],
      meetings: [],
    };

    setTeams([...teams, newTeam]);
    setNewTeamName("");
    setNewTeamOverview("");
    setShowCreateModal(false);
    Alert.alert("Success", `${newTeam.name} has been created!`);
  };

  // --- Handle Join Team (Dummy Logic) ---
  const handleJoinTeam = () => {
    if (!joinCode.trim()) {
      Alert.alert("Missing Code", "Please enter a team join code.");
      return;
    }
    
    // NOTE: In a real app, you would validate this code against your backend.
    
    setJoinCode("");
    setShowJoinModal(false);
    Alert.alert("Joined!", `Successfully sent request to join team with code: ${joinCode.trim()}.`);
  };

  const getRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* --- HEADER --- */}
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.text }]}>Teams Overview</Text>

        <View style={styles.iconRow}>
          {/* Add Team Icon */}
          <TouchableOpacity
            onPress={() => setAddModalVisible(true)} // Opens the main option selector modal
            style={styles.iconButton}
          >
            <Ionicons name="add-circle-outline" size={34} color={theme.blue} />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- TEAMS LIST --- */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {teams.map((team) => {
          const userTasks: TeamTask[] = team.tasks.filter(
            (t) => t.assignedTo === currentUser
          );

          return (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => router.push(`/(drawer)/teams/${team.id}`)}
            >
              {/* TEAM HEADER */}
              <View style={styles.teamHeader}>
                <Text style={[styles.teamName, { color: theme.text }]}>
                  {team.name}
                </Text>
              </View>

              {/* TEAM OVERVIEW */}
              {team.overview ? (
                <Text
                  style={[styles.overview, { color: theme.secondary }]}
                  numberOfLines={2}
                >
                  {team.overview}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.overview,
                    { color: theme.secondary, fontStyle: "italic" },
                  ]}
                >
                  No overview provided.
                </Text>
              )}

              {/* USER TASKS */}
              {userTasks.length > 0 && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons name="task-alt" size={20} color={theme.blue} />
                    <Text style={[styles.subHeader, { color: theme.blue }]}>
                      Your Tasks
                    </Text>
                  </View>

                  {userTasks.map((task) => (
                    <View
                      key={task.id}
                      style={[
                        styles.taskItem,
                        { backgroundColor: theme.lightCard },
                      ]}
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
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      
      {/* 1. --- ADD/JOIN OPTION MODAL (New Primary Modal) --- */}
      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, paddingVertical: 30 }]}>
            <Text style={[styles.modalHeader, { color: theme.text, marginBottom: 20 }]}>
              Team Options
            </Text>

            {/* Create Team Option */}
            <TouchableOpacity
              onPress={() => {
                setAddModalVisible(false);
                setShowCreateModal(true);
              }}
              style={[styles.optionBtn, { backgroundColor: theme.accent }]}
            >
              <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }}/>
              <Text style={styles.closeText}>Create a Team</Text>
            </TouchableOpacity>

            {/* Join Team Option */}
            <TouchableOpacity
              onPress={() => {
                setAddModalVisible(false);
                setShowJoinModal(true);
              }}
              style={[styles.optionBtn, { backgroundColor: theme.blue, marginTop: 10 }]}
            >
              <Ionicons name="people" size={20} color="#fff" style={{ marginRight: 8 }}/>
              <Text style={styles.closeText}>Join a Team</Text>
            </TouchableOpacity>
            
            {/* Cancel */}
            <TouchableOpacity
              onPress={() => setAddModalVisible(false)}
              style={{ marginTop: 20 }}
            >
              <Text style={[styles.cancelText, { color: theme.secondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. --- CREATE TEAM MODAL --- */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalHeader, { color: theme.text }]}>
              Create New Team
            </Text>

            <TextInput
              placeholder="Team Name"
              value={newTeamName}
              onChangeText={setNewTeamName}
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholderTextColor={theme.secondary}
            />

            <TextInput
              placeholder="Brief Overview"
              value={newTeamOverview}
              onChangeText={setNewTeamOverview}
              multiline
              numberOfLines={3}
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text, height: 80, textAlignVertical: 'top' },
              ]}
              placeholderTextColor={theme.secondary}
            />

            <TouchableOpacity
              onPress={handleCreateTeam}
              style={[styles.addBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.closeText}>Create Team</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={[styles.cancelBtn, { borderColor: theme.blue }]}
            >
              <Text style={[styles.cancelText, { color: theme.blue }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. --- JOIN TEAM MODAL --- */}
      <Modal visible={showJoinModal} transparent animationType="fade" onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalHeader, { color: theme.text }]}>
              Join a Team
            </Text>
            
            <TextInput
              placeholder="Enter team join code"
              value={joinCode}
              onChangeText={setJoinCode}
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholderTextColor={theme.secondary}
              keyboardType="default"
              autoCapitalize="none"
            />
            
            <TouchableOpacity
              onPress={handleJoinTeam}
              style={[styles.addBtn, { backgroundColor: theme.blue }]}
            >
              <Text style={styles.closeText}>Join Team</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowJoinModal(false)}
              style={[styles.cancelBtn, { borderColor: theme.accent }]}
            >
              <Text style={[styles.cancelText, { color: theme.accent }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  header: { fontSize: 24, fontWeight: "700" },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: { padding: 4 },
  infoIconButton: { padding: 4 },
  teamCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 3,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  teamName: { fontSize: 18, fontWeight: "700" },
  overview: { fontSize: 13, marginTop: 6 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    alignItems: 'center', // Center content in the card
  },
  modalHeader: { fontSize: 18, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  modalText: { fontSize: 14, marginVertical: 2 },
  
  // New/Modified Button Styles
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
  },
  addBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    width: '100%',
  },
  closeText: { color: "#fff", fontWeight: "700" },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    width: '100%',
  },
  cancelText: { fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
    fontSize: 14,
    width: '100%',
  },
});