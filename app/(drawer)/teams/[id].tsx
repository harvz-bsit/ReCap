// app/(drawer)/teams/[id].tsx
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { get, onValue, ref, set } from "firebase/database";
import { useEffect, useLayoutEffect, useState } from "react";
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

import { authRN, db } from "@/firebase/firebaseConfig";

type Member = {
  name: string;
  role?: string;
  department?: string;
};

type FirebaseMembers = Record<string, boolean> | Member[] | undefined;

const BAD_NAMES = ["Alyssa Quinones", "Mark Reyes", "Emma Diaz", "", null as any, undefined as any];

export default function TeamDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();

  const [team, setTeam] = useState<any>(null);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  /** ---------- Helpers ---------- */

  // Get active user profile + display name (nickname > full name)
  const getLoggedInUserProfile = async () => {
    const user = authRN.currentUser;
    if (!user) return null;

    const snap = await get(ref(db, `users/${user.uid}`));
    if (!snap.exists()) return null;

    const profile = snap.val();
    const displayName =
      (profile.nickname && String(profile.nickname).trim()) ||
      `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();

    return { profile, displayName };
  };

  // Fetch member profiles from UIDs
  const fetchMemberProfiles = async (membersRaw: Record<string, boolean> | undefined) => {
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

  // Replace bad/empty assignedTo with me, return cleaned array
  const sanitizeTasks = (tasks: any[], meName: string) =>
    (tasks || []).map((t) => ({
      ...t,
      assignedTo: BAD_NAMES.includes(t?.assignedTo as any) ? meName : t?.assignedTo,
    }));

  /** ---------- Load & Sync ---------- */
  useEffect(() => {
    if (!id) return;

    const teamRef = ref(db, `teams/${id}`);

    const unsubscribe = onValue(teamRef, async (snapshot) => {
      const userInfo = await getLoggedInUserProfile();
      const meName = userInfo?.displayName || "User";
      const meMember: Member = {
        name: meName,
        role: userInfo?.profile?.workType || "Member",
        department: userInfo?.profile?.department || "IT",
      };

      const data = snapshot.val();

      if (data) {
        const tasksRaw = data.tasks ? Object.values(data.tasks) : [];
        const meetingsRaw = data.meetings ? Object.values(data.meetings) : [];

        // Ensure I am in members
        const membersArray = await fetchMemberProfiles(data.members);

        setTeam({
          id,
          name: data.name || "Unnamed Team",
          overview: data.overview || "",
          members: membersArray,
          tasks: sanitizeTasks(tasksRaw, meName),
          meetings: meetingsRaw,
          joinCode: data.joinCode || "",
        });
        setTaskList(sanitizeTasks(tasksRaw, meName));
        return;
      }

      // If team does not exist
      if (userInfo) {
        await set(ref(db, `teams/${id}`), {
          name: "New Team",
          overview: "",
          members: { [authRN.currentUser?.uid as string]: true },
          tasks: {},
          meetings: {},
        });

        setTeam({
          id,
          name: "New Team",
          overview: "",
          members: [meMember],
          tasks: [],
          meetings: [],
          joinCode: "",
        });
        setTaskList([]);
      }
    });

    return () => unsubscribe();
  }, [id]);

  /** ---------- UI plumbing ---------- */
  useLayoutEffect(() => {
    if (team?.name) (navigation as any)?.setOptions?.({ title: team.name });
  }, [team]);

  if (!team) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? "#121212" : "#F4F8FB" }]}>
        <Text style={{ textAlign: "center", marginTop: 40, color: isDark ? "#FFF" : "#000" }}>Loading team...</Text>
      </SafeAreaView>
    );
  }

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

  const handleExport = () => Linking.openURL("https://calendar.google.com/calendar/u/0/r");

  const copyJoinCode = async () => {
    if (!team?.joinCode) return;
    await Clipboard.setStringAsync(team.joinCode);
    Alert.alert("Copied", "Join code copied to clipboard.");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? "#121212" : "#F4F8FB" }]}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push("/(drawer)/teams")} style={styles.backButton}>
          <Ionicons name="arrow-back-circle-outline" size={24} color="#1976D2" />
        </TouchableOpacity>

        <Text style={[styles.header, { color: isDark ? "#FFF" : "#000" }]}>{team.name}</Text>

        <TouchableOpacity onPress={() => setShowMembers(true)} style={styles.iconButton}>
          <Ionicons name="information-circle" size={26} color="#1976D2" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* STATS */}
        <View style={styles.statsContainer}>
          <StatCard icon="assignment" color="#F59E0B" number={pendingTasks.length} label="Pending" theme={{ lightCard: isDark ? "#1E1E1E" : "#F6F9FF", iconBg: "rgba(0,0,0,0.04)", iconBorder: "rgba(0,0,0,0.08)", text: isDark ? "#FFF" : "#000", secondary: isDark ? "#B0BEC5" : "#444", }} />
          <StatCard icon="task-alt" color="#16A34A" number={completedTasks.length} label="Completed" theme={{ lightCard: isDark ? "#1E1E1E" : "#F6F9FF", iconBg: "rgba(0,0,0,0.04)", iconBorder: "rgba(0,0,0,0.08)", text: isDark ? "#FFF" : "#000", secondary: isDark ? "#B0BEC5" : "#444", }} />
          <StatCard icon="calendar-today" color="#1976D2" number={team.meetings?.length || 0} label="Meetings" theme={{ lightCard: isDark ? "#1E1E1E" : "#F6F9FF", iconBg: "rgba(0,0,0,0.04)", iconBorder: "rgba(0,0,0,0.08)", text: isDark ? "#FFF" : "#000", secondary: isDark ? "#B0BEC5" : "#444", }} />
        </View>

        {/* TASKS */}
        <Text style={[styles.subHeader, { color: isDark ? "#FFF" : "#000" }]}><MaterialIcons name="assignment" size={18} /> Tasks</Text>
        {pendingTasks.length > 0 ? pendingTasks.map((t) => <TaskItem key={t.id} task={t} theme={{ text: isDark ? "#FFF" : "#000", secondary: isDark ? "#B0BEC5" : "#444" }} toggleTaskStatus={toggleTaskStatus} />) : <Text style={[styles.noItemsText, { color: isDark ? "#FFF" : "#555" }]}>No pending tasks!</Text>}

        {/* COMPLETED TASKS */}
        {completedTasks.length > 0 && (
          <>
            <Text style={[styles.subHeader, { color: "#16A34A" }]}><MaterialIcons name="task-alt" size={18} /> Completed Tasks</Text>
            {completedTasks.map((t) => <TaskItem key={t.id} task={t} theme={{ text: isDark ? "#FFF" : "#000" }} toggleTaskStatus={toggleTaskStatus} />)}
          </>
        )}

        {/* MEETINGS */}
        <Text style={[styles.subHeader, { color: isDark ? "#FFF" : "#000" }]}><MaterialIcons name="event" size={18} /> Meetings</Text>
        {team.meetings?.length > 0 ? team.meetings.map((m: any) => <MeetingItem key={m.id} meeting={m} theme={{ text: isDark ? "#FFF" : "#000", secondary: isDark ? "#B0BEC5" : "#444" }} getMeetingStatus={getMeetingStatus} />) : <Text style={[styles.noItemsText, { color: isDark ? "#FFF" : "#555" }]}>No meetings scheduled.</Text>}

        {/* EXPORT */}
        <TouchableOpacity style={[styles.exportButton, { backgroundColor: "#2196F3" }]} onPress={handleExport}>
          <Ionicons name="cloud-upload-sharp" size={20} color="#fff" />
          <Text style={styles.exportText}>Export to Google Calendar</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* MEMBERS / INFO MODAL */}
      <Modal visible={showMembers} transparent={false} animationType="fade">
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#121212" : "#F4F8FB", padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: isDark ? "#FFF" : "#000" }}>Team Info</Text>
            <TouchableOpacity onPress={() => setShowMembers(false)}>
              <Ionicons name="close-circle-outline" size={26} color="#1976D2" />
            </TouchableOpacity>
          </View>

          {/* Join Code */}
          {!!team.joinCode && (
            <TouchableOpacity onPress={copyJoinCode} activeOpacity={0.8} style={{ borderWidth: 1, borderColor: isDark ? "#444" : "#DDD", backgroundColor: isDark ? "#1E1E1E" : "#FFF", padding: 14, borderRadius: 14, marginBottom: 12 }}>
              <Text style={{ fontWeight: "700", color: isDark ? "#FFF" : "#000" }}>Join Code</Text>
              <Text selectable style={{ color: isDark ? "#FFF" : "#000", marginTop: 4 }}>{team.joinCode}</Text>
            </TouchableOpacity>
          )}

          {/* Members List */}
          <ScrollView style={{ maxHeight: 300 }}>
            {team.members.map((member: Member, idx: number) => (
              <View key={idx} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="person-circle-sharp" size={32} color="#1976D2" style={{ marginRight: 8 }} />
                <View>
                  <Text style={{ fontWeight: "600", color: isDark ? "#FFF" : "#000" }}>{member.name}</Text>
                  <Text style={{ color: isDark ? "#B0BEC5" : "#555" }}>{member.role} • {member.department}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={{ marginTop: 16, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#DC2626", backgroundColor: "#FEE2E2", flexDirection: "row", justifyContent: "center", alignItems: "center" }} onPress={() => setShowLeaveConfirm(true)}>
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
            <Text style={{ color: "#DC2626", fontWeight: "600", marginLeft: 8 }}>Leave Team</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* LEAVE CONFIRM */}
      <Modal visible={showLeaveConfirm} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ width: "85%", backgroundColor: isDark ? "#1E1E1E" : "#FFF", borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: isDark ? "#FFF" : "#000", textAlign: "center" }}>Do you want to leave {team.name}?</Text>

            <View style={{ flexDirection: "row", marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowLeaveConfirm(false)} style={{ backgroundColor: isDark ? "#333" : "#F6F9FF", flex: 1, marginRight: 8, padding: 12, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ color: isDark ? "#FFF" : "#444", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {
                setShowLeaveConfirm(false);
                setShowMembers(false);
                Alert.alert("Success", `You have left ${team.name}.`);
                router.push("/teams");
              }} style={{ backgroundColor: "#cc1b1b", flex: 1, marginLeft: 8, padding: 12, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ color: "#FFF", fontWeight: "600" }}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
