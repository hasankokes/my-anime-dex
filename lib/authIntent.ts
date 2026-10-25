// Holds the single action a guest tried to perform while the login modal is open.
// The login screen runs it once after a successful sign-in, or drops it on cancel.

export type AuthReason =
    | 'default'
    | 'favorite'
    | 'list'
    | 'custom_list'
    | 'review'
    | 'arena'
    | 'profile'
    | 'lists'
    | 'recommendations'
    | 'calendar';

export type ResumableAction = (ctx: { resumed: boolean }) => void | Promise<void>;

let pendingAction: ResumableAction | null = null;
let loginOpen = false;

export const authIntent = {
    isLoginOpen: () => loginOpen,

    setLoginOpen(open: boolean) {
        loginOpen = open;
    },

    /** Stores the action and marks the login modal as open. */
    begin(action?: ResumableAction) {
        pendingAction = action ?? null;
        loginOpen = true;
    },

    /** Returns the pending action and forgets it, so it can only run once. */
    take(): ResumableAction | null {
        const action = pendingAction;
        pendingAction = null;
        return action;
    },

    clear() {
        pendingAction = null;
    },
};
