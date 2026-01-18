export const useInterstitialAd = (): { showAdIfNeeded: () => Promise<void>; isLoaded: boolean; } => {
    return {
        showAdIfNeeded: async () => { },
        isLoaded: false
    };
};
