import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Alert, Platform, ActivityIndicator, AppState, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { SocialButton } from '../components/SocialButton';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    checkSession();

    // 1. Listen for auth state changes (e.g. after successful login in same tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // Use a small timeout to ensure navigation is ready
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      }
    });

    // 2. Listen for AppState changes (e.g. when user returns from browser popup on mobile)
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkSession();
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      } else {
        setCheckingSession(false);
      }
    } catch (error) {
      setCheckingSession(false);
    }
  };

  const performOAuth = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      
      // Separate logic for Web vs Native to avoid "origins don't match" error
      if (Platform.OS === 'web') {
        // ON WEB: Use standard Supabase redirect (no popup)
        // This avoids the iframe/CORS issues in the preview environment
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin,
            skipBrowserRedirect: false, // Let it redirect the current tab
          },
        });
        
        if (error) throw error;
        // The page will redirect, so no need to do anything else here
        
      } else {
        // ON MOBILE: Use WebBrowser auth session (System Browser)
        const redirectTo = makeRedirectUri({ scheme: 'myapp' });
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true, // Get the URL to open manually
          },
        });

        if (error) throw error;

        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectTo
          );

          if (result.type === 'success') {
            checkSession();
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Login Error', error.message);
      }
      setLoading(false);
    } finally {
      // On web, we might redirect away, so this might not run, which is fine.
      if (Platform.OS !== 'web') {
        setLoading(false);
      }
    }
  };

  if (checkingSession) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background with subtle gradient */}
      <LinearGradient
        colors={['#FFFFFF', '#F3F4F6']}
        style={styles.background}
      />

      <View style={styles.contentContainer}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=300&auto=format&fit=crop' }} 
            style={styles.logo}
          />
          <Text style={styles.appName}>My AnimeDex</Text>
          <Text style={styles.tagline}>Track, Discover, Watch.</Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.buttonContainer}>
            <SocialButton 
              provider="apple" 
              onPress={() => performOAuth('apple')}
              isLoading={loading}
            />
            <SocialButton 
              provider="google" 
              onPress={() => performOAuth('google')}
              isLoading={loading}
            />
          </View>

          {/* Manual Refresh Link */}
          <TouchableOpacity onPress={checkSession} style={styles.refreshLink}>
            <Text style={styles.refreshText}>Already logged in? Click here to refresh</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: height * 0.15,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
    marginBottom: 24,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
  },
  bottomSection: {
    width: '100%',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  refreshLink: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 8,
  },
  refreshText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#FACC15',
    textDecorationLine: 'underline',
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
