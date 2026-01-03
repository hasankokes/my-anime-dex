import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Alert, Platform, ActivityIndicator, AppState, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { SocialButton } from '../components/SocialButton';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREDEFINED_AVATARS } from '../lib/constants';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    checkSession();

    // 1. Listen for auth state changes - Removed redundant listener/redirect that conflicts with AuthGuard


    // 2. Listen for AppState changes
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkSession();
      }
    });

    return () => {
      // subscription.unsubscribe(); // Removed above
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

      } else {
        setCheckingSession(false);
      }
    } catch (error) {

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
        const randomAvatar = PREDEFINED_AVATARS[Math.floor(Math.random() * PREDEFINED_AVATARS.length)];

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              avatar_url: randomAvatar
            }
          }
        });

        if (error) throw error;

        // Optional: If you want to ensure the profile is updated immediately even if the trigger is slow or missing
        if (data.user) {
          // We attempt to update, but ignore error if profile doesn't exist yet (trigger might be racing)
          await supabase.from('profiles').update({ avatar_url: randomAvatar }).eq('id', data.user.id);
        }

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
  const handleForgotPassword = async () => {
    setAuthMessage(null);
    if (!email) {
      setAuthMessage({ type: 'error', text: 'Please enter your email address to reset your password.' });
      return;
    }

    try {
      setLoading(true);
      const redirectUrl = makeRedirectUri({
        scheme: 'myanimedex',
        path: 'reset-password',
      });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setAuthMessage({
        type: 'success',
        text: 'Check your email! We sent you a password reset link.'
      });
    } catch (error) {
      if (error instanceof Error) {
        setAuthMessage({ type: 'error', text: error.message });
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
        const redirectTo = makeRedirectUri({
          scheme: 'myanimedex',
        });

        Alert.alert(
          'Config Required',
          `Please add this URI to Supabase:\n${redirectTo}\n\nRunning in local/dev mode likely requires this specific URI.`
        );


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

            // Safety: Ensure profile exists (in case trigger failed or user already existed)
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
                if (!profile) {
                  await supabase.from('profiles').insert({
                    id: user.id,
                    username: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
                    avatar_url: user.user_metadata.avatar_url
                  });
                }
              }
            } catch (e) {

            }



            checkSession();
          }
        }
      }
    } catch (error) {

      if (error instanceof Error) {
        Alert.alert('Login Error', `${error.message}\nType: ${error.name}`);
      }
    } finally {
      if (Platform.OS !== 'web') {
        setLoading(false);
      }
    }
  };

  if (checkingSession) {
    return (
      <View style={[styles.container, styles.center, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#FACC15" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <LinearGradient
        colors={isDark ? ['#111827', '#1F2937'] : ['#FFFFFF', '#F3F4F6']}
        style={styles.background}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.contentContainer, { paddingTop: height * 0.05 }]}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/header-logo.png')}
              style={styles.logo}
            />

            <Text style={styles.tagline}>Track   Discover   Watch</Text>
          </View>

          {/* Social Section (Moved to Top) */}
          <View style={styles.buttonContainer}>
            <SocialButton
              provider="google"
              onPress={() => performOAuth('google')}
              isLoading={loading}
            />
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Email/Password Section */}
          <View style={styles.formContainer}>
            {authMessage && (
              <View style={[
                styles.messageContainer,
                authMessage.type === 'error' ? (isDark ? styles.errorContainerDark : styles.errorContainer) : (isDark ? styles.successContainerDark : styles.successContainer)
              ]}>
                <Text style={[styles.messageText, isDark && styles.messageTextDark]}>{authMessage.text}</Text>
              </View>
            )}

            <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
              <Ionicons name="mail-outline" size={20} color={isDark ? '#9CA3AF' : '#9CA3AF'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Email"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
              <Ionicons name="lock-closed-outline" size={20} color={isDark ? '#9CA3AF' : '#9CA3AF'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Password"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {!isSignUp && (
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPasswordContainer}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

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
              <Text style={[styles.toggleText, isDark && styles.textLight]}>
                {isSignUp ? 'Already have an account? Sign In' : 'Don\'t have an account? Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSection}>
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
  containerDark: {
    backgroundColor: '#111827',
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
    marginBottom: 50,
  },
  logo: {
    width: 280, // Increased size for visibility (approx 40% increased from 200)
    height: 280,
    resizeMode: 'contain',
    marginBottom: 0,
  },
  tagline: {
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
    color: '#6B7280',
    marginTop: -40,
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
    fontFamily: 'Poppins_500Medium',
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
  inputContainerDark: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: '#111827',
  },
  inputDark: {
    color: '#F9FAFB',
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
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#4B5563',
  },
  textLight: {
    color: '#D1D5DB',
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
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#9CA3AF',
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#FACC15',
  },
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorContainerDark: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  successContainer: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  successContainerDark: {
    backgroundColor: '#064E3B',
    borderWidth: 1,
    borderColor: '#065F46',
  },
  messageText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#1F2937',
    textAlign: 'center',
  },
  messageTextDark: {
    color: '#F9FAFB',
  },
});
