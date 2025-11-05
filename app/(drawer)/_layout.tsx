import { Drawer } from 'expo-router/drawer';
import { useColorScheme } from 'react-native';
import CustomDrawer from '../components/customdrawer'; 

const getTheme = (isDark) => ({
  text: isDark ? '#FFFFFF' : '#000000',
  blue: '#1976D2',
});

export default function DrawerLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = getTheme(isDark);

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.blue },
        headerTintColor: '#fff',
        drawerLabelStyle: { color: theme.text },
        drawerContentStyle: {
          backgroundColor: isDark ? '#121212' : '#F4F8FB',
        },
      }}
    >
      <Drawer.Screen name="dashboardscreen" options={{ title: 'Home' }} />
      <Drawer.Screen name="teams" options={{ title: 'Teams' }} />
      <Drawer.Screen name="recording" options={{ title: 'Record' }} />
      <Drawer.Screen name="logout" options={{ drawerItemStyle: { height: 0, overflow: 'hidden' } }} />
    </Drawer>
  );
}
