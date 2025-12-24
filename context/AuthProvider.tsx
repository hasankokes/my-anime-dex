import React, { createContext, useContext, useEffect, useState } from 'react';
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
