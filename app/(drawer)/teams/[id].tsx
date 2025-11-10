// app/(drawer)/teams/[id].tsx
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { get, onValue, ref, set, update } from "firebase/database";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
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

type FirebaseMembers = Record<string, Member> | Member[] | undefined;

const BAD_NAMES = ["Alyssa Quinones", "Mark Reyes", "Emma Diaz", "", null as any, undefined as any];

export default function TeamDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();

  const [team, setTeam] = useState<any>(null);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // --- local theme just for minor inline colors in join-code container
  const isDark = useMemo(() => false, []); // your shared styles already handle colors; keep neutral here

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

  // Normalize members to an array for rendering (Leader first)
  const toArrayMembers = (members: FirebaseMembers): Member[] => {
    let arr: Member[] = [];
    if (!members) arr = [];
    else if (Array.isArray(members)) arr = members.filter(Boolean);
    else arr = Object.values(members ?? {});

    // Leader first (no badges, just order)
    const leaders = arr.filter((m) => (m.role || "").toLowerCase() === "leader");
    const others = arr.filter((m) => (m.role || "").toLowerCase() !== "leader");
    return [...leaders, ...others];
  };

  // Upsert current user into team.members (supports array or object)
  const upsertMember = async (teamId: string, members: FirebaseMembers, me: Member) => {
    const user = authRN.currentUser;
    if (!user) return;

    // If object keyed by uid -> simple put
    if (members && !Array.isArray(members)) {
      await update(ref(db, `teams/${teamId}/members`), {
        [user.uid]: { name: me.name, role: me.role, department: me.department },
      });
      return;
    }

    // If array -> ensure one entry with my name; also drop mock names
    const arr: Member[] = Array.isArray(members) ? members.slice() : [];
    const withoutMocks = arr.filter((m) => m && !BAD_NAMES.includes(m.name as any));
    const idx = withoutMocks.findIndex((m) => m.name === me.name);

    if (idx === -1) {
      withoutMocks.push(me);
    } else {
      withoutMocks[idx] = { ...withoutMocks[idx], role: me.role, department: me.department };
    }

    await set(ref(db, `teams/${teamId}/members`), withoutMocks);
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

      // If team exists
      if (data) {
        const membersRaw: FirebaseMembers = data.members;
        const tasksRaw = data.tasks ? Object.values(data.tasks) : [];
        const meetingsRaw = data.meetings ? Object.values(data.meetings) : [];

        // Ensure I am in members (handles array or object)
        await upsertMember(String(id), membersRaw, meMember);

        // Clean tasks; if changed, write back (keep ids)
        const fixedTasks = sanitizeTasks(tasksRaw, meName);
        if (JSON.stringify(fixedTasks) !== JSON.stringify(tasksRaw)) {
          const taskObj: any = {};
          fixedTasks.forEach((t: any) => {
            if (t?.id) taskObj[t.id] = t;
          });
          await update(ref(db, `teams/${id}`), { tasks: taskObj });
        }

        setTeam({
          id,
          name: data.name || "Unnamed Team",
          overview: data.overview || "",
          members: toArrayMembers(membersRaw),
          tasks: fixedTasks,
          meetings: meetingsRaw,
          joinCode: data.joinCode || "", // <-- used in the modal
        });
        setTaskList(fixedTasks);
        return;
      }

      // Team does not exist -> create with me as the first member
      if (userInfo) {
        await set(ref(db, `teams/${id}`), {
          name: "New Team",
          overview: "",
          members: { [authRN.currentUser?.uid as string]: meMember },
          tasks: {},
          meetings: {},
          // joinCode intentionally omitted here; created via teams.tsx flow
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

  /** ---------- UI plumbing (styles retained) ---------- */
  useLayoutEffect(() => {
    if (team?.name) (navigation as any)?.setOptions?.({ title: team.name });
  }, [team]);

  if (!team) {
    return (
      <SafeAreaView style={[styles.safeArea]}>
        <Text style={{ textAlign: "center", marginTop: 40 }}>Loading team...</Text>
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
    <SafeAreaView style={[styles.safeArea]}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push("/(drawer)/teams")} style={styles.backButton}>
          <Ionicons name="arrow-back-circle-outline" size={24} color="#1976D2" />
        </TouchableOpacity>

        <Text style={[styles.header]}>{team.name}</Text>

        <TouchableOpacity onPress={() => setShowMembers(true)} style={styles.iconButton}>
          <Ionicons name="information-circle" size={26} color="#1976D2" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* STATS */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="assignment"
            color="#F59E0B"
            number={pendingTasks.length}
            label="Pending"
            theme={{
              lightCard: "#F6F9FF",
              iconBg: "rgba(0,0,0,0.04)",
              iconBorder: "rgba(0,0,0,0.08)",
              text: "#000",
              secondary: "#444",
            }}
          />

          <StatCard
            icon="task-alt"
            color="#16A34A"
            number={completedTasks.length}
            label="Completed"
            theme={{
              lightCard: "#F6F9FF",
              iconBg: "rgba(0,0,0,0.04)",
              iconBorder: "rgba(0,0,0,0.08)",
              text: "#000",
              secondary: "#444",
            }}
          />

          <StatCard
            icon="calendar-today"
            color="#1976D2"
            number={team.meetings?.length || 0}
            label="Meetings"
            theme={{
              lightCard: "#F6F9FF",
              iconBg: "rgba(0,0,0,0.04)",
              iconBorder: "rgba(0,0,0,0.08)",
              text: "#000",
              secondary: "#444",
            }}
          />
        </View>

        {/* TASKS */}
        <Text style={[styles.subHeader]}>
          <MaterialIcons name="assignment" size={18} /> Tasks
        </Text>

        {pendingTasks.length > 0 ? (
          pendingTasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              theme={{ text: "#000", secondary: "#444", ...team.theme }}
              toggleTaskStatus={toggleTaskStatus}
            />
          ))
        ) : (
          <Text style={[styles.noItemsText]}>No pending tasks!</Text>
        )}

        {/* COMPLETED TASKS */}
        {completedTasks.length > 0 && (
          <>
            <Text style={[styles.subHeader]}>
              <MaterialIcons name="task-alt" size={18} color="#16A34A" /> Completed Tasks
            </Text>

            {completedTasks.map((t) => (
              <TaskItem key={t.id} task={t} theme={{ text: "#000" }} toggleTaskStatus={toggleTaskStatus} />
            ))}
          </>
        )}

        {/* MEETINGS */}
        <Text style={[styles.subHeader]}>
          <MaterialIcons name="event" size={18} /> Meetings
        </Text>

        {team.meetings?.length > 0 ? (
          team.meetings.map((m: any) => (
            <MeetingItem
              key={m.id}
              meeting={m}
              theme={{ text: "#000", secondary: "#444" }}
              getMeetingStatus={getMeetingStatus}
            />
          ))
        ) : (
          <Text style={[styles.noItemsText]}>No meetings scheduled.</Text>
        )}

        {/* EXPORT */}
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: "#2196F3" }]}
          onPress={handleExport}
        >
          <Ionicons name="cloud-upload-sharp" size={20} color="#fff" />
          <Text style={styles.exportText}>Export to Google Calendar</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* MEMBERS / INFO MODAL (now includes Join Code container) */}
      <Modal visible={showMembers} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContentCenter]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle]}>Team Info</Text>
              <TouchableOpacity onPress={() => setShowMembers(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#1976D2" />
              </TouchableOpacity>
            </View>

{/* Join Code Container (Dark/Light Adaptive) */}
{!!team.joinCode && (
  <TouchableOpacity
    onPress={copyJoinCode}
    activeOpacity={0.8}
    style={{
      borderWidth: 1,
      borderColor: isDark ? "#444" : "rgba(0,0,0,0.1)",
      backgroundColor: isDark ? "#000" : "#FFF",
      padding: 14,
      borderRadius: 14,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <View>
      <Text
        style={[
          styles.memberRole,
          { fontWeight: "700", color: isDark ? "#FFF" : "#000" },
        ]}
      >
        Join Code
      </Text>

      <Text
        style={[
          styles.memberName,
          { color: isDark ? "#FFF" : "#000" },
        ]}
        selectable
      >
        {team.joinCode}
      </Text>
    </View>

    <Ionicons
      name="copy-outline"
      size={22}
      color={isDark ? "#FFF" : "#1976D2"}
    />
  </TouchableOpacity>
)}


            {/* Members List */}
            <ScrollView style={{ maxHeight: 300 }}>
              {team.members.map((member: any, idx: number) => (
                <View key={idx} style={[styles.memberCard]}>
                  <Ionicons name="person-circle-sharp" size={32} color="#1976D2" />
                  <View>
                    <Text style={[styles.memberName]}>{member.name}</Text>
                    <Text style={[styles.memberRole]}>
                      {member.role} • {member.department}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.leaveTeamButton,
                { backgroundColor: "#FEE2E2", borderColor: "#DC2626" },
              ]}
              onPress={() => setShowLeaveConfirm(true)}
            >
              <Ionicons name="log-out-outline" size={22} color="#DC2626" />
              <Text style={[styles.leaveTeamButtonText, { color: "#DC2626" }]}>
                Leave Team
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* LEAVE CONFIRM */}
      <Modal visible={showLeaveConfirm} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContentCenter]}>
            <Text style={[styles.modalTitle, { textAlign: "center" }]}>
              Do you want to leave {team.name}?
            </Text>

            <View style={{ flexDirection: "row", marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setShowLeaveConfirm(false)}
                style={[
                  styles.leaveTeamButton,
                  { backgroundColor: "#F6F9FF", flex: 1, marginRight: 8 },
                ]}
              >
                <Text style={[styles.leaveTeamButtonText, { color: "#444" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowLeaveConfirm(false);
                  setShowMembers(false);
                  Alert.alert("Success", `You have left ${team.name}.`);
                  router.push("/teams");
                }}
                style={[
                  styles.leaveTeamButton,
                  { backgroundColor: "#cc1b1b", flex: 1, marginLeft: 8 },
                ]}
              >
                <Text style={[styles.leaveTeamButtonText, { color: "#fff" }]}>
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
