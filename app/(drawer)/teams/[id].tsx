import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { get, off, onValue, ref, remove } from "firebase/database";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeetingItem from "@/app/(drawer)/teams/components/MeetingItem";
import StatCard from "@/app/(drawer)/teams/components/StatCard";
import TaskItem from "@/app/(drawer)/teams/components/TaskItem";
import { styles } from "@/app/(drawer)/teams/styles";
import { db } from "@/firebase/firebaseConfig";

type Member = {
  name: string;
  role?: string;
  department?: string;
};

const BAD_NAMES = [
  "Alyssa Quinones",
  "Mark Reyes",
  "Emma Diaz",
  "",
  null as any,
  undefined as any,
];

export default function TeamDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();

  // ---------- State (all hooks at the top) ----------
  const [team, setTeam] = useState<any>(null);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [localUser, setLocalUser] = useState<any>(null);

  // ---------- Theme ----------
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = useMemo(
    () => ({
      bg: isDark ? "#121212" : "#F4F8FB",
      card: isDark ? "#1E1E1E" : "#FFFFFF",
      text: isDark ? "#FFFFFF" : "#000000",
      secondary: isDark ? "#B0BEC5" : "#555",
      blue: "#1976D2",
      accent: isDark ? "#1565C0" : "#2196F3",
      border: isDark ? "#333" : "#E0E0E0",
      danger: "#DC2626",
      dangerBg: "#FEE2E2",
      // for icon backgrounds/borders used by child cards
      iconBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
      iconBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    }),
    [isDark]
  );

  // ---------- Helpers ----------
  const fetchMemberProfiles = async (
    membersRaw: Record<string, boolean> | undefined
  ) => {
    if (!membersRaw) return [];

    const uids = Object.keys(membersRaw);
    const members: Member[] = [];

    for (const uid of uids) {
      const snap = await get(ref(db, `users/${uid}`));
      if (snap.exists()) {
        const profile = snap.val();
        const displayName =
          (profile.nickname && String(profile.nickname).trim()) ||
          `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();

        members.push({
          name: displayName || "Unknown",
          role: profile.workType || "Member",
          department: profile.department || "IT",
        });
      }
    }

    return members;
  };

  const sanitizeTasks = (tasks: any[], meName: string) =>
    (tasks || []).map((t) => ({
      ...t,
      assignedTo: BAD_NAMES.includes(t?.assignedTo as any) ? meName : t?.assignedTo,
    }));

  // ---------- Load local user once ----------
  useEffect(() => {
    AsyncStorage.getItem("loggedInUser").then((u) => {
      setLocalUser(u ? JSON.parse(u) : null);
    });
  }, []);

  // ---------- Realtime team listener ----------
  useEffect(() => {
    if (!id) return;

    const teamRef = ref(db, `teams/${id}`);
    const cb = async (snapshot: any) => {
      const data = snapshot.val();

      // If team no longer exists, go back to list
      if (!data) {
        router.replace("/(drawer)/teams");
        return;
      }

      // Ensure we know who "me" is for task sanitization and membership checks
      const stored = await AsyncStorage.getItem("loggedInUser");
      const me = stored ? JSON.parse(stored) : null;
      const meName = me?.firstName ? `${me.firstName} ${me.lastName ?? ""}`.trim() : "User";
      const myUid = me?.uid;

      // If members exist and I'm not in the members anymore, redirect out
      if (myUid && data.members && !data.members[myUid]) {
        router.replace("/(drawer)/teams");
        return;
      }

      const tasksRaw = data.tasks ? Object.values(data.tasks) : [];
      const meetingsRaw = data.meetings ? Object.values(data.meetings) : [];
      const membersArray = await fetchMemberProfiles(data.members);

      // Order members: creator first
      let orderedMembers = membersArray;
      if (data.creatorUID) {
        const creatorSnap = await get(ref(db, `users/${data.creatorUID}`));
        if (creatorSnap.exists()) {
          const c = creatorSnap.val();
          const creatorName =
            (c.nickname && String(c.nickname).trim()) ||
            `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();

          const creatorIndex = membersArray.findIndex((m) => m.name === creatorName);
          if (creatorIndex > -1) {
            const creator = membersArray[creatorIndex];
            orderedMembers = [
              creator,
              ...membersArray.filter((_, i) => i !== creatorIndex),
            ];
          }
        }
      }

      setTeam({
        id,
        name: data.name || "Unnamed Team",
        overview: data.overview || "",
        creatorUID: data.creatorUID || null,
        members: orderedMembers,
        tasks: sanitizeTasks(tasksRaw, meName),
        meetings: meetingsRaw,
        joinCode: data.joinCode || "",
        rawMembers: data.members || {}, // keep raw for counts
      });

      setTaskList(sanitizeTasks(tasksRaw, meName));
    };

    onValue(teamRef, cb);
    return () => off(teamRef, "value", cb);
  }, [id, router]);

  // ---------- Header title ----------
  useLayoutEffect(() => {
    if (team?.name) (navigation as any)?.setOptions?.({ title: team.name });
  }, [team, navigation]);

  // ---------- Leave team logic ----------
  const handleLeaveTeam = async () => {
    try {
      const stored = await AsyncStorage.getItem("loggedInUser");
      const me = stored ? JSON.parse(stored) : null;

      if (!me?.uid) {
        Alert.alert("Error", "User not found.");
        return;
      }

      const myUid = me.uid;
      const teamRef = ref(db, `teams/${id}`);
      const teamSnap = await get(teamRef);

      if (!teamSnap.exists()) {
        // Already gone — just bounce out
        setShowLeaveConfirm(false);
        setShowMembers(false);
        router.replace("/(drawer)/teams");
        return;
      }

      const teamData = teamSnap.val();
      const membersObj: Record<string, true> = teamData.members || {};
      const memberIds = Object.keys(membersObj);
      const memberCount = memberIds.length;

      const isCreator = teamData.creatorUID === myUid;

      // If creator AND the only member -> delete the team
      if (isCreator && memberCount <= 1) {
        await remove(teamRef);
        setShowLeaveConfirm(false);
        setShowMembers(false);
        router.replace("/(drawer)/teams");
        return;
      }

      // If creator but there are other members -> cannot leave
      if (isCreator && memberCount > 1) {
        Alert.alert(
          "Cannot Leave",
          "You are the team creator. Transfer ownership or delete the team instead."
        );
        return;
      }

      // Regular member: remove membership
      await remove(ref(db, `teams/${id}/members/${myUid}`));

      // Close modals and redirect immediately
      setShowLeaveConfirm(false);
      setShowMembers(false);
      router.replace("/(drawer)/teams");
    } catch (err) {
      console.error("Leave error:", err);
      Alert.alert("Error", "Failed to leave team. Please try again.");
    }
  };

  // ---------- Derived + UI helpers ----------
  if (!team) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
        <Text style={{ textAlign: "center", marginTop: 40, color: theme.text }}>
          Loading team...
        </Text>
      </SafeAreaView>
    );
  }

  const isCreator = localUser?.uid && team?.creatorUID === localUser.uid;

  const now = new Date();
  const getMeetingStatus = (date: string, time: string) =>
    new Date(`${date}T${time}:00`) < now ? "Missed" : "Upcoming";

  const toggleTaskStatus = (taskId: string) =>
    setTaskList((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === "Completed" ? "Pending" : "Completed" }
          : t
      )
    );

  const pendingTasks = taskList.filter((t) => t.status !== "Completed");
  const completedTasks = taskList.filter((t) => t.status === "Completed");

  const handleExport = () =>
    Linking.openURL("https://calendar.google.com/calendar/u/0/r");

  const copyJoinCode = async () => {
    if (!team?.joinCode) return;
    await Clipboard.setStringAsync(team.joinCode);
    Alert.alert("Copied", "Join code copied to clipboard.");
  };

  // ---------- Render ----------
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      {/* HEADER */}
      <View style={[styles.headerRow, { paddingHorizontal: 16, paddingTop: 12, marginBottom: 15 }]}>
        <TouchableOpacity
          onPress={() => router.push("/(drawer)/teams")}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back-circle-outline" size={24} color={theme.blue} />
        </TouchableOpacity>

        <Text style={[styles.header, { color: theme.text }]}>{team.name}</Text>

        <TouchableOpacity onPress={() => setShowMembers(true)} style={styles.iconButton}>
          <Ionicons name="information-circle" size={26} color={theme.blue} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* STATS */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="assignment"
            color="#F59E0B"
            number={pendingTasks.length}
            label="Pending"
            theme={theme}
          />
          <StatCard
            icon="task-alt"
            color="#16A34A"
            number={completedTasks.length}
            label="Completed"
            theme={theme}
          />
          <StatCard
            icon="calendar-today"
            color={theme.blue}
            number={team.meetings?.length || 0}
            label="Meetings"
            theme={theme}
          />
        </View>

        {/* TASKS */}
        <Text style={[styles.subHeader, { color: theme.text }]}>
          <MaterialIcons name="assignment" size={18} /> Tasks
        </Text>

        {pendingTasks.length > 0 ? (
          pendingTasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              theme={theme}
              toggleTaskStatus={toggleTaskStatus}
            />
          ))
        ) : (
          <Text style={[styles.noItemsText, { color: theme.secondary }]}>
            No pending tasks!
          </Text>
        )}

        {/* COMPLETED TASKS (Creator Only) */}
        {isCreator && completedTasks.length > 0 && (
          <>
            <Text style={[styles.subHeader, { color: "#16A34A" }]}>
              <MaterialIcons name="task-alt" size={18} /> Completed Tasks
            </Text>

            {completedTasks.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                theme={theme}
                toggleTaskStatus={toggleTaskStatus}
              />
            ))}
          </>
        )}

        {/* MEETINGS */}
        <Text style={[styles.subHeader, { color: theme.text }]}>
          <MaterialIcons name="event" size={18} /> Meetings
        </Text>

        {team.meetings?.length > 0 ? (
          team.meetings.map((m: any) => (
            <MeetingItem
              key={m.id}
              meeting={m}
              theme={theme}
              getMeetingStatus={getMeetingStatus}
            />
          ))
        ) : (
          <Text style={[styles.noItemsText, { color: theme.secondary }]}>
            No meetings scheduled.
          </Text>
        )}

        {/* EXPORT */}
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: theme.accent }]}
          onPress={handleExport}
        >
          <Ionicons name="cloud-upload-sharp" size={20} color="#fff" />
          <Text style={styles.exportText}>Export to Google Calendar</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* MEMBERS / INFO MODAL (Floating Modal) */}
      <Modal visible={showMembers} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalContentCenter,
              { backgroundColor: theme.card, padding: 0, width: "90%", maxHeight: "80%", borderRadius: 15 }, // Floating card styles
            ]}
          >
            {/* MODAL HEADER */}
            <View
              style={[
                styles.modalHeader,
                { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  { fontSize: 20, fontWeight: "700", color: theme.text },
                ]}
              >
                Team Info
              </Text>
              <TouchableOpacity onPress={() => setShowMembers(false)}>
                <Ionicons name="close-circle-outline" size={26} color={theme.blue} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* JOIN CODE (Creator Only) */}
              {isCreator && !!team.joinCode && (
                <TouchableOpacity
                  onPress={copyJoinCode}
                  activeOpacity={0.8}
                  style={[
                    styles.memberCard,
                    {
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.bg,
                      padding: 14,
                      marginBottom: 12,
                      alignItems: "flex-start",
                    },
                  ]}
                >
                  <View>
                    <Text style={{ fontWeight: "700", color: theme.text }}>Join Code</Text>
                    <Text selectable style={{ color: theme.text, marginTop: 4 }}>
                      {team.joinCode}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* MEMBERS LIST */}
              <Text
                style={[
                  styles.modalTitle,
                  { color: theme.text, marginTop: 10, marginBottom: 5 },
                ]}
              >
                Members
              </Text>
              {team.members.map((member: Member, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.memberCard,
                    { backgroundColor: theme.bg, paddingVertical: 12 },
                  ]}
                >
                  <Ionicons name="person-circle-sharp" size={32} color={theme.blue} />
                  <View>
                    <Text style={[styles.memberName, { color: theme.text }]}>
                      {member.name}
                    </Text>
                    <Text style={[styles.memberRole, { color: theme.secondary }]}>
                      {member.role} • {member.department}
                    </Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.leaveTeamButton,
                  {
                    borderColor: theme.danger,
                    backgroundColor: theme.dangerBg,
                    marginTop: 20,
                    marginBottom: 20, // Reduced margin for floating modal
                  },
                ]}
                onPress={() => setShowLeaveConfirm(true)}
              >
                <Ionicons name="log-out-outline" size={22} color={theme.danger} />
                <Text style={[styles.leaveTeamButtonText, { color: theme.danger }]}>
                  {isCreator && team?.rawMembers
                    ? Object.keys(team.rawMembers).length <= 1
                      ? "Delete Team"
                      : "Leave Team"
                    : "Leave Team"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* LEAVE / DELETE CONFIRM */}
      <Modal visible={showLeaveConfirm} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalContentCenter,
              { backgroundColor: theme.card, padding: 20, width: "85%" },
            ]}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: theme.text,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              {isCreator && team?.rawMembers && Object.keys(team.rawMembers).length <= 1
                ? `Delete ${team.name}?`
                : `Are you sure you want to leave ${team.name}?`}
            </Text>

            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                onPress={() => setShowLeaveConfirm(false)}
                style={{
                  backgroundColor: theme.bg,
                  flex: 1,
                  marginRight: 8,
                  padding: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLeaveTeam}
                style={{
                  backgroundColor: theme.danger,
                  flex: 1,
                  marginLeft: 8,
                  padding: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FFF", fontWeight: "600" }}>
                  {isCreator && team?.rawMembers && Object.keys(team.rawMembers).length <= 1
                    ? "Yes, Delete"
                    : "Yes, Leave"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}