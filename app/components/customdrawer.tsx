import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { child, get, ref, remove, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
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

/* ✅ Sync full name to teams (also optional profile pic) */
const syncUserNameToTeams = async (userData: any) => {
  try {
    const snap = await get(child(ref(db), "teams"));
    const teams = snap.val();
    if (!teams) return;

    Object.keys(teams).forEach((teamId) => {
      if (teams[teamId].members?.[userData.uid]) {
        update(ref(db, `teams/${teamId}/members/${userData.uid}`), {
          name: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
          role: userData.workType || "Member",
          department: userData.department || "IT",
          ...(userData.profilePic ? { profilePic: userData.profilePic } : {}),
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
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ✅ Load User */
  useEffect(() => {
    (async () => {
      try {
        const local = await AsyncStorage.getItem("loggedInUser");
        if (!local) return;

        const base = JSON.parse(local);
        const uid = base.uid || base.id;

        const snap = await get(child(ref(db), `users/${uid}`));
        const profile = snap.exists() ? snap.val() : base;

        const merged = { ...base, ...profile, uid };

        setCurrentUser(merged);
        if (merged.profilePic) setProfileImage(merged.profilePic);

        syncUserNameToTeams(merged);
      } catch (e) {
        console.log("Load error:", e);
      }
    })();
  }, []);

  /* ✅ Pick Image & save to Firebase */
const pickImageFromGallery = async () => {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alert("Permission to access photos is required!");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });

    if (res.canceled || !res.assets[0].base64) return;

    const base64Img = `data:image/jpeg;base64,${res.assets[0].base64}`;

    // Update RTDB
    await update(ref(db, `users/${currentUser.uid}`), { profilePic: base64Img });

    // Update local state + AsyncStorage
    setProfileImage(base64Img);
    const updatedUser = { ...currentUser, profilePic: base64Img };
    setCurrentUser(updatedUser);
    await AsyncStorage.setItem("loggedInUser", JSON.stringify(updatedUser));

    alert("Profile picture updated!");
  } catch (e) {
    console.log("Upload error:", e);
    alert("Failed to upload image. Check permissions and network.");
  }
};



  const emailToShow = currentUser?.email || "Loading...";

  /* ✅ Logout */
  const confirmLogout = async () => {
    await AsyncStorage.removeItem("loggedInUser");
    await AsyncStorage.removeItem("loggedInUserEmail");
    setShowConfirmLogout(false);
    global.loggedInUser = null;
    router.replace("/");
  };

  /* ✅ Delete Account (Option A: auto-delete creator’s teams) */
  const permanentlyDeleteAccount = async () => {
    if (!currentUser?.uid) return;
    try {
      setIsDeleting(true);

      const tSnap = await get(child(ref(db), "teams"));
      const teams = tSnap.val() || {};

      const uid = currentUser.uid;

      const teamIds = Object.keys(teams);
      for (const teamId of teamIds) {
        const team = teams[teamId];
        if (!team) continue;

        if (team.creatorUID === uid) {
          await remove(ref(db, `teams/${teamId}`));
        } else if (team.members && team.members[uid]) {
          await remove(ref(db, `teams/${teamId}/members/${uid}`));
        }
      }

      await remove(ref(db, `users/${uid}`));
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
        {/* PROFILE HEADER */}
        <TouchableOpacity
          style={[styles.profileSection, { borderBottomColor: theme.border }]}
          onPress={() => setShowProfileModal(true)}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={{ width: 55, height: 55, borderRadius: 28 }} />
          ) : (
            <Ionicons name="person-circle-outline" size={50} color={theme.blue} />
          )}
          <Text style={[styles.userName, { color: theme.text, marginTop: 12 }]}>
            {currentUser?.firstName} {currentUser?.lastName}
          </Text>
          <Text style={[styles.userEmail, { color: theme.darkBlue }]}>{emailToShow}</Text>
        </TouchableOpacity>

        {/* MENU */}
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

        {/* LOGOUT */}
        <TouchableOpacity
          style={[styles.logoutSection, { borderTopColor: theme.border }]}
          onPress={() => setShowConfirmLogout(true)}
        >
          <Ionicons name="log-out-outline" size={22} color={theme.red} />
          <Text style={[styles.logoutText, { color: theme.red }]}> Logout</Text>
        </TouchableOpacity>
      </DrawerContentScrollView>

      {/* PROFILE MODAL */}
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

            <Text style={[styles.profileName, { color: theme.text }]}>
              {currentUser?.firstName} {currentUser?.lastName}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.darkBlue }]}>{emailToShow}</Text>

            {/* DELETE ACCOUNT BUTTON */}
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

      {/* LOGOUT CONFIRM */}
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

      {/* DELETE ACCOUNT CONFIRM */}
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
});
