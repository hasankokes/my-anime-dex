import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
    session: Session | null;
    loading: boolean;
    signIn: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    signUp: (email: string) => Promise<void>;
    avatarUrl: string | null;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    loading: true,
    signIn: async () => { },
    signOut: async () => { },
    signUp: async () => { },
    avatarUrl: null,
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

    useEffect(() => {
        // Function to fetch profile to get avatar_url
        const fetchProfile = async (userId: string) => {
            const { data } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', userId)
                .single();
            if (data?.avatar_url) {
                setAvatarUrl(data.avatar_url);
            }
        };

        // Check active sessions and set the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                // Try getting from metadata first, then profile
                const metaAvatar = session.user.user_metadata?.avatar_url;
                if (metaAvatar) {
                    setAvatarUrl(metaAvatar);
                } else {
                    fetchProfile(session.user.id);
                }
            }
            setLoading(false);
        });

        // Listen for changes to auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                const metaAvatar = session.user.user_metadata?.avatar_url;
                if (metaAvatar) {
                    setAvatarUrl(metaAvatar);
                } else {
                    fetchProfile(session.user.id);
                }
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
                console.log('Deep link parse error:', e);
            }
        };

        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url });
        });

        const sub = Linking.addEventListener('url', handleDeepLink);
        return () => sub.remove();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                session,
                loading,
                signIn,
                signOut,
                signUp,
                avatarUrl
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
