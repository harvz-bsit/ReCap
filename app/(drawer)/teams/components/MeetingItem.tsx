import React from "react";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { styles } from "@/app/(drawer)/teams/styles";

export default function MeetingItem({ meeting, theme, getMeetingStatus }: any) {
  const status = getMeetingStatus(meeting.date, meeting.time);
  const statusColor = status === "Missed" ? "#E53935" : theme.blue;

  return (
    <View style={[styles.meetingCard, { backgroundColor: theme.card }]}>
      <View
        style={[
          styles.iconWrapperSmall,
          { backgroundColor: theme.iconBg, borderColor: theme.iconBorder },
        ]}
      >
        <MaterialIcons
          name={status === "Missed" ? "event-busy" : "calendar-today"}
          size={22}
          color={theme.blue}
        />
      </View>

      <View style={{ marginLeft: 10 }}>
        <Text style={[styles.meetingTitle, { color: theme.text }]}>{meeting.title}</Text>
        <Text style={[styles.meetingInfo, { color: theme.secondary }]}>
          {meeting.date} • {meeting.time}
        </Text>
        <Text style={{ color: statusColor, fontWeight: "600", fontSize: 13 }}>{status}</Text>
      </View>
    </View>
  );
}
