import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform, StatusBar } from 'react-native';
// 1. Import Ionicons for professional, consistent icons
import { Ionicons } from '@expo/vector-icons'; 

// --- MOCK COMPONENTS (Updated) ---
const DrawerContentScrollView = ({ children, style, contentContainerStyle }) => (
    <View style={[{ flex: 1 }, style]}>
        <View style={contentContainerStyle}>
            {children}
        </View>
    </View>
);

// 2. Updated DrawerItem mock to accept and render an icon
// Note: In a real environment, you would use the 'icon' prop provided by React Navigation's DrawerItem.
const DrawerItem = ({ label, labelStyle, style, onPress, icon }) => (
    <TouchableOpacity style={[styles.drawerItemBase, style]} onPress={onPress}>
        {icon}
        <Text style={[styles.drawerLabel, labelStyle]}>{label}</Text>
    </TouchableOpacity>
);

// --- START THEME CONFIGURATION ---
const getTheme = (isDark) => ({
    bg: isDark ? '#121212' : '#F4F8FB',
    text: isDark ? '#FFFFFF' : '#000000',
    blue: isDark ? '#1976D2' : '#1976D2',
    darkBlue: isDark ? '#B0BEC5' : '#444', 
    activeBG: isDark ? '#1E1E1E' : '#E0F7FA', 
    red: '#FF5722',
    border: isDark ? '#2A2A2A' : '#E0E0E0',
});
// --- END THEME CONFIGURATION ---

// Helper function to check the current active route
const isRouteActive = (props, routeName) => {
    const currentRoute = props.state.routeNames[props.state.index];
    if (routeName === 'index' && currentRoute === 'index') return true;
    if (routeName === currentRoute) return true;
    return false;
};

// --- ANDROID SAFE AREA PADDING ---
const ANDROID_STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

export default function CustomDrawer(props) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const theme = getTheme(isDark);
    
    // Helper to determine the color for icons/labels based on active status
    const getActiveColor = (routeName) => isRouteActive(props, routeName) ? theme.blue : theme.darkBlue;
    const getActiveBG = (routeName) => isRouteActive(props, routeName) ? theme.activeBG : 'transparent';

    return (
        <DrawerContentScrollView 
            {...props} 
            style={{ backgroundColor: theme.bg }}
            contentContainerStyle={[
                styles.scrollContent, 
                { paddingTop: ANDROID_STATUS_BAR_HEIGHT }
            ]}
        >
            {/* 👤 Profile/Greeting Section */}
            <TouchableOpacity 
                style={[styles.profileSection, { borderBottomColor: theme.border }]}
                onPress={() => props.navigation.navigate('profile')} 
            >
                {/* Profile Icon/Placeholder */}
                <Ionicons 
                    name="person-circle-outline" 
                    size={50} 
                    color={theme.blue} 
                />
                <Text style={[styles.userName, { color: theme.text, marginTop: 12 }]}>Li Soliven</Text>
            </TouchableOpacity>

            {/* 📋 Menu Options */}
            <View style={styles.menuSection}>
                {/* HOME */}
                <DrawerItem
                    label="Home"
                    icon={<Ionicons name="home-outline" size={22} color={getActiveColor('index')} style={styles.icon} />}
                    labelStyle={[styles.drawerLabel, { color: getActiveColor('index') }]}
                    style={[styles.drawerItemBase, { backgroundColor: getActiveBG('index'), borderRadius: 8 }]}
                    onPress={() => props.navigation.navigate('index')} 
                />
                {/* TEAMS */}
                <DrawerItem
                    label="Teams"
                    icon={<Ionicons name="people-outline" size={22} color={getActiveColor('teams')} style={styles.icon} />}
                    labelStyle={[styles.drawerLabel, { color: getActiveColor('teams') }]}
                    style={[styles.drawerItemBase, { backgroundColor: getActiveBG('teams'), borderRadius: 8 }]}
                    onPress={() => props.navigation.navigate('teams')} 
                />
                {/* RECORD */}
                <DrawerItem
                    label="Record"
                    icon={<Ionicons name="mic-outline" size={22} color={getActiveColor('recording')} style={styles.icon} />}
                    labelStyle={[styles.drawerLabel, { color: getActiveColor('recording') }]}
                    style={[styles.drawerItemBase, { backgroundColor: getActiveBG('recording'), borderRadius: 8 }]}
                    onPress={() => props.navigation.navigate('recording')} 
                />
            </View>

            {/* Spacer View pushes the logout section to the very bottom */}
            <View style={styles.spacer} />

            {/* ⏻ Logout at the bottom */}
            <TouchableOpacity 
                style={[styles.logoutSection, { borderTopColor: theme.border }]} 
                onPress={() => props.navigation.navigate('logout')} 
            >
                <Ionicons name="log-out-outline" size={22} color={theme.red} style={styles.icon} />
                <Text style={[styles.logoutText, { color: theme.red }]}>Logout</Text>
            </TouchableOpacity>
        </DrawerContentScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1, 
    },
    profileSection: {
        padding: 20,
        borderBottomWidth: 1,
        marginBottom: 4, 
    },
    // Removed profileImagePlaceholder, using an Ionicons person-circle instead
    userName: {
        fontSize: 18,
        fontWeight: '700',
    },
    menuSection: {
        paddingHorizontal: 10,
        marginTop: 0, 
    },
    drawerItemBase: {
        // Changed to row to accommodate the icon
        flexDirection: 'row', 
        alignItems: 'center', // Align icon and text vertically
        paddingVertical: 10, 
        paddingHorizontal: 18, 
        marginVertical: 2, 
        minHeight: 48, 
    },
    // 3. New style for the icon to add spacing
    icon: {
        marginRight: 15,
        // The color is set dynamically via the 'icon' prop in the component
    },
    drawerLabel: {
        fontSize: 16, 
        fontWeight: '600',
    },
    spacer: {
        flex: 1, 
    },
    logoutSection: {
        // Changed to row to accommodate the icon
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%', 
        padding: 20,
        borderTopWidth: 1,
        // Aligns the icon/text row to the left
        justifyContent: 'flex-start',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
    },
});