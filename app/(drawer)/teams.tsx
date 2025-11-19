import { db } from "@/firebase/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { get, onValue, push, ref, set, update } from "firebase/database";
import React, { useEffect, useMemo, useState } from "react";
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

type Member = {
  name: string;
  role?: string;
};

type TeamTask = {
  id: string;
  title: string;
  status: "Pending" | "In Progress" | "Completed";
  deadline: string;
  assignedTo?: string;
};

type Team = {
  id: string;
  name: string;
  overview?: string;
  members: Record<string, Member> | Record<string, any>; // Adjusted for FB structure
  tasks: Record<string, TeamTask> | Record<string, any>; // Adjusted for FB structure
  meetings: Record<string, any> | Record<string, any>; // Adjusted for FB structure
  joinCode?: string;
  creatorUID?: string;
};

function generateJoinCode(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function TeamsScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const theme = useMemo(
    () => ({
      bg: isDark ? "#121212" : "#F4F8FB",
      card: isDark ? "#1E1E1E" : "#FFFFFF",
      text: isDark ? "#FFFFFF" : "#000000",
      secondary: isDark ? "#B0BEC5" : "#555",
      blue: "#1976D2",
      lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
      border: isDark ? "#333" : "#E0E0E0",
      accent: isDark ? "#1565C0" : "#2196F3",
    }),
    [isDark]
  );

  // ✅ Logged-in user info
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const stored = await AsyncStorage.getItem("loggedInUser");
      if (!stored) return;

      const user = JSON.parse(stored);
      const uid = user.uid || user.id;
      if (!uid) return;

      const snap = await get(ref(db, `users/${uid}`));
      const userObj = snap.exists() ? snap.val() : user;

      const displayName =
        `${userObj.firstName ?? ""} ${userObj.lastName ?? ""}`.trim();

      setCurrentUser({
        uid,
        name: displayName || "User",
        role: userObj.workType || "Member",
      });
    };

    fetchUser();
  }, []);

  // ✅ Firebase teams - FILTERED by current user membership
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const off = onValue(ref(db, "teams"), (snapshot) => {
      const data = snapshot.val() || {};
      const parsed = Object.entries(data)
        .map(([key, value]: any) => ({
          id: key,
          name: value.name,
          overview: value.overview || "",
          members: value.members || {},
          tasks: value.tasks || {},
          meetings: value.meetings || {},
          joinCode: value.joinCode || "",
          creatorUID: value.creatorUID,
        }))
        .filter((team) => {
          const members = team.members || {};
          return currentUser.uid in members;
        }) as Team[];

      setTeams(parsed);
    });

    return () => off();
  }, [currentUser?.uid]);

  // -----------------------------------------------------
  // ✅ CREATE TEAM
  // -----------------------------------------------------
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamOverview, setNewTeamOverview] = useState("");

  const handleCreateTeam = async () => {
    if (!currentUser) {
      Alert.alert("Error", "User not loaded yet.");
      return;
    }
    if (!newTeamName.trim()) {
      Alert.alert("Missing", "Enter a team name!");
      return;
    }

    try {
      const leader = {
        name: currentUser.name,
        role: "Leader",
      };

      const joinCode = generateJoinCode();

      const newTeam = {
        name: newTeamName.trim(),
        overview: newTeamOverview.trim() || "",
        creatorUID: currentUser.uid,
        members: { [currentUser.uid]: leader },
        tasks: {},
        meetings: {},
        joinCode,
      };

      const newRef = push(ref(db, "teams"));
      await set(newRef, newTeam);

      setNewTeamName("");
      setNewTeamOverview("");
      setShowCreateModal(false);
      setAddModalVisible(false);

      Alert.alert("Team Created", `Join Code: ${joinCode}`);

      router.push(`./teams/${newRef.key}`);
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to create team.");
    }
  };

  // -----------------------------------------------------
  // ✅ JOIN TEAM
  // -----------------------------------------------------
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const handleJoinTeam = async () => {
    if (!currentUser) return;

    const code = joinCode.trim();
    if (!code) {
      Alert.alert("Missing", "Enter a team code.");
      return;
    }

    try {
      const teamsSnap = await get(ref(db, "teams"));
      let teamId: string | null = null;
      let teamData: any = null;

      if (teamsSnap.exists()) {
        const all = teamsSnap.val();
        for (const [id, val] of Object.entries<any>(all)) {
          if (String(val.joinCode || "").toUpperCase() === code.toUpperCase()) {
            teamId = id;
            teamData = val;
            break;
          }
        }
      }

      if (!teamId) {
        const byIdSnap = await get(ref(db, `teams/${code}`));
        if (byIdSnap.exists()) {
          teamId = code;
          teamData = byIdSnap.val();
        }
      }

      if (!teamId || !teamData) {
        Alert.alert("Error", "Team not found!");
        return;
      }

      // ✅ Check if already a member
      const members = teamData.members || {};
      if (currentUser.uid in members) {
        Alert.alert("Already a Member", `You're already in ${teamData.name}`);
        setJoinCode("");
        setShowJoinModal(false);
        return;
      }

      // ✅ Add user to members
      members[currentUser.uid] = {
        name: currentUser.name,
        role: "Member",
      };

      await update(ref(db, `teams/${teamId}`), { members });

      setJoinCode("");
      setShowJoinModal(false);

      Alert.alert("Joined", `You have joined ${teamData.name}`);
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Could not join team.");
    }
  };

  // -----------------------------------------------------
  // ✅ Render team card with member count, task, and meeting summary
  // -----------------------------------------------------
  const renderTeam = ({ item }: { item: Team }) => {
    const members = item.members || {};
    const tasks = item.tasks || {};
    const meetings = item.meetings || {};

    const memberCount = Object.keys(members).length;
    
    // Convert tasks object to array and count pending ones
    const taskArray = Object.values(tasks) as TeamTask[];
    const pendingTasksCount = taskArray.filter(t => t.status !== "Completed").length;

    // Convert meetings object to array and count upcoming ones
    const meetingArray = Object.values(meetings) as any[];
    const now = new Date();
    const meetingsCount = meetingArray.length;



    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.teamCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
        onPress={() => router.push(`./teams/${item.id}`)}
      >
        <View style={styles.teamHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.teamName, { color: theme.text }]}>{item.name}</Text>

            {item.creatorUID === currentUser?.uid && (
              <View
                style={{
                  backgroundColor: theme.accent,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                  Creator
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text
          style={[styles.overview, { color: theme.secondary }]}
          numberOfLines={2}
        >
          {item.overview || "No overview provided."}
        </Text>

        {/* ✅ Summary Indicators (Members, Tasks, Meetings) */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 12 }}>
          {/* Members */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="people" size={16} color={theme.secondary} />
            <Text style={{ color: theme.secondary, fontSize: 12, marginLeft: 4 }}>
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </Text>
          </View>
          
          {/* Pending Tasks */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="alert-circle" size={16} color={pendingTasksCount > 0 ? "#F59E0B" : theme.secondary} />
            <Text style={{ color: theme.secondary, fontSize: 12, marginLeft: 4 }}>
              {pendingTasksCount} {pendingTasksCount === 1 ? "pending task" : "pending tasks"}
            </Text>
          </View>

          {/* Upcoming Meetings */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
<Ionicons name="calendar" size={16} color={meetingsCount > 0 ? theme.blue : theme.secondary} />
<Text style={{ color: theme.secondary, fontSize: 12, marginLeft: 4 }}>
  {meetingsCount} {meetingsCount === 1 ? "meeting" : "meetings"}
</Text>

          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.text }]}>Teams Overview</Text>

        <TouchableOpacity
          onPress={() => setAddModalVisible(true)}
          style={styles.iconButton}
        >
          <Ionicons name="add-circle-outline" size={34} color={theme.blue} />
        </TouchableOpacity>
      </View>

      {/* TEAM LIST */}
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        renderItem={renderTeam}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Ionicons name="people-outline" size={64} color={theme.secondary} />
            <Text style={[styles.noItemsText, { color: theme.secondary, marginTop: 16 }]}>
              No teams yet!
            </Text>
            <Text style={{ color: theme.secondary, fontSize: 14, marginTop: 8 }}>
              Create or join a team to get started
            </Text>
          </View>
        }
      />

      {/* MODALS */}

      {/* TEAM OPTIONS */}
      <Modal visible={addModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalHeader, { color: theme.text }]}>
              Team Options
            </Text>

            <TouchableOpacity
              onPress={() => {
                setAddModalVisible(false);
                setShowCreateModal(true);
              }}
              style={[styles.optionBtn, { backgroundColor: theme.accent }]}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.closeText}>Create a Team</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setAddModalVisible(false);
                setShowJoinModal(true);
              }}
              style={[styles.optionBtn, { backgroundColor: theme.blue }]}
            >
              <Ionicons name="people" size={20} color="#fff" />
              <Text style={styles.closeText}>Join a Team</Text>
            </TouchableOpacity>

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

      {/* CREATE TEAM */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalHeader, { color: theme.text }]}>
              Create Team
            </Text>

            <TextInput
              placeholder="Team Name"
              placeholderTextColor={theme.secondary}
              value={newTeamName}
              onChangeText={setNewTeamName}
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            />

            <TextInput
              placeholder="Team Overview"
              placeholderTextColor={theme.secondary}
              value={newTeamOverview}
              onChangeText={setNewTeamOverview}
              multiline
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  height: 70,
                  textAlignVertical: "top",
                },
              ]}
            />

            <TouchableOpacity
              onPress={handleCreateTeam}
              style={[styles.addBtn, { backgroundColor: theme.blue }]}
            >
              <Text style={styles.closeText}>Create</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                setNewTeamName("");
                setNewTeamOverview("");
              }}
              style={[styles.cancelBtn, { borderColor: theme.accent }]}
            >
              <Text style={[styles.cancelText, { color: theme.accent }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* JOIN TEAM */}
      <Modal visible={showJoinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalHeader, { color: theme.text }]}>
              Join a Team
            </Text>

            <TextInput
              placeholder="Enter join code"
              placeholderTextColor={theme.secondary}
              autoCapitalize="characters"
              value={joinCode}
              onChangeText={setJoinCode}
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            />

            <TouchableOpacity
              onPress={handleJoinTeam}
              style={[styles.addBtn, { backgroundColor: theme.blue }]}
            >
              <Text style={styles.closeText}>Join</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowJoinModal(false);
                setJoinCode("");
              }}
              style={[styles.cancelBtn, { borderColor: theme.accent }]}
            >
              <Text style={[styles.cancelText, { color: theme.accent }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* --------------------------- STYLES --------------------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  header: { fontSize: 24, fontWeight: "700" },
  iconButton: { padding: 4 },
  teamCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  teamHeader: {
    borderBottomWidth: 1,
    paddingBottom: 6,
    marginBottom: 6,
  },
  teamName: { fontSize: 18, fontWeight: "700" },
  overview: { fontSize: 14, marginTop: 4 },
  noItemsText: { textAlign: "center", marginTop: 30, fontSize: 16, fontWeight: "600" },
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
    alignItems: "center",
  },
  modalHeader: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: "100%",
    justifyContent: "center",
    marginTop: 10,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    width: "100%",
    marginVertical: 8,
    fontSize: 14,
  },
  addBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },
  closeText: { color: "#fff", fontWeight: "700" },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },
  cancelText: { fontWeight: "600" },
});