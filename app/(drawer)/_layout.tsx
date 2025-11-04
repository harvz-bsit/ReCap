import { Drawer } from 'expo-router/drawer';
import { useColorScheme } from 'react-native';
// Corrected import path to reference the components folder
import CustomDrawer from '../components/customdrawer'; 

// --- START THEME CONFIGURATION (Copied from Dashboard) ---
const getTheme = (isDark) => ({
  text: isDark ? '#FFFFFF' : '#000000',
  blue: '#1976D2', // Primary color for header
});
// --- END THEME CONFIGURATION ---

export default function DrawerLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = getTheme(isDark);

  return (
    <Drawer
      // 1. Integrates your custom UI component for the drawer content
      drawerContent={(props) => <CustomDrawer {...props} />} 
      
      screenOptions={{
        // 2. Hide the main header on all drawer screens (usually handled by the screen itself)
        headerShown: true,
        
        // 3. Style the header and items based on theme
        headerStyle: {
          backgroundColor: theme.blue,
        },
        headerTintColor: '#fff', // White text/icons in the header
        
        drawerLabelStyle: {
          color: theme.text,
        },

        // 4. Ensures the drawer background matches the main screen theme if no custom content were used
        drawerContentStyle: {
            backgroundColor: isDark ? '#121212' : '#F4F8FB',
        },
      }}
    >
      {/* This screen corresponds to the path: / 
        It loads app/(drawer)/index.tsx, which re-exports DashboardScreen.tsx
      */}
      <Drawer.Screen
        name="index" // The file name inside the (drawer) folder
        options={{
          title: 'Home', // Title shown in the drawer menu and the header (if enabled)
        }}
      />
      
      {/* You will need to create these files:
        - app/(drawer)/teams.tsx
        - app/(drawer)/recording.tsx
        - app/(drawer)/logout.tsx 
      */}
      <Drawer.Screen name="teams" options={{ title: 'Teams' }} />
      <Drawer.Screen name="recording" options={{ title: 'Record' }} />
      
      {/* We hide the logout route from the drawer menu 
        because it's handled manually inside CustomDrawer.tsx
      */}
      <Drawer.Screen name="logout" options={{ drawerItemStyle: { height: 0, overflow: 'hidden' } }} />
      
    </Drawer>
  );
}
