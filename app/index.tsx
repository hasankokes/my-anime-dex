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
import { PREDEFINED_AVATARS } from '../lib/constants';

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
        console.log('[LoginScreen] Session found, letting AuthGuard handle redirect');
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
          scheme: 'myapp',
        });

        Alert.alert(
          'Config Required',
          `Please add this URI to Supabase:\n${redirectTo}\n\nRunning in local/dev mode likely requires this specific URI.`
        );
        console.log('[LoginScreen] Redirect URI:', redirectTo);

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


          console.log('[LoginScreen] WebBrowser result:', JSON.stringify(result));
          Alert.alert('Debug WebBrowser', JSON.stringify(result));

          if (result.type === 'success' && result.url) {
            Alert.alert('Debug', `Auth URL received: ${result.url}`);
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
              console.log('[LoginScreen] Profile safety check failed:', e);
            }

            Alert.alert('Debug', 'Session exchanged successfully. checking session...');

            checkSession();
          }
        }
      }
    } catch (error) {
      console.error('[Auth] Error:', error);
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
        <ScrollView contentContainerStyle={[styles.contentContainer, { paddingTop: height * 0.08 }]}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/header-logo.png')}
              style={styles.logo}
            />

            <Text style={styles.tagline}>Track   Discover   Watch</Text>
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
                provider="google"
                onPress={() => performOAuth('google')}
                isLoading={loading}
              />
            </View>



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
    marginBottom: 60,
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
    marginTop: -20,
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
});
