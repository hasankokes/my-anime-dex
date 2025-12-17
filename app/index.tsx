import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SocialButton } from '../components/SocialButton';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const performOAuth = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      
      // Fix for "origins don't match" on web
      // On web, we want to redirect back to the current window origin
      const redirectUrl = Platform.OS === 'web' 
        ? (typeof window !== 'undefined' ? window.location.origin : '')
        : makeRedirectUri({
            path: 'auth/callback',
          });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          Alert.alert('Success', 'Authentication flow completed.');
        }
      }
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background: Mostly white as requested */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={['#FFFFFF', '#FFFFFF', '#F8FAFC', '#F1F5F9']}
          locations={[0, 0.6, 0.85, 1]}
          style={styles.gradient}
        />
      </View>

      <SafeAreaView style={styles.contentContainer}>
        {/* Top Section: Logo */}
        <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            {/* 
              TODO: Replace the uri below with the actual image URL you provided.
              I've used a placeholder since I cannot access the uploaded file directly.
            */}
            <Image 
              source={{ uri: 'https://img-wrapper.vercel.app/image?url=https://placehold.co/400x400/png' }} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>My AnimeDex</Text>
          </View>
        </View>

        {/* Bottom Section: Buttons & Text */}
        <View style={styles.bottomSection}>
          
          {/* Buttons pushed lower */}
          <View style={styles.buttonsContainer}>
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

          {/* Text at the very bottom with reduced font size */}
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>Welcome to My AnimeDex</Text>
            <Text style={styles.welcomeSubtitle}>
              Track anime, manage watch status, and favorite titles.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  gradient: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 30, // Increased bottom padding
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // Centers logo vertically in the top space
    paddingTop: height * 0.05,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  appName: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
    letterSpacing: -0.5,
  },
  bottomSection: {
    width: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  buttonsContainer: {
    width: '100%',
    marginBottom: 30, // Spacing between buttons and text
  },
  welcomeTextContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  welcomeTitle: {
    fontSize: 18, // Reduced from 28
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 12, // Reduced from 14
    fontFamily: 'Inter_500Medium',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: '90%',
  },
});
