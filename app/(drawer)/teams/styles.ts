import { StyleSheet, Platform } from "react-native";

export const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 20 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 16 },
  header: { fontSize: 22, fontWeight: "700", textAlign: "center", flex: 1 },
  iconButton: { padding: 4, marginRight: 13 },

  subHeader: { fontSize: 18, fontWeight: "700", marginTop: 20, marginBottom: 10, paddingLeft: 20 },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  statCard: { flex: 1, alignItems: "center", padding: 12, borderRadius: 12, marginHorizontal: 4 },
  statNumber: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  statLabel: { fontSize: 12, fontWeight: "500" },

  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: Platform.select({ android: 15 }),
    marginVertical: 6,
    paddingLeft: Platform.select({ android: 15 }),
  },
  taskTitle: { fontSize: 15, fontWeight: "600" },
  taskDeadline: { fontSize: 13 },

  meetingCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: Platform.select({ android: 15 }),
    marginVertical: 6,
    paddingLeft: Platform.select({ android: 15 }),
  },
  meetingTitle: { fontSize: 15, fontWeight: "600" },
  meetingInfo: { fontSize: 13 },

  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    marginTop: 24,
    marginLeft: 14,
    marginRight: 14,
  },
  exportText: { color: "#fff", fontWeight: "700", fontSize: 15, marginLeft: 6 },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContentCenter: {
    width: "85%",
    borderRadius: 20,
    padding: 11,
    maxHeight: "70%",
    elevation: 6,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700" },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    marginVertical: 6,
    gap: 12,
  },
  memberName: { fontSize: 15, fontWeight: "600" },
  memberRole: { fontSize: 13 },

  leaveTeamButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    gap: 6,
  },
  leaveTeamButtonText: { fontWeight: "700", fontSize: 14 },

  iconWrapper: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapperSmall: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  iconButtonContainer: { marginLeft: 10 },
  iconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  noItemsText: { fontSize: 14, fontWeight: "600", paddingLeft: 20, marginVertical: 6 },
});
