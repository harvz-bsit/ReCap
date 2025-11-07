import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Image,
  Dimensions,
  TouchableOpacity,
  Modal,
  Platform,
  SafeAreaView as RNSafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { teams } from "../../data/mockData";
import { SafeAreaView } from "react-native-safe-area-context";

const LOGO_SOURCE = require("../images/recap-logo.png");
const { width, height } = Dimensions.get("window");

const scale = width / 390;
const verticalScale = height / 844;

const getTheme = (isDark) => ({
  bg: isDark ? "#121212" : "#F4F8FB",
  card: isDark ? "#1E1E1E" : "#FFFFFF",
  text: isDark ? "#FFFFFF" : "#000000",
  blue: "#1976D2",
  secondary: isDark ? "#B0BEC5" : "#444",
  lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
});

const now = new Date();

const getRelativeDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date(now.toDateString());
  const targetDate = new Date(date.toDateString());
  const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatTimeForDisplay = (time24hr) => {
  const [hours, minutes] = time24hr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// ---------------- Meeting Item ----------------
const MeetingItem = ({ item, theme }) => {
  const statusColor =
    item.status === "Completed"
      ? "#16A34A"
      : item.status === "Upcoming"
      ? theme.blue
      : "#E53935";
  return (
    <View style={[styles.miniCard, { backgroundColor: theme.lightCard }]}>
      <View style={styles.meetingItemDetails}>
        <Ionicons name="videocam-outline" size={22 * scale} color={theme.blue} />
        <View style={styles.meetingTextContainer}>
          <Text
            style={[styles.cardTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.cardSub, { color: theme.secondary, marginTop: 2 }]}
          >
            {getRelativeDate(item.date)} • {formatTimeForDisplay(item.time)}
          </Text>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
      </View>
    </View>
  );
};

// ---------------- Task Item ----------------
const TaskItem = ({ item, theme }) => {
  const priorityColor =
    item.status === "Pending"
      ? "#E53935"
      : item.status === "In Progress"
      ? "#FB8C00"
      : theme.secondary;
  return (
    <View
      style={[
        styles.miniCard,
        {
          backgroundColor: theme.lightCard,
          borderLeftWidth: item.status === "Pending" ? 4 : 0,
          borderLeftColor: priorityColor,
          paddingLeft: item.status === "Pending" ? 8 : 12,
        },
      ]}
    >
      <View style={styles.taskItemContent}>
        <Ionicons name="checkbox-outline" size={22 * scale} color={priorityColor} />
        <View style={styles.taskTextContainer}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {item.title}
          </Text>
          <View style={styles.taskFooter}>
            <Text style={[styles.cardSub, { color: theme.secondary }]}>
              Due:{" "}
              <Text style={{ fontWeight: "600" }}>
                {getRelativeDate(item.deadline)}
              </Text>
            </Text>
            <View
              style={[styles.priorityBadge, { backgroundColor: priorityColor }]}
            >
              <Text style={styles.priorityBadgeText}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

// ---------------- Dashboard Screen ----------------
export default function DashboardScreen() {
  const currentUser = "Alyssa Quinones";
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = getTheme(isDark);

  const [currentTime, setCurrentTime] = useState(new Date());
  const newsScrollRef = useRef(null);
  const [selectedNews, setSelectedNews] = useState(null);


  const getPhilippineTime = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 8 * 3600000); // UTC+8
};


  // ✅ REAL-TIME PHILIPPINE STANDARD TIME FIX
useEffect(() => {
  const updatePHTime = () => {
    setCurrentTime(getPhilippineTime());
  };

  updatePHTime(); // set on mount
  const timer = setInterval(updatePHTime, 60000);

  return () => clearInterval(timer);
}, []);


  const userTeams = teams.filter((team) =>
    team.members.some((m) => m.name === currentUser)
  );
  const pendingTasks = userTeams.flatMap((team) =>
    team.tasks.filter((t) => t.status !== "Completed" && t.status !== undefined)
  );

  const allMeetings = userTeams.flatMap((team) =>
    team.meetings.map((m) => {
      const meetingDateTime = new Date(m.date + " " + m.time);
      let status = meetingDateTime < currentTime ? "Missed" : "Upcoming";
      return {
        id: `${team.id}-${m.id}`,
        title: m.title,
        date: m.date,
        time: m.time,
        status,
      };
    })
  );

  const recentMeetings = allMeetings.sort(
    (a, b) =>
      new Date(a.date + " " + a.time) - new Date(b.date + " " + b.time)
  );

  const newsData = [
    {
      id: "1",
      title: "AI Integration Now Live",
      text: "Gemini AI now powers meeting transcriptions and summaries.",
    },
    {
      id: "2",
      title: "New Teams Feature",
      text: "Organize recaps by project or department using the Teams tab.",
    },
    {
      id: "3",
      title: "Productivity Tips",
      text: "Boost workflow with daily summaries and smart recommendations.",
    },
  ];

  const DashboardHeader = () => {
    const firstName = currentUser.split(" ")[0];

    // ✅ ALWAYS USE PH TIME FOR GREETING
    const hour = currentTime.getHours();

let timeOfDay = "Morning"; 

if (hour >= 12 && hour < 17) {
  timeOfDay = "Afternoon";
} else if (hour >= 17) {
  timeOfDay = "Evening";
} 


    return (
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: theme.blue },
        ]}
      >
        <View style={styles.headerTextBox}>
          <Text style={styles.headerGreeting}>
            Good {timeOfDay}, {firstName}!
          </Text>
          <Text style={styles.headerSubtitle}>Welcome to ReCap</Text>
        </View>
        <Image
          source={LOGO_SOURCE}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>
    );
  };

  useEffect(() => {
    let scrollValue = 0;
    const interval = setInterval(() => {
      scrollValue += width * 0.7 + 10;
      if (newsScrollRef.current) {
        newsScrollRef.current.scrollTo({ x: scrollValue, animated: true });
      }
      if (scrollValue > (newsData.length - 1) * (width * 0.7 + 10)) {
        scrollValue = 0;
        newsScrollRef.current.scrollTo({ x: 0, animated: false });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        contentContainerStyle={{ paddingBottom: 30 * verticalScale }}
      >
        <DashboardHeader />

        {/* News */}
        <Text style={[styles.sectionTitle, { color: theme.blue }]}>
          News Updates
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          ref={newsScrollRef}
          style={{ marginVertical: 10 * verticalScale }}
        >
          {newsData.map((news) => (
            <TouchableOpacity
              key={news.id}
              onPress={() => setSelectedNews(news)}
              activeOpacity={0.8}
            >
              <View style={[styles.newsCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.newsTitle, { color: theme.text }]}>
                  {news.title}
                </Text>
                <Text
                  style={[styles.newsText, { color: theme.secondary }]}
                  numberOfLines={2}
                >
                  {news.text}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tasks */}
        <Text style={[styles.sectionTitle, { color: theme.blue }]}>
          Pending Tasks
        </Text>
        <View style={{ gap: 10 * scale }}>
          {pendingTasks.map((task) => (
            <TaskItem key={task.id} item={task} theme={theme} />
          ))}
        </View>

        {/* Meetings */}
        <Text style={[styles.sectionTitle, { color: theme.blue }]}>
          Recent Meetings
        </Text>
        <View style={{ gap: 10 * scale }}>
          {recentMeetings.map((meeting) => (
            <MeetingItem key={meeting.id} item={meeting} theme={theme} />
          ))}
        </View>

        {/* Modal */}
        <Modal
          visible={!!selectedNews}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedNews(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedNews(null)}
              >
                <Ionicons name="close" size={24 * scale} color={theme.text} />
              </TouchableOpacity>

              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {selectedNews?.title}
              </Text>
              <Text style={[styles.modalText, { color: theme.secondary }]}>
                {selectedNews?.text}
              </Text>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 * scale },
  headerContainer: {
    borderRadius: 12,
    paddingVertical: 35 * verticalScale,
    paddingHorizontal: 20 * scale,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20 * verticalScale,
    marginTop: 20 * verticalScale,
  },
  headerTextBox: { flex: 1 },
  headerGreeting: { color: "#fff", fontSize: 22 * scale, fontWeight: "700" },
  headerSubtitle: { color: "#E3F2FD", fontSize: 14 * scale, marginTop: 4 },
  headerLogo: { width: 110 * scale, height: 70 * scale },

  newsCard: {
    width: width * 0.7,
    marginRight: 10 * scale,
    borderRadius: 10,
    padding: 12 * scale,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  newsTitle: { fontSize: 15 * scale, fontWeight: "700", marginBottom: 4 },
  newsText: { fontSize: 13 * scale },
  sectionTitle: {
    fontSize: 18 * scale,
    fontWeight: "700",
    marginBottom: 10 * verticalScale,
    marginTop: 15 * verticalScale,
  },

  miniCard: {
    borderRadius: 10,
    padding: 12 * scale,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 15 * scale, fontWeight: "600" },
  cardSub: { fontSize: 13 * scale },

  meetingItemDetails: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  meetingTextContainer: { marginLeft: 10 * scale, flexShrink: 1 },
  statusBadge: {
    paddingHorizontal: 8 * scale,
    paddingVertical: 4 * verticalScale,
    borderRadius: 15,
  },
  statusBadgeText: { color: "#FFF", fontSize: 10 * scale, fontWeight: "700" },

  taskItemContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  taskTextContainer: { marginLeft: 12 * scale, flex: 1 },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4 * verticalScale,
  },
  priorityBadge: {
    paddingHorizontal: 8 * scale,
    paddingVertical: 3 * verticalScale,
    borderRadius: 6,
  },
  priorityBadgeText: { color: "#FFF", fontSize: 10 * scale, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    borderRadius: 16,
    padding: 20 * scale,
    elevation: 5,
  },
  modalCloseButton: {
    position: "absolute",
    top: 10 * scale,
    right: 10 * scale,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18 * scale,
    fontWeight: "700",
    marginBottom: 10 * verticalScale,
    paddingTop: 25 * verticalScale,
  },
  modalText: {
    fontSize: 14 * scale,
    lineHeight: 20 * verticalScale,
  },
});
