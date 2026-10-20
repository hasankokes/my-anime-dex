import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useGlobalSearchParams, usePathname, useSegments } from 'expo-router';
import { PostHogProvider } from 'posthog-react-native';
import { analytics, posthog } from '../lib/analytics';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageContext';
import { useTheme } from './ThemeContext';
import { useRevenueCat } from './RevenueCatProvider';

// Route pattern without groups, e.g. ['(tabs)', 'calendar'] -> 'calendar', ['anime', '[id]'] -> 'anime/[id]'
const screenNameFromSegments = (segments: string[]) => {
    const parts = segments.filter(s => !(s.startsWith('(') && s.endsWith(')')));
    return parts.length ? parts.join('/') : 'home';
};

/** Screen views, foreground sessions, user identity and app-wide properties for analytics. */
const AnalyticsTracker = () => {
    const segments = useSegments();
    const pathname = usePathname();
    const params = useGlobalSearchParams<{ id?: string }>();
    const { user, status } = useAuth();
    const { language } = useLanguage();
    const { isDark } = useTheme();
    const { isPro } = useRevenueCat();

    useEffect(() => {
        analytics.init();
    }, []);

    // Screen views: one per route change, named by the route pattern so ids don't split screens
    const screenName = screenNameFromSegments(segments as string[]);
    useEffect(() => {
        analytics.screen(screenName, {
            path: pathname,
            ...(params.id ? { entity_id: String(params.id) } : null),
        });
    }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    // Foreground sessions: summary when the app really goes to background, fresh counters when it
    // comes back. Brief 'inactive' states (notification center, app switcher peek) are ignored.
    useEffect(() => {
        let inBackground = false;
        const sub = AppState.addEventListener('change', next => {
            if (next === 'background' && !inBackground) {
                inBackground = true;
                analytics.endSession();
            } else if (next === 'active' && inBackground) {
                inBackground = false;
                analytics.startSession();
            }
        });
        return () => sub.remove();
    }, []);

    // Identity: guest id is merged into the user on sign-in; sign-out starts a new anonymous id
    const prevUserId = useRef<string | null>(null);
    useEffect(() => {
        if (status === 'loading') return;
        if (user) analytics.identify(user);
        else if (prevUserId.current) analytics.reset();
        prevUserId.current = user?.id ?? null;
    }, [user?.id, status]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (status === 'loading') return;
        analytics.setContext({
            auth_status: status,
            is_premium: isPro,
            app_language: language,
            app_theme: isDark ? 'dark' : 'light',
        });
    }, [status, isPro, language, isDark]);

    return null;
};

export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
    if (!posthog) {
        return (
            <>
                <AnalyticsTracker />
                {children}
            </>
        );
    }

    return (
        <PostHogProvider
            client={posthog}
            // expo-router screens are tracked manually above; taps give "what did they press before leaving"
            autocapture={{ captureScreens: false, captureTouches: true }}
        >
            <AnalyticsTracker />
            {children}
        </PostHogProvider>
    );
};
