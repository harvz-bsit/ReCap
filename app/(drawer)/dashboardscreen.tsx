import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { child, get, onValue, ref } from "firebase/database";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../firebase/firebaseConfig";

const LOGO_SOURCE = require("../images/recap-logo.png");
const { width, height } = Dimensions.get("window");

const scale = width / 390;
const verticalScale = height / 844;


const getTheme = (isDark: boolean) => ({
  bg: isDark ? "#121212" : "#F4F8FB",
  card: isDark ? "#1E1E1E" : "#FFFFFF",
  text: isDark ? "#FFFFFF" : "#000000",
  blue: "#1976D2",
  secondary: isDark ? "#B0BEC5" : "#444",
  lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
});

const now = new Date();

const getRelativeDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date(now.toDateString());
  const targetDate = new Date(date.toDateString());
  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatTimeForDisplay = (time24hr?: string) => {
  if (!time24hr) return ""; // return empty string if no time

  const [hours, minutes] = time24hr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const MeetingItem = ({ item, theme }: { item: any; theme: any }) => {
  const formattedDate = getRelativeDate(item.createdAt);
  const formattedTime = formatTimeForDisplay(item.time); // <-- capture time

  return (
    <View style={[styles.miniCard, { backgroundColor: theme.lightCard }]}>
      <View style={styles.meetingItemDetails}>
        <Ionicons name="videocam-outline" size={22 * scale} color={theme.blue} />

        <View style={styles.meetingTextContainer}>
          <Text
            style={[styles.cardTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {item.teamName}
          </Text>

          {/* DATE + TIME */}
          <Text
            style={[styles.cardSub, { color: theme.secondary, marginTop: 2 }]}
          >
            {formattedDate}
            {formattedTime ? ` • ${formattedTime}` : ""}
          </Text>
        </View>
      </View>
    </View>
  );
};


const TaskItem = ({ item, theme }: { item: any; theme: any }) => {
  const statusColor =
    item.status === "Pending"
      ? "#E53935"
      : item.status === "Completed"
      ? "#16A34A"
      : item.status === "In Progress"
      ? "#FB8C00"
      : theme.secondary;

  return (
    <View style={[styles.miniCard, { backgroundColor: theme.lightCard }]}>
      <View style={styles.taskItemDetails}>
        {/* Icon */}
        <Ionicons
          name="checkbox-outline"
          size={22 * scale}
          color={statusColor}
        />

        {/* TEXT CONTAINER (same concept as meetings) */}
        <View style={styles.taskTextBox}>
          <Text
            style={[styles.cardTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {item.task}
          </Text>

          <Text
            style={[styles.cardSub, { color: theme.secondary, marginTop: 2 }]}
          >
            {getRelativeDate(item.createdAt)}
          </Text>
        </View>
      </View>

      {/* STATUS BADGE — like meetings */}
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusBadgeText}>
          {item.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};



// ---------------- Dashboard Screen ----------------
export default function DashboardScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = getTheme(isDark);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const newsScrollRef = useRef<ScrollView>(null);
  const [selectedNews, setSelectedNews] = useState<any>(null);
  const [showMeetingDropdown, setShowMeetingDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ x: 0, y: 0 });
  const filterIconRef = useRef<View>(null);
  const [dropdownY, setDropdownY] = useState(0);
  const [teamList, setTeamList] = useState<string[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string | null>(null);
  const [meetingSort, setMeetingSort] = useState<"earliest" | "latest">("earliest");
  const [showTeamOptions, setShowTeamOptions] = useState(false);
  // FILTER MEETINGS BASED ON TEAM
// FINAL COMPUTED LIST (SORT + FILTER TOGETHER)
const finalMeetings = [...meetings]
  .filter((m) => {
    if (!selectedTeamFilter) return true;
    return m.teamName === selectedTeamFilter;
  })
  .sort((a, b) => {
    if (meetingSort === "earliest") return a.createdAt - b.createdAt;
    if (meetingSort === "latest") return b.createdAt - a.createdAt;
    if (meetingSort === "teamAsc") return a.teamName.localeCompare(b.teamName);
    if (meetingSort === "teamDesc") return b.teamName.localeCompare(a.teamName);
    return 0;
  });



  // ---------------- PH TIME ----------------
  const getPhilippineTime = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 8 * 3600000); // UTC+8
  };

  useEffect(() => {
    const updatePHTime = () => setCurrentTime(getPhilippineTime());
    updatePHTime(); // initial
    const timer = setInterval(updatePHTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // ---------------- FETCH USER (Unified: loggedInUser + uid) ----------------
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const session = await AsyncStorage.getItem("loggedInUser");
        if (!session) return;

        const user = JSON.parse(session);
        const userId = user.uid || user.id; // fallback if older session exists
        if (!userId) return;

        const sessionUser = { ...user, uid: userId };
        setCurrentUser(sessionUser);

        // Pull freshest profile from DB
        const snapshot = await get(child(ref(db), `users/${userId}`));
        const latestUser = snapshot.val();
        if (latestUser) {
          setCurrentUser({ ...sessionUser, ...latestUser, uid: userId });
        }
      } catch (error) {
        console.log("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // ---------------- FETCH TASKS & MEETINGS ----------------
useEffect(() => {
  if (!currentUser?.uid) return;

  const teamsRef = ref(db, "teams");

  const unsubscribe = onValue(teamsRef, (snapshot) => {
    const teamsData = snapshot.val();
    if (!teamsData) return;

    const userId = currentUser.uid;
    const userTasks: any[] = [];
    const userMeetings: any[] = [];

    Object.entries(teamsData).forEach(([teamId, data]: [string, any]) => {
      if (!data.members || !data.members[userId]) return;

      // Tasks
      const tasksRaw = Object.entries(data.tasks || {}).map(([tid, t]: any) => ({
        id: tid,
        task: t.task,
        assigneeName: t.assigneeName,
        status: t.status || "Pending",
        createdAt: t.createdAt,
        teamId,
        teamName: data.name,
      }));
      const myTasks = tasksRaw.filter(
        (t) => t.assigneeName === currentUser.firstName + " " + currentUser.lastName
      );
      userTasks.push(...myTasks);

      // Meetings (last 3 days)
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
const meetingsRaw = Object.entries(data.meetings || {}).map(([mid, m]: any) => ({
  id: mid,
  ...m,
  teamId,
  teamName: data.name,
}));


      userMeetings.push(...meetingsRaw);

    });

if (meetingSort === "earliest") {
  userMeetings.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
} else if (meetingSort === "latest") {
  userMeetings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
} else if (meetingSort === "teamAsc") {
  userMeetings.sort((a, b) => a.teamName.localeCompare(b.teamName));
} else if (meetingSort === "teamDesc") {
  userMeetings.sort((a, b) => b.teamName.localeCompare(a.teamName));
}


    setTasks(userTasks);
    setMeetings(userMeetings);

    // Collect unique team names for filter
const teamsForFilter = new Set<string>();
Object.entries(teamsData).forEach(([teamId, data]: any) => {
  if (data.members && data.members[userId]) {
    teamsForFilter.add(data.name);
  }
});
setTeamList(Array.from(teamsForFilter));

  });

  return () => unsubscribe(); // cleanup listener on unmount
}, [currentUser, meetingSort]);




  // ---------------- NEWS DATA ----------------
  const newsData = [
  {
    id: "1",
    title: "AI Meeting Transcription Launched",
    text: "ReCap AI now uses Whisper Large-V3 Model to automatically transcribe meetings with high accuracy. Your recordings are instantly converted to text, making documentation faster and more reliable."
  },
  {
    id: "2",
    title: "Smart Summaries Powered by GPT-4",
    text: "Summaries of your meetings are now generated using GPT-4 model, providing clear, concise insights. The system highlights key points and action items in seconds."
  },
  {
    id: "3",
    title: "Automated Task Extraction",
    text: "Tasks assigned during meetings are now automatically recognized and categorized. ReCap AI identifies members mentioned and syncs tasks to their dashboards in real time."
  },
  {
    id: "4",
    title: "Teams Feature Upgraded",
    text: "Create or join teams with a generated code. All summaries, tasks, and recordings are organized by team to enhance collaboration and transparency."
  },
  ];

  // ---------------- HEADER ----------------
  const DashboardHeader = () => {
    if (!currentUser) return null;

    const hour = currentTime.getHours();
    let timeOfDay = "Morning";
    if (hour >= 12 && hour < 17) timeOfDay = "Afternoon";
    else if (hour >= 17) timeOfDay = "Evening";

    const displayFirstName = currentUser.firstName || currentUser.nickname || "User";

    return (
      <View style={[styles.headerContainer, { backgroundColor: theme.blue }]}>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerGreeting}>
            Good {timeOfDay}, {displayFirstName}!
          </Text>
          <Text style={styles.headerSubtitle}>Streamline your day with smart summaries and tasks.</Text>
        </View>
        <Image source={LOGO_SOURCE} style={styles.headerLogo} resizeMode="contain" />
      </View>
    );
  };

  // ---------------- NEWS AUTO SCROLL ----------------
  useEffect(() => {
    let scrollValue = 0;
    const itemWidth = width * 0.7 + 10;
    const totalContentWidth = newsData.length * itemWidth;

    const interval = setInterval(() => {
      scrollValue += itemWidth;
      newsScrollRef.current?.scrollTo({ x: scrollValue, animated: true });

      if (scrollValue >= totalContentWidth) {
        scrollValue = 0;
        newsScrollRef.current?.scrollTo({ x: 0, animated: false });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [newsData]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
      {!currentUser ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: theme.text }}>Loading...</Text>
        </View>
      ) : (
        <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}
        contentContainerStyle={{ paddingBottom: 30 * verticalScale,
  }}
  showsVerticalScrollIndicator={false}
>

          <DashboardHeader />

          {/* News */}
          <Text style={[styles.sectionTitle, { color: theme.blue }]}>New Updates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={newsScrollRef} style={{ marginVertical: 10 * verticalScale }}>
            {newsData.map((news) => (
              <TouchableOpacity key={news.id} onPress={() => setSelectedNews(news)} activeOpacity={0.8}>
                <View style={[styles.newsCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.newsTitle, { color: theme.text }]}>{news.title}</Text>
                  <Text style={[styles.newsText, { color: theme.secondary }]} numberOfLines={2}>{news.text}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tasks */}
          <Text style={[styles.sectionTitle, { color: theme.blue }]}>Tasks</Text>
          {tasks.length === 0 ? (
            <Text style={{ color: theme.secondary, marginBottom: 10 }}>No tasks yet.</Text>
          ) : (
            tasks.map((task) => (
              <TaskItem key={`${task.teamId}_${task.id}`} item={task} theme={theme} />
            ))
          )}

<View
  style={{
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  }}
>
  <Text style={[styles.sectionTitle, { color: theme.blue, marginTop: 0 }]}>
    Meetings
  </Text>

  <TouchableOpacity
    ref={filterIconRef}
    onPress={() => {
      filterIconRef.current?.measure((fx, fy, width, height, px, py) => {
        setDropdownY(py + height + 8); // appear directly below the icon
      });
      setShowMeetingDropdown(true);
    }}
  >
    <Ionicons name="funnel-outline" size={22} color={theme.text} />
  </TouchableOpacity>
</View>


{/* FLOATING DROPDOWN FILTER MODAL */}
{showMeetingDropdown && (
  <Modal transparent visible animationType="fade">
    <TouchableOpacity
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",  // dim background
        justifyContent: "center",
        alignItems: "center",
      }}
      activeOpacity={1}
      onPress={() => {
        setShowMeetingDropdown(false);
        setShowTeamOptions(false);
      }}
    >
      <View
        style={{
          width: width * 0.82,
          backgroundColor: theme.card,
          borderRadius: 16,
          paddingVertical: 12,
          maxHeight: height * 0.55,

          // floating effect
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        {/* TITLE */}
        <Text
          style={{
            color: theme.text,
            fontSize: 16 * scale,
            fontWeight: "700",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Meeting Filters
        </Text>

        {/* Ascending */}
        <TouchableOpacity
          onPress={() => {
            setMeetingSort("earliest");
            setShowMeetingDropdown(false);
          }}
        >
          <Text style={{ padding: 12, color: theme.text, fontSize: 14 * scale }}>
            Ascending (Earliest)
          </Text>
        </TouchableOpacity>

        {/* Descending */}
        <TouchableOpacity
          onPress={() => {
            setMeetingSort("latest");
            setShowMeetingDropdown(false);
          }}
        >
          <Text style={{ padding: 12, color: theme.text, fontSize: 14 * scale }}>
            Descending (Latest)
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: theme.secondary + "33",
            marginVertical: 8,
          }}
        />

        {/* Toggle Team Filter */}
        <TouchableOpacity onPress={() => setShowTeamOptions(!showTeamOptions)}>
          <Text
            style={{
              padding: 12,
              color: theme.text,
              fontSize: 14 * scale,
              fontWeight: "600",
            }}
          >
            Filter by Team  ▾
          </Text>
        </TouchableOpacity>

        {/* TEAM LIST WITH SCROLL */}
        {showTeamOptions && (
          <ScrollView style={{ maxHeight: 200 }}>
            {teamList.map((teamName, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setSelectedTeamFilter(teamName);
                  setShowMeetingDropdown(false);
                  setShowTeamOptions(false);
                }}
              >
                <Text
                  style={{
                    padding: 12,
                    color: theme.text,
                    fontSize: 14 * scale,
                  }}
                >
                  {teamName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </TouchableOpacity>
  </Modal>
)}


{finalMeetings.length === 0 ? (
  <Text style={{ color: theme.secondary, marginBottom: 10 }}>
    No meetings found.
  </Text>
) : (
  finalMeetings.map((meeting) => (
    <MeetingItem
      key={`${meeting.teamId}_${meeting.id}`}
      item={meeting}
      theme={theme}
    />
  ))
)}


          {/* Modal */}
          <Modal visible={!!selectedNews} transparent animationType="fade" onRequestClose={() => setSelectedNews(null)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedNews(null)}>
                  <Ionicons name="close" size={24 * scale} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedNews?.title}</Text>
                <Text style={[styles.modalText, { color: theme.secondary }]}>{selectedNews?.text}</Text>
              </View>
            </View>
          </Modal>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 * scale, },
headerContainer: {
  borderRadius: 12,
  paddingVertical: 35 * verticalScale,
  paddingHorizontal: 20 * scale,
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 20 * verticalScale,
  marginTop: 20 * verticalScale,
  backgroundColor: "transparent",
},

  headerTextBox: { flex: 1 },
  headerGreeting: {color: "#fff", fontSize: 22 * scale, fontWeight: "700", marginBottom: 4 },
  headerSubtitle: {color: "#EAF4FF", fontSize: 13 * scale, opacity: 0.9 },
  headerLogo: { width: 110 * scale, height: 80 * scale, opacity: 0.92 },

  newsCard: {
    width: width * 0.7,
    height: 100 * verticalScale, 
    marginRight: 10 * scale,
    borderRadius: 10,
    padding: 12 * scale,
    shadowColor: "#000",
    justifyContent: "flex-start",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  newsTitle: { fontSize: 15 * scale, fontWeight: "700", marginBottom: 4 },
  newsText: { fontSize: 13 * scale, marginTop: 2 * scale, lineHeight: 16 * scale},
  sectionTitle: { fontSize: 18 * scale, fontWeight: "700", marginBottom: 10 * verticalScale, marginTop: 15 * verticalScale },

  miniCard: {
    borderRadius: 10,
    padding: 12 * scale,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8 * verticalScale,
  },
  cardTitle: { fontSize: 15 * scale, fontWeight: "600" },
  cardSub: { fontSize: 13 * scale },

  meetingItemDetails: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  meetingTextContainer: { marginLeft: 10 * scale, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 8 * scale, paddingVertical: 4 * verticalScale, borderRadius: 15 },
  statusBadgeText: { color: "#FFF", fontSize: 10 * scale, fontWeight: "700" },

  taskItemContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  taskTextContainer: { marginLeft: 12 * scale, flex: 1 },
  taskFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 * verticalScale },
  priorityBadge: { paddingHorizontal: 8 * scale, paddingVertical: 3 * verticalScale, borderRadius: 6 },
  priorityBadgeText: { color: "#FFF", fontSize: 10 * scale, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalCard: { width: "85%", borderRadius: 16, padding: 20 * scale, elevation: 5 },
  modalCloseButton: { position: "absolute", top: 10 * scale, right: 10 * scale, zIndex: 1 },
  modalTitle: { fontSize: 18 * scale, fontWeight: "700", marginBottom: 10 * verticalScale, paddingTop: 25 * verticalScale },
  modalText: { fontSize: 14 * scale, lineHeight: 20 * verticalScale },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  taskText: {
    fontSize: 16,
    color: "#333",
  },
  taskItemDetails: {
  flexDirection: "row",
  alignItems: "center",
  flexShrink: 1,
},

taskTextBox: {
  marginLeft: 10 * scale,
  flexShrink: 1,
},

});


