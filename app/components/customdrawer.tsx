import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { child, get, ref, set, update } from "firebase/database";
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

/* Theme */
const getTheme = (isDark) => ({
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

/* ✅ Highlight active screen */
const isRouteActive = (props, routeName) => {
  const currentRoute = props?.state?.routeNames?.[props?.state?.index];
  return routeName === currentRoute;
};

/* ✅ Sync updated name to all teams */
const syncUserNameToTeams = async (userData) => {
  try {
    const teamsSnap = await get(child(ref(db), "teams"));
    const teams = teamsSnap.val();
    if (!teams) return;

    Object.keys(teams).forEach((teamId) => {
      const team = teams[teamId];

      if (team.members && team.members[userData.uid]) {
        set(ref(db, `teams/${teamId}/members/${userData.uid}`), {
          name: `${userData.firstName} ${userData.lastName}`.trim(),
          role: userData.workType,
          department: userData.department,
        });
      }
    });
  } catch (err) {
    console.log("Sync to teams error:", err);
  }
};

export default function CustomDrawer(props) {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = getTheme(isDark);
  const insets = useSafeAreaInsets();

  // STATES
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [nickname, setNickname] = useState("User");
  const [profileImage, setProfileImage] = useState(null);
  const [tempNickname, setTempNickname] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ✅ Fetch logged in user */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const session = await AsyncStorage.getItem("loggedInUser");
        if (!session) return;

        const data = JSON.parse(session);
        const uid = data.uid || data.id;
        const profileSnap = await get(child(ref(db), `users/${uid}`));
        const profile = profileSnap.exists() ? profileSnap.val() : data;

        const merged = { ...data, ...profile, uid };
        setCurrentUser(merged);
        setNickname(`${merged.firstName ?? ""} ${merged.lastName ?? ""}`.trim() || merged.nickname || "User");

        /* ✅ Sync to teams */
        syncUserNameToTeams({
          uid,
          firstName: merged.firstName,
          lastName: merged.lastName,
          workType: merged.workType,
          department: merged.department,
        });
      } catch (e) {
        console.log("Load user error:", e);
      }
    };

    loadUser();
  }, []);

  /* Image Picker */
  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) setProfileImage(result.assets[0].uri);
  };

  const handleRemovePhoto = () => setProfileImage(null);

  const getActiveColor = (name) =>
    isRouteActive(props, name) ? theme.blue : theme.darkBlue;

  const getActiveBG = (name) =>
    isRouteActive(props, name) ? theme.activeBG : "transparent";

  const emailToShow = currentUser?.email || "Loading...";

  /* ✅ Logout */
  const confirmLogout = async () => {
    await AsyncStorage.removeItem("loggedInUser");
    setShowConfirm(false);
    router.replace("/");
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      edges={["top", "bottom"]}
    >
      <DrawerContentScrollView
        {...props}
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={[styles.scrollContent]}
      >
        {/* PROFILE SECTION */}
        <TouchableOpacity
          style={[styles.profileSection, { borderBottomColor: theme.border }]}
          onPress={() => setShowProfileModal(true)}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={{ width: 55, height: 55, borderRadius: 28 }}
            />
          ) : (
            <Ionicons name="person-circle-outline" size={50} color={theme.blue} />
          )}

          <Text style={[styles.userName, { color: theme.text, marginTop: 12 }]}>
            {nickname}
          </Text>

          <Text style={[styles.userEmail, { color: theme.darkBlue }]}>
            {emailToShow}
          </Text>
        </TouchableOpacity>

        {/* MENU */}
        <View style={styles.menuSection}>
          <DrawerItem
            label="Home"
            icon={
              <Ionicons
                name="home-outline"
                size={22}
                color={getActiveColor("dashboardscreen")}
                style={styles.icon}
              />
            }
            labelStyle={{ color: getActiveColor("dashboardscreen") }}
            style={{
              backgroundColor: getActiveBG("dashboardscreen"),
              borderRadius: 8,
            }}
            onPress={() => props.navigation.navigate("dashboardscreen")}
          />

          <DrawerItem
            label="Teams"
            icon={
              <Ionicons
                name="people-outline"
                size={22}
                color={getActiveColor("teams")}
                style={styles.icon}
              />
            }
            labelStyle={{ color: getActiveColor("teams") }}
            style={{
              backgroundColor: getActiveBG("teams"),
              borderRadius: 8,
            }}
            onPress={() => props.navigation.navigate("teams")}
          />

          <DrawerItem
            label="Record"
            icon={
              <Ionicons
                name="mic-outline"
                size={22}
                color={getActiveColor("recording")}
                style={styles.icon}
              />
            }
            labelStyle={{ color: getActiveColor("recording") }}
            style={{
              backgroundColor: getActiveBG("recording"),
              borderRadius: 8,
            }}
            onPress={() => props.navigation.navigate("recording")}
          />
        </View>

        <View style={styles.spacer} />

        {/* LOGOUT */}
        <TouchableOpacity
          style={[styles.logoutSection, { borderTopColor: theme.border }]}
          onPress={() => setShowConfirm(true)}
        >
          <Ionicons name="log-out-outline" size={22} color={theme.red} />
          <Text style={[styles.logoutText, { color: theme.red }]}>Logout</Text>
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
                <Text style={[styles.changePhotoText, { color: theme.blue }]}>
                  Change Profile Picture
                </Text>
              </TouchableOpacity>

              {profileImage && (
                <TouchableOpacity onPress={handleRemovePhoto}>
                  <Text
                    style={[
                      styles.changePhotoText,
                      { color: "#FF4500", marginTop: 4 },
                    ]}
                  >
                    Remove Photo
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.profileName, { color: theme.text }]}>
              {nickname}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.darkBlue }]}>
              {emailToShow}
            </Text>

            {/* EDIT NICKNAME */}
            <TouchableOpacity
              style={[styles.profileButtonContainer, { borderColor: theme.blue }]}
              onPress={() => {
                setEditingNickname(true);
                setTempNickname(nickname);
              }}
            >
              <Ionicons name="create-outline" size={20} color={theme.blue} />
              <Text style={[styles.profileButtonText, { color: theme.blue }]}>
                Edit Nickname
              </Text>
            </TouchableOpacity>

            {/* DELETE ACCOUNT (UI kept, no backend delete in this snippet) */}
            <TouchableOpacity
              style={[
                styles.profileButtonContainer,
                { borderColor: "#FF4500", backgroundColor: "transparent" },
              ]}
              onPress={() => setShowDeleteModal(true)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF4500" />
              <Text style={[styles.profileButtonText, { color: "#FF4500" }]}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EDIT NICKNAME MODAL */}
      <Modal visible={editingNickname} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalBox, { backgroundColor: theme.modalBG }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Nickname</Text>

            <TextInput
              value={tempNickname}
              onChangeText={setTempNickname}
              style={[
                styles.nicknameInput,
                { borderColor: theme.border, color: theme.text },
              ]}
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

                  const [firstName, ...rest] = tempNickname.split(" ");
                  const lastName = rest.join(" ");

                  // ✅ Update Firebase user profile
                  await update(ref(db, `users/${currentUser.uid}`), {
                    firstName,
                    lastName,
                  });

                  // ✅ Update local session
                  const updated = {
                    ...currentUser,
                    firstName,
                    lastName,
                  };
                  await AsyncStorage.setItem("loggedInUser", JSON.stringify({
                    uid: updated.uid,
                    email: updated.email,
                    firstName: updated.firstName,
                    lastName: updated.lastName,
                    nickname: updated.nickname,
                    workType: updated.workType,
                    department: updated.department,
                  }));

                  // ✅ Sync to all teams
                  syncUserNameToTeams({
                    uid: updated.uid,
                    firstName,
                    lastName,
                    workType: updated.workType,
                    department: updated.department,
                  });
                }}
              >
                <Text style={{ color: "#fff" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LOGOUT MODAL */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalBox, { backgroundColor: theme.modalBG }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Confirm Logout
            </Text>

            <Text style={[styles.modalText, { color: theme.modalText }]}>
              Do you want to logout?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.cancelBtn }]}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.red }]}
                onPress={confirmLogout}
              >
                <Text style={[styles.logoutBtnText]}>Logout</Text>
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
    width: "80%",
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
  profileModalClose: { position: "absolute", top: 10, right: 10 },
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
