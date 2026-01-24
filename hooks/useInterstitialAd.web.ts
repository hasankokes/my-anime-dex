export const useInterstitialAd = () => {
    return {
        showAdIfNeeded: async (actionType?: 'general' | 'trailer' | 'create_list') => { },
        isLoaded: false
    };
};
