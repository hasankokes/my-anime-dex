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
            backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)', // Slight transparency
            borderTopWidth: 0,
            shadowColor: "#000", // Ensure shadow is visible
            shadowOpacity: 0.3,
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
            <View style={styles.iconContainer}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={focused ? '#FACC15' : color}
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
            <View style={styles.iconContainer}>
              <Ionicons
                name={focused ? "heart" : "heart-outline"}
                size={24}
                color={focused ? '#FACC15' : color}
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
            <View style={styles.iconContainer}>
              <Ionicons
                name={focused ? "play-circle" : "play-circle-outline"}
                size={24}
                color={focused ? '#FACC15' : color}
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
            <View style={styles.iconContainer}>
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={24}
                color={focused ? '#FACC15' : color}
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
    position: 'absolute',
    bottom: 15, // Lowered from 25
    marginHorizontal: 50, // Increased from 20 to make it narrower
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    height: 70, // Increased slightly to show text descenders
    borderRadius: 35,
    borderTopWidth: 0,
    // Padding adjustments to center content vertically
    paddingTop: 8,
    paddingBottom: 10, // Increased padding to clear descenders (g, y, j, p, q)
  },
  tabLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    marginTop: 0, // Brought text closer to icon
    paddingBottom: 0,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 30, // Reduced height to compact the layout
    marginBottom: 0, // Removed bottom margin
  },
});
