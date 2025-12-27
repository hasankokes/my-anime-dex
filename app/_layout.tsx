import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { useFonts, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthProvider';
import { useRouter, useSegments } from 'expo-router';
import { NetworkProvider } from '../context/NetworkContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { LanguageProvider } from '../context/LanguageContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // In Expo Router, the root index route often has an empty segment array or ['index']
    const isLogin = segments.length === 0 || segments[0] === 'index';
    const isResetPassword = segments[0] === 'reset-password';
    const inPublicArea = isLogin || isResetPassword;

    if (!session && !inPublicArea) {
      router.replace('/');
    } else if (session && isLogin) {
      router.replace('/(tabs)');
    }
    // If session && isResetPassword, we stay there to allow checking/updating password
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return <>{children}</>;
};

export default function RootLayout() {
  useFrameworkReady();

  // Load Google Fonts AND Icon Fonts to prevent "squares"
  const [fontsLoaded] = useFonts({
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    ...Ionicons.font,
    ...Feather.font,
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ marginTop: 20 }}>Loading Application Resources...</Text>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <NetworkProvider>
          <LanguageProvider>
            <AuthProvider>
              <AuthGuard>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="anime/[id]" options={{ headerShown: false }} />

                  <Stack.Screen
                    name="subscription"
                    options={{
                      presentation: 'modal',
                      headerShown: false,
                      animation: 'slide_from_bottom'
                    }}
                  />
                </Stack>
              </AuthGuard>
              <OfflineBanner />
            </AuthProvider>
          </LanguageProvider>
        </NetworkProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
