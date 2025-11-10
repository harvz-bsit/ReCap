import React from "react";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { styles } from "@/app/(drawer)/teams/styles";

export default function StatCard({ icon, color, number, label, theme }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.lightCard }]}>
      <View
        style={[
          styles.iconWrapper,
          { backgroundColor: theme.iconBg, borderColor: theme.iconBorder },
        ]}
      >
        <MaterialIcons name={icon} size={26} color={color} />
      </View>

      <Text style={[styles.statNumber, { color: theme.text }]}>{number}</Text>
      <Text style={[styles.statLabel, { color: theme.secondary }]}>{label}</Text>
    </View>
  );
}
