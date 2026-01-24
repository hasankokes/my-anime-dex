export const useInterstitialAd = (): { showAdIfNeeded: (actionType?: 'general' | 'trailer' | 'create_list') => Promise<void>; isLoaded: boolean; } => {
    return {
        showAdIfNeeded: async (actionType?: 'general' | 'trailer' | 'create_list') => { },
        isLoaded: false
    };
};
