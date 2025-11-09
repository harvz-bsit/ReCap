// app/(drawer)/teams.tsx
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { child, get, onValue, push, ref, set } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { teams as mockTeams, TeamTask } from "../../data/mockData";
import { db } from "../../firebase/firebaseConfig";

// Keep same Team types as in mockData (minimal typing here)
type Team = {
  id: string;
  name: string;
  overview?: string;
  members: { name: string; role?: string; department?: string }[];
  tasks: TeamTask[];
  meetings: { id: string; title: string; date: string; time: string }[];
};

export default function TeamsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const theme = {
    bg: isDark ? "#121212" : "#F4F8FB",
    card: isDark ? "#1E1E1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#000000",
    secondary: isDark ? "#B0BEC5" : "#555",
    blue: "#1976D2",
    lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
    border: isDark ? "#333" : "#E0E0E0",
    accent: isDark ? "#1565C0" : "#2196F3",
  };

  const currentUser = "Alyssa Quinones";

  // --- State ---
  const [teams, setTeams] = useState<Team[]>([...mockTeams]); // start with mock
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamOverview, setNewTeamOverview] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // --- Load teams from Firebase and merge with mockTeams (mock kept unless firebase has same id) ---
  useEffect(() => {
    const teamsRef = ref(db, "teams");
    const off = onValue(teamsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const firebaseTeams: Team[] = Object.keys(data).map((key) => ({
        id: key,
        name: data[key].name || "",
        overview: data[key].overview || "",
        members: data[key].members || [],
        tasks: data[key].tasks || [],
        meetings: data[key].meetings || [],
      }));

      // Merge: keep mock teams that are not overridden by firebase, then add firebase teams
      const merged: Team[] = [
        ...mockTeams.filter((m) => !firebaseTeams.some((f) => f.id === m.id)) as Team[],
        ...firebaseTeams,
      ];

      setTeams(merged);
    });

    return () => off();
  }, []);

  // --- Create Team (writes to Firebase). New teams have empty tasks/meetings ---
  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !newTeamOverview.trim()) {
      Alert.alert("Missing Information", "Please enter both a team name and an overview.");
      return;
    }

    try {
      const newTeam = {
        name: newTeamName.trim(),
        overview: newTeamOverview.trim(),
        members: [{ name: currentUser, role: "Leader", department: "IT" }],
        tasks: [],
        meetings: [],
      };

      const newTeamRef = push(ref(db, "teams"));
      await set(newTeamRef, newTeam);

      // Clear inputs & close
      setNewTeamName("");
      setNewTeamOverview("");
      setShowCreateModal(false);
      setAddModalVisible(false);

      // Navigate to the newly created team details and pass the team object
      router.push({
        pathname: `../(drawer)/teams/${newTeamRef.key}`,
        params: { team: JSON.stringify({ ...newTeam, id: newTeamRef.key }) },
      });

      Alert.alert("Success", `${newTeam.name} has been created!`);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Failed to create team. Try again.");
    }
  };

  // --- Join Team (attempts to find the ID on RTDB and add member) ---
  const handleJoinTeam = async () => {
    if (!joinCode.trim()) {
      Alert.alert("Missing Code", "Please enter a team join code.");
      return;
    }

    try {
      const teamSnap = await get(child(ref(db), `teams/${joinCode.trim()}`));
      if (!teamSnap.exists()) {
        Alert.alert("Error", "Team not found!");
        return;
      }

      const teamData = teamSnap.val();
      const members = teamData.members || [];
      // Avoid duplicate
      if (!members.some((m: any) => m.name === currentUser)) {
        members.push({ name: currentUser, role: "Member", department: "IT" });
        await set(ref(db, `teams/${joinCode.trim()}/members`), members);
      }

      setJoinCode("");
      setShowJoinModal(false);
      Alert.alert("Joined!", `You have joined ${teamData.name || "the team"}!`);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Failed to join team. Try again.");
    }
  };

  // --- Helper for relative dates ---
  const getRelativeDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const today = new Date();
    const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // --- Render a single team card (keeps your UI) ---
  const renderTeam = ({ item }: { item: Team }) => {
    const userTasks: TeamTask[] = (item.tasks || []).filter((t) => t.assignedTo === currentUser);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.teamCard, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: 18 }]}
        onPress={() =>
          router.push({
            pathname: `../(drawer)/teams/${item.id}`,
            params: { team: JSON.stringify(item) },
          })
        }
      >
        {/* TEAM NAME */}
        <View style={styles.teamHeader}>
          <Text style={[styles.teamName, { color: theme.text }]}>{item.name}</Text>
        </View>

        {/* OVERVIEW */}
        {item.overview ? (
          <Text style={[styles.overview, { color: theme.secondary }]} numberOfLines={2}>
            {item.overview}
          </Text>
        ) : (
          <Text style={[styles.overview, { color: theme.secondary, fontStyle: "italic" }]}>No overview provided.</Text>
        )}

        {/* USER TASKS */}
        {userTasks.length > 0 ? (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="task-alt" size={20} color={theme.blue} />
              <Text style={[styles.subHeader, { color: theme.blue }]}>Your Tasks</Text>
            </View>
            {userTasks.map((task) => (
              <View key={task.id} style={[styles.taskItem, { backgroundColor: theme.lightCard }]}>
                <MaterialIcons
                  name={task.status === "Completed" ? "check-circle" : task.status === "In Progress" ? "autorenew" : "pending"}
                  size={20}
                  color={task.status === "Completed" ? "#16A34A" : task.status === "In Progress" ? "#0288D1" : "#F59E0B"}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text style={[styles.deadline, { color: theme.secondary }]}>
                    Due: <Text style={{ fontWeight: "600" }}>{getRelativeDate(task.deadline)}</Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.noItemsText, { color: theme.secondary }]}>No pending tasks!</Text>
        )}

        {/* Meetings placeholder if no meetings */}
        {(!item.meetings || item.meetings.length === 0) && (
          <Text style={[styles.noItemsText, { color: theme.secondary }]}>No meetings scheduled.</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.text }]}>Teams Overview</Text>
        <View style={styles.iconRow}>
          <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={34} color={theme.blue} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={teams || []}
        keyExtractor={(item) => item.id}
        renderItem={renderTeam}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        ListEmptyComponent={<Text style={[styles.noItemsText, { color: theme.secondary }]}>No teams yet!</Text>}
        showsVerticalScrollIndicator={false}
      />

      {/* MODALS */}
      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, paddingVertical: 30 }]}>
            <Text style={[styles.modalHeader, { color: theme.text, marginBottom: 20 }]}>Team Options</Text>

            <TouchableOpacity
              onPress={() => {
                setAddModalVisible(false);
                setShowCreateModal(true);
              }}
              style={[styles.optionBtn, { backgroundColor: theme.accent }]}
            >
              <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.closeText}>Create a Team</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setAddModalVisible(false);
                setShowJoinModal(true);
              }}
              style={[styles.optionBtn, { backgroundColor: theme.blue, marginTop: 10 }]}
            >
              <Ionicons name="people" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.closeText}>Join a Team</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAddModalVisible(false)} style={{ marginTop: 20 }}>
              <Text style={[styles.cancelText, { color: theme.secondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CREATE TEAM */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalHeader, { color: theme.text }]}>Create New Team</Text>
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
              style={[styles.input, { borderColor: theme.border, color: theme.text, height: 80, textAlignVertical: "top" }]}
              placeholderTextColor={theme.secondary}
            />
            <TouchableOpacity onPress={handleCreateTeam} style={[styles.addBtn, { backgroundColor: theme.accent }]}>
              <Text style={styles.closeText}>Create Team</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreateModal(false)} style={[styles.cancelBtn, { borderColor: theme.blue }]}>
              <Text style={[styles.cancelText, { color: theme.blue }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* JOIN TEAM */}
      <Modal visible={showJoinModal} transparent animationType="fade" onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalHeader, { color: theme.text }]}>Join a Team</Text>
            <TextInput
              placeholder="Enter team join code"
              value={joinCode}
              onChangeText={setJoinCode}
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholderTextColor={theme.secondary}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={handleJoinTeam} style={[styles.addBtn, { backgroundColor: theme.blue }]}>
              <Text style={styles.closeText}>Join Team</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowJoinModal(false)} style={[styles.cancelBtn, { borderColor: theme.accent }]}>
              <Text style={[styles.cancelText, { color: theme.accent }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles (same as your original) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingHorizontal: 10 },
  header: { fontSize: 24, fontWeight: "700" },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: { padding: 4 },
  teamCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, elevation: 3 },
  teamHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, paddingBottom: 6 },
  teamName: { fontSize: 18, fontWeight: "700" },
  overview: { fontSize: 13, marginTop: 6 },
  sectionBlock: { marginTop: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  subHeader: { fontSize: 15, fontWeight: "600" },
  taskItem: { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: 10, marginVertical: 4 },
  taskTitle: { fontSize: 14, fontWeight: "600" },
  deadline: { fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalCard: { width: "85%", borderRadius: 16, padding: 20, elevation: 5, alignItems: "center" },
  modalHeader: { fontSize: 18, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  optionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%", paddingVertical: 12, borderRadius: 10 },
  addBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 10, alignItems: "center", width: "100%" },
  closeText: { color: "#fff", fontWeight: "700" },
  cancelBtn: { marginTop: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center", width: "100%" },
  cancelText: { fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginVertical: 6, fontSize: 14, width: "100%" },
  noItemsText: { fontSize: 14, textAlign: "center", marginVertical: 12 },
});