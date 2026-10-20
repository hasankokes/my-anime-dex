import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authIntent } from '../lib/authIntent';
import { pendingArenaResult } from '../lib/pendingArenaResult';
import { recommendationService } from '../services/recommendationService';

export type AuthStatus = 'loading' | 'guest' | 'authenticated';

// Removes everything cached for the previous user (keys are per-user, e.g. favorites_cache_<id>)
const clearUserCaches = async () => {
    authIntent.clear();
    recommendationService.clearCache();
    await pendingArenaResult.clear();
    try {
        const keys = await AsyncStorage.getAllKeys();
        const userKeys = keys.filter(k => k.startsWith('favorites_cache_'));
        if (userKeys.length) await AsyncStorage.multiRemove(userKeys);
    } catch {
        // ignore
    }
};

type AuthContextType = {
    session: Session | null;
    user: User | null;
    status: AuthStatus;
    loading: boolean;
    signIn: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    signUp: (email: string) => Promise<void>;
    avatarUrl: string | null;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    status: 'loading',
    loading: true,
    signIn: async () => { },
    signOut: async () => { },
    signUp: async () => { },
    avatarUrl: null,
    refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null); // State for avatarUrl

    const signIn = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
    };

    const signOut = async () => {
        setSession(null);
        setAvatarUrl(null);
        await supabase.auth.signOut();
    };

    const signUp = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
    };

    const fetchProfile = async (userId: string, metadataAvatar?: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', userId)
            .single();

        if (data?.avatar_url) {
            setAvatarUrl(data.avatar_url);
        } else if (metadataAvatar) {
            // Fallback to Google metadata if no profile avatar exists
            setAvatarUrl(metadataAvatar);
        }
    };

    const refreshProfile = async () => {
        if (session?.user) {
            await fetchProfile(session.user.id);
        }
    };

    useEffect(() => {
        // Check active sessions and set the user
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("AuthProvider: Error getting session:", error.message);
                if (error.message.includes("Refresh Token")) {
                    console.log("AuthProvider: tailored sign out for invalid refresh token");
                    // Force sign out to clear invalid tokens from storage
                    supabase.auth.signOut();
                    setSession(null);
                    setAvatarUrl(null);
                }
            } else {
                setSession(session);
                if (session?.user) {
                    // Always fetch from DB first, passing metadata as fallback
                    fetchProfile(session.user.id, session.user.user_metadata?.avatar_url);
                }
            }
            setLoading(false);
        });

        // Listen for changes to auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                // Always fetch from DB first, passing metadata as fallback
                fetchProfile(session.user.id, session.user.user_metadata?.avatar_url);
            } else {
                setAvatarUrl(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Handle deep links for Supabase Auth on Native
    useEffect(() => {
        if (Platform.OS === 'web') return;

        const handleDeepLink = async (event: { url: string }) => {
            const urlStr = event.url;
            if (!urlStr) return;

            try {
                const url = new URL(urlStr);
                const code = url.searchParams.get('code');
                const fragment = url.hash.substring(1);
                const params = new URLSearchParams(fragment);
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                if (code) {
                    await supabase.auth.exchangeCodeForSession(code);
                } else if (access_token && refresh_token) {
                    await supabase.auth.setSession({
                        access_token,
                        refresh_token,
                    });
                }
            } catch (e) {

            }
        };

        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url });
        });

        const sub = Linking.addEventListener('url', handleDeepLink);
        return () => sub.remove();
    }, []);

    // When a signed-in user becomes a guest (logout, expired/revoked session), drop their caches
    const userId = session?.user?.id ?? null;
    const prevUserId = React.useRef<string | null>(null);
    useEffect(() => {
        if (prevUserId.current && prevUserId.current !== userId) {
            clearUserCaches();
        }
        prevUserId.current = userId;
    }, [userId]);

    const status: AuthStatus = loading ? 'loading' : session ? 'authenticated' : 'guest';

    const contextValue = React.useMemo(() => ({
        session,
        user: session?.user ?? null,
        status,
        loading,
        signIn,
        signOut,
        signUp,
        avatarUrl,
        refreshProfile
    }), [session, status, loading, avatarUrl]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
