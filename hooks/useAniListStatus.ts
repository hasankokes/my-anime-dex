import { useSyncExternalStore } from 'react';
import { getAniListStatus, subscribeAniListStatus, AniListStatus } from '../services/anilist/client';

/** Live AniList availability ('ok' | 'down'), shared by every screen. */
export function useAniListStatus(): AniListStatus {
    return useSyncExternalStore(subscribeAniListStatus, getAniListStatus, getAniListStatus);
}
