import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StepLayout {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type WalkthroughId = 'home' | 'calendar' | 'watching' | 'lists' | 'favorites';

const WALKTHROUGH_CONFIGS: Record<WalkthroughId, { stepKeys: string[]; storageKey: string }> = {
    home: {
        stepKeys: ['logo', 'search', 'discover', 'rollDice', 'myLists', 'trending', 'themeToggle', 'profile'],
        storageKey: 'walkthrough_home_completed',
    },
    calendar: {
        stepKeys: ['broadcastTime', 'dayTabs', 'favoritesToggle'],
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
        stepKeys: ['filterTabs'],
        storageKey: 'walkthrough_favorites_completed',
    },
};

interface WalkthroughContextType {
    isActive: boolean;
    activeWalkthroughId: WalkthroughId | null;
    currentStep: number;
    totalSteps: number;
    stepKeys: string[];
    getStepLayout: (step: number) => StepLayout | undefined;
    registerStepLayout: (step: number, layout: StepLayout) => void;
    startWalkthrough: (id: WalkthroughId) => void;
    nextStep: () => void;
    skipWalkthrough: () => void;
    checkFirstLaunch: (id: WalkthroughId) => Promise<boolean>;
    resetWalkthroughs: () => Promise<void>;
    resetKey: number;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

export const WalkthroughProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [activeWalkthroughId, setActiveWalkthroughId] = useState<WalkthroughId | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [resetKey, setResetKey] = useState(0);
    const stepLayoutsRef = useRef<Record<number, StepLayout>>({});

    const config = activeWalkthroughId ? WALKTHROUGH_CONFIGS[activeWalkthroughId] : null;
    const totalSteps = config ? config.stepKeys.length : 0;
    const stepKeys = config ? config.stepKeys : [];

    const registerStepLayout = useCallback((step: number, layout: StepLayout) => {
        stepLayoutsRef.current[step] = layout;
    }, []);

    const getStepLayout = useCallback((step: number) => {
        return stepLayoutsRef.current[step];
    }, []);

    const startWalkthrough = useCallback((id: WalkthroughId) => {
        // Do not clear stepLayoutsRef here, as onLayout events might have already populated it.
        // stepLayoutsRef.current = {}; 
        setActiveWalkthroughId(id);
        setCurrentStep(0);
        setIsActive(true);
    }, []);

    const nextStep = useCallback(() => {
        setCurrentStep(prev => {
            const stepsCount = activeWalkthroughId ? WALKTHROUGH_CONFIGS[activeWalkthroughId].stepKeys.length : 0;
            if (prev < stepsCount - 1) {
                return prev + 1;
            } else {
                setIsActive(false);
                if (activeWalkthroughId) {
                    AsyncStorage.setItem(WALKTHROUGH_CONFIGS[activeWalkthroughId].storageKey, 'true');
                }
                setActiveWalkthroughId(null);
                return 0;
            }
        });
    }, [activeWalkthroughId]);

    const skipWalkthrough = useCallback(() => {
        setIsActive(false);
        setCurrentStep(0);
        if (activeWalkthroughId) {
            AsyncStorage.setItem(WALKTHROUGH_CONFIGS[activeWalkthroughId].storageKey, 'true');
        }
        setActiveWalkthroughId(null);
    }, [activeWalkthroughId]);

    const checkFirstLaunch = useCallback(async (id: WalkthroughId) => {
        const completed = await AsyncStorage.getItem(WALKTHROUGH_CONFIGS[id].storageKey);
        return completed !== 'true';
    }, [resetKey]); // Re-check when resetKey changes

    const resetWalkthroughs = useCallback(async () => {
        await AsyncStorage.multiRemove([
            'walkthrough_home_completed',
            'walkthrough_calendar_completed',
            'walkthrough_watching_completed',
            'walkthrough_lists_completed',
            'walkthrough_favorites_completed',
        ]);
        setResetKey(prev => prev + 1);
    }, []);

    return (
        <WalkthroughContext.Provider
            value={{
                isActive,
                activeWalkthroughId,
                currentStep,
                totalSteps,
                stepKeys,
                getStepLayout,
                registerStepLayout,
                startWalkthrough,
                nextStep,
                skipWalkthrough,
                checkFirstLaunch,
                resetWalkthroughs,
                resetKey,
            }}
        >
            {children}
        </WalkthroughContext.Provider>
    );
};

export const useWalkthrough = () => {
    const context = useContext(WalkthroughContext);
    if (!context) {
        throw new Error('useWalkthrough must be used within a WalkthroughProvider');
    }
    return context;
};
