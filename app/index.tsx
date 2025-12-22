import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Alert, Platform, ActivityIndicator, AppState, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { SocialButton } from '../components/SocialButton';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  console.log('[LoginScreen] Rendering...');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    checkSession();

    // 1. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      }
    });

    // 2. Listen for AppState changes
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
      // Create a promise that rejects after 2 seconds to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 2000)
      );

      // Race against the timeout
      const response = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]) as any;

      const { data: { session } } = response;

      if (session) {
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      } else {
        setCheckingSession(false);
      }
    } catch (error) {
      console.log('[Auth] Session check failed or timed out:', error);
      setCheckingSession(false);
    }
  };

  const performEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        Alert.alert('Success', 'Account created! Please check your email for confirmation settings.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Authentication Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const performOAuth = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);

      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin,
            skipBrowserRedirect: false,
          },
        });
        if (error) throw error;
      } else {
        const redirectTo = makeRedirectUri({ scheme: 'myapp' });
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });

        if (error) throw error;

        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectTo
          );

          if (result.type === 'success' && result.url) {
            const url = new URL(result.url);
            const code = url.searchParams.get('code');
            const access_token = new URLSearchParams(url.hash.substring(1)).get('access_token');
            const refresh_token = new URLSearchParams(url.hash.substring(1)).get('refresh_token');

            if (code) {
              const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
              if (sessionError) throw sessionError;
            } else if (access_token && refresh_token) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (sessionError) throw sessionError;
            }

            checkSession();
          }
        }
      }
    } catch (error) {
      console.error('[Auth] Error:', error);
      if (error instanceof Error) {
        Alert.alert('Login Error', error.message);
      }
    } finally {
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
      <LinearGradient
        colors={['#FFFFFF', '#F3F4F6']}
        style={styles.background}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.contentContainer, { paddingTop: height * 0.15 }]}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=300&auto=format&fit=crop' }}
              style={styles.logo}
            />
            <Text style={styles.appName}>My AnimeDex</Text>
            <Text style={styles.tagline}>Track, Discover, Watch.</Text>
          </View>

          {/* Email/Password Section */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={performEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleLink}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? Sign In' : 'Don\'t have an account? Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Social Section */}
          <View style={styles.bottomSection}>
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

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
              <Text style={styles.refreshText}>Check Session</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
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
  formContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    height: 56,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#111827',
  },
  primaryButton: {
    backgroundColor: '#FACC15',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: "#FACC15",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#000000',
  },
  toggleLink: {
    alignItems: 'center',
    padding: 8,
  },
  toggleText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#4B5563',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
