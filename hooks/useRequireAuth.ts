import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthProvider';
import { authIntent, AuthReason, ResumableAction } from '../lib/authIntent';

/**
 * Returns requireAuth(reason, action):
 * - signed in: runs the action right away with { resumed: false }
 * - guest: remembers the action, opens the login modal, and the login screen
 *   runs it once with { resumed: true } after a successful sign-in.
 * Cancelling the login drops the action, so nothing is written.
 */
export function useRequireAuth() {
    const { session } = useAuth();
    const router = useRouter();

    return useCallback((reason: AuthReason, action?: ResumableAction) => {
        if (session) {
            action?.({ resumed: false });
            return true;
        }
        // Ignore repeated taps while the login modal is already opening/open
        if (authIntent.isLoginOpen()) return false;

        authIntent.begin(action);
        router.push({ pathname: '/login', params: { reason } });
        return false;
    }, [session, router]);
}
