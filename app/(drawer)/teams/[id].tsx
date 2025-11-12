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
};

export default function TeamDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();

  const [team, setTeam] = useState<any>(null);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [removeMemberUID, setRemoveMemberUID] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [localUser, setLocalUser] = useState<any>(null);

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
      iconBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
      iconBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    }),
    [isDark]
  );

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
          `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();

        members.push({
          name: displayName || "Unknown",
          role: profile.workType || "Member",
        });
      }
    }

    return members;
  };

  useEffect(() => {
    AsyncStorage.getItem("loggedInUser").then((u) => {
      setLocalUser(u ? JSON.parse(u) : null);
    });
  }, []);

  useEffect(() => {
    if (!id) return;

    const teamRef = ref(db, `teams/${id}`);
    const cb = async (snapshot: any) => {
      const data = snapshot.val();
      if (!data) {
        router.replace("/(drawer)/teams");
        return;
      }

      const stored = await AsyncStorage.getItem("loggedInUser");
      const me = stored ? JSON.parse(stored) : null;
      const meName = me?.firstName ? `${me.firstName} ${me.lastName ?? ""}`.trim() : "User";
      const myUid = me?.uid;

      if (myUid && data.members && !data.members[myUid]) {
        router.replace("/(drawer)/teams");
        return;
      }

      // ---- TASKS ----
      const tasksRawObj = data.Tasks || {};
      const tasksRaw = Object.entries(tasksRawObj).map(([taskId, t]: any) => ({
        id: taskId,
        Task: t.Task,
        assignedTo: t.Asignee,
        status: t.status || "pending",
      }));

      // If user is creator, show all tasks
      let myTasks = myUid && data.creatorUID === myUid
        ? tasksRaw
        : tasksRaw.filter((t) => t.assignedTo === myUid);

      // ---- MEETINGS ----
      const meetingsRaw = data.meetings ? Object.values(data.meetings) : [];

      // ---- MEMBERS ----
      const membersArray = await fetchMemberProfiles(data.members);

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
        tasks: myTasks, // updated to show all tasks for creator
        meetings: meetingsRaw,
        joinCode: data.joinCode || "",
        rawMembers: data.members || {},
      });

      setTaskList(myTasks);
    };

    onValue(teamRef, cb);
    return () => off(teamRef, "value", cb);
  }, [id, router]);

  useLayoutEffect(() => {
    if (team?.name) (navigation as any)?.setOptions?.({ title: team.name });
  }, [team, navigation]);

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

      if (isCreator && memberCount <= 1) {
        await remove(teamRef);
        setShowLeaveConfirm(false);
        setShowMembers(false);
        router.replace("/(drawer)/teams");
        return;
      }

      if (isCreator && memberCount > 1) {
        Alert.alert(
          "Cannot Leave",
          "You are the team creator. Transfer ownership or delete the team instead."
        );
        return;
      }

      await remove(ref(db, `teams/${id}/members/${myUid}`));
      setShowLeaveConfirm(false);
      setShowMembers(false);
      router.replace("/(drawer)/teams");
    } catch (err) {
      console.error("Leave error:", err);
      Alert.alert("Error", "Failed to leave team. Please try again.");
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberUID) return;
    try {
      await remove(ref(db, `teams/${id}/members/${removeMemberUID}`));
      setRemoveMemberUID(null);
      setShowRemoveConfirm(false);
    } catch (err) {
      console.error("Remove member error:", err);
      Alert.alert("Error", "Failed to remove member. Try again.");
    }
  };

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      {/* HEADER AND STATS */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, marginBottom: 15 }}>
        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => router.push("/(drawer)/teams")}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back-circle-outline" size={24} color={theme.blue} />
            </TouchableOpacity>

            <Text
              style={[styles.header, { color: theme.text, flex: 1, textAlign: "center" }]}
            >
              {team.name}
            </Text>

            <TouchableOpacity onPress={() => setShowMembers(true)} style={styles.iconButton}>
              <Ionicons name="information-circle" size={26} color={theme.blue} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
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
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TASKS */}
        <Text style={[styles.subHeader, { color: theme.text, marginTop: 16 }]}>
          <MaterialIcons name="assignment" size={18} /> Tasks
        </Text>

        {pendingTasks.length > 0 ? (
          pendingTasks.map((t) => (
            <TaskItem key={t.id} task={t} theme={theme} toggleTaskStatus={toggleTaskStatus} />
          ))
        ) : (
          <Text style={[styles.noItemsText, { color: theme.secondary }]}>
            No pending tasks!
          </Text>
        )}

        {isCreator && completedTasks.length > 0 && (
          <>
            <Text style={[styles.subHeader, { color: "#16A34A" }]}>
              <MaterialIcons name="task-alt" size={18} /> Completed Tasks
            </Text>

            {completedTasks.map((t) => (
              <TaskItem key={t.id} task={t} theme={theme} toggleTaskStatus={toggleTaskStatus} />
            ))}
          </>
        )}

        {/* MEETINGS */}
        <Text style={[styles.subHeader, { color: theme.text }]}>
          <MaterialIcons name="event" size={18} /> Meetings
        </Text>

        {team.meetings?.length > 0 ? (
          team.meetings.map((m: any) => (
            <MeetingItem key={m.id} meeting={m} theme={theme} getMeetingStatus={getMeetingStatus} />
          ))
        ) : (
          <Text style={[styles.noItemsText, { color: theme.secondary }]}>
            No meetings scheduled.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: theme.accent, marginTop: 16 }]}
          onPress={handleExport}
        >
          <Ionicons name="cloud-upload-sharp" size={20} color="#fff" />
          <Text style={styles.exportText}>Export to Google Calendar</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* MEMBERS / INFO MODAL */}
      <Modal visible={showMembers} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalContentCenter,
              { backgroundColor: theme.card, padding: 0, width: "90%", maxHeight: "80%", borderRadius: 15 },
            ]}
          >
            {/* MODAL HEADER */}
            <View
              style={[styles.modalHeader, { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
            >
              <Text style={[styles.modalTitle, { fontSize: 20, fontWeight: "700", color: theme.text }]}>
                Team Info
              </Text>
              <TouchableOpacity onPress={() => setShowMembers(false)}>
                <Ionicons name="close-circle-outline" size={26} color={theme.blue} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {isCreator && !!team.joinCode && (
                <TouchableOpacity
                  onPress={copyJoinCode}
                  activeOpacity={0.8}
                  style={[styles.memberCard, { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, padding: 14, marginBottom: 12, alignItems: "flex-start" }]}
                >
                  <View>
                    <Text style={{ fontWeight: "700", color: theme.text }}>Join Code</Text>
                    <Text selectable style={{ color: theme.text, marginTop: 4 }}>{team.joinCode}</Text>
                  </View>
                </TouchableOpacity>
              )}

              <Text style={[styles.modalTitle, { color: theme.text, marginTop: 10, marginBottom: 5 }]}>
                Members
              </Text>

              {team.members.map((member: Member, idx: number) => {
                const memberUID = Object.keys(team.rawMembers)[idx];
                const isMemberCreator = memberUID === team.creatorUID;

                return (
                  <View
                    key={idx}
                    style={[styles.memberCard, { backgroundColor: theme.bg, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons name="person-circle-sharp" size={32} color={theme.blue} />
                      <View>
                        <Text style={[styles.memberName, { color: theme.text }]}>{member.name}</Text>
                        <Text style={[styles.memberRole, { color: theme.secondary }]}>{member.role}</Text>
                      </View>
                    </View>

                    {isCreator && !isMemberCreator && (
                      <TouchableOpacity
                        onPress={() => {
                          setRemoveMemberUID(memberUID);
                          setShowRemoveConfirm(true);
                        }}
                        style={{ backgroundColor: theme.danger, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 5 }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity
                style={[styles.leaveTeamButton, { borderColor: theme.danger, backgroundColor: theme.dangerBg, marginTop: 20, marginBottom: 20 }]}
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

      {/* REMOVE MEMBER CONFIRMATION */}
      <Modal visible={showRemoveConfirm} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContentCenter, { backgroundColor: theme.card, padding: 20, width: "85%" }]}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, textAlign: "center", marginBottom: 20 }}>
              Are you sure you want to remove this member?
            </Text>

            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                onPress={() => setShowRemoveConfirm(false)}
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
                onPress={handleRemoveMember}
                style={{ backgroundColor: theme.danger, flex: 1, marginLeft: 8, padding: 12, borderRadius: 10, alignItems: "center" }}
              >
                <Text style={{ color: "#FFF", fontWeight: "600" }}>Yes, Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LEAVE / DELETE CONFIRMATION */}
      <Modal visible={showLeaveConfirm} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContentCenter, { backgroundColor: theme.card, padding: 20, width: "85%" }]}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, textAlign: "center", marginBottom: 20 }}>
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
