import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { teams, TeamTask } from "../data/mockData";

const LOGO_SOURCE = require("../images/recap-logo.png");
const { width } = Dimensions.get("window");

const now = new Date();

const getTheme = (isDark) => ({
  bg: isDark ? "#121212" : "#F4F8FB",
  card: isDark ? "#1E1E1E" : "#FFFFFF",
  text: isDark ? "#FFFFFF" : "#000000",
  blue: "#1976D2",
  secondary: isDark ? "#B0BEC5" : "#444",
  lightCard: isDark ? "#2A2A2A" : "#F6F9FF",
  logoDark: "#E3F2FD",
});

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
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

const MeetingItem = ({ item, theme }) => {
  const statusColor =
    item.status === "Completed" ? "#16A34A" : item.status === "Upcoming" ? theme.blue : "#E53935";
  return (
    <View style={[styles.miniCard, { backgroundColor: theme.lightCard }]}>
      <View style={styles.meetingItemDetails}>
        <Ionicons name="videocam-outline" size={24} color={theme.blue} />
        <View style={styles.meetingTextContainer}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.cardSub, { color: theme.secondary, marginTop: 2 }]}>
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

const TaskItem = ({ item, theme }) => {
  const priorityColor =
    item.status === "Pending" ? "#E53935" : item.status === "In Progress" ? "#FB8C00" : theme.secondary;
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
        <Ionicons name="checkbox-outline" size={24} color={priorityColor} />
        <View style={styles.taskTextContainer}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
          <View style={styles.taskFooter}>
            <Text style={[styles.cardSub, { color: theme.secondary }]}>
              Due: <Text style={{ fontWeight: "600" }}>{getRelativeDate(item.deadline)}</Text>
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
              <Text style={styles.priorityBadgeText}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function DashboardScreen() {
  const currentUser = "Alyssa Quinones";
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = getTheme(isDark);

  const [currentTime, setCurrentTime] = useState(new Date());
  const newsScrollRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const userTeams = teams.filter((team) => team.members.some((m) => m.name === currentUser));
  const pendingTasks = userTeams.flatMap((team) =>
    team.tasks.filter((t) => t.status !== "Completed" && t.status !== undefined)
  );

  const allMeetings = userTeams.flatMap((team) =>
    team.meetings.map((m) => {
      const meetingDateTime = new Date(m.date + " " + m.time);
      let status = meetingDateTime < currentTime ? "Missed" : "Upcoming";
      return { id: `${team.id}-${m.id}`, title: m.title, date: m.date, time: m.time, status };
    })
  );

  const recentMeetings = allMeetings.sort(
    (a, b) => new Date(a.date + " " + a.time) - new Date(b.date + " " + b.time)
  );

  const newsData = [
    { id: "1", title: "AI Integration Now Live", text: "Gemini AI now powers meeting transcriptions and summaries." },
    { id: "2", title: "New Teams Feature", text: "Organize recaps by project or department using the Teams tab." },
    { id: "3", title: "Productivity Tips", text: "Boost workflow with daily summaries and smart recommendations." },
    { id: "4", title: "Security Update", text: "Latest security patches deployed to keep data encrypted." },
  ];

  // 🌟 Blue Header with Greeting and Logo
  const DashboardHeader = () => {
    const firstName = currentUser.split(" ")[0];
    const hour = currentTime.getHours();
    let timeOfDay = "Morning";
    if (hour >= 12 && hour < 17) timeOfDay = "Afternoon";
    if (hour >= 17 || hour < 5) timeOfDay = "Evening";

    return (
      <View style={[styles.headerContainer, { backgroundColor: theme.blue }]}>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerGreeting}>Good {timeOfDay}, {firstName}!</Text>
          <Text style={styles.headerSubtitle}>Welcome to ReCap</Text>
        </View>
        <Image source={LOGO_SOURCE} style={styles.headerLogo} resizeMode="contain" />
      </View>
    );
  };

  // 🌐 Auto Scroll for News Section
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
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <DashboardHeader />

      {/* 📰 NEWS UPDATES SECTION */}
      <Text style={[styles.sectionTitle, { color: theme.blue, marginTop: 20 }]}>News Updates</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        ref={newsScrollRef}
        style={{ marginVertical: 10 }}
      >
        {newsData.map((news) => (
          <View key={news.id} style={[styles.newsCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.newsTitle, { color: theme.text }]}>{news.title}</Text>
            <Text style={[styles.newsText, { color: theme.secondary }]}>{news.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 📋 TASKS */}
      <Text style={[styles.sectionTitle, { color: theme.blue, marginTop: 20 }]}>Pending Tasks</Text>
      <View style={{ gap: 10 }}>
        {pendingTasks.map((task) => (
          <TaskItem key={task.id} item={task} theme={theme} />
        ))}
      </View>

      {/* 📅 MEETINGS */}
      <Text style={[styles.sectionTitle, { color: theme.blue, marginTop: 20 }]}>Recent Meetings</Text>
      <View style={{ gap: 10 }}>
        {recentMeetings.map((meeting) => (
          <MeetingItem key={meeting.id} item={meeting} theme={theme} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  // 🌟 Blue Header Styles
  headerContainer: {
    backgroundColor: "#1976D2",
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    justifyContent: "space-between",
    elevation: 6,
  },
  headerTextBox: { flex: 1 },
  headerGreeting: { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: "#E3F2FD", fontSize: 14, marginTop: 4 },
  headerLogo: { width: 150, height: 70 },

  newsCard: {
    width: width * 0.7,
    marginRight: 10,
    borderRadius: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  newsTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  newsText: { fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },

  miniCard: {
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSub: { fontSize: 14 },
  meetingItemDetails: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  meetingTextContainer: { marginLeft: 12, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15 },
  statusBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  taskItemContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  taskTextContainer: { marginLeft: 12, flex: 1 },
  taskFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
});
