import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from '../lib/analytics';

export interface StepLayout {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type WalkthroughId = 'home' | 'calendar' | 'watching' | 'lists' | 'favorites';

/** A step with this key has no target: it renders as a centred intro card.
 *  Steps whose target is not on screen (premium-only, web, empty list…) are skipped automatically. */
export const WELCOME_STEP = 'welcome';

// Steps run top-to-bottom on screen so the spotlight never jumps around.
const WALKTHROUGH_CONFIGS: Record<WalkthroughId, { stepKeys: string[]; storageKey: string }> = {
    home: {
        stepKeys: [WELCOME_STEP, 'logo', 'search', 'themeToggle', 'profile', 'pulse', 'myLists', 'discover', 'rollDice', 'arena', 'trending', 'trendingToggle'],
        storageKey: 'walkthrough_home_completed',
    },
    calendar: {
        stepKeys: ['reminders', 'favoritesToggle', 'viewToggle', 'dayTabs', 'broadcastTime'],
        storageKey: 'walkthrough_calendar_completed',
    },
    watching: {
        stepKeys: ['episodeControls'],
        storageKey: 'walkthrough_watching_completed',
    },
    lists: {
        stepKeys: ['addListButton', 'tabFilter'],
        storageKey: 'walkthrough_lists_completed',
    },
    favorites: {
        stepKeys: ['sortButton', 'advancedFilter', 'filterTabs'],
        storageKey: 'walkthrough_favorites_completed',
    },
};

type TargetRef = React.RefObject<View | null>;
/** Scrolls the screen by `dy` px; returns whether it actually moved. */
type ScrollBy = (dy: number) => boolean;

interface WalkthroughContextType {
    isActive: boolean;
    activeWalkthroughId: WalkthroughId | null;
    currentStep: number;
    totalSteps: number;
    stepKeys: string[];
    startWalkthrough: (id: WalkthroughId) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipWalkthrough: () => void;
    checkFirstLaunch: (id: WalkthroughId) => Promise<boolean>;
    resetWalkthroughs: () => Promise<void>;
    resetKey: number;
    /** Live window rect of a step target, or null if it is not mounted / laid out. */
    measureTarget: (key: string) => Promise<StepLayout | null>;
    /** Scrolls the active tour's screen, when it registered a scroller. */
    scrollActiveScreen: ScrollBy | null;
    registerTargets: (id: WalkthroughId, targets: Record<string, TargetRef>, scrollBy?: ScrollBy) => () => void;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

// Screens only need start/end status and stable controls; keeping them in their own
// contexts means stepping through a tour re-renders the overlay, not the screens.
type WalkthroughStatus = Pick<WalkthroughContextType, 'isActive' | 'activeWalkthroughId' | 'resetKey'>;
type WalkthroughControls = Pick<WalkthroughContextType, 'registerTargets' | 'startWalkthrough' | 'checkFirstLaunch'>;
const WalkthroughStatusContext = createContext<WalkthroughStatus | undefined>(undefined);
const WalkthroughControlsContext = createContext<WalkthroughControls | undefined>(undefined);

export const WalkthroughProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [activeWalkthroughId, setActiveWalkthroughId] = useState<WalkthroughId | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [resetKey, setResetKey] = useState(0);
    const targetsRef = useRef<Partial<Record<WalkthroughId, Record<string, TargetRef>>>>({});
    const scrollersRef = useRef<Partial<Record<WalkthroughId, ScrollBy>>>({});

    const config = activeWalkthroughId ? WALKTHROUGH_CONFIGS[activeWalkthroughId] : null;
    const totalSteps = config ? config.stepKeys.length : 0;
    const stepKeys = useMemo(() => (config ? config.stepKeys : []), [config]);

    const registerTargets = useCallback((id: WalkthroughId, targets: Record<string, TargetRef>, scrollBy?: ScrollBy) => {
        targetsRef.current[id] = targets;
        if (scrollBy) scrollersRef.current[id] = scrollBy;
        return () => {
            if (targetsRef.current[id] === targets) delete targetsRef.current[id];
            if (scrollersRef.current[id] === scrollBy) delete scrollersRef.current[id];
        };
    }, []);

    const measureTarget = useCallback((key: string) => {
        return new Promise<StepLayout | null>(resolve => {
            const node = activeWalkthroughId ? targetsRef.current[activeWalkthroughId]?.[key]?.current : null;
            if (!node) return resolve(null);
            node.measureInWindow((x, y, width, height) => {
                resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
            });
        });
    }, [activeWalkthroughId]);

    const scrollActiveScreen = useCallback<ScrollBy>((dy) => {
        return activeWalkthroughId ? !!scrollersRef.current[activeWalkthroughId]?.(dy) : false;
    }, [activeWalkthroughId]);

