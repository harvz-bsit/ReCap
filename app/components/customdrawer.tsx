import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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

const getTheme = (isDark) => ({
  bg: isDark ? '#121212' : '#F4F8FB',
  text: isDark ? '#FFFFFF' : '#000000',
  blue: '#1976D2',
  darkBlue: isDark ? '#B0BEC5' : '#444',
  activeBG: isDark ? '#1E1E1E' : '#E0F7FA',
  red: '#FF5722',
  border: isDark ? '#2A2A2A' : '#E0E0E0',
  modalBG: isDark ? '#1E1E1E' : '#FFFFFF',
  modalText: isDark ? '#E0E0E0' : '#333333',
  modalOverlay: 'rgba(0,0,0,0.5)',
  cancelBtn: isDark ? '#333333' : '#E0E0E0',
});

const isRouteActive = (props, routeName) => {
  const currentRoute = props?.state?.routeNames?.[props?.state?.index];
  return routeName === currentRoute;
};

const ANDROID_STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

export default function CustomDrawer(props) {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = getTheme(isDark);

  const [showConfirm, setShowConfirm] = useState(false);

  const getActiveColor = (routeName) =>
    isRouteActive(props, routeName) ? theme.blue : theme.darkBlue;
  const getActiveBG = (routeName) =>
    isRouteActive(props, routeName) ? theme.activeBG : 'transparent';

  const handleLogoutPress = () => setShowConfirm(true);

  const confirmLogout = () => {
    setShowConfirm(false);
    props.navigation.closeDrawer();
    router.replace('/'); // ✅ Go to login screen
  };

  const cancelLogout = () => setShowConfirm(false);

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView
        {...props}
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: ANDROID_STATUS_BAR_HEIGHT },
        ]}
      >
        {/* Profile Section */}
        <TouchableOpacity
          style={[styles.profileSection, { borderBottomColor: theme.border }]}
          onPress={() => props.navigation.navigate('profile')}
        >
          <Ionicons name="person-circle-outline" size={50} color={theme.blue} />
          <Text style={[styles.userName, { color: theme.text, marginTop: 12 }]}>
            Li Soliven
          </Text>
        </TouchableOpacity>

        {/* Drawer Menu */}
        <View style={styles.menuSection}>
          <DrawerItem
            label="Home"
            icon={<Ionicons name="home-outline" size={22} color={getActiveColor('dashboardscreen')} style={styles.icon} />}
            labelStyle={[styles.drawerLabel, { color: getActiveColor('dashboardscreen') }]}
            style={[styles.drawerItemBase, { backgroundColor: getActiveBG('dashboardscreen'), borderRadius: 8 }]}
            onPress={() => props.navigation.navigate('dashboardscreen')}
          />
          <DrawerItem
            label="Teams"
            icon={<Ionicons name="people-outline" size={22} color={getActiveColor('teams')} style={styles.icon} />}
            labelStyle={[styles.drawerLabel, { color: getActiveColor('teams') }]}
            style={[styles.drawerItemBase, { backgroundColor: getActiveBG('teams'), borderRadius: 8 }]}
            onPress={() => props.navigation.navigate('teams')}
          />
          <DrawerItem
            label="Record"
            icon={<Ionicons name="mic-outline" size={22} color={getActiveColor('recording')} style={styles.icon} />}
            labelStyle={[styles.drawerLabel, { color: getActiveColor('recording') }]}
            style={[styles.drawerItemBase, { backgroundColor: getActiveBG('recording'), borderRadius: 8 }]}
            onPress={() => props.navigation.navigate('recording')}
          />
        </View>

        {/* Spacer pushes logout to bottom */}
        <View style={styles.spacer} />

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutSection, { borderTopColor: theme.border }]}
          onPress={handleLogoutPress}
        >
          <Ionicons name="log-out-outline" size={22} color={theme.red} style={styles.icon} />
          <Text style={[styles.logoutText, { color: theme.red }]}>Logout</Text>
        </TouchableOpacity>
      </DrawerContentScrollView>

      {/* 🌙 Themed Modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalBox, { backgroundColor: theme.modalBG }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Confirm Logout</Text>
            <Text style={[styles.modalText, { color: theme.modalText }]}>
              Do you want to logout?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.cancelBtn }]}
                onPress={cancelLogout}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  profileSection: { padding: 20, borderBottomWidth: 1, marginBottom: 4 },
  userName: { fontSize: 18, fontWeight: '700' },
  menuSection: { paddingHorizontal: 10 },
  drawerItemBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginVertical: 2,
    minHeight: 48,
  },
  icon: { marginRight: 15 },
  drawerLabel: { fontSize: 16, fontWeight: '600' },
  spacer: { flex: 1 },
  logoutSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 20,
    borderTopWidth: 1,
    justifyContent: 'flex-start',
  },
  logoutText: { fontSize: 16, fontWeight: '700' },

  // 🌙 Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalText: { fontSize: 15, textAlign: 'center', marginBottom: 16 },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  logoutBtnText: { color: '#fff', fontWeight: '700' },
});
