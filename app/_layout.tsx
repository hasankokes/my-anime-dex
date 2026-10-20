import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { useFonts, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Ionicons, Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthProvider';
import { pendingArenaResult } from '../lib/pendingArenaResult';
import { NetworkProvider } from '../context/NetworkContext';
import { OfflineBanner } from '../components/OfflineBanner';
import { LanguageProvider } from '../context/LanguageContext';
import { RevenueCatProvider } from '../context/RevenueCatProvider';
import { WalkthroughProvider } from '../context/WalkthroughContext';
import { AnalyticsProvider } from '../context/AnalyticsProvider';
import { WalkthroughOverlay } from '../components/WalkthroughOverlay';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { requestTrackingPermissions } from '../lib/tracking';

SplashScreen.preventAutoHideAsync();

// No forced login: guests browse freely and the login modal opens only via requireAuth.
// While the stored session is being restored we keep the native splash up and decide nothing,
// so signed-in users never see the login screen flash.
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
      return;
    }
    // Safety net: never keep the native splash forever if session restore hangs
    const timer = setTimeout(() => SplashScreen.hideAsync(), 6000);
    return () => clearTimeout(timer);
  }, [loading]);

  // A guest's finished Arena result is saved once, as soon as they are signed in
  // (also covers app restarts and email-verification sign-ins).
  useEffect(() => {
    if (user?.id) pendingArenaResult.flush();
  }, [user?.id]);

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
              <RevenueCatProvider>
                <AnalyticsProvider>
                  <WalkthroughProvider>
                    <AuthGuard>
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="index" options={{ headerShown: false }} />
                        <Stack.Screen
                          name="login"
                          options={{
                            presentation: 'modal',
                            headerShown: false,
                            animation: 'slide_from_bottom'
                          }}
                        />
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
                    <WalkthroughOverlay />
                  </WalkthroughProvider>
                </AnalyticsProvider>
              </RevenueCatProvider>
            </AuthProvider>
          </LanguageProvider>
        </NetworkProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
