import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar, 
          { 
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            borderTopWidth: isDark ? 0 : 1
          }
        ],
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons 
                name={focused ? "home" : "home-outline"} 
                size={24} 
                color={focused ? '#111827' : color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons 
                name={focused ? "heart" : "heart-outline"} 
                size={24} 
                color={focused ? '#111827' : color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="watching"
        options={{
          title: 'Watching',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons 
                name={focused ? "play-circle" : "play-circle-outline"} 
                size={24} 
                color={focused ? '#111827' : color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons 
                name={focused ? "person" : "person-outline"} 
                size={24} 
                color={focused ? '#111827' : color} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    elevation: 0,
    shadowOpacity: 0,
    height: 85, 
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 32,
    borderRadius: 16,
  },
  activeIconContainer: {
    backgroundColor: '#FACC15',
  },
});
