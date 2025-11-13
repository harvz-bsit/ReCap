import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { get, off, onValue, ref, remove, set } from "firebase/database";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
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

type Member = { name: string; role?: string };

export default function TeamDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();

  const [team, setTeam] = useState<any>(null);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [localUser, setLocalUser] = useState<any>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeMemberUID, setRemoveMemberUID] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

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

  const exportTasksToGoogleCalendar = () => {
  taskList.forEach((task) => {
    const title = encodeURIComponent(task.task);
    const details = encodeURIComponent(`Assigned to: ${task.assigneeName}`);
    const startDate = new Date(task.createdAt).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endDate = new Date(new Date(task.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace(/-|:|\.\d\d\d/g, '');

    // Google Calendar URL (opens app if installed on mobile)
    const url = `https://calendar.google.com/calendar/u/0/r/eventedit?text=${title}&details=${details}&dates=${startDate}/${endDate}`;

    Linking.openURL(url);
  });
};



  // Load local user once
  useEffect(() => {
    AsyncStorage.getItem("loggedInUser").then((u) => setLocalUser(u ? JSON.parse(u) : null));
  }, []);

  // Fetch member profiles
  const fetchMemberProfiles = async (membersRaw: Record<string, boolean> | undefined) => {
    if (!membersRaw) return [];
    const uids = Object.keys(membersRaw);
    const members: Member[] = [];
    for (const uid of uids) {
      const snap = await get(ref(db, `users/${uid}`));
      if (snap.exists()) {
        const profile = snap.val();
        members.push({
          name: `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "Unknown",
          role: profile.role || "Member",
          profilePic: profile.profilePic || null,
        });
      }
    }
    return members;
  };

  // Listen to team updates
  useEffect(() => {
    if (!id) return;
    const teamRef = ref(db, `teams/${id}`);
    const handleTeamSnapshot = async (snapshot: any) => {
      const data = snapshot.val();
      if (!data) return router.replace("/(drawer)/teams");

      const stored = await AsyncStorage.getItem("loggedInUser");
      const me = stored ? JSON.parse(stored) : null;
      const meUid = me?.uid;
      const meName = me ? `${me.firstName} ${me.lastName ?? ""}`.trim() : "";

      // Restrict access if not member
      if (meUid && data.members && !data.members[meUid]) return router.replace("/(drawer)/teams");

      // Prepare tasks
      const tasksRaw = Object.entries(data.tasks || {}).map(([tid, t]: any) => ({
        id: tid,
        task: t.task,
        assigneeName: t.assigneeName,
        status: t.status || "Pending",
        createdAt: t.createdAt,
      }));
      const myTasks =
        meUid && data.creatorUID === meUid
          ? tasksRaw
          : tasksRaw.filter((t) => t.assigneeName === meName);

      // Prepare meetings
      const meetingsRaw = Object.entries(data.meetings || {}).map(([mid, m]: any) => ({
        id: mid,
        ...m,
      }));

      // Members
      const membersArray = await fetchMemberProfiles(data.members);
      let orderedMembers = membersArray;
      if (data.creatorUID) {
        const creatorSnap = await get(ref(db, `users/${data.creatorUID}`));
        if (creatorSnap.exists()) {
          const c = creatorSnap.val();
          const creatorName = (c.nickname ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`).trim();
          const idx = membersArray.findIndex((m) => m.name === creatorName);
          if (idx > -1) {
            orderedMembers = [membersArray[idx], ...membersArray.filter((_, i) => i !== idx)];
          }
        }
      }

      setTeam({
        id,
        name: data.name || "Unnamed Team",
        overview: data.overview || "",
        creatorUID: data.creatorUID,
        members: orderedMembers,
        rawMembers: data.members || {},
        tasks: myTasks,
        meetings: meetingsRaw,
        joinCode: data.joinCode || "",
      });
      setTaskList(myTasks);
    };

    onValue(teamRef, handleTeamSnapshot);
    return () => off(teamRef, "value", handleTeamSnapshot);
  }, [id, router]);

  useLayoutEffect(() => {
    if (team?.name) (navigation as any)?.setOptions?.({ title: team.name });
  }, [team, navigation]);

  // Toggle task status
  const toggleTaskStatus = async (taskId: string) => {
    if (!team) return;
    const task = taskList.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === "Completed" ? "Pending" : "Completed";
    try {
      await set(ref(db, `teams/${team.id}/tasks/${taskId}/status`), newStatus);
      setTaskList((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update task status.");
    }
  };

  // Leave or delete team
  const handleLeaveTeam = async () => {
    if (!localUser?.uid || !team) return;
    try {
      const meUid = localUser.uid;
      const teamRef = ref(db, `teams/${team.id}`);
      const teamSnap = await get(teamRef);
      if (!teamSnap.exists()) return;

      const teamData = teamSnap.val();
      const memberCount = Object.keys(teamData.members || {}).length;
      const isCreator = teamData.creatorUID === meUid;

      if (isCreator && memberCount <= 1) {
        await remove(teamRef);
      } else if (!isCreator || (isCreator && memberCount > 1)) {
        if (isCreator) {
          Alert.alert(
            "Cannot Leave",
            "You are the team creator. Transfer ownership or delete the team instead."
          );
          return;
        } else {
          await remove(ref(db, `teams/${team.id}/members/${meUid}`));
        }
      }
      setShowLeaveConfirm(false);
      router.replace("/(drawer)/teams");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to leave team.");
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberUID || !team) return;
    try {
      await remove(ref(db, `teams/${team.id}/members/${removeMemberUID}`));
      setRemoveMemberUID(null);
      setShowRemoveConfirm(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to remove member.");
    }
  };

  const copyJoinCode = async () => {
    if (!team?.joinCode) return;
    await Clipboard.setStringAsync(team.joinCode);
    Alert.alert("Copied", "Join code copied to clipboard.");
  };

  const openMeetingModal = (meeting: any) => {
    setSelectedMeeting(meeting);
    setShowMeetingModal(true);
  };

  const handleExport = () => Linking.openURL("https://calendar.google.com/calendar/u/0/r");

  const isCreator = localUser?.uid && team?.creatorUID === localUser.uid;
  const pendingTasks = taskList.filter((t) => t.status !== "Completed");
  const completedTasks = taskList.filter((t) => t.status === "Completed");

  if (!team) return <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}><Text style={{ textAlign: "center", marginTop: 40, color: theme.text }}>Loading team...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header and Stats */}
        <View style={{ padding: 16 }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 12, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <TouchableOpacity onPress={() => router.push("/(drawer)/teams")}>
                <Ionicons name="arrow-back-circle-outline" size={24} color={theme.blue} />
              </TouchableOpacity>
              <Text style={{ fontWeight: "700", fontSize: 18, color: theme.text }}>{team.name}</Text>
              <TouchableOpacity onPress={() => setShowMembers(true)}>
                <Ionicons name="information-circle" size={26} color={theme.blue} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <StatCard icon="assignment" color="#F59E0B" number={pendingTasks.length} label="Pending" theme={theme} />
              <StatCard icon="task-alt" color="#16A34A" number={completedTasks.length} label="Completed" theme={theme} />
              <StatCard icon="calendar-today" color={theme.blue} number={team.meetings?.length || 0} label="Meetings" theme={theme} />
            </View>
          </View>
        </View>

        {/* Tasks */}
        <Text style={[styles.subHeader, { color: theme.text, marginTop: 16 }]}>
          <MaterialIcons name="assignment" size={18} /> Tasks
        </Text>
        {pendingTasks.length > 0 ? pendingTasks.map((t) => (
          <TaskItem key={t.id} task={t} theme={theme} toggleTaskStatus={toggleTaskStatus} isCreator={isCreator} members={team.members} teamId={team.id} />
        )) : <Text style={[styles.noItemsText, { color: theme.secondary }]}>No pending tasks!</Text>}

        {completedTasks.length > 0 && (
          <>
            <Text style={[styles.subHeader, { color: "#16A34A" }]}>
              <MaterialIcons name="task-alt" size={18} /> Completed Tasks
            </Text>
            {completedTasks.map((t) => (
              <TaskItem key={t.id} task={t} theme={theme} toggleTaskStatus={toggleTaskStatus} isCreator={isCreator} members={team.members} teamId={team.id} />
            ))}
          </>
        )}

        {/* Meetings */}
        <Text style={[styles.subHeader, { color: theme.text }]}>
          <MaterialIcons name="event" size={18} /> Meetings
        </Text>
        {team.meetings?.length > 0 ? team.meetings.map((m) => (
          <TouchableOpacity key={m.id} onPress={() => openMeetingModal(m)}>
            <MeetingItem meeting={m} theme={theme} getMeetingStatus={() => ""} />
          </TouchableOpacity>
        )) : <Text style={{ color: theme.secondary, marginVertical: 8 }}>No meetings scheduled.</Text>}

       <TouchableOpacity
  style={[styles.exportButton, { backgroundColor: theme.accent, marginTop: 16 }]}
  onPress={exportTasksToGoogleCalendar}
>
  <Ionicons name="cloud-upload-sharp" size={20} color="#fff" />
  <Text style={styles.exportText}>Export Tasks to Google Calendar</Text>
</TouchableOpacity>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* MEETING SUMMARY MODAL */}
      <Modal visible={showMeetingModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContentCenter, { backgroundColor: theme.card, padding: 20, width: "85%" }]}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginBottom: 15 }}>
              Meeting Summary
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={{ color: theme.text }}>{selectedMeeting?.summary || "No summary available."}</Text>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowMeetingModal(false)}
              style={{ marginTop: 20, alignSelf: "center" }}
            >
              <Text style={{ color: theme.blue, fontWeight: "600", fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MEMBERS / INFO MODAL */}
      {/* MEMBERS / TEAM INFO MODAL */}
<Modal visible={showMembers} transparent animationType="fade">
  <View style={styles.modalOverlayCenter}>
    <View
      style={[
        styles.modalContentCenter,
        {
          backgroundColor: theme.card,
          padding: 0,
          width: "90%",
          maxHeight: "80%",
          borderRadius: 15,
        },
      ]}
    >
      {/* Header */}
      <View
        style={{
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: theme.text }}>
          Team Info
        </Text>
        <TouchableOpacity onPress={() => setShowMembers(false)}>
          <Ionicons name="close-circle-outline" size={26} color={theme.blue} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Join Code for Creator */}
        {isCreator && !!team.joinCode && (
          <TouchableOpacity
            onPress={copyJoinCode}
            activeOpacity={0.8}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.bg,
              padding: 14,
              marginBottom: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontWeight: "700", color: theme.text }}>Join Code</Text>
            <Text selectable style={{ color: theme.text, marginTop: 4 }}>
              {team.joinCode}
            </Text>
          </TouchableOpacity>
        )}

        {/* Members Section */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: theme.text,
            marginVertical: 10,
          }}
        >
          Members
        </Text>

        {team.members.map((member: Member, idx: number) => {
          const memberUID = Object.keys(team.rawMembers)[idx];
          const isMemberCreator = memberUID === team.creatorUID;

          return (
            <View
              key={memberUID}
              style={{
                backgroundColor: theme.bg,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                borderRadius: 10,
              }}
            >
              {/* Profile Pic + Name + Role */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 10 }}>
                {member.profilePic ? (
                  <Image
                    source={{ uri: member.profilePic }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                  />
                ) : (
                  <Ionicons name="person-circle-sharp" size={40} color={theme.blue} />
                )}
                <View>
                  <Text style={{ color: theme.text, fontWeight: "600" }}>
                    {member.name}
                  </Text>
                  <Text style={{ color: theme.secondary }}>{member.role}</Text>
                </View>
              </View>

              {/* Remove Button */}
              {isCreator && !isMemberCreator && (
                <TouchableOpacity
                  onPress={() => {
                    setRemoveMemberUID(memberUID);
                    setShowRemoveConfirm(true);
                  }}
                  style={{
                    backgroundColor: theme.danger,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderRadius: 5,
                    marginRight: 15,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>-</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Leave / Delete Team */}
        <TouchableOpacity
          style={{
            borderColor: theme.danger,
            backgroundColor: theme.dangerBg,
            marginTop: 20,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
          }}
          onPress={() => setShowLeaveConfirm(true)}
        >
          <Ionicons name="log-out-outline" size={22} color={theme.danger} />
          <Text
            style={{
              color: theme.danger,
              fontWeight: "600",
              marginLeft: 8,
            }}
          >
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
