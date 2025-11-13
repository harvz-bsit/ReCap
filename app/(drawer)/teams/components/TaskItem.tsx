import { styles } from "@/app/(drawer)/teams/styles";
import { db } from "@/firebase/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { ref, set } from "firebase/database";
import { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

type Member = { name: string; uid?: string };

interface TaskItemProps {
  task: any;
  theme: any;
  toggleTaskStatus: (taskId: string) => void;
  isCreator: boolean;
  members: Member[];
  teamId: string;
}

export default function TaskItem({
  task,
  theme,
  toggleTaskStatus,
  isCreator,
  members,
  teamId,
}: TaskItemProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const isCompleted = task.status?.toLowerCase() === "completed";

  const handleAssign = async (memberName: string, memberUid: string) => {
    if (!memberUid) return;
    try {
      await set(ref(db, `teams/${teamId}/tasks/${task.id}/assigneeName`), memberName);
      setShowAssignModal(false);
    } catch (err) {
      console.error("Failed to assign task:", err);
      alert("Failed to assign task. Try again.");
    }
  };

  return (
    <View style={[styles.taskCard, { backgroundColor: theme.card }]}>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.taskAssignee,
            { color: theme.secondary, marginBottom: 4, textTransform: "uppercase" },
          ]}
        >
          {task.assigneeName || (isCreator ? (
            <TouchableOpacity onPress={() => setShowAssignModal(true)}>
              <Text style={{ color: theme.blue, fontWeight: "700" }}>Not Assigned (Tap to Assign)</Text>
            </TouchableOpacity>
          ) : "Not Assigned")}
        </Text>

        <Text
          style={[
            styles.taskTitle,
            {
              color: isCompleted ? "#16A34A" : theme.text,
              textDecorationLine: isCompleted ? "line-through" : "none",
              marginBottom: 6,
            },
          ]}
        >
          {task.task}
        </Text>

        <Text style={[styles.taskDeadline, { color: theme.secondary }]}>
          {isCompleted ? "Completed: " : "Created At: "}
          {new Date(task.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          {new Date(task.createdAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          })}
        </Text>
      </View>

      {isCreator && (
        <TouchableOpacity
          onPress={() => toggleTaskStatus(task.id)}
          style={styles.iconButtonContainer}
        >
          <View
            style={[styles.iconSquare, { backgroundColor: theme.iconBg, borderColor: theme.iconBorder }]}
          >
            <Ionicons
              name={isCompleted ? "checkbox" : "square-outline"}
              size={22}
              color={isCompleted ? "#16A34A" : theme.blue}
            />
          </View>
        </TouchableOpacity>
      )}

      {/* Assign Modal */}
      <Modal visible={showAssignModal} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ margin: 20, backgroundColor: theme.card, borderRadius: 12, padding: 20 }}>
            <Text style={{ fontWeight: "700", color: theme.text, fontSize: 16, marginBottom: 12 }}>
              Assign Task
            </Text>
            <ScrollView>
              {members.map((m, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={{ paddingVertical: 10 }}
                  onPress={() => handleAssign(m.name, m.uid || Object.keys(members)[idx])}
                >
                  <Text style={{ color: theme.text }}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowAssignModal(false)}
              style={{ marginTop: 12, alignSelf: "center" }}
            >
              <Text style={{ color: theme.blue, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
