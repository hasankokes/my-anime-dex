export type AdActionType = 'general' | 'trailer' | 'create_list';

// No ads outside native builds
export const useAdsBootstrap = () => { };

export const useInterstitialAd = (): { showAdIfNeeded: (actionType?: AdActionType) => Promise<boolean>; isLoaded: boolean; } => ({
    showAdIfNeeded: async () => false,
    isLoaded: false,
});
