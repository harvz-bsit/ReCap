// FULL FINAL CustomDrawer.tsx — with Delete Account (Option A: auto-delete creator’s teams)

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { child, get, ref, remove, set, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase/firebaseConfig";

/* Drawer wrappers */
const DrawerContentScrollView = ({ children, style, contentContainerStyle }) => (
  <View style={[{ flex: 1 }, style]}>
    <View style={contentContainerStyle}>{children}</View>
  </View>
);

const DrawerItem = ({ label, labelStyle, style, onPress, icon }) => (
  <TouchableOpacity style={[styles.drawerItemBase, style]} onPress={onPress}>
    {icon}
    <Text style={[styles.drawerLabel, labelStyle]}>{label}</Text>
  </TouchableOpacity>
);

/* THEME */
const getTheme = (isDark: boolean) => ({
  bg: isDark ? "#121212" : "#F4F8FB",
  text: isDark ? "#FFFFFF" : "#000000",
  blue: "#1976D2",
  darkBlue: isDark ? "#B0BEC5" : "#444",
  activeBG: isDark ? "#1E1E1E" : "#E0F7FA",
  red: "#FF5722",
  border: isDark ? "#2A2A2A" : "#E0E0E0",
  modalBG: isDark ? "#1E1E1E" : "#FFFFFF",
  modalText: isDark ? "#E0E0E0" : "#333333",
  modalOverlay: "rgba(0,0,0,0.5)",
  cancelBtn: isDark ? "#333333" : "#E0E0E0",
});

/* ACTIVE HIGHLIGHT */
const isRouteActive = (props: any, routeName: string) => {
  const currentRoute = props?.state?.routeNames?.[props?.state?.index];
  return routeName === currentRoute;
};

/* ✅ Sync full name to teams (NOT nickname) */
const syncUserNameToTeams = async (userData: any) => {
  try {
    const snap = await get(child(ref(db), "teams"));
    const teams = snap.val();
    if (!teams) return;

    Object.keys(teams).forEach((teamId) => {
      if (teams[teamId].members?.[userData.uid]) {
        set(ref(db, `teams/${teamId}/members/${userData.uid}`), {
          name: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
          role: userData.workType || "Member",
          department: userData.department || "IT",
        });
      }
    });
  } catch (e) {
    console.log("Sync error:", e);
  }
};

export default function CustomDrawer(props: any) {
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = getTheme(scheme === "dark");
  const insets = useSafeAreaInsets();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [nickname, setNickname] = useState("User");
  const [tempNickname, setTempNickname] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  // NEW: delete account modal + progress
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ✅ Load User */
  useEffect(() => {
    (async () => {
      try {
        const local = await AsyncStorage.getItem("loggedInUser");
        if (!local) return;

        const base = JSON.parse(local);
        const uid = base.uid || base.id; // tolerate both shapes

        const snap = await get(child(ref(db), `users/${uid}`));
        const profile = snap.exists() ? snap.val() : base;

        const merged = { ...base, ...profile, uid };

        setCurrentUser(merged);
        setNickname(merged.nickname || "User");

        syncUserNameToTeams(merged);
      } catch (e) {
        console.log("Load error:", e);
      }
    })();
  }, []);

  /* ✅ Pick Image */
  const pickImageFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!res.canceled) setProfileImage(res.assets[0].uri);
  };

  const emailToShow = currentUser?.email || "Loading...";

  /* ✅ Logout */
  const confirmLogout = async () => {
    await AsyncStorage.removeItem("loggedInUser");
    await AsyncStorage.removeItem("loggedInUserEmail");
    setShowConfirmLogout(false);
    router.replace("/");
  };

  /* ✅ Delete Account (Option A: auto-delete creator’s teams) */
  const permanentlyDeleteAccount = async () => {
    if (!currentUser?.uid) return;
    try {
      setIsDeleting(true);

      // 1) Load all teams
      const tSnap = await get(child(ref(db), "teams"));
      const teams = tSnap.val() || {};

      const uid = currentUser.uid;

      // 2) Iterate over teams
      const teamIds = Object.keys(teams);
      for (const teamId of teamIds) {
        const team = teams[teamId];
        if (!team) continue;

        if (team.creatorUID === uid) {
          // ✅ Creator: delete entire team
          await remove(ref(db, `teams/${teamId}`));
        } else if (team.members && team.members[uid]) {
          // ✅ Member: remove user from members
          await remove(ref(db, `teams/${teamId}/members/${uid}`));
        }
      }

      // 3) Remove user profile
      await remove(ref(db, `users/${uid}`));

      // 4) Local cleanup & redirect
      await AsyncStorage.removeItem("loggedInUser");
      await AsyncStorage.removeItem("loggedInUserEmail");

      setShowDeleteModal(false);
      setShowProfileModal(false);
      setIsDeleting(false);

      router.replace("/");
    } catch (e) {
      console.log("Delete account error:", e);
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <DrawerContentScrollView
        {...props}
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={[styles.scrollContent]}
      >
        {/* ✅ PROFILE HEADER */}
        <TouchableOpacity
          style={[styles.profileSection, { borderBottomColor: theme.border }]}
          onPress={() => setShowProfileModal(true)}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={{ width: 55, height: 55, borderRadius: 28 }} />
          ) : (
            <Ionicons name="person-circle-outline" size={50} color={theme.blue} />
          )}

          {/* ✅ Always show full name */}
          <Text style={[styles.userName, { color: theme.text, marginTop: 12 }]}>
            {currentUser?.firstName} {currentUser?.lastName}
          </Text>

          <Text style={[styles.userEmail, { color: theme.darkBlue }]}>{emailToShow}</Text>
        </TouchableOpacity>

        {/* ✅ MENU */}
        <View style={styles.menuSection}>
          <DrawerItem
            label="Home"
            icon={<Ionicons name="home-outline" size={22} color={theme.blue} style={styles.icon} />}
            labelStyle={{ color: theme.blue }}
            onPress={() => props.navigation.navigate("dashboardscreen")}
          />

          <DrawerItem
            label="Teams"
            icon={<Ionicons name="people-outline" size={22} color={theme.blue} style={styles.icon} />}
            labelStyle={{ color: theme.blue }}
            onPress={() => props.navigation.navigate("teams")}
          />

          <DrawerItem
            label="Record"
            icon={<Ionicons name="mic-outline" size={22} color={theme.blue} style={styles.icon} />}
            labelStyle={{ color: theme.blue }}
            onPress={() => props.navigation.navigate("recording")}
          />
        </View>

        <View style={styles.spacer} />

        {/* ✅ LOGOUT */}
        <TouchableOpacity
          style={[styles.logoutSection, { borderTopColor: theme.border }]}
          onPress={() => setShowConfirmLogout(true)}
        >
          <Ionicons name="log-out-outline" size={22} color={theme.red} />
          <Text style={[styles.logoutText, { color: theme.red }]}>Logout</Text>
        </TouchableOpacity>
      </DrawerContentScrollView>

      {/* ✅ PROFILE MODAL */}
      <Modal visible={showProfileModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.profileModalBox, { backgroundColor: theme.modalBG }]}>
            <TouchableOpacity
              onPress={() => setShowProfileModal(false)}
              style={styles.profileModalClose}
            >
              <Ionicons name="close" size={24} color={theme.blue} />
            </TouchableOpacity>

            <View style={{ alignItems: "center", marginTop: 10 }}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profilePic} />
              ) : (
                <Ionicons name="person-circle-outline" size={110} color={theme.blue} />
              )}

              <TouchableOpacity onPress={pickImageFromGallery}>
                <Text style={[styles.changePhotoText, { color: theme.blue }]}>Change Profile Picture</Text>
              </TouchableOpacity>

              {profileImage && (
                <TouchableOpacity onPress={() => setProfileImage(null)}>
                  <Text style={[styles.changePhotoText, { color: "#FF4500", marginTop: 4 }]}>
                    Remove Photo
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* FULL NAME */}
            <Text style={[styles.profileName, { color: theme.text }]}>
              {currentUser?.firstName} {currentUser?.lastName}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.darkBlue }]}>{emailToShow}</Text>

            {/* ✅ EDIT NICKNAME */}
            <TouchableOpacity
              style={[styles.profileButtonContainer, { borderColor: theme.blue }]}
              onPress={() => {
                setTempNickname(nickname);
                setEditingNickname(true);
              }}
            >
              <Ionicons name="create-outline" size={20} color={theme.blue} />
              <Text style={[styles.profileButtonText, { color: theme.blue }]}>Edit Nickname</Text>
            </TouchableOpacity>

            {/* ✅ DELETE ACCOUNT BUTTON */}
            <TouchableOpacity
              style={[styles.profileButtonContainer, { borderColor: "#FF4500" }]}
              onPress={() => setShowDeleteModal(true)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF4500" />
              <Text style={[styles.profileButtonText, { color: "#FF4500" }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ EDIT NICKNAME MODAL */}
      <Modal visible={editingNickname} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalBox, { backgroundColor: theme.modalBG }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Nickname</Text>

            <TextInput
              value={tempNickname}
              onChangeText={setTempNickname}
              style={[styles.nicknameInput, { borderColor: theme.border, color: theme.text }]}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.cancelBtn }]}
                onPress={() => setEditingNickname(false)}
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.blue }]}
                onPress={async () => {
                  if (!currentUser) return;

                  setNickname(tempNickname);
                  setEditingNickname(false);

                  const updated = {
                    ...currentUser,
                    nickname: tempNickname,
                  };

                  await update(ref(db, `users/${currentUser.uid}`), {
                    nickname: tempNickname,
                  });

                  await AsyncStorage.setItem("loggedInUser", JSON.stringify(updated));

                  setCurrentUser(updated);
                }}
              >
                <Text style={{ color: "#fff" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ LOGOUT CONFIRM */}
      <Modal visible={showConfirmLogout} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalBox, { backgroundColor: theme.modalBG }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Confirm Logout</Text>

            <Text style={[styles.modalText, { color: theme.modalText }]}>Do you want to logout?</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.cancelBtn }]}
                onPress={() => setShowConfirmLogout(false)}
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.red }]}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ DELETE ACCOUNT CONFIRM (ARE YOU SURE) */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalBox, { backgroundColor: theme.modalBG }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Delete Account</Text>
            <Text style={[styles.modalText, { color: theme.modalText }]}>
              Are you sure you want to delete your account?\nThis will permanently delete your account and all teams you created. This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.cancelBtn }]}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#FF4500" }]}
                onPress={permanentlyDeleteAccount}
                disabled={isDeleting}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ----------------------------- STYLES ----------------------------- */
