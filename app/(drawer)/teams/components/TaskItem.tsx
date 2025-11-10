import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "@/app/(drawer)/teams/styles";

export default function TaskItem({ task, theme, toggleTaskStatus }: any) {
  const isCompleted = task.status === "Completed";

  return (
    <View style={[styles.taskCard, { backgroundColor: theme.card }]}>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.taskTitle,
            {
              color: isCompleted ? "#16A34A" : theme.text,
              textDecorationLine: isCompleted ? "line-through" : "none",
            },
          ]}
        >
          {task.title}
        </Text>

        <Text style={[styles.taskDeadline, { color: theme.secondary }]}>
          {isCompleted ? "Completed: " : "Deadline: "}
          {task.deadline}
        </Text>
      </View>

      <TouchableOpacity onPress={() => toggleTaskStatus(task.id)} style={styles.iconButtonContainer}>
        <View
          style={[
            styles.iconSquare,
            { backgroundColor: theme.iconBg, borderColor: theme.iconBorder },
          ]}
        >
          <Ionicons
            name={isCompleted ? "checkbox" : "square-outline"}
            size={22}
            color={isCompleted ? "#16A34A" : theme.blue}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}