    // Analytics: the step the user saw last, so a skip tells where they gave up
    useEffect(() => {
        if (isActive && activeWalkthroughId) {
            analytics.track('walkthrough_step_viewed', { walkthrough: activeWalkthroughId, step: currentStep, total_steps: totalSteps });
        }
    }, [isActive, activeWalkthroughId, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

    const finish = useCallback((id: WalkthroughId | null) => {
        setIsActive(false);
        setCurrentStep(0);
        setActiveWalkthroughId(null);
        if (id) AsyncStorage.setItem(WALKTHROUGH_CONFIGS[id].storageKey, 'true');
    }, []);

    const startWalkthrough = useCallback((id: WalkthroughId) => {
        analytics.track('walkthrough_started', { walkthrough: id });
        setActiveWalkthroughId(id);
        setCurrentStep(0);
        setIsActive(true);
    }, []);

    const nextStep = useCallback(() => {
        if (!activeWalkthroughId) return;
        const stepsCount = WALKTHROUGH_CONFIGS[activeWalkthroughId].stepKeys.length;
        if (currentStep < stepsCount - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            analytics.track('walkthrough_completed', { walkthrough: activeWalkthroughId, total_steps: stepsCount });
            finish(activeWalkthroughId);
        }
    }, [activeWalkthroughId, currentStep, finish]);

    const prevStep = useCallback(() => {
        setCurrentStep(prev => Math.max(0, prev - 1));
    }, []);

    const skipWalkthrough = useCallback(() => {
        if (activeWalkthroughId) {
            analytics.track('walkthrough_skipped', { walkthrough: activeWalkthroughId, step: currentStep, total_steps: totalSteps });
        }
        finish(activeWalkthroughId);
    }, [activeWalkthroughId, currentStep, totalSteps, finish]);

    const checkFirstLaunch = useCallback(async (id: WalkthroughId) => {
        const completed = await AsyncStorage.getItem(WALKTHROUGH_CONFIGS[id].storageKey);
        return completed !== 'true';
    }, []);

    const resetWalkthroughs = useCallback(async () => {
        await AsyncStorage.multiRemove(Object.values(WALKTHROUGH_CONFIGS).map(c => c.storageKey));
        setResetKey(prev => prev + 1);
    }, []);

    const status = useMemo(() => ({ isActive, activeWalkthroughId, resetKey }), [isActive, activeWalkthroughId, resetKey]);
    const controls = useMemo(
        () => ({ registerTargets, startWalkthrough, checkFirstLaunch }),
        [registerTargets, startWalkthrough, checkFirstLaunch]
    );

    return (
        <WalkthroughStatusContext.Provider value={status}>
        <WalkthroughControlsContext.Provider value={controls}>
        <WalkthroughContext.Provider
            value={{
                isActive,
                activeWalkthroughId,
                currentStep,
                totalSteps,
                stepKeys,
                startWalkthrough,
                nextStep,
                prevStep,
                skipWalkthrough,
                checkFirstLaunch,
                resetWalkthroughs,
                resetKey,
                measureTarget,
                scrollActiveScreen: activeWalkthroughId && scrollersRef.current[activeWalkthroughId] ? scrollActiveScreen : null,
                registerTargets,
            }}
        >
            {children}
        </WalkthroughContext.Provider>
        </WalkthroughControlsContext.Provider>
        </WalkthroughStatusContext.Provider>
    );
};

export const useWalkthrough = () => {
    const context = useContext(WalkthroughContext);
    if (!context) {
        throw new Error('useWalkthrough must be used within a WalkthroughProvider');
    }
    return context;
};

/** Tour start/end status without re-rendering on every step. */
export const useWalkthroughStatus = () => {
    const context = useContext(WalkthroughStatusContext);
    if (!context) {
        throw new Error('useWalkthroughStatus must be used within a WalkthroughProvider');
    }
    return context;
};

const useWalkthroughControls = () => {
    const context = useContext(WalkthroughControlsContext);
    if (!context) {
        throw new Error('useWalkthroughControls must be used within a WalkthroughProvider');
    }
    return context;
};

/**
 * Registers a screen's step targets (refs keyed by step key). The overlay
 * measures them live on every step, so positions are never stale. Pass
 * `scrollBy` for scrollable screens so off-screen targets get scrolled into view.
 */
export const useWalkthroughTargets = (id: WalkthroughId, targets: Record<string, TargetRef>, scrollBy?: ScrollBy) => {
    const { registerTargets } = useWalkthroughControls();
    const targetsRef = useRef(targets);
    targetsRef.current = targets;
    const scrollRef = useRef(scrollBy);
    scrollRef.current = scrollBy;

    useEffect(() => {
        // Proxies keep the registration stable while always reading the latest refs.
        const proxy = new Proxy({} as Record<string, TargetRef>, {
            get: (_, key: string) => targetsRef.current[key],
        });
        return registerTargets(id, proxy, scrollBy ? (dy) => !!scrollRef.current?.(dy) : undefined);
    }, [id, registerTargets, !!scrollBy]); // eslint-disable-line react-hooks/exhaustive-deps
};

/**
 * Starts the tour the first time its screen is focused and ready. Re-checks
 * whenever another tour ends, so tours never collide or get lost.
 */
export const useWalkthroughAutoStart = (id: WalkthroughId, enabled = true, delay = 700) => {
    const { isActive, resetKey } = useWalkthroughStatus();
    const { checkFirstLaunch, startWalkthrough } = useWalkthroughControls();

    useFocusEffect(
        useCallback(() => {
            if (!enabled || isActive) return;
            let cancelled = false;
            const timer = setTimeout(async () => {
                const isFirst = await checkFirstLaunch(id);
                if (isFirst && !cancelled) startWalkthrough(id);
            }, delay);
            return () => {
                cancelled = true;
                clearTimeout(timer);
            };
        // resetKey: replay after "Start walkthrough" in Help clears the completed flags
        }, [id, enabled, isActive, delay, resetKey, checkFirstLaunch, startWalkthrough]) // eslint-disable-line react-hooks/exhaustive-deps
    );
};