const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  profileSection: { padding: 20, borderBottomWidth: 1, marginBottom: 4 },

  userName: { fontSize: 18, fontWeight: "700" },
  userEmail: { fontSize: 13, fontWeight: "500", marginTop: 2 },

  menuSection: { paddingHorizontal: 10 },

  drawerItemBase: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginVertical: 2,
    minHeight: 48,
  },

  icon: { marginRight: 15 },
  drawerLabel: { fontSize: 16, fontWeight: "600" },

  spacer: { flex: 3 },

  logoutSection: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    padding: 20,
    borderTopWidth: 1,
    marginTop: 30,
  },
  logoutText: { fontSize: 16, fontWeight: "700" },

  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },

  modalBox: {
    width: "85%",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },

  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  modalText: { fontSize: 15, textAlign: "center", marginBottom: 16 },

  modalButtons: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },

  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },

  logoutBtnText: { color: "#fff", fontWeight: "700" },

  profileModalBox: {
    width: "85%",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },

  profileModalClose: {
    position: "absolute",
    top: 10,
    right: 10,
  },

  profilePic: { width: 110, height: 110, borderRadius: 55, marginBottom: 10 },
  changePhotoText: { marginTop: 6, fontSize: 14, fontWeight: "600" },

  profileName: { fontSize: 22, fontWeight: "700", marginTop: 10 },
  profileEmail: { fontSize: 15, marginBottom: 20 },

  profileButtonContainer: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  profileButtonText: { fontSize: 16, fontWeight: "600", marginLeft: 10 },

  nicknameInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
});
